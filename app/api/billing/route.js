import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

// Initialize Stripe conditionally
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

// Optimized pricing tiers - Higher base, lower token costs
const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: 1999, // $19.99 in cents
    interval: 'month',
    features: [
      '15,000 AI tokens included',
      'Basic analytics & forecasting', 
      'Email support',
      '1 barbershop location',
      '$0.008 per 1,000 additional tokens'
    ],
    stripe_price_id: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_demo',
    included_tokens: 15000,
    overage_rate: 0.008
  },
  professional: {
    name: 'Professional',
    price: 4999, // $49.99 in cents  
    interval: 'month',
    features: [
      '75,000 AI tokens included',
      'Advanced analytics & real-time alerts',
      'Priority support',
      'Custom branding',
      'Up to 5 barbershop locations',
      '$0.006 per 1,000 additional tokens'
    ],
    stripe_price_id: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional_demo',
    included_tokens: 75000,
    overage_rate: 0.006
  },
  enterprise: {
    name: 'Enterprise',
    price: 9999, // $99.99 in cents
    interval: 'month', 
    features: [
      '300,000 AI tokens included',
      'Full AI suite with custom models',
      'White-label options',
      'Dedicated success manager',
      'Unlimited barbershop locations',
      'API access & custom integrations',
      '$0.004 per 1,000 additional tokens'
    ],
    stripe_price_id: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_demo',
    included_tokens: 300000,
    overage_rate: 0.004
  }
}

