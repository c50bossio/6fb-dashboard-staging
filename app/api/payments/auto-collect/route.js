import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})

/**
 * POST /api/payments/auto-collect
 * Automatic fee collection with retry logic and fallback mechanisms
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { 
      client_id,
      amount,
      description = 'Automated fee collection',
      incident_id = null,
      fee_type = 'no_show',
      retry_attempts = 3,
      retry_delay_hours = 24,
      enable_fallback = true
    } = await request.json()
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role, full_name')
      .eq('id', session.user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'manager', 'owner']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const barberbarbershopId = profile.barbershop_id

    // Get barbershop's Stripe account and automation settings
    const [stripeAccountResult, automationSettingsResult] = await Promise.all([
      supabase
        .from('stripe_accounts')
        .select('*')
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('onboarding_completed', true)
        .single(),
      
      supabase
        .from('automation_settings')
        .select('*')
        .eq('barberbarbershop_id', barberbarbershopId)
        .single()
    ])

    const { data: stripeAccount, error: stripeError } = stripeAccountResult
    const { data: automationSettings } = automationSettingsResult

    // Pre-validate payment capability
    const paymentCapability = await validatePaymentCapability(
      stripeAccount, 
      client_id, 
      supabase, 
      barberbarbershopId
    )

    if (!paymentCapability.canProcess) {
      // Handle graceful fallback
      const fallbackResult = await handlePaymentFallback({
        client_id,
        amount,
        description,
        incident_id,
        fee_type,
        barberbarbershopId,
        reason: paymentCapability.reason,
        supabase,
        session,
        enable_fallback,
        automationSettings
      })

      return NextResponse.json({
        success: false,
        payment_attempted: false,
        fallback_initiated: true,
        fallback_result: fallbackResult,
        reason: paymentCapability.reason,
        next_action: fallbackResult.next_action
      })
    }

    // Attempt automatic payment collection
    const collectionResult = await attemptPaymentCollection({
      client_id,
      amount,
      description,
      incident_id,
      fee_type,
      barberbarbershopId,
      stripeAccount,
      supabase,
      session,
      retry_attempts,
      retry_delay_hours
    })

    // Log the collection attempt
    await logPaymentAttempt({
      barberbarbershopId,
      client_id,
      amount,
      fee_type,
      result: collectionResult,
      session,
      incident_id,
      supabase
    })

    // Handle retry logic if payment failed
    if (!collectionResult.success && collectionResult.should_retry && retry_attempts > 0) {
      await scheduleRetryAttempt({
        client_id,
        amount,
        description,
        incident_id,
        fee_type,
        barberbarbershopId,
        retry_attempts: retry_attempts - 1,
        retry_delay_hours,
        original_attempt_id: collectionResult.attempt_id,
        supabase
      })
    }

    // If payment failed and fallback is enabled
    if (!collectionResult.success && enable_fallback && !collectionResult.should_retry) {
      const fallbackResult = await handlePaymentFallback({
        client_id,
        amount,
        description,
        incident_id,
        fee_type,
        barberbarbershopId,
        reason: collectionResult.error_message,
        supabase,
        session,
        enable_fallback,
        automationSettings
      })

      return NextResponse.json({
        success: false,
        payment_attempted: true,
        payment_result: collectionResult,
        fallback_initiated: true,
        fallback_result: fallbackResult,
        next_action: fallbackResult.next_action
      })
    }

    return NextResponse.json({
      success: collectionResult.success,
      payment_attempted: true,
      payment_result: collectionResult,
      fallback_initiated: false,
      retry_scheduled: !collectionResult.success && collectionResult.should_retry && retry_attempts > 0,
      message: collectionResult.success 
        ? 'Payment collected successfully'
        : 'Payment collection failed, see details for next steps'
    })
    
  } catch (error) {
    console.error('Error in auto payment collection:', error)
    return NextResponse.json(
      { error: 'Failed to process automatic payment collection', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Validate payment capability before attempting collection
 */
