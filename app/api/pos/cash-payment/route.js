import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST: Record cash payment and update inventory
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      barbershopId,
      barberId,
      customerId,
      cartItems,
      subtotal,
      totalAmount,
      amountReceived,
      change
    } = body

    // Validate required fields
    if (!barbershopId || !cartItems || cartItems.length === 0 || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: barbershopId, cartItems, totalAmount' },
        { status: 400 }
      )
    }

    // Verify access to barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, role')
      .eq('id', user.id)
      .single()

    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, owner_id, name')
      .eq('id', barbershopId)
      .single()

    // Allow access if:
    // 1. User's profile is associated with this barbershop
    // 2. User is the owner of this barbershop
    // 3. User has admin/owner privileges
    // 4. User is a BARBER (needs POS access)
    const allowedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'BARBER']
    const hasAccess = profile?.barbershop_id === barbershopId ||
                     barbershop?.owner_id === user.id ||
                     allowedRoles.includes(profile?.role)

    if (!hasAccess) {
      console.error('Access denied - Profile:', profile, 'Barbershop:', barbershop)
      return NextResponse.json(
        { error: 'Access denied to this barbershop' },
        { status: 403 }
      )
    }

    // Generate receipt number
    const receiptNumber = `CASH-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Record each item as a sale
    const salesPromises = cartItems.map(item =>
      supabase.from('pos_sales').insert({
        barbershop_id: barbershopId,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        barber_id: barberId,
        customer_id: customerId,
        payment_method: 'cash',
        receipt_number: receiptNumber,
        metadata: {
          subtotal,
          total_amount: totalAmount,
          amount_received: amountReceived,
          change,
          cash_payment: true
        }
      })
    )

    await Promise.all(salesPromises)

    // Update product inventory
    const inventoryPromises = cartItems.map(item =>
      supabase.rpc('decrement_product_stock', {
        product_id: item.id,
        quantity_sold: item.quantity
      }).then(() =>
        // Record inventory movement
        supabase.from('inventory_movements').insert({
          barbershop_id: barbershopId,
          product_id: item.id,
          movement_type: 'sale',
          quantity: -item.quantity, // Negative for sale
          unit_price: item.price,
          reference_type: 'cash_sale',
          reference_id: receiptNumber,
          notes: `Cash sale - Receipt: ${receiptNumber}`
        })
      )
    )

    await Promise.all(inventoryPromises)

    return NextResponse.json({
      success: true,
      receipt_number: receiptNumber,
      subtotal,
      total_amount: totalAmount,
      amount_received: amountReceived,
      change,
      items_sold: cartItems.length,
      message: 'Cash payment recorded successfully'
    })

  } catch (error) {
    console.error('Cash payment error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process cash payment',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
