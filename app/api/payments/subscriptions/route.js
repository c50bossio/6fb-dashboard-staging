import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '../../../../lib/supabase/server'

// Safe Stripe initialization
const getStripeInstance = () => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
    return null
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20'
  })
}

// VIP Subscription Plans Configuration
const VIP_PLANS = {
  vip_basic: {
    id: 'vip_basic',
    name: 'VIP Basic',
    price: 29.99,
    interval: 'month',
    features: [
      'Priority booking',
      'No booking fees',
      '10% discount on services',
      'SMS reminders',
      'Loyalty points (2x)'
    ],
    booking_priority: 1,
    discount_percentage: 0.10,
    loyalty_multiplier: 2.0,
    cancellation_protection: true
  },
  vip_premium: {
    id: 'vip_premium',
    name: 'VIP Premium',
    price: 49.99,
    interval: 'month',
    features: [
      'All VIP Basic features',
      'Last-minute booking (2hr notice)',
      '15% discount on services',
      'Free rescheduling',
      'Loyalty points (3x)',
      'Quarterly style consultation'
    ],
    booking_priority: 2,
    discount_percentage: 0.15,
    loyalty_multiplier: 3.0,
    cancellation_protection: true,
    last_minute_booking: true,
    free_rescheduling: true
  },
  vip_platinum: {
    id: 'vip_platinum',
    name: 'VIP Platinum',
    price: 79.99,
    interval: 'month',
    features: [
      'All VIP Premium features',
      '20% discount on services',
      'Personal barber assignment',
      'Loyalty points (5x)',
      'Monthly style consultation',
      'Exclusive events access',
      'Complimentary products'
    ],
    booking_priority: 3,
    discount_percentage: 0.20,
    loyalty_multiplier: 5.0,
    cancellation_protection: true,
    last_minute_booking: true,
    free_rescheduling: true,
    personal_barber: true,
    exclusive_access: true
  }
}

