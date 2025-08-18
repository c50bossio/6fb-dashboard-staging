import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

export async function POST(request) {
  try {
    const { bookingData, shopSettings, customerInfo } = await request.json()
    
    // Validate required data
    if (!bookingData || !shopSettings || !customerInfo) {
      return NextResponse.json(
        { error: 'Missing required booking, shop, or customer data' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get shop's Stripe Connect account
    const { data: shop } = await supabase
      .from('barbershops')
      .select(`
        *,
        stripe_connected_accounts (
          stripe_account_id,
          onboarding_completed,
          charges_enabled
        )
      `)
      .eq('id', bookingData.shopId)
      .single()

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Check if shop has Stripe Connect setup
    const stripeAccount = shop.stripe_connected_accounts?.[0]
    if (!stripeAccount?.onboarding_completed || !stripeAccount?.charges_enabled) {
      return NextResponse.json(
        { error: 'Shop payment processing not enabled' },
        { status: 400 }
      )
    }

    // Calculate payment amounts
    const totalAmount = parseFloat(bookingData.price) || 0
    const depositAmount = shopSettings.depositRequired 
      ? (shopSettings.depositPercentage 
          ? totalAmount * (shopSettings.depositPercentage / 100)
          : parseFloat(shopSettings.depositAmount) || 0)
      : 0
    
    const paymentAmount = shopSettings.depositRequired ? depositAmount : totalAmount
    const amountInCents = Math.round(paymentAmount * 100)

    // Calculate application fee (platform fee)
    const applicationFeePercent = 0.029 // 2.9% platform fee
    const applicationFeeAmount = Math.round(amountInCents * applicationFeePercent)

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      application_fee_amount: applicationFeeAmount,
      payment_method_types: ['card'],
      metadata: {
        booking_id: bookingData.id || 'pending',
        shop_id: bookingData.shopId,
        service_id: bookingData.serviceId,
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        total_amount: totalAmount.toString(),
        payment_amount: paymentAmount.toString(),
        is_deposit: shopSettings.depositRequired ? 'true' : 'false',
        remaining_amount: (totalAmount - paymentAmount).toString()
      }
    }, {
      stripeAccount: stripeAccount.stripe_account_id
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentAmount,
      currency: 'usd'
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: 'Your card was declined. Please try a different payment method.' },
        { status: 400 }
      )
    }
    
    if (error.type === 'StripeRateLimitError') {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a moment.' },
        { status: 429 }
      )
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid payment request. Please check your information.' },
        { status: 400 }
      )
    }
    
    if (error.type === 'StripeAPIError') {
      return NextResponse.json(
        { error: 'Payment processing temporarily unavailable. Please try again.' },
        { status: 503 }
      )
    }
    
    if (error.type === 'StripeConnectionError') {
      return NextResponse.json(
        { error: 'Network error. Please check your connection and try again.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Payment processing failed. Please try again.' },
      { status: 500 }
    )
  }
}