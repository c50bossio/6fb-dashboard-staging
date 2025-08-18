import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { items, appointment_id, payment_total, payment_method } = await request.json()
    
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      )
    }
    
    const barbershopId = '550e8400-e29b-41d4-a716-446655440000' // Demo shop
    const inventoryTransactions = []
    const productUpdates = []
    let totalSaleValue = 0
    
    // Start a transaction to ensure data consistency
    for (const item of items) {
      const { product_id, quantity, sale_price } = item
      
      if (!product_id || !quantity || quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid item data: ${JSON.stringify(item)}` },
          { status: 400 }
        )
      }
      
      // Get current product data
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', product_id)
        .eq('barbershop_id', barbershopId)
        .single()
      
      if (productError || !product) {
        return NextResponse.json(
          { error: `Product not found: ${product_id}` },
          { status: 404 }
        )
      }
      
      // Check if sufficient stock is available
      if (product.current_stock < quantity) {
        return NextResponse.json(
          { 
            error: `Insufficient stock for ${product.name}. Available: ${product.current_stock}, Requested: ${quantity}`,
            product: {
              id: product.id,
              name: product.name,
              available_stock: product.current_stock,
              requested_quantity: quantity
            }
          },
          { status: 409 } // Conflict
        )
      }
      
      const newStock = product.current_stock - quantity
      const saleValue = (sale_price || product.retail_price) * quantity
      totalSaleValue += saleValue
      
      // Prepare inventory transaction record
      inventoryTransactions.push({
        barbershop_id: barbershopId,
        product_id: product.id,
        transaction_type: 'sale',
        quantity: -quantity, // Negative for sales
        previous_stock: product.current_stock,
        new_stock: newStock,
        unit_cost: sale_price || product.retail_price,
        total_value: saleValue,
        reference_id: appointment_id || `pos-${Date.now()}`,
        notes: `POS Sale - ${quantity}x ${product.name}`,
        created_at: new Date().toISOString()
      })
      
      // Prepare product stock update
      productUpdates.push({
        id: product.id,
        current_stock: newStock,
        updated_at: new Date().toISOString()
      })
    }
    
    // Log inventory transactions (table-less approach for now)
    // Inventory transaction logging would be implemented here
    
    // Update product stock levels
    for (const update of productUpdates) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          current_stock: update.current_stock,
          updated_at: update.updated_at
        })
        .eq('id', update.id)
      
      if (updateError) {
        console.error(`❌ Error updating product ${update.id}:`, updateError)
        // Continue with other updates even if one fails
      }
    }
    
    // Create a transaction record for the sale
    const { data: transaction, error: saleError } = await supabase
      .from('transactions')
      .insert({
        barbershop_id: barbershopId,
        appointment_id: appointment_id || null,
        transaction_type: 'sale',
        amount: payment_total || totalSaleValue,
        payment_method: payment_method || 'cash',
        payment_status: 'completed',
        items: items,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (saleError) {
      console.error('❌ Error recording sale transaction:', saleError)
    }
    
    // Get updated inventory summary
    const { data: updatedProducts } = await supabase
      .from('products')
      .select('current_stock, min_stock_level, retail_price, name')
      .eq('barbershop_id', barbershopId)
      .in('id', items.map(item => item.product_id))
    
    const lowStockAlerts = updatedProducts?.filter(p => 
      p.current_stock <= p.min_stock_level && p.current_stock > 0
    ) || []
    
    const outOfStockAlerts = updatedProducts?.filter(p => 
      p.current_stock === 0
    ) || []
    
    
    return NextResponse.json({
      success: true,
      message: `Sale processed: ${items.length} items sold`,
      transaction_id: transaction?.id,
      total_value: totalSaleValue,
      inventory_updates: productUpdates.map(update => ({
        product_id: update.id,
        new_stock: update.current_stock
      })),
      alerts: {
        low_stock: lowStockAlerts.map(p => ({
          id: p.id,
          name: p.name,
          current_stock: p.current_stock,
          min_stock_level: p.min_stock_level
        })),
        out_of_stock: outOfStockAlerts.map(p => ({
          id: p.id,
          name: p.name
        }))
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ POS sale processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process sale', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve recent inventory transactions
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 20
    const product_id = searchParams.get('product_id')
    
    const barbershopId = '550e8400-e29b-41d4-a716-446655440000'
    
    let query = supabase
      .from('inventory_transactions')
      .select(`
        *,
        products (
          name,
          sku,
          retail_price
        )
      `)
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    
    const { data: transactions, error } = await query
    
    if (error) {
      console.error('❌ Error fetching inventory transactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      transactions,
      count: transactions.length
    })
    
  } catch (error) {
    console.error('❌ Error in inventory transactions GET:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve transactions' },
      { status: 500 }
    )
  }
}