import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Safe Stripe initialization - only initialize when needed at runtime
const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
    return null
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
  })
}

export async function POST(request) {
  try {
    const { booking_id, customer_id, barber_id, service_id, payment_type, amount } = await request.json()

    // Validate required parameters
    if (!booking_id || !service_id || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: booking_id, service_id, amount'
      }, { status: 400 })
    }

    // Get service information to set payment details
    const serviceInfo = {
      id: service_id,
      name: 'Barbershop Service',
      price: amount
    }

    // Get Stripe instance
    const stripe = getStripeInstance()
    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Stripe not configured - add STRIPE_SECRET_KEY to environment variables',
        mock_response: {
          payment_intent_id: 'pi_mock_' + Date.now(),
          client_secret: 'pi_mock_' + Date.now() + '_secret_mock',
          amount: amount,
          currency: 'usd',
          status: 'requires_payment_method',
          note: 'This is a mock response - configure Stripe for real payments'
        }
      }, { status: 200 })
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        booking_id,
        customer_id: customer_id || 'guest',
        barber_id: barber_id || 'staff',
        service_id,
        payment_type: payment_type || 'full_payment'
      },
      description: `Payment for ${serviceInfo.name}`,
      automatic_payment_methods: {
        enabled: true
      }
    })

    // Store payment intent in database (optional - payment works without DB)
    try {
      // For now, just log the payment intent info
      // Future: Store in database when Supabase client is properly configured
      console.log('Payment intent created:', {
        id: paymentIntent.id,
        booking_id,
        customer_id,
        amount,
        status: 'pending'
      })
    } catch (dbError) {
      console.warn('Database operation failed:', dbError.message)
      // Continue - Stripe integration works without DB
    }

    return NextResponse.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      amount: amount,
      payment_intent_id: paymentIntent.id,
      service_info: serviceInfo,
      metadata: paymentIntent.metadata
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}