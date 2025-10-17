import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '../../../../lib/supabase/server'

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

    // Initialize Supabase client
    const supabase = createClient()

    // Handle the event
    switch (event.type) {
      // Payment Intent events (for booking payments)
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(supabase, event.data.object)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(supabase, event.data.object)
        break

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(supabase, event.data.object)
        break

      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(supabase, event.data.object)
        break

      // Charge events (for payment tracking)
      case 'charge.succeeded':
        await handleChargeSucceeded(supabase, event.data.object)
        break

      case 'charge.failed':
        await handleChargeFailed(supabase, event.data.object)
        break

      case 'charge.refunded':
        await handleChargeRefunded(supabase, event.data.object)
        break

      // Transfer events (for commission payouts)
      case 'transfer.created':
        await handleTransferCreated(supabase, event.data.object)
        break

      case 'transfer.paid':
        await handleTransferPaid(supabase, event.data.object)
        break

      case 'transfer.failed':
        await handleTransferFailed(supabase, event.data.object)
        break

      // Subscription events (for VIP memberships)
      case 'customer.subscription.created':
        await handleSubscriptionCreated(supabase, event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(supabase, event.data.object)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object)
        break

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(supabase, event.data.object)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object)
        break

      case 'customer.created':
        await handleCustomerCreated(supabase, event.data.object)
        break

      case 'invoice.created':
        await handleInvoiceCreated(supabase, event.data.object)
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

// ============================================
// PAYMENT INTENT HANDLERS (Booking Payments)
// ============================================

