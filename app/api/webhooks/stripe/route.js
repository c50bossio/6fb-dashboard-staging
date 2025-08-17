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

      // Stripe Connect Events
      case 'account.updated':
        await handleAccountUpdated(event.data.object)
        break

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object)
        break

      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object)
        break

      case 'payout.created':
        await handlePayoutCreated(event.data.object)
        break

      case 'payout.paid':
        await handlePayoutPaid(event.data.object)
        break

      case 'payout.failed':
        await handlePayoutFailed(event.data.object)
        break

      case 'person.created':
      case 'person.updated':
        await handlePersonUpdated(event.data.object)
        break

      case 'external_account.created':
        await handleExternalAccountCreated(event.data.object)
        break

      case 'external_account.updated':
        await handleExternalAccountUpdated(event.data.object)
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

// ==========================================
// Stripe Connect Event Handlers
// ==========================================

async function handleAccountUpdated(account) {
  console.log('Connect account updated:', account.id)
  
  try {
    // Import Supabase client
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Update account status in database
    const { error } = await supabase
      .from('stripe_connected_accounts')
      .update({
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        onboarding_completed: account.details_submitted && account.charges_enabled && account.payouts_enabled,
        verification_status: account.charges_enabled && account.payouts_enabled ? 'verified' : 'pending',
        capabilities: account.capabilities,
        requirements: account.requirements,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', account.id)
    
    if (error) {
      console.error('Error updating account status:', error)
      return
    }
    
    // If onboarding is complete, update related records
    if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
      // Get the account record to find user_id
      const { data: accountData } = await supabase
        .from('stripe_connected_accounts')
        .select('user_id, barbershop_id')
        .eq('stripe_account_id', account.id)
        .single()
      
      if (accountData) {
        // Update profile
        await supabase
          .from('profiles')
          .update({
            stripe_connect_onboarded: true,
            payment_setup_completed: true,
            payment_setup_completed_at: new Date().toISOString()
          })
          .eq('id', accountData.user_id)
        
        // Update barbershop
        if (accountData.barbershop_id) {
          await supabase
            .from('barbershops')
            .update({
              accepts_online_payments: true
            })
            .eq('id', accountData.barbershop_id)
        }
        
        console.log(`Account ${account.id} onboarding completed`)
      }
    }
    
  } catch (error) {
    console.error('Error handling account updated:', error)
  }
}

async function handleAccountDeauthorized(account) {
  console.log('Connect account deauthorized:', account.id)
  
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Mark account as deauthorized
    await supabase
      .from('stripe_connected_accounts')
      .update({
        onboarding_completed: false,
        charges_enabled: false,
        payouts_enabled: false,
        verification_status: 'deauthorized',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', account.id)
    
    console.log(`Account ${account.id} deauthorized`)
    
  } catch (error) {
    console.error('Error handling account deauthorized:', error)
  }
}

async function handleCapabilityUpdated(capability) {
  console.log('Capability updated:', capability.id, capability.status)
  
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Update capability status
    const { data: account } = await supabase
      .from('stripe_connected_accounts')
      .select('capabilities')
      .eq('stripe_account_id', capability.account)
      .single()
    
    if (account) {
      const capabilities = account.capabilities || {}
      capabilities[capability.id] = capability.status
      
      await supabase
        .from('stripe_connected_accounts')
        .update({
          capabilities,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_account_id', capability.account)
      
      console.log(`Capability ${capability.id} updated to ${capability.status}`)
    }
    
  } catch (error) {
    console.error('Error handling capability updated:', error)
  }
}

async function handlePayoutCreated(payout) {
  console.log('Payout created:', payout.id)
  
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Get connected account
    const { data: account } = await supabase
      .from('stripe_connected_accounts')
      .select('id, user_id')
      .eq('stripe_account_id', payout.account)
      .single()
    
    if (!account) {
      console.error('No connected account found for payout')
      return
    }
    
    // Record payout transaction
    await supabase
      .from('payout_transactions')
      .insert({
        stripe_connected_account_id: account.id,
        stripe_payout_id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        type: payout.method === 'instant' ? 'instant' : 'standard',
        status: payout.status,
        description: payout.description,
        expected_arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
        initiated_at: new Date(payout.created * 1000).toISOString()
      })
    
    console.log(`Payout ${payout.id} recorded: $${payout.amount / 100}`)
    
  } catch (error) {
    console.error('Error handling payout created:', error)
  }
}

async function handlePayoutPaid(payout) {
  console.log('Payout paid:', payout.id)
  
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Update payout status
    await supabase
      .from('payout_transactions')
      .update({
        status: 'paid',
        arrived_at: new Date().toISOString()
      })
      .eq('stripe_payout_id', payout.id)
    
    // Update payout statistics
    const { data: account } = await supabase
      .from('stripe_connected_accounts')
      .select('id')
      .eq('stripe_account_id', payout.account)
      .single()
    
    if (account) {
      const { data: settings } = await supabase
        .from('payout_settings')
        .select('total_payouts_count, total_payouts_amount')
        .eq('stripe_connected_account_id', account.id)
        .single()
      
      if (settings) {
        await supabase
          .from('payout_settings')
          .update({
            total_payouts_count: (settings.total_payouts_count || 0) + 1,
            total_payouts_amount: (settings.total_payouts_amount || 0) + (payout.amount / 100),
            last_payout_date: new Date().toISOString(),
            last_payout_amount: payout.amount / 100,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_connected_account_id', account.id)
      }
    }
    
    console.log(`Payout ${payout.id} completed: $${payout.amount / 100}`)
    
  } catch (error) {
    console.error('Error handling payout paid:', error)
  }
}

async function handlePayoutFailed(payout) {
  console.log('Payout failed:', payout.id)
  
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Update payout status
    await supabase
      .from('payout_transactions')
      .update({
        status: 'failed',
        failure_code: payout.failure_code,
        failure_message: payout.failure_message
      })
      .eq('stripe_payout_id', payout.id)
    
    console.log(`Payout ${payout.id} failed: ${payout.failure_message}`)
    
    // TODO: Send notification to user about failed payout
    
  } catch (error) {
    console.error('Error handling payout failed:', error)
  }
}

async function handlePersonUpdated(person) {
  console.log('Person updated:', person.id)
  
  // Person updates are for identity verification
  // Log for audit purposes
  console.log(`Person ${person.id} verification status: ${person.verification?.status}`)
}

async function handleExternalAccountCreated(externalAccount) {
  console.log('External account created:', externalAccount.id)
  
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Get connected account
    const { data: account } = await supabase
      .from('stripe_connected_accounts')
      .select('id, user_id')
      .eq('stripe_account_id', externalAccount.account)
      .single()
    
    if (account) {
      // Record bank account
      await supabase
        .from('bank_accounts')
        .insert({
          user_id: account.user_id,
          stripe_connected_account_id: account.id,
          stripe_bank_account_id: externalAccount.id,
          bank_name: externalAccount.bank_name,
          last4: externalAccount.last4,
          currency: externalAccount.currency,
          country: externalAccount.country,
          status: externalAccount.status || 'new',
          is_default: externalAccount.default_for_currency || false,
          created_at: new Date().toISOString()
        })
      
      console.log(`Bank account ${externalAccount.id} added`)
    }
    
  } catch (error) {
    console.error('Error handling external account created:', error)
  }
}

async function handleExternalAccountUpdated(externalAccount) {
  console.log('External account updated:', externalAccount.id)
  
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = createClient()
    
    // Update bank account status
    await supabase
      .from('bank_accounts')
      .update({
        status: externalAccount.status,
        is_default: externalAccount.default_for_currency || false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_bank_account_id', externalAccount.id)
    
    console.log(`Bank account ${externalAccount.id} updated`)
    
  } catch (error) {
    console.error('Error handling external account updated:', error)
  }
}

// ==========================================
// Original Email Function
// ==========================================

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