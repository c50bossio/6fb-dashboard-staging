import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_demo'

export async function POST(request) {
  try {
    const body = await request.text()
    const headersList = headers()
    const sig = headersList.get('stripe-signature')

    let event

    try {
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe not configured - webhook processing unavailable' },
          { status: 503 }
        )
      }
      
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    console.log('Stripe webhook received:', event.type)

    switch (event.type) {
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
        await handlePaymentSucceeded(event.data.object)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break

      case 'customer.created':
        await handleCustomerCreated(event.data.object)
        break

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id)
  
  const tenantId = subscription.metadata?.tenant_id
  const planName = subscription.metadata?.plan_name
  
  if (!tenantId) {
    console.error('No tenant_id in subscription metadata')
    return
  }

  try {
    const subscriptionData = {
      tenant_id: tenantId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      status: subscription.status,
      tier: planName || 'starter',
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date()
    }

    console.log('Subscription data to save:', subscriptionData)
    

    await sendSubscriptionEmail(tenantId, 'welcome', {
      plan_name: planName,
      trial_end: subscriptionData.trial_end
    })

  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id)
  
  const tenantId = subscription.metadata?.tenant_id
  
  if (!tenantId) {
    console.error('No tenant_id in subscription metadata')
    return
  }

  try {
    const subscriptionData = {
      tenant_id: tenantId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date()
    }

    if (subscription.status === 'active') {
      console.log(`Subscription ${subscription.id} is now active`)
      await sendSubscriptionEmail(tenantId, 'activated', {
        subscription_id: subscription.id
      })
    } else if (subscription.status === 'canceled') {
      console.log(`Subscription ${subscription.id} was canceled`)
      await sendSubscriptionEmail(tenantId, 'canceled', {
        canceled_at: new Date()
      })
    } else if (subscription.status === 'past_due') {
      console.log(`Subscription ${subscription.id} is past due`)
      await sendSubscriptionEmail(tenantId, 'payment_failed', {
        retry_date: new Date(subscription.current_period_end * 1000)
      })
    }


  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id)
  
  const tenantId = subscription.metadata?.tenant_id
  
  if (!tenantId) {
    console.error('No tenant_id in subscription metadata')
    return
  }

  try {
    const subscriptionData = {
      tenant_id: tenantId,
      status: 'canceled',
      canceled_at: new Date(),
      updated_at: new Date()
    }


    await sendSubscriptionEmail(tenantId, 'cancellation_confirmed', {
      canceled_at: new Date()
    })

    console.log(`Subscription canceled for tenant ${tenantId}`)

  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded:', invoice.id)
  
  const subscriptionId = invoice.subscription
  const tenantId = invoice.subscription_details?.metadata?.tenant_id
  
  if (!tenantId) {
    console.error('No tenant_id in invoice metadata')
    return
  }

  try {
    const paymentData = {
      tenant_id: tenantId,
      stripe_invoice_id: invoice.id,
      stripe_subscription_id: subscriptionId,
      amount_paid: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      period_start: new Date(invoice.period_start * 1000),
      period_end: new Date(invoice.period_end * 1000),
      paid_at: new Date(invoice.status_transitions.paid_at * 1000),
      status: 'paid'
    }


    await sendSubscriptionEmail(tenantId, 'payment_succeeded', {
      amount: paymentData.amount_paid,
      invoice_url: invoice.hosted_invoice_url
    })

    console.log(`Payment recorded for tenant ${tenantId}: $${paymentData.amount_paid}`)

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed:', invoice.id)
  
  const tenantId = invoice.subscription_details?.metadata?.tenant_id
  
  if (!tenantId) {
    console.error('No tenant_id in invoice metadata')
    return
  }

  try {
    const paymentData = {
      tenant_id: tenantId,
      stripe_invoice_id: invoice.id,
      amount_due: invoice.amount_due / 100,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt ? 
        new Date(invoice.next_payment_attempt * 1000) : null,
      status: 'failed',
      failed_at: new Date()
    }


    await sendSubscriptionEmail(tenantId, 'payment_failed', {
      amount_due: paymentData.amount_due,
      next_attempt: paymentData.next_payment_attempt,
      update_payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`
    })

    console.log(`Payment failed for tenant ${tenantId}: $${paymentData.amount_due}`)

  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handleTrialWillEnd(subscription) {
  console.log('Trial will end:', subscription.id)
  
  const tenantId = subscription.metadata?.tenant_id
  const trialEnd = new Date(subscription.trial_end * 1000)
  
  if (!tenantId) {
    console.error('No tenant_id in subscription metadata')
    return
  }

  try {
    await sendSubscriptionEmail(tenantId, 'trial_ending', {
      trial_end_date: trialEnd,
      days_remaining: Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)),
      upgrade_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`
    })

    console.log(`Trial ending reminder sent to tenant ${tenantId}`)

  } catch (error) {
    console.error('Error handling trial will end:', error)
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id)
  
  const tenantId = session.metadata?.tenant_id
  const planName = session.metadata?.plan
  
  if (!tenantId) {
    console.error('No tenant_id in checkout session metadata')
    return
  }

  try {
    const checkoutData = {
      tenant_id: tenantId,
      stripe_checkout_session_id: session.id,
      stripe_customer_id: session.customer,
      subscription_id: session.subscription,
      plan_name: planName,
      amount_total: session.amount_total / 100,
      currency: session.currency,
      payment_status: session.payment_status,
      completed_at: new Date()
    }


    await sendSubscriptionEmail(tenantId, 'checkout_completed', {
      plan_name: planName,
      amount: checkoutData.amount_total,
      customer_portal_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`
    })

    console.log(`Checkout completed for tenant ${tenantId}: ${planName} plan`)

  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

async function handleCustomerCreated(customer) {
  console.log('Customer created:', customer.id)
  
  try {
    console.log(`New Stripe customer created: ${customer.id} (${customer.email})`)

  } catch (error) {
    console.error('Error handling customer created:', error)
  }
}

async function handleInvoiceCreated(invoice) {
  console.log('Invoice created:', invoice.id)
  
  const tenantId = invoice.subscription_details?.metadata?.tenant_id
  
  if (!tenantId) {
    return // Not all invoices have tenant metadata
  }

  try {
    const hasUsageCharges = invoice.lines.data.some(line => 
      line.description && line.description.includes('token')
    )

    if (hasUsageCharges) {
      console.log(`Usage-based invoice created for tenant ${tenantId}`)
      
      await sendSubscriptionEmail(tenantId, 'usage_invoice', {
        invoice_amount: invoice.amount_due / 100,
        invoice_url: invoice.hosted_invoice_url,
        due_date: new Date(invoice.due_date * 1000)
      })
    }

  } catch (error) {
    console.error('Error handling invoice created:', error)
  }
}

async function sendSubscriptionEmail(tenantId, emailType, data) {
  console.log(`Sending ${emailType} email to tenant ${tenantId}:`, data)
  
  const emailTemplates = {
    welcome: `Welcome to 6FB AI! Your ${data.plan_name} plan is active. Trial ends: ${data.trial_end}`,
    activated: `Your subscription is now active! Subscription ID: ${data.subscription_id}`,
    canceled: `Your subscription has been canceled. Canceled at: ${data.canceled_at}`,
    payment_succeeded: `Payment of $${data.amount} processed successfully. Invoice: ${data.invoice_url}`,
    payment_failed: `Payment failed. Amount due: $${data.amount_due}. Next attempt: ${data.next_attempt}`,
    trial_ending: `Your trial ends in ${data.days_remaining} days on ${data.trial_end_date}. Upgrade: ${data.upgrade_url}`,
    checkout_completed: `Welcome! Your ${data.plan_name} plan ($${data.amount}) is active. Manage: ${data.customer_portal_url}`,
    cancellation_confirmed: `Subscription canceled on ${data.canceled_at}. You'll retain access until your billing period ends.`,
    usage_invoice: `Usage invoice for $${data.invoice_amount} created. Due: ${data.due_date}. View: ${data.invoice_url}`
  }

  const message = emailTemplates[emailType] || `Unknown email type: ${emailType}`
  
  console.log(`EMAIL [${emailType}]: ${message}`)
  
  return true
}