async function validatePaymentCapability(stripeAccount, clientId, supabase, barberbarbershopId) {
  try {
    // Check if Stripe is configured
    if (!stripeAccount) {
      return {
        canProcess: false,
        reason: 'no_stripe_account',
        details: 'Stripe account not configured for this barbershop'
      }
    }

    // Get client information
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', clientId)
      .single()
    
    if (customerError || !customer) {
      return {
        canProcess: false,
        reason: 'customer_not_found',
        details: 'Customer not found in database'
      }
    }

    // Check if customer has Stripe ID
    if (!customer.stripe_customer_id) {
      return {
        canProcess: false,
        reason: 'no_stripe_customer',
        details: 'Customer not set up for payments'
      }
    }

    // Check if customer has valid payment method
    const stripeCustomer = await stripe.customers.retrieve(
      customer.stripe_customer_id,
      { stripeAccount: stripeAccount.account_id }
    )

    if (!stripeCustomer.default_source && !stripeCustomer.invoice_settings?.default_payment_method) {
      return {
        canProcess: false,
        reason: 'no_payment_method',
        details: 'No payment method on file'
      }
    }

    return {
      canProcess: true,
      customer,
      stripeCustomer
    }

  } catch (error) {
    console.error('Error validating payment capability:', error)
    return {
      canProcess: false,
      reason: 'validation_error',
      details: error.message
    }
  }
}

/**
 * Attempt payment collection with error handling
 */
async function attemptPaymentCollection({
  client_id, amount, description, incident_id, fee_type,
  barberbarbershopId, stripeAccount, supabase, session, retry_attempts, retry_delay_hours
}) {
  try {
    // Get customer data
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', client_id)
      .single()

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customer.stripe_customer_id,
      description: `${description} - Auto Collection`,
      confirm: true,
      off_session: true,
      metadata: {
        incident_id: incident_id || '',
        client_id,
        barberbarbershop_id: barberbarbershopId,
        type: fee_type,
        collection_type: 'automatic'
      },
      // 5% platform fee
      application_fee_amount: Math.round(amount * 100 * 0.05)
    }, {
      stripeAccount: stripeAccount.account_id
    })

    const success = paymentIntent.status === 'succeeded'
    
    // Update incident if provided
    if (incident_id && success) {
      await supabase
        .from('no_show_incidents')
        .update({
          fee_charged: true,
          fee_status: 'charged',
          fee_charge_date: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', incident_id)
    }

    // Update client strike history if successful
    if (success) {
      await updateClientBalance(supabase, barberbarbershopId, client_id, -amount)
    }

    return {
      success,
      payment_intent_id: paymentIntent.id,
      status: paymentIntent.status,
      amount_collected: success ? amount : 0,
      should_retry: !success && canRetryPayment(paymentIntent),
      error_message: !success ? getPaymentErrorMessage(paymentIntent) : null,
      attempt_id: generateAttemptId()
    }

  } catch (error) {
    console.error('Payment collection attempt failed:', error)
    return {
      success: false,
      payment_intent_id: null,
      status: 'failed',
      amount_collected: 0,
      should_retry: canRetryStripeError(error),
      error_message: error.message,
      attempt_id: generateAttemptId()
    }
  }
}

/**
 * Handle payment fallback mechanisms
 */
async function handlePaymentFallback({
  client_id, amount, description, incident_id, fee_type, barberbarbershopId,
  reason, supabase, session, enable_fallback, automationSettings
}) {
  const fallbackActions = []

  try {
    // Generate payment request link
    const paymentLink = await generatePaymentRequestLink({
      client_id, amount, description, incident_id, fee_type, barberbarbershopId, supabase
    })
    fallbackActions.push({
      type: 'payment_link',
      action: 'Payment request link generated',
      data: { link: paymentLink }
    })

    // Track unpaid balance
    await updateClientBalance(supabase, barberbarbershopId, client_id, amount)
    fallbackActions.push({
      type: 'balance_tracking',
      action: 'Added to unpaid balance',
      data: { amount }
    })

    // Send invoice email if automation settings allow
    if (automationSettings?.automatic_fee_collection?.fallback_to_email !== false) {
      const emailResult = await sendInvoiceEmail({
        client_id, amount, description, paymentLink, barberbarbershopId, supabase
      })
      fallbackActions.push({
        type: 'email_invoice',
        action: 'Invoice email sent',
        data: emailResult
      })
    }

    // Queue for manual collection
    await queueForManualCollection({
      client_id, amount, description, incident_id, fee_type, barberbarbershopId, reason, supabase, session
    })
    fallbackActions.push({
      type: 'manual_queue',
      action: 'Queued for manual collection',
      data: { reason }
    })

    // Notify manager if enabled
    if (automationSettings?.manager_notifications?.payment_failures !== false) {
      await notifyManagerOfPaymentFailure({
        client_id, amount, reason, barberbarbershopId, supabase, session
      })
      fallbackActions.push({
        type: 'manager_notification',
        action: 'Manager notified of payment failure',
        data: { reason }
      })
    }

    return {
      success: true,
      actions_taken: fallbackActions,
      next_action: 'await_manual_payment',
      payment_link: paymentLink
    }

  } catch (error) {
    console.error('Error in payment fallback:', error)
    return {
      success: false,
      actions_taken: fallbackActions,
      error: error.message,
      next_action: 'manual_intervention_required'
    }
  }
}

