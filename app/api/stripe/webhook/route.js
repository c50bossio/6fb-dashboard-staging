import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
})

// Initialize Supabase with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Webhook secret from Stripe Dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle successful checkout (initial subscription)
async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.metadata?.supabase_user_id
    const tier = session.metadata?.subscription_tier
    const billingPeriod = session.metadata?.billing_period

    if (!userId || !tier) {
      console.error('Missing metadata in checkout session:', session.id)
      return
    }

    // Retrieve the subscription
    const subscription = await stripe.subscriptions.retrieve(session.subscription)

    // Update user record
    const { error } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: subscription.id,
        subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_price_id: subscription.items.data[0].price.id,
        // Reset usage for new billing period
        sms_credits_used: 0,
        email_credits_used: 0,
        ai_tokens_used: 0
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user after checkout:', error)
      throw error
    }

    // Create subscription history record
    await supabase
      .from('subscription_history')
      .insert({
        user_id: userId,
        subscription_tier: tier,
        stripe_subscription_id: subscription.id,
        stripe_invoice_id: session.invoice,
        amount: session.amount_total,
        currency: session.currency.toUpperCase(),
        status: 'active',
        billing_period: billingPeriod || 'monthly',
        period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        metadata: {
          session_id: session.id,
          customer_email: session.customer_details?.email
        }
      })

    console.log(`Subscription activated for user ${userId} - Tier: ${tier}`)

  } catch (error) {
    console.error('Error handling checkout session:', error)
    throw error
  }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
  try {
    const userId = subscription.metadata?.supabase_user_id
    const tier = subscription.metadata?.subscription_tier

    if (!userId) {
      console.log('No user ID in subscription metadata, skipping')
      return
    }

    // Update user subscription status
    await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    console.log(`Subscription created: ${subscription.id}`)

  } catch (error) {
    console.error('Error handling subscription creation:', error)
  }
}

// Handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  try {
    const status = subscription.status
    const cancelAtPeriodEnd = subscription.cancel_at_period_end

    // Map Stripe status to our status
    let dbStatus = 'inactive'
    if (status === 'active' || status === 'trialing') {
      dbStatus = cancelAtPeriodEnd ? 'canceling' : 'active'
    } else if (status === 'past_due') {
      dbStatus = 'past_due'
    } else if (status === 'canceled') {
      dbStatus = 'canceled'
    } else if (status === 'unpaid') {
      dbStatus = 'unpaid'
    }

    // Update user subscription status
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: dbStatus,
        subscription_cancel_at_period_end: cancelAtPeriodEnd,
        subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_price_id: subscription.items.data[0]?.price.id
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error updating subscription:', error)
      throw error
    }

    // Log status change in history
    const { data: userData } = await supabase
      .from('users')
      .select('id, subscription_tier')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (userData) {
      await supabase
        .from('subscription_history')
        .insert({
          user_id: userData.id,
          subscription_tier: userData.subscription_tier,
          stripe_subscription_id: subscription.id,
          status: dbStatus,
          metadata: {
            event: 'subscription_updated',
            stripe_status: status,
            cancel_at_period_end: cancelAtPeriodEnd
          }
        })
    }

    console.log(`Subscription updated: ${subscription.id} - Status: ${dbStatus}`)

  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(subscription) {
  try {
    // Update user subscription status to canceled
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'canceled',
        subscription_cancel_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }

    // Log cancellation in history
    const { data: userData } = await supabase
      .from('users')
      .select('id, subscription_tier')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (userData) {
      await supabase
        .from('subscription_history')
        .insert({
          user_id: userData.id,
          subscription_tier: userData.subscription_tier,
          stripe_subscription_id: subscription.id,
          status: 'canceled',
          metadata: {
            event: 'subscription_canceled',
            canceled_at: new Date().toISOString()
          }
        })
    }

    console.log(`Subscription canceled: ${subscription.id}`)

  } catch (error) {
    console.error('Error handling subscription deletion:', error)
  }
}

// Handle successful invoice payment (renewal)
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    if (!invoice.subscription) return

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription)

    // Reset usage counters for new billing period
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        // Reset usage counters
        sms_credits_used: 0,
        email_credits_used: 0,
        ai_tokens_used: 0,
        // Update payment info
        last_payment_amount: invoice.amount_paid,
        last_payment_date: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription)

    if (error) {
      console.error('Error updating after payment:', error)
      throw error
    }

    // Create payment record in history
    const { data: userData } = await supabase
      .from('users')
      .select('id, subscription_tier')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (userData) {
      await supabase
        .from('subscription_history')
        .insert({
          user_id: userData.id,
          subscription_tier: userData.subscription_tier,
          stripe_subscription_id: invoice.subscription,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          status: 'paid',
          period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          metadata: {
            event: 'invoice_payment_succeeded',
            invoice_number: invoice.number,
            payment_intent: invoice.payment_intent
          }
        })
    }

    console.log(`Payment succeeded for invoice: ${invoice.id}`)

  } catch (error) {
    console.error('Error handling invoice payment:', error)
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice) {
  try {
    if (!invoice.subscription) return

    // Update subscription status to past_due
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'past_due',
        last_payment_failure_date: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription)

    if (error) {
      console.error('Error updating after payment failure:', error)
      throw error
    }

    // Log payment failure in history
    const { data: userData } = await supabase
      .from('users')
      .select('id, subscription_tier, email')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (userData) {
      await supabase
        .from('subscription_history')
        .insert({
          user_id: userData.id,
          subscription_tier: userData.subscription_tier,
          stripe_subscription_id: invoice.subscription,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency.toUpperCase(),
          status: 'failed',
          metadata: {
            event: 'invoice_payment_failed',
            invoice_number: invoice.number,
            attempt_count: invoice.attempt_count,
            next_payment_attempt: invoice.next_payment_attempt
          }
        })

      // TODO: Send email notification about payment failure
      console.log(`Payment failed notification needed for: ${userData.email}`)
    }

    console.log(`Payment failed for invoice: ${invoice.id}`)

  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

// Handle trial ending soon notification
async function handleTrialWillEnd(subscription) {
  try {
    const userId = subscription.metadata?.supabase_user_id

    if (!userId) return

    // Get user email for notification
    const { data: userData } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single()

    if (userData) {
      // TODO: Send email notification about trial ending
      console.log(`Trial ending notification needed for: ${userData.email}`)
      
      // Log in history
      await supabase
        .from('subscription_history')
        .insert({
          user_id: userId,
          subscription_tier: subscription.metadata?.subscription_tier,
          stripe_subscription_id: subscription.id,
          status: 'trial_ending',
          metadata: {
            event: 'trial_will_end',
            trial_end: new Date(subscription.trial_end * 1000).toISOString()
          }
        })
    }

    console.log(`Trial ending soon for subscription: ${subscription.id}`)

  } catch (error) {
    console.error('Error handling trial ending:', error)
  }
}

// Export config to prevent body parsing (required for webhooks)
export const runtime = 'nodejs'