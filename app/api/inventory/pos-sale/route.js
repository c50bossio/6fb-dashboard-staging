import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Commission calculation function
async function calculateAndRecordCommission({ barber_id, barbershop_id, payment_amount, transaction_id, payment_intent_id }) {
  try {
    // Get barber's financial arrangement
    const { data: arrangement, error: arrangementError } = await supabase
      .from('financial_arrangements')
      .select('*')
      .eq('barber_id', barber_id)
      .eq('barbershop_id', barbershop_id)
      .eq('status', 'active')
      .single()

    if (arrangementError) {
      console.log('❌ No active financial arrangement found for barber, using default commission')
      // Use default 40% commission if no arrangement found
      await recordCommission({
        barber_id,
        barbershop_id,
        payment_amount,
        commission_percentage: 40.0,
        commission_amount: payment_amount * 0.40,
        shop_amount: payment_amount * 0.60,
        arrangement_type: 'commission',
        payment_intent_id,
        arrangement_id: null
      })
      return
    }

    let commission_amount = 0
    let shop_amount = 0
    let commission_percentage = 0

    // Calculate commission based on arrangement type
    switch (arrangement.arrangement_type) {
      case 'commission':
        commission_percentage = arrangement.commission_percentage || 40.0
        commission_amount = payment_amount * (commission_percentage / 100)
        shop_amount = payment_amount - commission_amount
        break

      case 'booth_rent':
        // For booth rent, barber gets everything minus the rent (rent is handled separately)
        commission_percentage = 100.0
        commission_amount = payment_amount
        shop_amount = 0
        break

      case 'hybrid':
        // Hybrid: Base rent + commission on revenue over threshold
        const monthly_revenue = await getBarberMonthlyRevenue(barber_id, barbershop_id)
        if (monthly_revenue > (arrangement.hybrid_revenue_threshold || 3000)) {
          commission_percentage = arrangement.hybrid_commission_rate || 20.0
          commission_amount = payment_amount * (commission_percentage / 100)
          shop_amount = payment_amount - commission_amount
        } else {
          // Below threshold, barber gets everything (rent covers shop portion)
          commission_percentage = 100.0
          commission_amount = payment_amount
          shop_amount = 0
        }
        break

      default:
        // Default to commission split
        commission_percentage = 40.0
        commission_amount = payment_amount * 0.40
        shop_amount = payment_amount * 0.60
    }

    // Record the commission transaction
    await recordCommission({
      barber_id,
      barbershop_id,
      payment_amount,
      commission_percentage,
      commission_amount,
      shop_amount,
      arrangement_type: arrangement.arrangement_type,
      payment_intent_id,
      arrangement_id: arrangement.id
    })

  } catch (error) {
    console.error('❌ Error calculating commission:', error)
  }
}

// Helper function to record commission transaction
async function recordCommission({ barber_id, barbershop_id, payment_amount, commission_percentage, commission_amount, shop_amount, arrangement_type, payment_intent_id, arrangement_id }) {
  try {
    // Insert commission transaction
    const { error: commissionError } = await supabase
      .from('commission_transactions')
      .insert({
        payment_intent_id,
        arrangement_id,
        barber_id,
        barbershop_id,
        payment_amount,
        commission_amount,
        shop_amount,
        commission_percentage,
        arrangement_type,
        status: 'pending_payout',
        created_at: new Date().toISOString()
      })

    if (commissionError) {
      console.error('❌ Error recording commission transaction:', commissionError)
      return
    }

    // Update barber's commission balance
    const { data: existingBalance } = await supabase
      .from('barber_commission_balances')
      .select('*')
      .eq('barber_id', barber_id)
      .eq('barbershop_id', barbershop_id)
      .single()

    if (existingBalance) {
      // Update existing balance
      const { error: balanceError } = await supabase
        .from('barber_commission_balances')
        .update({
          pending_amount: parseFloat(existingBalance.pending_amount) + commission_amount,
          total_earned: parseFloat(existingBalance.total_earned) + commission_amount,
          last_transaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingBalance.id)

      if (balanceError) {
        console.error('❌ Error updating commission balance:', balanceError)
      }
    } else {
      // Create new balance record
      const { error: newBalanceError } = await supabase
        .from('barber_commission_balances')
        .insert({
          barber_id,
          barbershop_id,
          pending_amount: commission_amount,
          paid_amount: 0,
          total_earned: commission_amount,
          last_transaction_at: new Date().toISOString()
        })

      if (newBalanceError) {
        console.error('❌ Error creating commission balance:', newBalanceError)
      }
    }

    console.log(`✅ Commission calculated: $${commission_amount} (${commission_percentage}%) for barber ${barber_id}`)
  } catch (error) {
    console.error('❌ Error in recordCommission:', error)
  }
}

// Helper function to get barber's monthly revenue
async function getBarberMonthlyRevenue(barber_id, barbershop_id) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: transactions } = await supabase
    .from('commission_transactions')
    .select('payment_amount')
    .eq('barber_id', barber_id)
    .eq('barbershop_id', barbershop_id)
    .gte('created_at', startOfMonth.toISOString())

  return transactions?.reduce((total, t) => total + parseFloat(t.payment_amount), 0) || 0
}

export async function POST(request) {
  try {
    const { items, appointment_id, payment_total, payment_method, barber_id } = await request.json()
    
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      )
    }

    // Validate barber_id is provided for commission tracking
    if (!barber_id) {
      return NextResponse.json(
        { error: 'Barber ID is required for commission tracking' },
        { status: 400 }
      )
    }

    // Validate barber exists and is active staff
    const { data: barber, error: barberError } = await supabase
      .from('barbershop_staff')
      .select('user_id, role, is_active')
      .eq('user_id', barber_id)
      .eq('is_active', true)
      .single()

    if (barberError || !barber) {
      return NextResponse.json(
        { error: 'Invalid barber ID - barber not found or inactive' },
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
        barber_id: barber_id,
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

    // Calculate and record commission if transaction was successful
    if (transaction && !saleError) {
      await calculateAndRecordCommission({
        barber_id,
        barbershop_id: barbershopId,
        payment_amount: payment_total || totalSaleValue,
        transaction_id: transaction.id,
        payment_intent_id: transaction.id // Using transaction ID as payment intent for now
      })
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