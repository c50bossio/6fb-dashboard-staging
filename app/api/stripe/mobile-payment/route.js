import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/stripe/mobile-payment
 * Process mobile payment using Stripe Terminal
 */
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sessionId, amount, readerId, paymentMethodId } = body

    // Get mobile payment session
    const { data: session, error: sessionError } = await supabase
      .from('mobile_payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 404 }
      )
    }

    // Verify barber owns this session
    if (session.barber_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - not your session' },
        { status: 403 }
      )
    }

    // Get barber's Stripe account
    const { data: barberSettings } = await supabase
      .from('barber_payment_settings')
      .select('stripe_account_id')
      .eq('barber_id', user.id)
      .single()

    const stripeAccountId = barberSettings?.stripe_account_id

    let paymentResult

    if (readerId) {
      // Process via Stripe Terminal Reader
      try {
        // Create Payment Intent for Terminal
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          payment_method_types: ['card_present'],
          capture_method: 'automatic',
          metadata: {
            mobile_session_id: sessionId,
            barber_id: user.id,
            service_location: session.service_location_type
          }
        }, {
          stripeAccount: stripeAccountId // If using Connect account
        })

        // Process payment with Terminal reader
        const terminalPayment = await stripe.terminal.readers.processPaymentIntent(
          readerId,
          {
            payment_intent: paymentIntent.id
          },
          {
            stripeAccount: stripeAccountId
          }
        )

        paymentResult = {
          paymentIntentId: paymentIntent.id,
          status: terminalPayment.action?.status || 'processing',
          chargeId: paymentIntent.latest_charge
        }

      } catch (terminalError) {
        console.error('Terminal payment error:', terminalError)
        return NextResponse.json(
          { error: 'Terminal payment failed: ' + terminalError.message },
          { status: 400 }
        )
      }

    } else if (paymentMethodId) {
      // Process with existing payment method (online backup)
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'usd',
          payment_method: paymentMethodId,
          confirm: true,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/mobile-payment-complete`,
          metadata: {
            mobile_session_id: sessionId,
            barber_id: user.id,
            service_location: session.service_location_type
          }
        }, {
          stripeAccount: stripeAccountId
        })

        paymentResult = {
          paymentIntentId: paymentIntent.id,
          status: paymentIntent.status,
          chargeId: paymentIntent.latest_charge
        }

      } catch (paymentError) {
        console.error('Payment method error:', paymentError)
        return NextResponse.json(
          { error: 'Payment failed: ' + paymentError.message },
          { status: 400 }
        )
      }

    } else {
      return NextResponse.json(
        { error: 'Either readerId or paymentMethodId is required' },
        { status: 400 }
      )
    }

    // Record payment in audit table
    await supabase
      .from('payment_routing_audit')
      .insert({
        appointment_id: session.appointment_id,
        barbershop_id: session.barbershop_id || null,
        barber_id: session.barber_id,
        routed_to: 'barber',
        routing_reason: 'Mobile payment - direct to barber account',
        is_mobile_service: true,
        service_location: session.service_address,
        amount: session.base_amount,
        mobile_fee: session.mobile_service_fee,
        platform_fee: session.total_amount * 0.025, // 2.5% platform fee
        stripe_charge_id: paymentResult.chargeId,
        stripe_account_used: stripeAccountId
      })

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentResult.paymentIntentId,
      chargeId: paymentResult.chargeId,
      status: paymentResult.status,
      message: 'Payment processed successfully'
    })

  } catch (error) {
    console.error('Mobile payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Payment processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/stripe/mobile-payment?sessionId=xxx
 * Get mobile payment session status
 */
export async function GET(request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get session status
    const { data: session, error: sessionError } = await supabase
      .from('mobile_payment_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('barber_id', user.id) // Ensure barber can only see their sessions
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.session_status,
        amount: session.total_amount,
        service_location: session.service_location_type,
        service_address: session.service_address,
        scheduled_at: session.scheduled_at,
        payment_collected_at: session.payment_collected_at
      }
    })

  } catch (error) {
    console.error('Get mobile payment session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get session' },
      { status: 500 }
    )
  }
}