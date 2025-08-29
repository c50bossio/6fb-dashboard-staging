import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const barbershop_id = searchParams.get('barbershop_id')
    const show_in_pos = searchParams.get('show_in_pos') || 'false'

    if (!barbershop_id) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 })
    }

    // Fetch products with inventory data
    let query = supabase
      .from('barbershop_inventory')
      .select(`
        id,
        name,
        sku,
        barcode,
        category,
        brand,
        description,
        quantity_on_hand,
        quantity_available,
        quantity_reserved,
        cost_price,
        retail_price,
        reorder_point,
        reorder_quantity,
        max_stock_level,
        track_inventory,
        show_in_pos,
        commission_rate,
        image_url,
        thumbnail_url,
        product_source,
        sync_enabled,
        auto_reorder,
        preferred_supplier,
        created_at,
        updated_at
      `)
      .eq('barbershop_id', barbershop_id)

    if (show_in_pos === 'true') {
      query = query.eq('show_in_pos', true)
    }

    const { data: products, error: productsError } = await query.order('name')

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Calculate analytics
    const analytics = {
      totalProducts: products?.length || 0,
      totalValue: products?.reduce((sum, p) => sum + ((p.cost_price || 0) * p.quantity_on_hand), 0) || 0,
      lowStockCount: products?.filter(p => p.quantity_available <= p.reorder_point && p.quantity_available > 0).length || 0,
      outOfStockCount: products?.filter(p => p.quantity_available === 0).length || 0
    }

    return NextResponse.json({
      products: products || [],
      analytics
    })

  } catch (error) {
    console.error('Inventory API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      barbershop_id,
      name,
      sku,
      barcode,
      category,
      brand,
      description,
      quantity_on_hand,
      cost_price,
      retail_price,
      reorder_point,
      reorder_quantity,
      track_inventory,
      show_in_pos,
      commission_rate,
      image_url
    } = body

    if (!barbershop_id || !name || !sku || !retail_price) {
      return NextResponse.json({ 
        error: 'Missing required fields: barbershop_id, name, sku, retail_price' 
      }, { status: 400 })
    }

    // Check for duplicate SKU
    const { data: existingProduct } = await supabase
      .from('barbershop_inventory')
      .select('id')
      .eq('barbershop_id', barbershop_id)
      .eq('sku', sku)
      .single()

    if (existingProduct) {
      return NextResponse.json({ 
        error: 'Product with this SKU already exists' 
      }, { status: 409 })
    }

    // Create the product
    const { data: product, error: insertError } = await supabase
      .from('barbershop_inventory')
      .insert({
        barbershop_id,
        name,
        sku,
        barcode,
        category,
        brand,
        description,
        quantity_on_hand: quantity_on_hand || 0,
        quantity_available: quantity_on_hand || 0,
        quantity_reserved: 0,
        cost_price: cost_price || 0,
        retail_price,
        reorder_point: reorder_point || 5,
        reorder_quantity: reorder_quantity || 10,
        track_inventory: track_inventory !== false,
        show_in_pos: show_in_pos !== false,
        commission_rate: commission_rate || 10,
        image_url: image_url || null,
        product_source: 'custom',
        sync_enabled: false,
        auto_reorder: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating product:', insertError)
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
    }

    // Create initial stock movement record
    if (quantity_on_hand > 0) {
      await supabase
        .from('inventory_adjustments')
        .insert({
          barbershop_id,
          inventory_id: product.id,
          movement_type: 'received',
          quantity_change: quantity_on_hand,
          stock_before: 0,
          stock_after: quantity_on_hand,
          reason: 'Initial stock',
          notes: 'Product added to inventory',
          unit_cost: cost_price || 0,
          total_cost_change: (cost_price || 0) * quantity_on_hand,
          performed_by: barbershop_id // Will be updated with proper user ID when auth is added
        })
    }

    return NextResponse.json({ product })

  } catch (error) {
    console.error('Product creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const product_id = searchParams.get('product_id')
    const body = await request.json()

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const {
      name,
      sku,
      barcode,
      category,
      brand,
      description,
      cost_price,
      retail_price,
      reorder_point,
      reorder_quantity,
      track_inventory,
      show_in_pos,
      commission_rate,
      image_url
    } = body

    // Update the product
    const { data: product, error: updateError } = await supabase
      .from('barbershop_inventory')
      .update({
        name,
        sku,
        barcode,
        category,
        brand,
        description,
        cost_price: cost_price || 0,
        retail_price,
        reorder_point: reorder_point || 5,
        reorder_quantity: reorder_quantity || 10,
        track_inventory: track_inventory !== false,
        show_in_pos: show_in_pos !== false,
        commission_rate: commission_rate || 10,
        image_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', product_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating product:', updateError)
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
    }

    return NextResponse.json({ product })

  } catch (error) {
    console.error('Product update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const product_id = searchParams.get('product_id')

    if (!product_id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    // Delete the product
    const { error: deleteError } = await supabase
      .from('barbershop_inventory')
      .delete()
      .eq('id', product_id)

    if (deleteError) {
      console.error('Error deleting product:', deleteError)
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Product deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}