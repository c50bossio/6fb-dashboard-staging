import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { 
      products, 
      customer_id, 
      barber_id, 
      appointment_id,
      payment_method = 'cash',
      payment_intent_id,
      notes
    } = await request.json()
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      )
    }
    
    if (!barber_id) {
      return NextResponse.json(
        { error: 'Barber ID is required for commission tracking' },
        { status: 400 }
      )
    }
    
    // Get barbershop ID from barber's staff record
    const { data: staffRecord, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('barberbarbershop_id, user_id')
      .eq('user_id', barber_id)
      .eq('is_active', true)
      .single()
    
    if (staffError || !staffRecord) {
      return NextResponse.json(
        { error: 'Invalid barber ID or barber not active' },
        { status: 400 }
      )
    }
    
    const barberbarbershop_id = staffRecord.barberbarbershop_id
    
    // Generate receipt number
    const receiptNumber = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
    
    // Process each product sale
    const salesPromises = products.map(async (item) => {
      const { product_id, quantity, discount = 0 } = item
      
      // Get product details
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', product_id)
        .eq('barberbarbershop_id', barberbarbershop_id)
        .single()
      
      if (productError || !product) {
        throw new Error(`Product not found: ${product_id}`)
      }
      
      // Check stock availability
      if (product.track_inventory && product.current_stock < quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.current_stock}`)
      }
      
      // Calculate amounts
      const unit_price = product.retail_price
      const discount_amount = discount
      const tax_rate = product.tax_rate || 0
      const subtotal = (unit_price * quantity) - discount_amount
      const tax_amount = subtotal * (tax_rate / 100)
      const total_amount = subtotal + tax_amount
      
      // Record the sale
      const { data: sale, error: saleError } = await supabase
        .from('product_sales')
        .insert({
          barberbarbershop_id,
          product_id,
          quantity,
          unit_price,
          discount_amount,
          tax_amount,
          total_amount,
          cost_price: product.cost_price,
          barber_id,
          customer_id,
          appointment_id,
          payment_method,
          payment_intent_id,
          receipt_number: receiptNumber,
          notes,
          sale_date: new Date().toISOString()
        })
        .select()
        .single()
      
      if (saleError) {
        throw saleError
      }
      
      // The stock update is handled by the database trigger we created
      // But we can also update last_sold_at here
      await supabase
        .from('products')
        .update({ last_sold_at: new Date().toISOString() })
        .eq('id', product_id)
      
      return {
        ...sale,
        product_name: product.name,
        product_sku: product.sku
      }
    })
    
    const sales = await Promise.all(salesPromises)
    
    // Calculate totals
    const totalAmount = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalTax = sales.reduce((sum, sale) => sum + sale.tax_amount, 0)
    const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount_amount, 0)
    
    // Calculate commission for barber
    const commissionRate = 0.40 // 40% default commission on product sales
    const commissionAmount = totalAmount * commissionRate
    
    // Record commission transaction
    await supabase
      .from('commission_transactions')
      .insert({
        barber_id,
        barberbarbershop_id,
        transaction_type: 'product_sale',
        payment_amount: totalAmount,
        commission_percentage: commissionRate * 100,
        commission_amount: commissionAmount,
        shop_amount: totalAmount - commissionAmount,
        payment_intent_id,
        status: 'completed',
        created_at: new Date().toISOString()
      })
    
    // Update commission balance
    const { data: balance } = await supabase
      .from('commission_balances')
      .select('*')
      .eq('barber_id', barber_id)
      .eq('barberbarbershop_id', barberbarbershop_id)
      .single()
    
    if (balance) {
      await supabase
        .from('commission_balances')
        .update({
          pending_amount: balance.pending_amount + commissionAmount,
          total_earned: balance.total_earned + commissionAmount,
          last_transaction_at: new Date().toISOString()
        })
        .eq('barber_id', barber_id)
        .eq('barberbarbershop_id', barberbarbershop_id)
    } else {
      await supabase
        .from('commission_balances')
        .insert({
          barber_id,
          barberbarbershop_id,
          pending_amount: commissionAmount,
          paid_amount: 0,
          total_earned: commissionAmount,
          last_transaction_at: new Date().toISOString()
        })
    }
    
    return NextResponse.json({
      success: true,
      receipt_number: receiptNumber,
      sales,
      summary: {
        items_count: sales.length,
        total_amount: totalAmount.toFixed(2),
        total_tax: totalTax.toFixed(2),
        total_discount: totalDiscount.toFixed(2),
        commission_amount: commissionAmount.toFixed(2),
        payment_method
      }
    })
    
  } catch (error) {
    console.error('Error recording product sale:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to record sale' },
      { status: 500 }
    )
  }
}