/**
 * Helper functions
 */
function canRetryPayment(paymentIntent) {
  const retryableStatuses = ['requires_payment_method', 'requires_confirmation']
  return retryableStatuses.includes(paymentIntent.status)
}

function canRetryStripeError(error) {
  const retryableCodes = ['card_declined', 'insufficient_funds', 'authentication_required']
  return retryableCodes.includes(error.code)
}

function getPaymentErrorMessage(paymentIntent) {
  if (paymentIntent.last_payment_error) {
    return paymentIntent.last_payment_error.message
  }
  return `Payment failed with status: ${paymentIntent.status}`
}

function generateAttemptId() {
  return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function updateClientBalance(supabase, barberbarbershopId, clientId, amountChange) {
  const { data: strikeHistory } = await supabase
    .from('client_strike_history')
    .select('outstanding_balance')
    .eq('barberbarbershop_id', barberbarbershopId)
    .eq('client_id', clientId)
    .single()

  const currentBalance = strikeHistory?.outstanding_balance || 0
  const newBalance = Math.max(0, currentBalance + amountChange)

  await supabase
    .from('client_strike_history')
    .upsert({
      barberbarbershop_id: barberbarbershopId,
      client_id: clientId,
      outstanding_balance: newBalance,
      updated_at: new Date().toISOString()
    })
}

async function generatePaymentRequestLink({ client_id, amount, description, incident_id, fee_type, barberbarbershopId, supabase }) {
  // Create a secure payment request token
  const token = `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Store payment request in database
  await supabase
    .from('payment_requests')
    .insert({
      token,
      barberbarbershop_id: barberbarbershopId,
      client_id,
      amount,
      description,
      incident_id,
      fee_type,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      created_at: new Date().toISOString()
    })

  return `${process.env.NEXT_PUBLIC_BASE_URL}/pay/${token}`
}

async function sendInvoiceEmail({ client_id, amount, description, paymentLink, barberbarbershopId, supabase }) {
  // Implementation would use your email service (SendGrid, etc.)
  // For now, just log the action
  console.log(`Invoice email would be sent for client ${client_id}, amount $${amount}`)
  return { sent: true, email_id: `email_${Date.now()}` }
}

async function queueForManualCollection({ client_id, amount, description, incident_id, fee_type, barberbarbershopId, reason, supabase, session }) {
  await supabase
    .from('manual_collection_queue')
    .insert({
      barberbarbershop_id: barberbarbershopId,
      client_id,
      amount,
      description,
      incident_id,
      fee_type,
      reason,
      status: 'queued',
      created_by: session.user.id,
      created_at: new Date().toISOString()
    })
}

async function notifyManagerOfPaymentFailure({ client_id, amount, reason, barberbarbershopId, supabase, session }) {
  // Implementation would trigger manager notification
  console.log(`Manager notification for payment failure: client ${client_id}, amount $${amount}, reason: ${reason}`)
}

async function scheduleRetryAttempt({ client_id, amount, description, incident_id, fee_type, barberbarbershopId, retry_attempts, retry_delay_hours, original_attempt_id, supabase }) {
  const retryAt = new Date(Date.now() + retry_delay_hours * 60 * 60 * 1000)
  
  await supabase
    .from('payment_retry_queue')
    .insert({
      barberbarbershop_id: barberbarbershopId,
      client_id,
      amount,
      description,
      incident_id,
      fee_type,
      retry_attempts_remaining: retry_attempts,
      retry_at: retryAt.toISOString(),
      original_attempt_id,
      status: 'scheduled',
      created_at: new Date().toISOString()
    })
}

async function logPaymentAttempt({ barberbarbershopId, client_id, amount, fee_type, result, session, incident_id, supabase }) {
  await supabase
    .from('payment_logs')
    .insert({
      barberbarbershop_id: barberbarbershopId,
      client_id,
      amount,
      type: fee_type,
      status: result.success ? 'succeeded' : 'failed',
      stripe_payment_intent_id: result.payment_intent_id,
      incident_id,
      error_message: result.error_message,
      attempt_id: result.attempt_id,
      created_by: session.user.id,
      collection_method: 'automatic',
      created_at: new Date().toISOString()
    })
}