import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

// Initialize Supabase with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Pricing configuration (matches pricing page)
const PRICING_CONFIG = {
  barber: {
    name: 'Individual Barber',
    monthly: {
      price: 3500, // $35 in cents
      priceId: process.env.STRIPE_BARBER_PRICE_ID || 'price_barber_monthly'
    },
    yearly: {
      price: 33600, // $336 in cents (20% discount)
      priceId: process.env.STRIPE_BARBER_PRICE_ID_YEARLY || 'price_barber_yearly'
    }
  },
  shop: {
    name: 'Barbershop',
    monthly: {
      price: 9900, // $99 in cents
      priceId: process.env.STRIPE_SHOP_PRICE_ID || 'price_shop_monthly'
    },
    yearly: {
      price: 95040, // $950.40 in cents (20% discount)
      priceId: process.env.STRIPE_SHOP_PRICE_ID_YEARLY || 'price_shop_yearly'
    }
  },
  enterprise: {
    name: 'Multi-Location Enterprise',
    monthly: {
      price: 24900, // $249 in cents
      priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly'
    },
    yearly: {
      price: 239040, // $2,390.40 in cents (20% discount)
      priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID_YEARLY || 'price_enterprise_yearly'
    }
  }
}

export async function POST(request) {
  try {
    const { tierId, billingPeriod, userId, userEmail } = await request.json()

    // Validate input
    if (!tierId || !billingPeriod || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!PRICING_CONFIG[tierId]) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    let stripeCustomerId = null
    
    // Check if user already has a Stripe customer ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userData?.stripe_customer_id) {
      stripeCustomerId = userData.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: userId,
          subscription_tier: tierId
        }
      })
      
      stripeCustomerId = customer.id

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId)
    }

    // Get the appropriate price ID
    const selectedPlan = PRICING_CONFIG[tierId]
    const priceConfig = billingPeriod === 'yearly' ? selectedPlan.yearly : selectedPlan.monthly

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceConfig.priceId,
          quantity: 1,
        }
      ],
      // Set payment behavior to require immediate payment (no trial)
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          subscription_tier: tierId,
          billing_period: billingPeriod
        },
        // No trial period - immediate payment required
        trial_period_days: 0
      },
      // Payment mode configuration - require immediate payment
      payment_method_collection: 'always',
      // URLs for redirect after checkout
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/subscribe?canceled=true`,
      // Additional options
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      },
      // Metadata for webhook processing
      metadata: {
        supabase_user_id: userId,
        subscription_tier: tierId,
        billing_period: billingPeriod
      }
    })

    // Return the checkout URL
    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id
    })

  } catch (error) {
    console.error('Stripe checkout session error:', error)
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: 'Your card was declined. Please try a different payment method.' },
        { status: 400 }
      )
    } else if (error.type === 'StripeRateLimitError') {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in a moment.' },
        { status: 429 }
      )
    } else if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Invalid request. Please check your information and try again.' },
        { status: 400 }
      )
    } else if (error.type === 'StripeAPIError') {
      return NextResponse.json(
        { error: 'Payment service temporarily unavailable. Please try again later.' },
        { status: 500 }
      )
    } else if (error.type === 'StripeConnectionError') {
      return NextResponse.json(
        { error: 'Network error. Please check your connection and try again.' },
        { status: 500 }
      )
    } else if (error.type === 'StripeAuthenticationError') {
      console.error('Stripe authentication error - check API keys')
      return NextResponse.json(
        { error: 'Payment configuration error. Please contact support.' },
        { status: 500 }
      )
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'Failed to create checkout session. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve pricing information
export async function GET(request) {
  try {
    // Return pricing configuration for display purposes
    const pricingData = Object.entries(PRICING_CONFIG).map(([key, value]) => ({
      id: key,
      name: value.name,
      monthly: {
        price: value.monthly.price / 100, // Convert cents to dollars
        priceId: value.monthly.priceId
      },
      yearly: {
        price: value.yearly.price / 100, // Convert cents to dollars
        priceId: value.yearly.priceId,
        monthlyEquivalent: Math.round(value.yearly.price / 12) / 100
      }
    }))

    return NextResponse.json({
      pricing: pricingData,
      currency: 'USD',
      features: {
        barber: ['1 staff member', '500 SMS/month', '1,000 emails/month'],
        shop: ['Up to 15 barbers', '2,000 SMS/month', '5,000 emails/month'],
        enterprise: ['Unlimited barbers', '10,000 SMS/month', '25,000 emails/month']
      }
    })
  } catch (error) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing information' },
      { status: 500 }
    )
  }
}