async function handlePaymentIntentSucceeded(supabase, paymentIntent) {
  try {
    console.log('Processing payment_intent.succeeded:', paymentIntent.id)

    // Update payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        stripe_charge_id: paymentIntent.latest_charge,
        payment_completed_at: new Date().toISOString(),
        amount_received: paymentIntent.amount_received,
        receipt_url: paymentIntent.receipt_email,
        metadata: {
          ...JSON.parse(JSON.stringify(paymentIntent.metadata || {})),
          stripe_payment_intent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount_received: paymentIntent.amount_received,
            created: paymentIntent.created
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .select()
      .single()

    if (paymentError) {
      console.error('Failed to update payment record:', paymentError)
      return
    }

    if (payment) {
      // Update associated booking status
      if (payment.booking_id) {
        await supabase
          .from('appointments')
          .update({
            payment_status: 'completed',
            status: 'CONFIRMED',
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.booking_id)
      }

      // Process commission distribution
      if (payment.commission_barber && payment.barber_id) {
        await processCommissionDistribution(supabase, payment)
      }

      // Send confirmation notifications
      await sendBookingConfirmationNotifications(supabase, payment)

      // Update business metrics
      await updateBusinessMetrics(supabase, payment, 'payment_succeeded')

      console.log('Payment processing completed successfully:', paymentIntent.id)
    }

  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error)
    await logWebhookError(supabase, 'payment_intent.succeeded', paymentIntent.id, error)
  }
}

async function handlePaymentIntentFailed(supabase, paymentIntent) {
  try {
    console.log('Processing payment_intent.payment_failed:', paymentIntent.id)

    const { data: payment } = await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_code: paymentIntent.last_payment_error?.code,
        failure_message: paymentIntent.last_payment_error?.message,
        failure_decline_code: paymentIntent.last_payment_error?.decline_code,
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .select()
      .single()

    if (payment?.booking_id) {
      // Update booking to pending payment
      await supabase
        .from('appointments')
        .update({
          payment_status: 'failed',
          status: 'PENDING',
          payment_failure_reason: paymentIntent.last_payment_error?.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.booking_id)
    }

    // Send payment failure notifications
    await sendPaymentFailureNotifications(supabase, payment, paymentIntent.last_payment_error)

    // Update metrics
    await updateBusinessMetrics(supabase, payment, 'payment_failed')

  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error)
  }
}

async function handlePaymentIntentCanceled(supabase, paymentIntent) {
  try {
    console.log('Processing payment_intent.canceled:', paymentIntent.id)

    await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: paymentIntent.cancellation_reason,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

  } catch (error) {
    console.error('Error handling payment_intent.canceled:', error)
  }
}

async function handlePaymentIntentRequiresAction(supabase, paymentIntent) {
  try {
    console.log('Processing payment_intent.requires_action:', paymentIntent.id)

    await supabase
      .from('payments')
      .update({
        status: 'requires_action',
        requires_action: true,
        next_action_type: paymentIntent.next_action?.type,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

  } catch (error) {
    console.error('Error handling payment_intent.requires_action:', error)
  }
}

// ============================================
// CHARGE HANDLERS (Payment Tracking)
// ============================================

async function handleChargeSucceeded(supabase, charge) {
  try {
    console.log('Processing charge.succeeded:', charge.id)

    // Update payment record with charge details
    await supabase
      .from('payments')
      .update({
        stripe_charge_id: charge.id,
        payment_method_details: charge.payment_method_details,
        receipt_url: charge.receipt_url,
        outcome: charge.outcome,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', charge.payment_intent)

  } catch (error) {
    console.error('Error handling charge.succeeded:', error)
  }
}

async function handleChargeFailed(supabase, charge) {
  try {
    console.log('Processing charge.failed:', charge.id)

    await supabase
      .from('payments')
      .update({
        stripe_charge_id: charge.id,
        failure_code: charge.failure_code,
        failure_message: charge.failure_message,
        outcome: charge.outcome,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', charge.payment_intent)

  } catch (error) {
    console.error('Error handling charge.failed:', error)
  }
}

async function handleChargeRefunded(supabase, charge) {
  try {
    console.log('Processing charge.refunded:', charge.id)

    const refund = charge.refunds.data[0] // Get the latest refund

    await supabase
      .from('payments')
      .update({
        status: charge.amount_refunded === charge.amount ? 'refunded' : 'partially_refunded',
        refund_amount: charge.amount_refunded,
        refund_id: refund?.id,
        refund_reason: refund?.reason,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', charge.payment_intent)

  } catch (error) {
    console.error('Error handling charge.refunded:', error)
  }
}

// ============================================
// TRANSFER HANDLERS (Commission Payouts)
// ============================================

async function handleTransferCreated(supabase, transfer) {
  try {
    console.log('Processing transfer.created:', transfer.id)

    await supabase
      .from('payout_activities')
      .update({
        stripe_transfer_status: 'created',
        transfer_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_transfer_id', transfer.id)

  } catch (error) {
    console.error('Error handling transfer.created:', error)
  }
}

async function handleTransferPaid(supabase, transfer) {
  try {
    console.log('Processing transfer.paid:', transfer.id)

    const { data: payout } = await supabase
      .from('payout_activities')
      .update({
        stripe_transfer_status: 'paid',
        transfer_paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_transfer_id', transfer.id)
      .select()
      .single()

    if (payout) {
      // Update related payment records
      if (payout.metadata?.payment_ids) {
        await supabase
          .from('payments')
          .update({
            payout_status: 'paid',
            payout_date: new Date().toISOString()
          })
          .in('id', payout.metadata.payment_ids)
      }

      // Send payout confirmation to barber
      await sendPayoutConfirmationNotification(supabase, payout, transfer)
    }

  } catch (error) {
    console.error('Error handling transfer.paid:', error)
  }
}

async function handleTransferFailed(supabase, transfer) {
  try {
    console.log('Processing transfer.failed:', transfer.id)

    await supabase
      .from('payout_activities')
      .update({
        stripe_transfer_status: 'failed',
        transfer_failure_reason: transfer.failure_message,
        transfer_failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_transfer_id', transfer.id)

  } catch (error) {
    console.error('Error handling transfer.failed:', error)
  }
}

// ============================================
// SUBSCRIPTION HANDLERS (VIP Memberships)
// ============================================

async function handleSubscriptionCreated(supabase, subscription) {
  console.log('Subscription created:', subscription.id)
  
  const tenantId = subscription.metadata?.tenant_id
  const planName = subscription.metadata?.plan_name
  
  if (!tenantId) {
    console.error('No tenant_id in subscription metadata')
    return
  }

  try {
    // Update tenant subscription in database
    // In production, this would use the TokenBillingService
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
    
    // TODO: Save to database via TokenBillingService
    // await tokenBillingService.updateSubscription(tenantId, subscriptionData)

    // Send welcome email
    await sendSubscriptionEmail(tenantId, 'welcome', {
      plan_name: planName,
      trial_end: subscriptionData.trial_end
    })

  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(supabase, subscription) {
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

    // Handle specific status changes
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

    // TODO: Update database
    // await tokenBillingService.updateSubscription(tenantId, subscriptionData)

  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(supabase, subscription) {
  console.log('Subscription deleted:', subscription.id)
  
  const tenantId = subscription.metadata?.tenant_id
  
  if (!tenantId) {
    console.error('No tenant_id in subscription metadata')
    return
  }

  try {
    // Mark subscription as canceled in database
    const subscriptionData = {
      tenant_id: tenantId,
      status: 'canceled',
      canceled_at: new Date(),
      updated_at: new Date()
    }

    // TODO: Update database
    // await tokenBillingService.updateSubscription(tenantId, subscriptionData)

    // Send cancellation confirmation
    await sendSubscriptionEmail(tenantId, 'cancellation_confirmed', {
      canceled_at: new Date()
    })

    console.log(`Subscription canceled for tenant ${tenantId}`)

  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

async function handleInvoicePaymentSucceeded(supabase, invoice) {
  console.log('Payment succeeded:', invoice.id)
  
  const subscriptionId = invoice.subscription
  const tenantId = invoice.subscription_details?.metadata?.tenant_id
  
  if (!tenantId) {
    console.error('No tenant_id in invoice metadata')
    return
  }

  try {
    // Record successful payment
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

    // TODO: Save payment record
    // await tokenBillingService.recordPayment(tenantId, paymentData)

    // Send payment confirmation
    await sendSubscriptionEmail(tenantId, 'payment_succeeded', {
      amount: paymentData.amount_paid,
      invoice_url: invoice.hosted_invoice_url
    })

    console.log(`Payment recorded for tenant ${tenantId}: $${paymentData.amount_paid}`)

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handleInvoicePaymentFailed(supabase, invoice) {
  console.log('Payment failed:', invoice.id)
  
  const tenantId = invoice.subscription_details?.metadata?.tenant_id
  
  if (!tenantId) {
    console.error('No tenant_id in invoice metadata')
    return
  }

  try {
    // Record failed payment
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

    // TODO: Save failed payment record
    // await tokenBillingService.recordFailedPayment(tenantId, paymentData)

    // Send payment failure notification
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

async function handleTrialWillEnd(supabase, subscription) {
  console.log('Trial will end:', subscription.id)
  
  const tenantId = subscription.metadata?.tenant_id
  const trialEnd = new Date(subscription.trial_end * 1000)
  
  if (!tenantId) {
    console.error('No tenant_id in subscription metadata')
    return
  }

  try {
    // Send trial ending reminder
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

async function handleCheckoutCompleted(supabase, session) {
  console.log('Checkout completed:', session.id)
  
  const tenantId = session.metadata?.tenant_id
  const planName = session.metadata?.plan
  
  if (!tenantId) {
    console.error('No tenant_id in checkout session metadata')
    return
  }

  try {
    // Record successful checkout
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

    // TODO: Save checkout record
    // await tokenBillingService.recordCheckout(tenantId, checkoutData)

    // Send checkout confirmation
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

async function handleCustomerCreated(supabase, customer) {
  console.log('Customer created:', customer.id)
  
  try {
    // Log customer creation for analytics
    console.log(`New Stripe customer created: ${customer.id} (${customer.email})`)

  } catch (error) {
    console.error('Error handling customer created:', error)
  }
}

async function handleInvoiceCreated(supabase, invoice) {
  console.log('Invoice created:', invoice.id)
  
  const tenantId = invoice.subscription_details?.metadata?.tenant_id
  
  if (!tenantId) {
    return // Not all invoices have tenant metadata
  }

  try {
    // Check if this is a usage-based invoice (token overages)
    const hasUsageCharges = invoice.lines.data.some(line => 
      line.description && line.description.includes('token')
    )

    if (hasUsageCharges) {
      console.log(`Usage-based invoice created for tenant ${tenantId}`)
      
      // Send usage invoice notification
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
  // Mock email sending - in production, integrate with email service
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
  
  // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
  console.log(`EMAIL [${emailType}]: ${message}`)
  
  return true
}

// ============================================
// BARBERSHOP-SPECIFIC HELPER FUNCTIONS
// ============================================

async function processCommissionDistribution(supabase, payment) {
  try {
    // Create commission payout record
    await supabase
      .from('commission_payouts')
      .insert({
        payment_id: payment.id,
        barber_id: payment.barber_id,
        barbershop_id: payment.barbershop_id,
        amount: payment.commission_barber,
        commission_rate: payment.commission_barber / payment.amount,
        status: 'pending',
        earned_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    // Update barber's total commissions
    await supabase.rpc('update_barber_commission_total', {
      p_barber_id: payment.barber_id,
      p_amount: payment.commission_barber / 100 // Convert to dollars
    })

  } catch (error) {
    console.error('Failed to process commission distribution:', error)
  }
}

async function sendBookingConfirmationNotifications(supabase, payment) {
  try {
    // Get booking details for notifications
    const { data: booking } = await supabase
      .from('appointments')
      .select(`
        *,
        users:barber_id (name, email),
        services (name, duration_minutes)
      `)
      .eq('id', payment.booking_id)
      .single()

    if (booking) {
      // Send SMS/Email confirmations
      console.log('Sending booking confirmation notifications:', {
        customer: payment.customer_name,
        service: booking.services?.name,
        barber: booking.users?.name,
        scheduled_at: booking.scheduled_at,
        amount: payment.amount / 100
      })

      // TODO: Integrate with notification service
      // await notificationService.sendBookingConfirmation(booking, payment)
    }

  } catch (error) {
    console.error('Failed to send booking confirmation:', error)
  }
}

async function sendPaymentFailureNotifications(supabase, payment, error) {
  try {
    console.log('Sending payment failure notifications:', {
      payment_id: payment?.id,
      customer: payment?.customer_name,
      error_code: error?.code,
      error_message: error?.message
    })

    // TODO: Integrate with notification service for payment failures
    // await notificationService.sendPaymentFailure(payment, error)

  } catch (notificationError) {
    console.error('Failed to send payment failure notification:', notificationError)
  }
}

async function sendPayoutConfirmationNotification(supabase, payout, transfer) {
  try {
    // Get barber details
    const { data: barber } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', payout.barber_id)
      .single()

    if (barber) {
      console.log('Sending payout confirmation:', {
        barber_name: barber.name,
        amount: transfer.amount / 100,
        transfer_id: transfer.id,
        payout_date: new Date().toISOString()
      })

      // TODO: Send payout confirmation email/SMS to barber
      // await notificationService.sendPayoutConfirmation(barber, payout, transfer)
    }

  } catch (error) {
    console.error('Failed to send payout confirmation:', error)
  }
}

async function updateBusinessMetrics(supabase, payment, eventType) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    if (eventType === 'payment_succeeded') {
      // Update daily metrics
      await supabase
        .from('daily_business_metrics')
        .upsert({
          date: today,
          barbershop_id: payment.barbershop_id,
          total_revenue: supabase.raw('COALESCE(total_revenue, 0) + ?', [payment.amount / 100]),
          completed_bookings: supabase.raw('COALESCE(completed_bookings, 0) + 1'),
          commission_earned: supabase.raw('COALESCE(commission_earned, 0) + ?', [payment.commission_barber / 100]),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date,shop_id'
        })

      // Update barber performance metrics
      if (payment.barber_id) {
        await supabase
          .from('barber_performance_metrics')
          .upsert({
            date: today,
            barber_id: payment.barber_id,
            barbershop_id: payment.barbershop_id,
            services_completed: supabase.raw('COALESCE(services_completed, 0) + 1'),
            revenue_generated: supabase.raw('COALESCE(revenue_generated, 0) + ?', [payment.amount / 100]),
            commission_earned: supabase.raw('COALESCE(commission_earned, 0) + ?', [payment.commission_barber / 100]),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'date,barber_id'
          })
      }
    }

  } catch (error) {
    console.error('Failed to update business metrics:', error)
  }
}

async function logWebhookError(supabase, eventType, eventId, error) {
  try {
    await supabase
      .from('webhook_error_logs')
      .insert({
        event_type: eventType,
        stripe_event_id: eventId,
        error_message: error.message,
        error_stack: error.stack,
        created_at: new Date().toISOString()
      })
  } catch (logError) {
    console.error('Failed to log webhook error:', logError)
  }
}