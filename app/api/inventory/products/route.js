import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/inventory/products - Get barbershop's local inventory
export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barbershopId = searchParams.get('barbershop_id');
    const category = searchParams.get('category');
    const showInPos = searchParams.get('show_in_pos');
    const lowStock = searchParams.get('low_stock');

    if (!barbershopId) {
      return NextResponse.json({ error: 'Barbershop ID required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('barbershop_inventory')
      .select(`
        *,
        master_product:master_products(
          name,
          brand,
          wholesale_price,
          msrp,
          image_url
        )
      `)
      .eq('barbershop_id', barbershopId)
      .order('pos_display_order', { ascending: true });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (showInPos === 'true') {
      query = query.eq('show_in_pos', true);
    }

    if (lowStock === 'true') {
      query = query.lte('quantity_available', 'reorder_point');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching inventory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate analytics
    const analytics = {
      totalProducts: data.length,
      totalValue: data.reduce((sum, item) => 
        sum + (item.quantity_on_hand * (item.cost_price || 0)), 0
      ),
      lowStockCount: data.filter(item => 
        item.quantity_available <= item.reorder_point
      ).length,
      outOfStockCount: data.filter(item => 
        item.quantity_available === 0
      ).length
    };

    return NextResponse.json({
      products: data,
      analytics
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/inventory/products - Add custom product to barbershop inventory
export async function POST(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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
    } = body;

    // Validate required fields
    if (!barbershop_id || !name || !sku || !retail_price) {
      return NextResponse.json({ 
        error: 'Missing required fields: barbershop_id, name, sku, retail_price' 
      }, { status: 400 });
    }

    // Check if SKU already exists for this barbershop
    const { data: existingProduct } = await supabase
      .from('barbershop_inventory')
      .select('id')
      .eq('barbershop_id', barbershop_id)
      .eq('sku', sku)
      .single();

    if (existingProduct) {
      return NextResponse.json({ 
        error: 'Product with this SKU already exists' 
      }, { status: 409 });
    }

    // Create the product
    const { data, error } = await supabase
      .from('barbershop_inventory')
      .insert({
        barbershop_id,
        product_source: 'custom',
        name,
        sku,
        barcode,
        category,
        brand,
        description,
        quantity_on_hand: quantity_on_hand || 0,
        cost_price,
        retail_price,
        reorder_point: reorder_point || 5,
        reorder_quantity: reorder_quantity || 10,
        track_inventory: track_inventory !== false,
        show_in_pos: show_in_pos !== false,
        commission_rate: commission_rate || 10,
        image_url,
        preferred_supplier: 'direct'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create initial inventory movement record
    if (quantity_on_hand > 0) {
      await supabase
        .from('inventory_movements')
        .insert({
          barbershop_id,
          barbershop_inventory_id: data.id,
          movement_type: 'received',
          quantity_change: quantity_on_hand,
          stock_before: 0,
          stock_after: quantity_on_hand,
          reason: 'Initial stock',
          performed_by: user.id,
          unit_cost: cost_price,
          total_cost_change: cost_price * quantity_on_hand
        });
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/inventory/products - Update product
export async function PUT(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    const body = await request.json();
    const updateData = { ...body };
    delete updateData.id;  // Remove id if it's in the body

    // Remove fields that shouldn't be updated directly
    delete updateData.quantity_on_hand;
    delete updateData.quantity_available;
    delete updateData.created_at;

    const { data, error } = await supabase
      .from('barbershop_inventory')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/inventory/products - Delete product
export async function DELETE(request) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Check if product exists and belongs to user's barbershop
    const { data: product, error: fetchError } = await supabase
      .from('barbershop_inventory')
      .select('id, name, barbershop_id')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete associated inventory movements first (if any)
    await supabase
      .from('inventory_movements')
      .delete()
      .eq('barbershop_inventory_id', productId);

    // Delete the product
    const { error: deleteError } = await supabase
      .from('barbershop_inventory')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('Error deleting product:', error);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}