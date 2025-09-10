import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '../../../../lib/supabase/server'

// Safe Stripe initialization - only initialize when needed at runtime
const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
    return null
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
  })
}

// Business logic constants
const DEPOSIT_PERCENTAGE = 0.25 // 25% deposit for new clients
const COMMISSION_RATES = {
  barber: 0.60,    // 60% to barber
  shop: 0.35,      // 35% to shop
  platform: 0.05   // 5% platform fee
}

// Payment type configurations
const PAYMENT_CONFIGS = {
  deposit: {
    capture_method: 'manual', // Capture later when service is completed
    description_suffix: 'Deposit'
  },
  full_payment: {
    capture_method: 'automatic',
    description_suffix: 'Payment'
  },
  subscription: {
    capture_method: 'automatic',
    description_suffix: 'VIP Membership'
  }
}

export async function POST(request) {
  try {
    const { 
      booking_id, 
      customer_id, 
      barber_id, 
      service_id, 
      payment_type = 'full_payment',
      amount,
      shop_id,
      customer_email,
      customer_name,
      save_payment_method = false,
      automatic_confirmation = true
    } = await request.json()

    // Enhanced validation
    if (!booking_id || !service_id || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: booking_id, service_id, amount'
      }, { status: 400 })
    }

    if (!['deposit', 'full_payment', 'subscription'].includes(payment_type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment_type. Must be: deposit, full_payment, or subscription'
      }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient()
    
    // Get service information for enhanced payment details
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select(`
        id,
        name,
        price,
        duration_minutes,
        category,
        barbershop_id,
        barbershops(
          id,
          name,
          owner_id
        )
      `)
      .eq('id', service_id)
      .single()

    if (serviceError || !serviceData) {
      return NextResponse.json({
        success: false,
        error: 'Service not found or invalid service_id'
      }, { status: 404 })
    }

    // Get barber information if provided
    let barberData = null
    if (barber_id) {
      const { data: barber, error: barberError } = await supabase
        .from('users')
        .select('id, name, email, stripe_account_id')
        .eq('id', barber_id)
        .single()
      
      if (!barberError && barber) {
        barberData = barber
      }
    }

    // Calculate payment amounts
    const servicePrice = parseFloat(serviceData.price)
    const finalAmount = payment_type === 'deposit' ? 
      Math.round(servicePrice * DEPOSIT_PERCENTAGE * 100) : // Convert to cents
      Math.round(amount * 100) // Use provided amount in cents

    // Calculate commission splits for metadata
    const commissionData = {
      barber_amount: Math.round(finalAmount * COMMISSION_RATES.barber),
      shop_amount: Math.round(finalAmount * COMMISSION_RATES.shop),
      platform_fee: Math.round(finalAmount * COMMISSION_RATES.platform),
      total_amount: finalAmount
    }

    // Enhanced service information
    const serviceInfo = {
      id: serviceData.id,
      name: serviceData.name,
      category: serviceData.category,
      duration_minutes: serviceData.duration_minutes,
      price: serviceData.price,
      shop_name: serviceData.barbershops?.name,
      payment_amount: finalAmount / 100, // Convert back to dollars for display
      is_deposit: payment_type === 'deposit'
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

    // Get payment configuration
    const paymentConfig = PAYMENT_CONFIGS[payment_type]
    
    // Create comprehensive payment intent
    const paymentIntentData = {
      amount: finalAmount,
      currency: 'usd',
      capture_method: paymentConfig.capture_method,
      confirmation_method: automatic_confirmation ? 'automatic' : 'manual',
      
      // Enhanced metadata for business logic
      metadata: {
        booking_id,
        customer_id: customer_id || 'guest',
        barber_id: barber_id || '',
        service_id,
        shop_id: shop_id || serviceData.barbershop_id,
        payment_type,
        service_name: serviceData.name,
        service_price: serviceData.price.toString(),
        barber_name: barberData?.name || '',
        commission_barber: commissionData.barber_amount.toString(),
        commission_shop: commissionData.shop_amount.toString(),
        platform_fee: commissionData.platform_fee.toString(),
        shop_name: serviceData.barbershops?.name || ''
      },
      
      description: `${serviceData.name} ${paymentConfig.description_suffix} - ${serviceData.barbershops?.name || 'Barbershop'}`,
      
      // Enhanced payment methods
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' // Keep in-app experience
      },
      
      // Customer information
      receipt_email: customer_email || undefined,
      
      // Save payment method for future use if requested
      setup_future_usage: save_payment_method ? 'on_session' : undefined
    }
    
    // Add transfer data for connected accounts (barber payouts)
    if (barberData?.stripe_account_id && payment_type !== 'deposit') {
      paymentIntentData.transfer_data = {
        destination: barberData.stripe_account_id,
        amount: commissionData.barber_amount
      }
    }
    
    // Create the payment intent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)

    // Store payment intent in database with comprehensive tracking
    try {
      const { error: paymentInsertError } = await supabase
        .from('payments')
        .insert({
          stripe_payment_intent_id: paymentIntent.id,
          booking_id,
          customer_id: customer_id || null,
          barber_id: barber_id || null,
          service_id,
          shop_id: shop_id || serviceData.barbershop_id,
          amount: finalAmount, // Store in cents
          currency: 'usd',
          payment_type,
          status: 'pending',
          service_name: serviceData.name,
          customer_name: customer_name || null,
          customer_email: customer_email || null,
          barber_name: barberData?.name || null,
          commission_barber: commissionData.barber_amount,
          commission_shop: commissionData.shop_amount,
          platform_fee: commissionData.platform_fee,
          metadata: {
            stripe_metadata: paymentIntent.metadata,
            service_info: serviceInfo,
            commission_breakdown: commissionData
          },
          transaction_date: new Date().toISOString()
        })
      
      if (paymentInsertError) {
        console.error('Failed to store payment record:', paymentInsertError)
        // Continue - payment processing can work without DB record
      }
      
      // Update booking status if booking exists
      if (booking_id) {
        await supabase
          .from('appointments')
          .update({ 
            payment_status: 'pending',
            stripe_payment_intent_id: paymentIntent.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', booking_id)
      }
      
    } catch (dbError) {
      console.warn('Database operations failed:', dbError.message)
      // Continue - Stripe integration works without DB
    }

    // Return comprehensive payment information
    return NextResponse.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_cents: finalAmount,
      amount_dollars: finalAmount / 100,
      payment_type,
      capture_method: paymentConfig.capture_method,
      service_info: serviceInfo,
      commission_breakdown: {
        barber_amount: commissionData.barber_amount / 100,
        shop_amount: commissionData.shop_amount / 100,
        platform_fee: commissionData.platform_fee / 100
      },
      metadata: paymentIntent.metadata,
      requires_capture: paymentConfig.capture_method === 'manual',
      setup_future_usage: save_payment_method,
      webhook_enabled: !!process.env.STRIPE_WEBHOOK_SECRET,
      // Additional fields for frontend handling
      shop_settings: {
        accepts_deposits: payment_type === 'deposit',
        capture_method: paymentConfig.capture_method,
        commission_rates: COMMISSION_RATES
      }
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    
    // Enhanced error handling with specific error types
    let errorMessage = 'Internal server error'
    let statusCode = 500
    
    if (error.type === 'StripeCardError') {
      errorMessage = 'Your card was declined. Please try a different payment method.'
      statusCode = 402
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid payment information. Please check your details and try again.'
      statusCode = 400
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Payment processing is temporarily unavailable. Please try again later.'
      statusCode = 503
    } else if (error.type === 'StripeConnectionError') {
      errorMessage = 'Network error. Please check your connection and try again.'
      statusCode = 503
    }
    
    // Log detailed error for debugging
    console.error('Detailed payment error:', {
      type: error.type,
      code: error.code,
      message: error.message,
      param: error.param,
      stack: error.stack
    })
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      error_type: error.type || 'unknown',
      error_code: error.code || null
    }, { status: statusCode })
  }
}