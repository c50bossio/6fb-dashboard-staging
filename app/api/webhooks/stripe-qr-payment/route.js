import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_QR_PAYMENT

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !endpointSecret) {
      console.error('Missing Stripe signature or webhook secret')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Processing Stripe webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      
      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object)
        break
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session) {
  try {
    console.log('Processing checkout completion for session:', session.id)

    // Find the QR payment session
    const { data: qrSession, error: findError } = await supabase
      .from('qr_payment_sessions')
      .select('*')
      .eq('session_id', session.id)
      .single()

    if (findError || !qrSession) {
      console.error('QR session not found for checkout:', session.id)
      return
    }

    // Update session status
    const { error: updateError } = await supabase
      .from('qr_payment_sessions')
      .update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent,
        processed_at: new Date().toISOString()
      })
      .eq('id', qrSession.id)

    if (updateError) {
      console.error('Failed to update QR session status:', updateError)
      return
    }

    // Create sales records
    await createSalesRecords(qrSession, session)

    console.log('Successfully processed checkout completion for:', session.id)

  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

async function handleCheckoutExpired(session) {
  try {
    console.log('Processing checkout expiration for session:', session.id)

    const { error } = await supabase
      .from('qr_payment_sessions')
      .update({
        status: 'expired',
        processed_at: new Date().toISOString()
      })
      .eq('session_id', session.id)

    if (error) {
      console.error('Failed to update expired session:', error)
    } else {
      console.log('Successfully marked session as expired:', session.id)
    }

  } catch (error) {
    console.error('Error handling checkout expired:', error)
  }
}

async function handlePaymentSucceeded(paymentIntent) {
  try {
    console.log('Processing payment success for intent:', paymentIntent.id)

    // Update any QR sessions with this payment intent
    const { error } = await supabase
      .from('qr_payment_sessions')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (error) {
      console.error('Failed to update payment intent status:', error)
    }

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(paymentIntent) {
  try {
    console.log('Processing payment failure for intent:', paymentIntent.id)

    // Update any QR sessions with this payment intent
    const { error } = await supabase
      .from('qr_payment_sessions')
      .update({
        status: 'cancelled',
        processed_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (error) {
      console.error('Failed to update failed payment status:', error)
    }

  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function createSalesRecords(qrSession, stripeSession) {
  try {
    const receiptNumber = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    // Create sales records for each item
    const salesRecords = qrSession.cart_items.map(item => ({
      barbershop_id: qrSession.barbershop_id,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      barber_id: qrSession.barber_id,
      customer_id: qrSession.customer_id,
      payment_method: 'qr_code',
      receipt_number: receiptNumber,
      total_amount: item.price * item.quantity,
      tax_amount: (item.price * item.quantity * (item.tax_rate || 0)) / 100,
      stripe_payment_intent_id: stripeSession.payment_intent,
      metadata: {
        stripe_session_id: stripeSession.id,
        qr_session_id: qrSession.id,
        payment_type: 'qr_code_pos'
      },
      created_at: new Date().toISOString()
    }))

    // Insert sales records
    const { error: salesError } = await supabase
      .from('pos_sales')
      .insert(salesRecords)

    if (salesError) {
      console.error('Failed to create sales records:', salesError)
      return
    }

    console.log(`Created ${salesRecords.length} sales records for receipt: ${receiptNumber}`)

    // Update inventory for each product
    for (const item of qrSession.cart_items) {
      try {
        const { error: stockError } = await supabase.rpc('update_product_stock', {
          p_product_id: item.id,
          p_quantity_change: -item.quantity
        })

        if (stockError) {
          console.error(`Failed to update stock for product ${item.id}:`, stockError)
        }
      } catch (stockUpdateError) {
        console.error(`Stock update error for product ${item.id}:`, stockUpdateError)
      }
    }

    // Create commission records if barber is specified
    if (qrSession.barber_id) {
      await createCommissionRecords(qrSession, receiptNumber)
    }

    console.log('Successfully created all sales records and updated inventory')

  } catch (error) {
    console.error('Error creating sales records:', error)
  }
}

async function createCommissionRecords(qrSession, receiptNumber) {
  try {
    const commissionRecords = qrSession.cart_items
      .filter(item => item.commission_rate && item.commission_rate > 0)
      .map(item => {
        const itemTotal = item.price * item.quantity
        const commissionAmount = (itemTotal * item.commission_rate) / 100
        
        return {
          barber_id: qrSession.barber_id,
          barbershop_id: qrSession.barbershop_id,
          product_id: item.id,
          sale_amount: itemTotal,
          commission_rate: item.commission_rate,
          commission_amount: commissionAmount,
          receipt_number: receiptNumber,
          commission_type: 'product_sale',
          status: 'pending',
          created_at: new Date().toISOString()
        }
      })

    if (commissionRecords.length > 0) {
      const { error: commissionError } = await supabase
        .from('commissions')
        .insert(commissionRecords)

      if (commissionError) {
        console.error('Failed to create commission records:', commissionError)
      } else {
        console.log(`Created ${commissionRecords.length} commission records`)
      }
    }

  } catch (error) {
    console.error('Error creating commission records:', error)
  }
}