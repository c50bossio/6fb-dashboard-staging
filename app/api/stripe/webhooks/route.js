import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  const supabase = createClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, supabase)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabase)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, supabase)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, supabase)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object, supabase)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription, supabase) {
  const userId = subscription.metadata.user_id

  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_id: subscription.id,
      subscription_plan: subscription.metadata.plan_id || 'BASIC',
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  // Log event
  await supabase.rpc('log_security_event', {
    p_user_id: userId,
    p_event_type: 'subscription_webhook_created',
    p_details: { 
      subscription_id: subscription.id,
      status: subscription.status
    }
  })
}

async function handleSubscriptionUpdated(subscription, supabase) {
  const userId = subscription.metadata.user_id

  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  // Log event
  await supabase.rpc('log_security_event', {
    p_user_id: userId,
    p_event_type: 'subscription_webhook_updated',
    p_details: { 
      subscription_id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end
    }
  })
}

async function handleSubscriptionDeleted(subscription, supabase) {
  const userId = subscription.metadata.user_id

  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      subscription_plan: 'free',
      subscription_current_period_end: null,
      trial_ends_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  // Log event
  await supabase.rpc('log_security_event', {
    p_user_id: userId,
    p_event_type: 'subscription_webhook_cancelled',
    p_details: { 
      subscription_id: subscription.id,
      cancelled_at: subscription.canceled_at
    }
  })
}

async function handlePaymentSucceeded(invoice, supabase) {
  const customerId = invoice.customer
  const subscriptionId = invoice.subscription

  // Get user from customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('No user found for customer:', customerId)
    return
  }

  // Record payment
  await supabase
    .from('payments')
    .insert({
      user_id: profile.id,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: customerId,
      stripe_payment_intent_id: invoice.payment_intent,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'completed',
      description: `Payment for subscription ${subscriptionId}`,
      metadata: {
        invoice_number: invoice.number,
        subscription_id: subscriptionId
      }
    })

  // Update subscription status if needed
  if (subscriptionId) {
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
  }

  // Log event
  await supabase.rpc('log_security_event', {
    p_user_id: profile.id,
    p_event_type: 'payment_succeeded',
    p_details: { 
      invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency
    }
  })
}

async function handlePaymentFailed(invoice, supabase) {
  const customerId = invoice.customer
  const subscriptionId = invoice.subscription

  // Get user from customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('No user found for customer:', customerId)
    return
  }

  // Record failed payment
  await supabase
    .from('payments')
    .insert({
      user_id: profile.id,
      stripe_invoice_id: invoice.id,
      stripe_customer_id: customerId,
      stripe_payment_intent_id: invoice.payment_intent,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: 'failed',
      description: `Failed payment for subscription ${subscriptionId}`,
      metadata: {
        invoice_number: invoice.number,
        subscription_id: subscriptionId,
        failure_reason: invoice.last_finalization_error?.message
      }
    })

  // Log event with higher risk score
  await supabase.rpc('log_security_event', {
    p_user_id: profile.id,
    p_event_type: 'payment_failed',
    p_details: { 
      invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count
    },
    p_risk_score: 30
  })
}

async function handleTrialWillEnd(subscription, supabase) {
  const userId = subscription.metadata.user_id

  if (!userId) {
    console.error('No user_id in subscription metadata')
    return
  }

  // Create notification for user
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'email',
      channel: 'system',
      subject: 'Your trial is ending soon',
      content: `Your 6FB AI Agent System trial will end on ${new Date(subscription.trial_end * 1000).toLocaleDateString()}. Add a payment method to continue using the service.`,
      metadata: {
        subscription_id: subscription.id,
        trial_end: subscription.trial_end,
        notification_type: 'trial_ending'
      }
    })

  // Log event
  await supabase.rpc('log_security_event', {
    p_user_id: userId,
    p_event_type: 'trial_ending_notification',
    p_details: { 
      subscription_id: subscription.id,
      trial_end: subscription.trial_end
    }
  })
}