// GET endpoint for subscription management
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const customer_id = searchParams.get('customer_id')
    const shop_id = searchParams.get('shop_id')
    const action = searchParams.get('action') || 'list' // list, plans, status, usage

    const supabase = createClient()

    if (action === 'plans') {
      // Return available VIP plans
      const plansWithShopPricing = await Promise.all(
        Object.values(VIP_PLANS).map(async (plan) => {
          // Get shop-specific pricing if shop_id provided
          let shopSpecificPlan = { ...plan }
          
          if (shop_id) {
            const { data: shopPricing } = await supabase
              .from('shop_vip_pricing')
              .select('*')
              .eq('shop_id', shop_id)
              .eq('plan_id', plan.id)
              .single()
            
            if (shopPricing) {
              shopSpecificPlan.price = shopPricing.custom_price || plan.price
              shopSpecificPlan.features = [...plan.features, ...(shopPricing.additional_features || [])]
            }
          }

          return shopSpecificPlan
        })
      )

      return NextResponse.json({
        success: true,
        plans: plansWithShopPricing,
        shop_id: shop_id || null
      })
    }

    if (action === 'status' && customer_id) {
      // Get customer's current subscription status
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          users (
            name,
            email,
            stripe_customer_id
          )
        `)
        .eq('customer_id', customer_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // Get usage statistics if subscription exists
      let usageStats = null
      if (subscription) {
        const { data: usage } = await supabase
          .from('vip_usage_tracking')
          .select('*')
          .eq('subscription_id', subscription.id)
          .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

        if (usage && usage.length > 0) {
          usageStats = {
            bookings_made: usage.reduce((sum, u) => sum + (u.bookings_count || 0), 0),
            discounts_used: usage.reduce((sum, u) => sum + (u.discount_amount || 0), 0),
            loyalty_points_earned: usage.reduce((sum, u) => sum + (u.loyalty_points || 0), 0),
            rescheduling_used: usage.reduce((sum, u) => sum + (u.free_reschedules || 0), 0)
          }
        }
      }

      return NextResponse.json({
        success: true,
        subscription: subscription ? {
          ...subscription,
          plan_details: VIP_PLANS[subscription.plan_id] || null
        } : null,
        usage_stats: usageStats,
        is_active: subscription?.status === 'active',
        current_period_end: subscription?.current_period_end
      })
    }

    if (action === 'list') {
      // List subscriptions (admin view)
      let subscriptionsQuery = supabase
        .from('user_subscriptions')
        .select(`
          *,
          users (
            id,
            name,
            email,
            stripe_customer_id
          )
        `)
        .order('created_at', { ascending: false })

      if (shop_id) {
        subscriptionsQuery = subscriptionsQuery.eq('shop_id', shop_id)
      }

      const { data: subscriptions, error } = await subscriptionsQuery.limit(100)

      if (error) {
        throw error
      }

      // Add plan details to each subscription
      const subscriptionsWithPlans = subscriptions.map(sub => ({
        ...sub,
        plan_details: VIP_PLANS[sub.plan_id] || null
      }))

      return NextResponse.json({
        success: true,
        subscriptions: subscriptionsWithPlans,
        total_active: subscriptions.filter(s => s.status === 'active').length,
        total_revenue: subscriptions
          .filter(s => s.status === 'active')
          .reduce((sum, s) => {
            const plan = VIP_PLANS[s.plan_id]
            return sum + (plan ? plan.price : 0)
          }, 0)
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters'
    }, { status: 400 })

  } catch (error) {
    console.error('Subscription GET error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve subscription information'
    }, { status: 500 })
  }
}

// POST endpoint for subscription creation and management
export async function POST(request) {
  try {
    const {
      action, // 'create', 'update', 'cancel', 'reactivate'
      customer_id,
      plan_id,
      shop_id,
      payment_method_id,
      coupon_code = null,
      trial_days = 7,
      customer_email,
      customer_name
    } = await request.json()

    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Action is required'
      }, { status: 400 })
    }

    const stripe = getStripeInstance()
    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Payment processing not configured',
        mock_response: {
          subscription_id: 'sub_mock_' + Date.now(),
          status: 'active',
          plan_id,
          customer_id,
          note: 'Configure Stripe for real subscriptions'
        }
      }, { status: 200 })
    }

    const supabase = createClient()

    if (action === 'create') {
      if (!customer_id || !plan_id) {
        return NextResponse.json({
          success: false,
          error: 'customer_id and plan_id are required for subscription creation'
        }, { status: 400 })
      }

      const selectedPlan = VIP_PLANS[plan_id]
      if (!selectedPlan) {
        return NextResponse.json({
          success: false,
          error: 'Invalid plan_id'
        }, { status: 400 })
      }

      // Check for existing active subscription
      const { data: existingSubscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('status', 'active')
        .single()

      if (existingSubscription) {
        return NextResponse.json({
          success: false,
          error: 'Customer already has an active subscription'
        }, { status: 400 })
      }

      // Get or create Stripe customer
      const { data: customerData } = await supabase
        .from('users')
        .select('stripe_customer_id, email, name')
        .eq('id', customer_id)
        .single()

      let stripeCustomerId = customerData?.stripe_customer_id

      if (!stripeCustomerId) {
        // Create new Stripe customer
        const stripeCustomer = await stripe.customers.create({
          email: customer_email || customerData?.email,
          name: customer_name || customerData?.name,
          metadata: {
            user_id: customer_id,
            shop_id: shop_id || ''
          }
        })

        stripeCustomerId = stripeCustomer.id

        // Update user record with Stripe customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', customer_id)
      }

      // Create or retrieve Stripe price for the plan
      const stripePriceId = await getOrCreateStripePrice(stripe, selectedPlan)

      // Attach payment method to customer if provided
      if (payment_method_id) {
        await stripe.paymentMethods.attach(payment_method_id, {
          customer: stripeCustomerId
        })

        // Set as default payment method
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: payment_method_id
          }
        })
      }

      // Create Stripe subscription
      const subscriptionData = {
        customer: stripeCustomerId,
        items: [{ price: stripePriceId }],
        trial_period_days: trial_days,
        metadata: {
          customer_id,
          plan_id,
          shop_id: shop_id || '',
          created_via: 'api'
        },
        expand: ['latest_invoice.payment_intent']
      }

      // Apply coupon if provided
      if (coupon_code) {
        subscriptionData.coupon = coupon_code
      }

      const stripeSubscription = await stripe.subscriptions.create(subscriptionData)

      // Store subscription in database
      const { data: dbSubscription, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          customer_id,
          shop_id: shop_id || null,
          stripe_subscription_id: stripeSubscription.id,
          stripe_customer_id: stripeCustomerId,
          plan_id,
          status: stripeSubscription.status,
          current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          trial_start: stripeSubscription.trial_start ? 
            new Date(stripeSubscription.trial_start * 1000).toISOString() : null,
          trial_end: stripeSubscription.trial_end ? 
            new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
          cancel_at_period_end: stripeSubscription.cancel_at_period_end,
          coupon_code,
          metadata: {
            stripe_subscription: {
              id: stripeSubscription.id,
              status: stripeSubscription.status,
              items: stripeSubscription.items.data
            },
            plan_details: selectedPlan
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (subscriptionError) {
        throw subscriptionError
      }

      // Initialize usage tracking
      await supabase
        .from('vip_usage_tracking')
        .insert({
          subscription_id: dbSubscription.id,
          customer_id,
          period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
          period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          bookings_count: 0,
          discount_amount: 0,
          loyalty_points: 0,
          free_reschedules: 0,
          created_at: new Date().toISOString()
        })

      return NextResponse.json({
        success: true,
        subscription: {
          ...dbSubscription,
          plan_details: selectedPlan
        },
        stripe_subscription: {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          trial_end: stripeSubscription.trial_end,
          current_period_end: stripeSubscription.current_period_end
        },
        payment_intent: stripeSubscription.latest_invoice?.payment_intent || null
      })
    }

    if (action === 'cancel') {
      if (!customer_id) {
        return NextResponse.json({
          success: false,
          error: 'customer_id is required for cancellation'
        }, { status: 400 })
      }

      // Get active subscription
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('status', 'active')
        .single()

      if (error || !subscription) {
        return NextResponse.json({
          success: false,
          error: 'No active subscription found'
        }, { status: 404 })
      }

      // Cancel Stripe subscription
      const cancelledSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: true,
          metadata: {
            ...subscription.metadata,
            cancelled_at: new Date().toISOString()
          }
        }
      )

      // Update database
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription cancelled successfully',
        subscription: {
          id: subscription.id,
          cancel_at_period_end: true,
          current_period_end: subscription.current_period_end
        }
      })
    }

    if (action === 'reactivate') {
      if (!customer_id) {
        return NextResponse.json({
          success: false,
          error: 'customer_id is required for reactivation'
        }, { status: 400 })
      }

      // Get cancelled subscription
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('cancel_at_period_end', true)
        .single()

      if (error || !subscription) {
        return NextResponse.json({
          success: false,
          error: 'No cancelled subscription found'
        }, { status: 404 })
      }

      // Reactivate Stripe subscription
      const reactivatedSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: false
        }
      )

      // Update database
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: false,
          cancelled_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription reactivated successfully',
        subscription: {
          id: subscription.id,
          status: reactivatedSubscription.status,
          cancel_at_period_end: false
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Subscription POST error:', error)
    
    let errorMessage = 'Failed to process subscription request'
    let statusCode = 500
    
    if (error.type === 'StripeCardError') {
      errorMessage = 'Payment method declined. Please try a different card.'
      statusCode = 402
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid subscription request. Please check your information.'
      statusCode = 400
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      error_type: error.type || 'unknown'
    }, { status: statusCode })
  }
}

// Helper function to create or retrieve Stripe price
async function getOrCreateStripePrice(stripe, plan) {
  try {
    // Try to find existing price
    const prices = await stripe.prices.list({
      lookup_keys: [plan.id],
      limit: 1
    })

    if (prices.data.length > 0) {
      return prices.data[0].id
    }

    // Create new price
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: Math.round(plan.price * 100), // Convert to cents
      recurring: {
        interval: plan.interval
      },
      lookup_key: plan.id,
      nickname: plan.name,
      metadata: {
        plan_id: plan.id,
        plan_name: plan.name
      }
    })

    return price.id
  } catch (error) {
    console.error('Error creating Stripe price:', error)
    throw error
  }
}