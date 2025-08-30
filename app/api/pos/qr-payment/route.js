import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { 
  PaymentResponseFormatters,
  formatPaymentStatusResponse,
  handlePOSError,
  createValidationErrorResponse,
  createNotFoundErrorResponse
} from '@/lib/unified-pos-response-handler'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { 
      cartItems, 
      barberbarbershopId, 
      barberId, 
      customerId, 
      expiresInMinutes = 30 
    } = await request.json()

    // Validate required fields
    if (!cartItems || !cartItems.length) {
      return NextResponse.json(
        { error: 'Cart items are required' },
        { status: 400 }
      )
    }

    if (!barberbarbershopId) {
      return NextResponse.json(
        { error: 'Barbershop ID is required' },
        { status: 400 }
      )
    }

    // Get barbershop details for Stripe Connect
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('stripe_account_id, name, address, phone')
      .eq('id', barberbarbershopId)
      .single()

    if (barbershopError || !barbershop) {
      return NextResponse.json(
        { error: 'Barbershop not found' },
        { status: 404 }
      )
    }

    if (!barbershop.stripe_account_id) {
      return NextResponse.json(
        { error: 'Barbershop Stripe account not configured' },
        { status: 400 }
      )
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const tax = cartItems.reduce((sum, item) => {
      const itemTax = (item.price * item.quantity * (item.tax_rate || 0)) / 100
      return sum + itemTax
    }, 0)
    const total = subtotal + tax

    // Convert to cents for Stripe
    const totalCents = Math.round(total * 100)

    // Create line items for Stripe
    const lineItems = await Promise.all(cartItems.map(async item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image_url ? [item.image_url] : [],
          metadata: {
            sku: item.sku || '',
            barcode: item.barcode || ''
          }
        },
        unit_amount: Math.round(item.price * 100),
        tax_behavior: 'exclusive'
      },
      quantity: item.quantity,
      tax_rates: item.tax_rate ? [await getOrCreateTaxRate(item.tax_rate)] : []
    })))

    // Calculate application fee (2.9% + 30 cents, capped at reasonable amount)
    const platformFeePercent = 2.9
    const platformFeeFixed = 30 // 30 cents in cents
    const applicationFee = Math.min(
      Math.round((totalCents * platformFeePercent / 100) + platformFeeFixed),
      Math.round(totalCents * 0.1) // Cap at 10% of total
    )

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/qr-payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/qr-payment/cancelled?session_id={CHECKOUT_SESSION_ID}`,
      expires_at: Math.floor(Date.now() / 1000) + (expiresInMinutes * 60),
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: barbershop.stripe_account_id,
        },
        metadata: {
          barberbarbershop_id: barberbarbershopId,
          barber_id: barberId || '',
          customer_id: customerId || '',
          payment_type: 'qr_code_pos',
          cart_items: JSON.stringify(cartItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })))
        }
      },
      metadata: {
        barberbarbershop_id: barberbarbershopId,
        barber_id: barberId || '',
        customer_id: customerId || '',
        payment_type: 'qr_code_pos'
      },
      custom_fields: [
        {
          key: 'phone_number',
          label: {
            type: 'text',
            custom: 'Phone Number (Optional)'
          },
          type: 'text',
          optional: true
        }
      ],
      phone_number_collection: {
        enabled: true
      }
    }, {
      stripeAccount: barbershop.stripe_account_id
    })

    // Store QR payment session in database
    const expiresAt = new Date(Date.now() + (expiresInMinutes * 60 * 1000))
    
    const { data: qrSession, error: dbError } = await supabase
      .from('qr_payment_sessions')
      .insert({
        session_id: session.id,
        barberbarbershop_id: barberbarbershopId,
        barber_id: barberId,
        customer_id: customerId,
        cart_items: cartItems,
        total_amount: total,
        subtotal: subtotal,
        tax_amount: tax,
        application_fee: applicationFee / 100, // Store in dollars
        status: 'pending',
        stripe_session_url: session.url,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error storing QR session:', dbError)
      return NextResponse.json(
        { error: 'Failed to store payment session' },
        { status: 500 }
      )
    }

    const responseData = PaymentResponseFormatters.qrPayment({
      sessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: expiresAt.toISOString(),
      totalAmount: total,
      qrSessionId: qrSession.id,
      barberbarbershop_id: barberbarbershopId,
      barber_id: barberId,
      customer_id: customerId,
      created_at: qrSession.created_at,
      status: 'pending'
    })

    return NextResponse.json(responseData)

  } catch (error) {
    const errorResponse = handlePOSError(error, {
      operation: 'qr_payment_creation',
      barberbarbershopId: barberbarbershopId
    })
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

// GET endpoint to check payment status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Get session from database
    const { data: qrSession, error: dbError } = await supabase
      .from('qr_payment_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (dbError || !qrSession) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404 }
      )
    }

    // If already processed, return cached status
    if (qrSession.status !== 'pending') {
      return NextResponse.json({
        status: qrSession.status,
        sessionId: sessionId,
        totalAmount: qrSession.total_amount,
        processedAt: qrSession.processed_at
      })
    }

    // Check if expired
    if (new Date(qrSession.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('qr_payment_sessions')
        .update({ status: 'expired', processed_at: new Date().toISOString() })
        .eq('id', qrSession.id)

      return NextResponse.json({
        status: 'expired',
        sessionId: sessionId,
        totalAmount: qrSession.total_amount
      })
    }

    // Get barbershop for Stripe account
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('stripe_account_id')
      .eq('id', qrSession.barberbarbershop_id)
      .single()

    if (!barbershop?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Stripe account not found' },
        { status: 400 }
      )
    }

    // Check Stripe session status
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      stripeAccount: barbershop.stripe_account_id
    })

    let newStatus = 'pending'
    if (session.payment_status === 'paid') {
      newStatus = 'completed'
    } else if (session.status === 'expired') {
      newStatus = 'expired'
    }

    // Update database if status changed
    if (newStatus !== 'pending') {
      await supabase
        .from('qr_payment_sessions')
        .update({ 
          status: newStatus, 
          processed_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent
        })
        .eq('id', qrSession.id)

      // If completed, create sales records
      if (newStatus === 'completed') {
        await createSalesRecords(qrSession)
      }
    }

    const statusResponse = formatPaymentStatusResponse({
      status: newStatus,
      session_id: sessionId,
      total_amount: qrSession.total_amount,
      barberbarbershop_id: qrSession.barberbarbershop_id,
      barber_id: qrSession.barber_id,
      customer_id: qrSession.customer_id,
      processed_at: newStatus !== 'pending' ? new Date().toISOString() : null,
      created_at: qrSession.created_at,
      expires_at: qrSession.expires_at,
      stripe_session_url: qrSession.stripe_session_url
    }, 'qr_code')

    return NextResponse.json(statusResponse)

  } catch (error) {
    const errorResponse = handlePOSError(error, {
      operation: 'qr_payment_status_check',
      sessionId: sessionId
    })
    return NextResponse.json(errorResponse, { status: errorResponse.statusCode })
  }
}

// Helper function to create sales records
async function createSalesRecords(qrSession) {
  try {
    const receiptNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    const salesRecords = qrSession.cart_items.map(item => ({
      barberbarbershop_id: qrSession.barberbarbershop_id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      barber_id: qrSession.barber_id,
      customer_id: qrSession.customer_id,
      payment_method: 'qr_code',
      receipt_number: receiptNumber,
      total_amount: item.price * item.quantity,
      tax_amount: (item.price * item.quantity * (item.tax_rate || 0)) / 100,
      created_at: new Date().toISOString()
    }))

    // Insert sales records
    const { error: salesError } = await supabase
      .from('pos_sales')
      .insert(salesRecords)

    if (salesError) {
      console.error('Failed to create sales records:', salesError)
    }

    // Update inventory
    for (const item of qrSession.cart_items) {
      await supabase.rpc('update_product_stock', {
        p_product_id: item.id,
        p_quantity_change: -item.quantity
      })
    }

  } catch (error) {
    console.error('Failed to create sales records:', error)
  }
}

// Helper function to get or create tax rate
async function getOrCreateTaxRate(taxRate) {
  try {
    // This is a simplified version - in production you'd want to cache tax rates
    const taxRates = await stripe.taxRates.list({ 
      limit: 100 
    })
    
    const existingRate = taxRates.data.find(rate => 
      rate.percentage === taxRate && rate.active
    )
    
    if (existingRate) {
      return existingRate.id
    }
    
    // Create new tax rate
    const newRate = await stripe.taxRates.create({
      display_name: `Tax ${taxRate}%`,
      percentage: taxRate,
      inclusive: false,
    })
    
    return newRate.id
  } catch (error) {
    console.error('Tax rate error:', error)
    return null
  }
}