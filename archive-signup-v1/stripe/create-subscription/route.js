import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

// Force Node.js runtime to support Supabase and Stripe dependencies
export const runtime = 'nodejs'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  BASIC: {
    name: "Basic Barbershop",
    price: 2900, // $29.00
    interval: 'month',
    limits: {
      bookings_per_month: 500,
      ai_chats_per_month: 1000,
      staff_accounts: 5,
      locations: 1
    }
  },
  PROFESSIONAL: {
    name: "Professional",
    price: 4900, // $49.00
    interval: 'month',
    limits: {
      bookings_per_month: 2000,
      ai_chats_per_month: 5000,
      staff_accounts: 15,
      locations: 3
    }
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 9900, // $99.00
    interval: 'month',
    limits: {
      bookings_per_month: -1, // unlimited
      ai_chats_per_month: -1, // unlimited
      staff_accounts: -1,     // unlimited
      locations: -1          // unlimited
    }
  }
}

export async function POST(request) {
  try {
    const { planId, customerId, trialDays = 14 } = await request.json()
    
    if (!planId || !customerId) {
      return NextResponse.json(
        { error: 'Plan ID and Customer ID are required' },
        { status: 400 }
      )
    }

    if (!SUBSCRIPTION_PLANS[planId]) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify customer belongs to user
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.stripe_customer_id !== customerId) {
      return NextResponse.json(
        { error: 'Customer does not belong to user' },
        { status: 403 }
      )
    }

    // Check if user already has an active subscription
    if (profile.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      )
    }

    const plan = SUBSCRIPTION_PLANS[planId]

    // Create or get Stripe price
    let priceId
    try {
      // First, try to find existing price
      const prices = await stripe.prices.list({
        lookup_keys: [`${planId.toLowerCase()}_monthly`],
        limit: 1
      })

      if (prices.data.length > 0) {
        priceId = prices.data[0].id
      } else {
        // Create new price
        const price = await stripe.prices.create({
          unit_amount: plan.price,
          currency: 'usd',
          recurring: { interval: plan.interval },
          product_data: {
            name: plan.name,
            description: `6FB AI Agent System - ${plan.name} Plan`
          },
          lookup_key: `${planId.toLowerCase()}_monthly`,
          metadata: {
            plan_id: planId,
            limits: JSON.stringify(plan.limits)
          }
        })
        priceId = price.id
      }
    } catch (priceError) {
      console.error('Error creating/finding price:', priceError)
      return NextResponse.json(
        { error: 'Failed to setup pricing' },
        { status: 500 }
      )
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: trialDays,
      metadata: {
        user_id: user.id,
        plan_id: planId
      }
    })

    // Update user profile
    await supabase
      .from('profiles')
      .update({
        subscription_status: subscription.status,
        subscription_plan: planId,
        subscription_id: subscription.id,
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Log subscription creation
    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'subscription_created',
      p_details: { 
        subscription_id: subscription.id,
        plan_id: planId,
        trial_days: trialDays
      }
    })

    // Create initial usage tracking record
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: user.id,
        resource_type: 'subscription_created',
        count: 1,
        period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        period_end: new Date(subscription.current_period_end * 1000).toISOString()
      })

    const response = {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end,
        plan: {
          id: planId,
          name: plan.name,
          price: plan.price,
          limits: plan.limits
        }
      },
      client_secret: null,
      requires_payment: false
    }

    // If subscription requires payment, include client secret
    if (subscription.latest_invoice?.payment_intent) {
      response.client_secret = subscription.latest_invoice.payment_intent.client_secret
      response.requires_payment = subscription.latest_invoice.payment_intent.status === 'requires_payment_method'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Stripe subscription creation error:', error)
    
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve available plans
export async function GET() {
  try {
    return NextResponse.json({
      plans: Object.entries(SUBSCRIPTION_PLANS).map(([id, plan]) => ({
        id,
        name: plan.name,
        price: plan.price,
        interval: plan.interval,
        limits: plan.limits,
        features: [
          `${plan.limits.bookings_per_month === -1 ? 'Unlimited' : plan.limits.bookings_per_month} bookings per month`,
          `${plan.limits.ai_chats_per_month === -1 ? 'Unlimited' : plan.limits.ai_chats_per_month} AI interactions`,
          `${plan.limits.staff_accounts === -1 ? 'Unlimited' : plan.limits.staff_accounts} staff accounts`,
          `${plan.limits.locations === -1 ? 'Unlimited' : plan.limits.locations} location${plan.limits.locations !== 1 ? 's' : ''}`
        ]
      }))
    })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}