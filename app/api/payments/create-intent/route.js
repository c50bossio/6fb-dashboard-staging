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

    const supabase = createClient()
    
    // Get barbershop fee settings
    let customerPaysProcessingFee = false
    if (barbershop_id) {
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('customer_pays_processing_fee')
        .eq('id', barbershop_id)
        .single()
      
      customerPaysProcessingFee = barbershop?.customer_pays_processing_fee || false
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

    // Get financial arrangement for commission calculation
    let arrangementData = null
    if (barber_id && (barbershop_id || (barber_id && typeof barber_id === 'string'))) {
      const shopId = barbershop_id || (await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('id', barber_id)
        .single())?.data?.barbershop_id

      if (shopId) {
        const { data: arrangement } = await supabase
          .from('financial_arrangements')
          .select('*')
          .eq('barbershop_id', shopId)
          .eq('barber_id', barber_id)
          .eq('is_active', true)
          .single()
        
        if (arrangement) {
          arrangementData = arrangement
        }
      }
    }

    // Calculate fees based on barbershop settings
    let finalAmount = amount
    let processingFee = 0
    let barbershopReceives = amount
    
    if (customerPaysProcessingFee) {
      // Customer pays the Stripe fee (2.9% + $0.30)
      processingFee = Math.round((amount * 0.029 + 0.30) * 100) / 100
      finalAmount = amount + processingFee
      barbershopReceives = amount // Barbershop gets full service amount
    } else {
      // Barbershop absorbs the fee (default)
      processingFee = Math.round((amount * 0.029 + 0.30) * 100) / 100
      barbershopReceives = amount - processingFee
    }

    // Create payment intent with proper routing and commission metadata
    const paymentIntentParams = {
      amount: Math.round(finalAmount * 100), // Convert to cents (with fee if applicable)
      currency: 'usd',
      metadata: {
        booking_id,
        customer_id: customer_id || 'guest',
        barber_id: barber_id || 'staff',
        barbershop_id: barbershop_id || '',
        service_id,
        payment_type: payment_type || 'full_payment',
        // Fee information
        service_amount: amount,
        processing_fee: processingFee,
        fee_paid_by: customerPaysProcessingFee ? 'customer' : 'barbershop',
        barbershop_receives: barbershopReceives,
        // Add arrangement data for commission processing
        arrangement_id: arrangementData?.id || '',
        arrangement_type: arrangementData?.type || '',
        commission_percentage: arrangementData?.commission_percentage || '',
        product_commission_percentage: arrangementData?.product_commission_percentage || ''
      },
      description: `Payment for ${serviceInfo.name}`,
      automatic_payment_methods: {
        enabled: true
      }
    }

    // If barbershop has a Connect account, route the payment to them
    if (stripeConnectAccountId) {
      // Simple pass-through model - no platform markup
      paymentIntentParams.application_fee_amount = 0 // No platform fee
      paymentIntentParams.transfer_data = {
        destination: stripeConnectAccountId
      }
    } else {
      // No Connect account - payment goes to platform (for now)
      console.warn('No Connect account found - payment will go to platform account')
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    try {
      // Store payment intent in database
      await supabase
        .from('payment_intents')
        .insert({
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
      amount: finalAmount, // Total amount customer pays
      service_amount: amount, // Original service amount
      processing_fee: processingFee, // Fee amount
      payment_intent_id: paymentIntent.id,
      service_info: serviceInfo,
      metadata: paymentIntent.metadata,
      fee_configuration: {
        model: customerPaysProcessingFee ? 'customer_pays' : 'barbershop_absorbs',
        customer_pays_total: finalAmount,
        barbershop_receives: barbershopReceives,
        processing_fee: processingFee,
        stripe_rate: '2.9% + $0.30'
      },
      routing: {
        destination: stripeConnectAccountId || 'platform',
        barbershop_receives: barbershopReceives.toFixed(2),
        stripe_fee: processingFee.toFixed(2),
        fee_paid_by: customerPaysProcessingFee ? 'customer' : 'barbershop'
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