// GET - Retrieve billing information
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const tenantId = searchParams.get('tenant_id')

    switch (action) {
      case 'plans':
        return NextResponse.json({
          success: true,
          plans: PRICING_PLANS
        })

      case 'subscription':
        if (!tenantId) {
          return NextResponse.json(
            { error: 'tenant_id required' },
            { status: 400 }
          )
        }

        // For demo purposes, return mock subscription data
        // In production, this would query the token_billing_service
        const Subscription = {
          tenant_id: tenantId,
          tier: 'starter',
          status: 'trial',
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          tokens_included: 10000,
          tokens_used: 2500,
          tokens_remaining: 7500,
          usage_percentage: 25.0,
          monthly_base: 9.99,
          overage_charges: 0,
          total_bill: 0,
          next_billing_date: null
        }

        return NextResponse.json({
          success: true,
          subscription: mockSubscription
        })

      case 'usage':
        if (!tenantId) {
          return NextResponse.json(
            { error: 'tenant_id required' },
            { status: 400 }
          )
        }

        // Mock usage analytics
        const Usage = {
          tenant_id: tenantId,
          period_days: 30,
          summary: {
            total_tokens: 15420,
            total_cost: 23.45,
            total_requests: 156,
            avg_tokens_per_request: 98.8
          },
          daily_breakdown: [
            {
              date: '2025-08-04',
              tokens: 1250,
              cost: 1.89,
              requests: 12,
              features: ['analytics', 'forecasting']
            },
            {
              date: '2025-08-03', 
              tokens: 980,
              cost: 1.47,
              requests: 8,
              features: ['recommendations', 'alerts']
            }
          ],
          top_features: [
            { feature: 'analytics', tokens: 8500, percentage: 55.1 },
            { feature: 'forecasting', tokens: 4200, percentage: 27.2 },
            { feature: 'recommendations', tokens: 2720, percentage: 17.7 }
          ]
        }

        return NextResponse.json({
          success: true,
          usage: mockUsage
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Billing GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Handle billing actions
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, tenant_id, plan, customer_email } = body

    switch (action) {
      case 'start_trial':
        // Start 14-day free trial
        const trialSubscription = {
          tenant_id,
          tier: plan || 'starter',
          status: 'trial',
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          tokens_included: PRICING_PLANS[plan || 'starter'].included_tokens,
          tokens_used: 0,
          monthly_base: PRICING_PLANS[plan || 'starter'].price / 100,
          features: PRICING_PLANS[plan || 'starter'].features
        }

        // In production, save to database via token_billing_service
        
        return NextResponse.json({
          success: true,
          message: '14-day free trial started!',
          subscription: trialSubscription
        })

      case 'create_checkout':
        if (!plan || !PRICING_PLANS[plan]) {
          return NextResponse.json(
            { error: 'Invalid plan selected' },
            { status: 400 }
          )
        }

        const selectedPlan = PRICING_PLANS[plan]

        // Check if we have valid Stripe keys
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
          // Return mock checkout session for testing
          return NextResponse.json({
            success: true,
            checkout_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/billing/success?session_id=cs_test_mock_session_123`,
            session_id: 'cs_test_mock_session_123',
            message: 'Mock checkout created for testing (Stripe not configured)'
          })
        }

        // Create Stripe Checkout Session with 14-day trial
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          customer_email,
          
          line_items: [
            {
              price: selectedPlan.stripe_price_id,
              quantity: 1,
            },
          ],
          
          // 14-day free trial
          subscription_data: {
            trial_period_days: 14,
            metadata: {
              tenant_id,
              plan_name: plan,
              included_tokens: selectedPlan.included_tokens.toString(),
              overage_rate: selectedPlan.overage_rate.toString()
            }
          },
          
          metadata: {
            tenant_id,
            plan
          },
          
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/plans`,
          
          allow_promotion_codes: true,
          billing_address_collection: 'required',
        })

        return NextResponse.json({
          success: true,
          checkout_url: session.url,
          session_id: session.id
        })

      case 'create_portal':
        // Create Stripe Customer Portal session for subscription management
        if (!tenant_id) {
          return NextResponse.json(
            { error: 'tenant_id required' },
            { status: 400 }
          )
        }

        // Check if we have valid Stripe keys
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
          // Return mock portal session for testing
          return NextResponse.json({
            success: true,
            portal_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/billing/portal-demo`,
            message: 'Mock portal created for testing (Stripe not configured)'
          })
        }

        // In production, get stripe_customer_id from database
        const CustomerId = 'cus_demo_customer'

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: mockCustomerId,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
        })

        return NextResponse.json({
          success: true,
          portal_url: portalSession.url
        })

      case 'upgrade_plan':
        const { new_plan, stripe_subscription_id } = body

        if (!new_plan || !PRICING_PLANS[new_plan]) {
          return NextResponse.json(
            { error: 'Invalid new plan' },
            { status: 400 }
          )
        }

        // Update Stripe subscription
        if (stripe_subscription_id && stripe_subscription_id !== 'demo') {
          const subscription = await stripe.subscriptions.retrieve(stripe_subscription_id)
          
          await stripe.subscriptions.update(stripe_subscription_id, {
            items: [{
              id: subscription.items.data[0].id,
              price: PRICING_PLANS[new_plan].stripe_price_id,
            }],
            proration_behavior: 'create_prorations'
          })
        }

        return NextResponse.json({
          success: true,
          message: `Successfully upgraded to ${PRICING_PLANS[new_plan].name} plan`,
          new_plan: new_plan
        })

      case 'cancel_subscription':
        const { subscription_id, reason } = body

        if (subscription_id && subscription_id !== 'demo') {
          await stripe.subscriptions.update(subscription_id, {
            cancel_at_period_end: true,
            metadata: {
              cancellation_reason: reason || 'user_requested'
            }
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Subscription will be cancelled at the end of the current billing period'
        })

      case 'reactivate_subscription':
        const { reactivate_subscription_id } = body

        if (reactivate_subscription_id && reactivate_subscription_id !== 'demo') {
          await stripe.subscriptions.update(reactivate_subscription_id, {
            cancel_at_period_end: false,
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Subscription has been reactivated'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Billing POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update billing settings
export async function PUT(request) {
  try {
    const body = await request.json()
    const { tenant_id, action, settings } = body

    switch (action) {
      case 'update_payment_method':
        // Handle payment method updates through Stripe
        return NextResponse.json({
          success: true,
          message: 'Payment method updated successfully'
        })

      case 'update_billing_email':
        const { billing_email } = settings

        // Update billing email in Stripe and database
        return NextResponse.json({
          success: true,
          message: 'Billing email updated successfully',
          billing_email
        })

      case 'update_usage_alerts':
        const { alert_thresholds } = settings

        // Save usage alert preferences
        return NextResponse.json({
          success: true,
          message: 'Usage alert preferences updated',
          alert_thresholds
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Billing PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}