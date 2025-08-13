import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
export const runtime = 'edge'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

// Initialize Supabase with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Tier mapping
const TIER_FEATURES = {
  barber: {
    name: 'Individual Barber',
    staff_limit: 1,
    sms_credits: 500,
    email_credits: 1000,
    ai_tokens: 5000
  },
  shop: {
    name: 'Barbershop',
    staff_limit: 15,
    sms_credits: 2000,
    email_credits: 5000,
    ai_tokens: 20000
  },
  enterprise: {
    name: 'Multi-Location Enterprise',
    staff_limit: 999999,
    sms_credits: 10000,
    email_credits: 25000,
    ai_tokens: 100000
  }
}

export async function POST(request) {
  try {
    const { sessionId, userId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer']
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 404 }
      )
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Get subscription details
    const subscription = session.subscription
    const customer = session.customer
    const tier = session.metadata.subscription_tier
    const billingPeriod = session.metadata.billing_period

    if (!subscription || !tier) {
      return NextResponse.json(
        { error: 'Subscription details not found' },
        { status: 400 }
      )
    }

    // Get the user ID from metadata or parameter
    const supabaseUserId = session.metadata.supabase_user_id || userId

    if (!supabaseUserId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 400 }
      )
    }

    // Get tier features
    const tierFeatures = TIER_FEATURES[tier]

    // Update user record with subscription details
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_price_id: subscription.items.data[0].price.id,
        payment_method_last4: customer.invoice_settings?.default_payment_method?.card?.last4,
        payment_method_brand: customer.invoice_settings?.default_payment_method?.card?.brand,
        // Set credit limits based on tier
        sms_credits_included: tierFeatures.sms_credits,
        email_credits_included: tierFeatures.email_credits,
        ai_tokens_included: tierFeatures.ai_tokens,
        staff_limit: tierFeatures.staff_limit,
        // Reset usage counters for new billing period
        sms_credits_used: 0,
        email_credits_used: 0,
        ai_tokens_used: 0
      })
      .eq('id', supabaseUserId)

    if (updateError) {
      console.error('Error updating user subscription:', updateError)
      // Don't fail the verification if update fails - webhook will retry
    }

    // Create subscription history record
    const { error: historyError } = await supabase
      .from('subscription_history')
      .insert({
        user_id: supabaseUserId,
        subscription_tier: tier,
        stripe_subscription_id: subscription.id,
        stripe_invoice_id: session.invoice,
        amount: session.amount_total,
        currency: session.currency.toUpperCase(),
        status: 'active',
        billing_period: billingPeriod,
        period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        metadata: {
          session_id: sessionId,
          customer_email: customer.email,
          payment_method: session.payment_method_types[0]
        }
      })

    if (historyError) {
      console.error('Error creating subscription history:', historyError)
      // Don't fail - this is for record keeping
    }

    // Prepare response data
    const responseData = {
      success: true,
      planName: tierFeatures.name,
      tier: tier,
      billingPeriod: billingPeriod === 'yearly' ? 'Yearly' : 'Monthly',
      amount: (session.amount_total / 100).toFixed(2),
      currency: session.currency.toUpperCase(),
      nextBilling: new Date(subscription.current_period_end * 1000).toLocaleDateString(),
      features: {
        staffLimit: tierFeatures.staff_limit,
        smsCredits: tierFeatures.sms_credits,
        emailCredits: tierFeatures.email_credits,
        aiTokens: tierFeatures.ai_tokens
      }
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Session verification error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid session ID or session expired' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to verify subscription. Please contact support.' },
      { status: 500 }
    )
  }
}