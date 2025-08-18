import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

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
    const { booking_id, customer_id, barber_id, service_id, payment_type, amount, barbershop_id } = await request.json()

    if (!booking_id || !service_id || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: booking_id, service_id, amount'
      }, { status: 400 })
    }

    const serviceInfo = {
      id: service_id,
      name: 'Barbershop Service',
      price: amount
    }

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

    // Look up the barbershop's Stripe Connect account
    const supabase = createClient()
    let stripeConnectAccountId = null
    
    // Try to get Connect account ID based on available information
    if (barbershop_id) {
      // If barbershop_id is provided directly
      const { data: connectAccount } = await supabase
        .from('stripe_connected_accounts')
        .select('stripe_account_id, charges_enabled, payouts_enabled')
        .eq('barbershop_id', barbershop_id)
        .single()
      
      if (connectAccount) {
        if (!connectAccount.charges_enabled) {
          return NextResponse.json({
            success: false,
            error: 'This barbershop has not completed payment setup. Please complete Stripe onboarding first.'
          }, { status: 400 })
        }
        stripeConnectAccountId = connectAccount.stripe_account_id
      }
    } else if (barber_id) {
      // If only barber_id is provided, look up their barbershop
      const { data: barber } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('id', barber_id)
        .single()
      
      if (barber?.barbershop_id) {
        const { data: connectAccount } = await supabase
          .from('stripe_connected_accounts')
          .select('stripe_account_id, charges_enabled, payouts_enabled')
          .eq('barbershop_id', barber.barbershop_id)
          .single()
        
        if (connectAccount) {
          if (!connectAccount.charges_enabled) {
            return NextResponse.json({
              success: false,
              error: 'This barbershop has not completed payment setup. Please complete Stripe onboarding first.'
            }, { status: 400 })
          }
          stripeConnectAccountId = connectAccount.stripe_account_id
        }
      }
    }

    // Create payment intent with proper routing
    const paymentIntentParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        booking_id,
        customer_id: customer_id || 'guest',
        barber_id: barber_id || 'staff',
        barbershop_id: barbershop_id || '',
        service_id,
        payment_type: payment_type || 'full_payment'
      },
      description: `Payment for ${serviceInfo.name}`,
      automatic_payment_methods: {
        enabled: true
      }
    }

    // If barbershop has a Connect account, route the payment to them
    if (stripeConnectAccountId) {
      // Zero markup - barbershop gets everything minus Stripe's fee (2.9% + $0.30)
      paymentIntentParams.application_fee_amount = 0
      paymentIntentParams.transfer_data = {
        destination: stripeConnectAccountId
      }
    } else {
      // No Connect account - payment goes to platform (for now)
      console.warn('No Connect account found - payment will go to platform account')
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    try {
        id: paymentIntent.id,
        booking_id,
        customer_id,
        amount,
        status: 'pending'
      })
    } catch (dbError) {
      console.warn('Database operation failed:', dbError.message)
    }

    return NextResponse.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      amount: amount,
      payment_intent_id: paymentIntent.id,
      service_info: serviceInfo,
      metadata: paymentIntent.metadata,
      routing: {
        destination: stripeConnectAccountId || 'platform',
        platform_fee: 0,
        barbershop_receives: stripeConnectAccountId ? 
          (amount - (amount * 0.029 + 0.30)).toFixed(2) : // Barbershop gets amount minus Stripe fee
          0,
        stripe_fee: (amount * 0.029 + 0.30).toFixed(2)
      }
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}