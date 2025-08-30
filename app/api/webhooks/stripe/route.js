import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { handleProductSalePayment } from '@/lib/product-commission-webhook-handler'
import webhookRetryManager from '@/lib/webhook-retry-manager'
import webhookSecurity from '@/lib/webhook-security'

export const runtime = 'nodejs'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_demo'

export async function POST(request) {
  const startTime = Date.now()
  const headersList = headers()
  const clientIp = headersList.get('x-forwarded-for') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'
  
  try {
    // Security: Rate limiting check
    const rateLimitResult = webhookSecurity.checkRateLimit(clientIp)
    if (!rateLimitResult.allowed) {
      await webhookSecurity.logSecurityEvent('rate_limit_exceeded', {
        client_ip: clientIp,
        requests: rateLimitResult.requestCount,
        limit: rateLimitResult.limit
      }, 'warning')
      
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          reset_time: rateLimitResult.resetTime
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
            ...webhookSecurity.getSecurityHeaders()
          }
        }
      )
    }

    const body = await request.text()
    const sig = headersList.get('stripe-signature')

    let event

    try {
      if (!stripe) {
        return NextResponse.json(
          { error: 'Stripe not configured - webhook processing unavailable' },
          { 
            status: 503,
            headers: webhookSecurity.getSecurityHeaders()
          }
        )
      }
      
      // Enhanced signature verification
      const signatureResult = webhookSecurity.verifyStripeSignature(body, sig, endpointSecret)
      if (!signatureResult.valid) {
        await webhookSecurity.logSecurityEvent('signature_verification_failed', {
          error: signatureResult.error,
          code: signatureResult.code,
          client_ip: clientIp,
          user_agent: userAgent
        }, 'error')
        
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { 
            status: 400,
            headers: webhookSecurity.getSecurityHeaders()
          }
        )
      }

      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
      
      // Validate event structure
      const validationResult = webhookSecurity.validateWebhookPayload(event)
      if (!validationResult.valid) {
        await webhookSecurity.logSecurityEvent('payload_validation_failed', {
          errors: validationResult.errors,
          event_type: event?.type,
          event_id: event?.id
        }, 'error')
        
        return NextResponse.json(
          { error: 'Invalid webhook payload' },
          { 
            status: 400,
            headers: webhookSecurity.getSecurityHeaders()
          }
        )
      }

      // Check for replay attacks
      const replayResult = await webhookSecurity.checkReplayAttack(event.id, event.created)
      if (replayResult.isReplay) {
        await webhookSecurity.logSecurityEvent('replay_attack_detected', {
          event_id: event.id,
          original_processed_at: replayResult.originalProcessedAt,
          client_ip: clientIp
        }, 'warning')
        
        return NextResponse.json(
          { error: 'Event already processed' },
          { 
            status: 409,
            headers: webhookSecurity.getSecurityHeaders()
          }
        )
      }

      // Sanitize event data
      event = webhookSecurity.sanitizeWebhookEvent(event)
      
    } catch (err) {
      console.error('Webhook processing error:', err.message)
      
      await webhookSecurity.logSecurityEvent('webhook_processing_error', {
        error: err.message,
        client_ip: clientIp,
        user_agent: userAgent
      }, 'error')
      
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { 
          status: 400,
          headers: webhookSecurity.getSecurityHeaders()
        }
      )
    }

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

      // Terminal Payment Events
      case 'terminal.reader.action_succeeded':
        await handleTerminalActionSucceeded(event.data.object)
        break

      case 'terminal.reader.action_failed':
        await handleTerminalActionFailed(event.data.object)
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

      // Booking Payment Events
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceededEnhanced(event.data.object)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object)
        break

      // Transfer webhook events for commission tracking
      case 'transfer.created':
        await handleTransferCreated(event.data.object)
        break

      case 'transfer.paid':
        await handleTransferPaid(event.data.object)
        break

      case 'transfer.failed':
        await handleTransferFailed(event.data.object)
        break

      case 'transfer.reversed':
        await handleTransferReversed(event.data.object)
        break

      default:
        // Unhandled event type
        break
    }

    // Record successful processing
    const processingTime = Date.now() - startTime
    
    // Update processing statistics
    await updateWebhookStats(event.type, true, processingTime)
    
    // Log successful processing
    await webhookSecurity.logSecurityEvent('webhook_processed_successfully', {
      event_type: event.type,
      event_id: event.id,
      processing_time_ms: processingTime,
      client_ip: clientIp
    }, 'info')

    return NextResponse.json({ 
      received: true,
      processed_at: new Date().toISOString(),
      processing_time_ms: processingTime
    }, {
      headers: webhookSecurity.getSecurityHeaders()
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    console.error('Webhook error:', error)
    
    // Record failed processing
    await updateWebhookStats(event?.type || 'unknown', false, processingTime)
    
    // Log error
    await webhookSecurity.logSecurityEvent('webhook_processing_failed', {
      error: error.message,
      stack: error.stack,
      event_type: event?.type,
      event_id: event?.id,
      processing_time_ms: processingTime,
      client_ip: clientIp
    }, 'error')
    
    // Add to dead letter queue for manual review
    if (event) {
      await webhookRetryManager.createDeadLetterRecord(
        event.type,
        event,
        `Processing failed: ${error.message}`
      )
    }
    
    return NextResponse.json(
      { error: 'Webhook handler failed', details: error.message },
      { 
        status: 500,
        headers: webhookSecurity.getSecurityHeaders()
      }
    )
  }
}

// Helper function to update webhook statistics
async function updateWebhookStats(eventType, success, processingTimeMs) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    await supabase.rpc('update_webhook_stats', {
      p_event_type: eventType,
      p_success: success,
      p_processing_time_ms: processingTimeMs
    })
  } catch (error) {
    console.error('Failed to update webhook stats:', error)
  }
}

async function handleSubscriptionCreated(subscription) {
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

    await sendSubscriptionEmail(tenantId, 'welcome', {
      plan_name: planName,
      trial_end: subscriptionData.trial_end
    })

  } catch (error) {
    console.error('Error handling subscription created:', error)
  }
}

async function handleSubscriptionUpdated(subscription) {
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
      await sendSubscriptionEmail(tenantId, 'activated', {
        subscription_id: subscription.id
      })
    } else if (subscription.status === 'canceled') {
      await sendSubscriptionEmail(tenantId, 'canceled', {
        canceled_at: new Date()
      })
    } else if (subscription.status === 'past_due') {
      await sendSubscriptionEmail(tenantId, 'payment_failed', {
        retry_date: new Date(subscription.current_period_end * 1000)
      })
    }

  } catch (error) {
    console.error('Error handling subscription updated:', error)
  }
}

async function handleSubscriptionDeleted(subscription) {
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

  } catch (error) {
    console.error('Error handling subscription deleted:', error)
  }
}

async function handlePaymentSucceeded(invoice) {
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

  } catch (error) {
    console.error('Error handling payment succeeded:', error)
  }
}

async function handlePaymentFailed(invoice) {
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

  } catch (error) {
    console.error('Error handling payment failed:', error)
  }
}

async function handleTrialWillEnd(subscription) {
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

  } catch (error) {
    console.error('Error handling trial will end:', error)
  }
}

async function handleCheckoutCompleted(session) {
  // Route to appropriate handler based on payment type
  if (session.metadata?.source === 'pos_system') {
    await handlePOSPaymentLinkCompleted(session)
    return
  }
  
  // Check if this is a QR code payment
  if (session.metadata?.payment_type === 'qr_code_pos') {
    await handleQRPaymentCompleted(session)
    return
  }

  const userId = session.client_reference_id || session.metadata?.userId
  const plan = session.metadata?.plan
  const billing = session.metadata?.billing

  if (!userId) {
    console.error('No user ID in checkout session')
    return
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const { createBarbershopForOwner } = await import('@/lib/barbershop-helper')
    const supabase = await createClient()
    
    // Map plan to role and standardize tier naming
    let role = 'SHOP_OWNER'
    let subscription_tier = 'PROFESSIONAL'  // Default to PROFESSIONAL for backwards compatibility
    
    if (plan === 'barber') {
      role = 'BARBER'
      subscription_tier = 'INDIVIDUAL'
    } else if (plan === 'shop') {
      role = 'SHOP_OWNER'
      subscription_tier = 'PROFESSIONAL'  // Shop Owner = PROFESSIONAL tier
    } else if (plan === 'enterprise') {
      role = 'ENTERPRISE_OWNER'
      subscription_tier = 'ENTERPRISE'
    }

    // Update user profile with role and subscription info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role: role,
        subscription_status: 'active',
        subscription_tier: subscription_tier,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription
      })
      .eq('id', userId)
      .select()
      .single()
      
    if (profileError) {
      console.error('Failed to update profile:', profileError)
      return
    }

    // Get user details for barbershop creation
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    
    if (!user) {
      console.error('User not found:', userId)
      return
    }
    
    // Create barbershop for barbers and shop owners
    if (role === 'BARBER' || role === 'SHOP_OWNER') {
      try {
        const userName = profile.first_name || profile.full_name || user.email?.split('@')[0]
        const shopName = role === 'BARBER' 
          ? `${userName}'s Chair` 
          : `${userName}'s Barbershop`
        
        const barbershop = await createBarbershopForOwner(user, {
          name: shopName,
          email: user.email,
          type: role === 'BARBER' ? 'individual' : 'multi-barber'
        })

        // Update profile with shop_id
        await supabase
          .from('profiles')
          .update({ barbershop_id: barbershop.id })
          .eq('id', userId)
          
      } catch (barbershopError) {
        console.error('Barbershop creation failed in webhook:', barbershopError)
      }
    }
    
    // For enterprise owners, create organization
    if (role === 'ENTERPRISE_OWNER') {
      try {
        const userName = profile.first_name || profile.full_name || user.email?.split('@')[0]
        
        const { data: organization } = await supabase
          .from('organizations')
          .insert({
            name: `${userName}'s Organization`,
            owner_id: userId,
            tier: 'enterprise'
          })
          .select()
          .single()
          
        if (organization) {

          // Create first barbershop
          const barbershop = await createBarbershopForOwner(user, {
            name: `${organization.name} - Main Location`,
            organization_id: organization.id
          })

        }
      } catch (orgError) {
        console.error('Organization creation failed in webhook:', orgError)
      }
    }
    
    // Send welcome email
    await sendSubscriptionEmail(userId, 'checkout_completed', {
      plan_name: plan,
      amount: session.amount_total / 100,
      customer_portal_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`
    })

  } catch (error) {
    console.error('Error handling checkout completed:', error)
  }
}

async function handleCustomerCreated(customer) {
  try {
    // Customer created processing would go here
  } catch (error) {
    console.error('Error handling customer created:', error)
  }
}

async function handleInvoiceCreated(invoice) {
  const tenantId = invoice.subscription_details?.metadata?.tenant_id
  
  if (!tenantId) {
    return // Not all invoices have tenant metadata
  }

  try {
    const hasUsageCharges = invoice.lines.data.some(line => 
      line.description && line.description.includes('token')
    )

    if (hasUsageCharges) {
      
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
  try {
    // Import Supabase client
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
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
        .select('user_id, barberbarbershop_id')
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
        if (accountData.barberbarbershop_id) {
          await supabase
            .from('barbershops')
            .update({
              accepts_online_payments: true
            })
            .eq('id', accountData.barberbarbershop_id)
        }
        
      }
    }
    
  } catch (error) {
    console.error('Error handling account updated:', error)
  }
}

async function handleAccountDeauthorized(account) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
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

  } catch (error) {
    console.error('Error handling account deauthorized:', error)
  }
}

async function handleCapabilityUpdated(capability) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
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
      
    }
    
  } catch (error) {
    console.error('Error handling capability updated:', error)
  }
}

async function handlePayoutCreated(payout) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
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

  } catch (error) {
    console.error('Error handling payout created:', error)
  }
}

async function handlePayoutPaid(payout) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
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

  } catch (error) {
    console.error('Error handling payout paid:', error)
  }
}

async function handlePayoutFailed(payout) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Update payout status
    await supabase
      .from('payout_transactions')
      .update({
        status: 'failed',
        failure_code: payout.failure_code,
        failure_message: payout.failure_message
      })
      .eq('stripe_payout_id', payout.id)

    // TODO: Send notification to user about failed payout
    
  } catch (error) {
    console.error('Error handling payout failed:', error)
  }
}

async function handlePersonUpdated(person) {
  // Person updates are for identity verification
  // Log for audit purposes
}

async function handleExternalAccountCreated(externalAccount) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
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
      
    }
    
  } catch (error) {
    console.error('Error handling external account created:', error)
  }
}

async function handleExternalAccountUpdated(externalAccount) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Update bank account status
    await supabase
      .from('bank_accounts')
      .update({
        status: externalAccount.status,
        is_default: externalAccount.default_for_currency || false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_bank_account_id', externalAccount.id)

  } catch (error) {
    console.error('Error handling external account updated:', error)
  }
}

// ==========================================
// Booking Payment Event Handlers
// ==========================================

async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Check if this is a booking payment
    const bookingId = paymentIntent.metadata?.booking_id
    if (!bookingId || bookingId === 'pending') {
        return
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('Booking not found for payment intent:', paymentIntent.id, bookingError)
      return
    }

    // Extract payment metadata
    const metadata = paymentIntent.metadata
    const paymentAmount = paymentIntent.amount / 100 // Convert from cents
    const isDeposit = metadata.is_deposit === 'true'
    const remainingAmount = parseFloat(metadata.remaining_amount || '0')

    // Create payment metadata
    const paymentMetadata = {
      payment_status: 'completed',
      stripe_payment_intent_id: paymentIntent.id,
      amount_paid: paymentAmount,
      currency: paymentIntent.currency,
      payment_method: 'card',
      is_deposit: isDeposit,
      remaining_amount: remainingAmount,
      paid_at: new Date().toISOString(),
      webhook_processed_at: new Date().toISOString(),
      customer_info: {
        name: metadata.customer_name,
        email: metadata.customer_email,
        phone: metadata.customer_phone
      }
    }

    // Update booking with payment information
    let updatedNotes = booking.notes || ''
    if (updatedNotes.trim()) {
      updatedNotes += '\n\n'
    }
    updatedNotes += `PAYMENT_METADATA: ${JSON.stringify(paymentMetadata)}`

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error updating booking after payment:', updateError)
      return
    }

    // Send confirmation email
    await sendBookingConfirmationEmail({
      booking: { ...booking, status: 'confirmed' },
      customerEmail: metadata.customer_email,
      customerName: metadata.customer_name,
      amountPaid: paymentAmount,
      remainingAmount: remainingAmount,
      isDeposit: isDeposit,
      paymentMethod: 'card'
    })

    // Process product sale commission if applicable
    const productSaleResult = await handleProductSalePayment(paymentIntent, supabase)
    
    if (productSaleResult.success && productSaleResult.reason !== 'no_product_sale') {
      console.log(`Product sale commission processed successfully`)
    }

    // Calculate and record service commission if financial arrangement exists
    const commissionResult = await processCommissionCalculation(paymentIntent, supabase)
    
    if (commissionResult.success) {
      console.log(`Commission processed successfully`)
      
      // Update booking metadata with commission info
      const commissionMetadata = {
        commission_calculated: true,
        service_commission_amount: commissionResult.commission_amount,
        product_commission_amount: productSaleResult.commission_amount || 0,
        total_commission_amount: commissionResult.commission_amount + (productSaleResult.commission_amount || 0),
        shop_amount: commissionResult.shop_amount,
        transaction_id: commissionResult.transaction_id,
        arrangement_type: commissionResult.arrangement_type,
        has_product_sales: productSaleResult.success && productSaleResult.reason !== 'no_product_sale'
      }
      
      // Add commission info to booking notes
      let commissionNotes = booking.notes || ''
      if (commissionNotes.trim()) {
        commissionNotes += '\n\n'
      }
      commissionNotes += `COMMISSION_INFO: ${JSON.stringify(commissionMetadata)}`
      
      await supabase
        .from('bookings')
        .update({
          notes: commissionNotes
        })
        .eq('id', bookingId)
    } else if (commissionResult.reason !== 'no_arrangement') {
      console.warn(`⚠️ Service commission calculation failed: ${commissionResult.reason}`)
    }

    // Send notification via booking notification service
    await sendBookingNotification({
      event_type: 'payment_intent.succeeded',
      booking_id: bookingId,
      data: {
        payment_intent: paymentIntent,
        metadata: paymentIntent.metadata,
        amount_paid: paymentAmount,
        is_deposit: isDeposit,
        remaining_amount: remainingAmount
      },
      timestamp: new Date().toISOString(),
      source: 'stripe'
    })

  } catch (error) {
    console.error('Error handling payment intent succeeded:', error)
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Check if this is a booking payment
    const bookingId = paymentIntent.metadata?.booking_id
    if (!bookingId || bookingId === 'pending') {
      return
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('Booking not found for failed payment:', paymentIntent.id)
      return
    }

    // Create failure metadata
    const failureMetadata = {
      payment_status: 'failed',
      stripe_payment_intent_id: paymentIntent.id,
      failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
      failure_code: paymentIntent.last_payment_error?.code || 'unknown',
      failed_at: new Date().toISOString(),
      customer_info: {
        name: paymentIntent.metadata.customer_name,
        email: paymentIntent.metadata.customer_email,
        phone: paymentIntent.metadata.customer_phone
      }
    }

    // Update booking with failure information
    let updatedNotes = booking.notes || ''
    if (updatedNotes.trim()) {
      updatedNotes += '\n\n'
    }
    updatedNotes += `PAYMENT_FAILURE: ${JSON.stringify(failureMetadata)}`

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'payment_failed',
        notes: updatedNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error updating booking after payment failure:', updateError)
    }

    // Send notification via booking notification service
    await sendBookingNotification({
      event_type: 'payment_intent.payment_failed',
      booking_id: bookingId,
      data: {
        payment_intent: paymentIntent,
        metadata: paymentIntent.metadata,
        failure_reason: failureMetadata.failure_reason,
        failure_code: failureMetadata.failure_code
      },
      timestamp: new Date().toISOString(),
      source: 'stripe'
    })

  } catch (error) {
    console.error('Error handling payment intent failed:', error)
  }
}

async function sendBookingConfirmationEmail({ booking, customerEmail, customerName, amountPaid, remainingAmount, isDeposit, paymentMethod }) {
  // Email details are logged through the email service
  
  // TODO: Integrate with actual email service
  // For now, this is just logging the email details
  return true
}

// ==========================================
// Commission Calculation Functions
// ==========================================

async function processCommissionCalculation(paymentIntent, supabase) {
  try {
    const metadata = paymentIntent.metadata
    const arrangementId = metadata.arrangement_id
    const barberId = metadata.barber_id
    const barberbarbershopId = metadata.barberbarbershop_id
    
    // Skip if no arrangement data - this is normal for non-commission payments
    if (!arrangementId || !barberId || !barberbarbershopId) {
      
      return { success: false, reason: 'no_arrangement' }
    }

    // Get the financial arrangement details with retry mechanism
    let arrangement, arrangementError
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase
        .from('financial_arrangements')
        .select('*')
        .eq('id', arrangementId)
        .eq('is_active', true)
        .single()
      
      arrangement = result.data
      arrangementError = result.error
      
      if (!arrangementError) break
      
      console.warn(`Arrangement fetch attempt ${attempt + 1} failed:`, arrangementError.message)
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000))
    }

    if (arrangementError || !arrangement) {
      console.error('Error fetching arrangement after retries:', arrangementError)
      await recordCommissionError(paymentIntent.id, 'arrangement_not_found', arrangementError?.message, supabase)
      return { success: false, reason: 'arrangement_error', error: arrangementError }
    }

    const paymentAmount = paymentIntent.amount / 100 // Convert from cents
    let commissionAmount = 0
    let shopAmount = 0
    let tierInfo = null
    let tierBonus = 0

    // Check if barber is using tier system
    if (arrangement.use_tier_system && arrangement.tier_structure_id) {
      const tierCalculation = await calculateTieredCommissionWebhook(
        paymentAmount, 
        barberId, 
        barberbarbershopId, 
        arrangement, 
        supabase
      )
      
      if (tierCalculation.success) {
        commissionAmount = tierCalculation.barberAmount
        shopAmount = tierCalculation.shopAmount
        tierInfo = tierCalculation.tierInfo
        tierBonus = tierCalculation.tierInfo?.tierBonus || 0
        
        console.log(`Using tier-based commission calculation`)
      } else {
        console.warn(`⚠️ Tier calculation failed, falling back to standard: ${tierCalculation.error}`)
        // Fall through to standard calculation
      }
    }

    // Standard calculation if not using tiers or tier calculation failed
    if (!tierInfo) {
      // Calculate commission based on arrangement type with proper validation
      switch (arrangement.type) {
        case 'commission':
          if (!arrangement.commission_percentage || arrangement.commission_percentage < 0 || arrangement.commission_percentage > 100) {
            throw new Error(`Invalid commission percentage: ${arrangement.commission_percentage}`)
          }
          commissionAmount = paymentAmount * (arrangement.commission_percentage / 100)
          shopAmount = paymentAmount - commissionAmount
          break
          
        case 'hybrid':
          if (!arrangement.commission_percentage || arrangement.commission_percentage < 0 || arrangement.commission_percentage > 100) {
            throw new Error(`Invalid hybrid commission percentage: ${arrangement.commission_percentage}`)
          }
          commissionAmount = paymentAmount * (arrangement.commission_percentage / 100)
          shopAmount = paymentAmount - commissionAmount
          // TODO: Add revenue threshold logic for hybrid model
          break
          
        case 'booth_rent':
          // For booth rent, barber keeps everything except fixed rent (handled separately)
          commissionAmount = paymentAmount
          shopAmount = 0
          break
          
        default:
          throw new Error(`Unknown arrangement type: ${arrangement.type}`)
      }
    }

    // Validate calculated amounts
    if (commissionAmount < 0 || shopAmount < 0) {
      throw new Error(`Invalid calculated amounts: commission=$${commissionAmount}, shop=$${shopAmount}`)
    }

    if (Math.abs((commissionAmount + shopAmount) - paymentAmount) > 0.01 && arrangement.type !== 'booth_rent') {
      throw new Error(`Amount mismatch: commission($${commissionAmount}) + shop($${shopAmount}) != payment($${paymentAmount})`)
    }

    // Record the commission transaction with comprehensive metadata
    const commissionTransaction = {
      payment_intent_id: paymentIntent.id,
      arrangement_id: arrangementId,
      barber_id: barberId,
      barberbarbershop_id: barberbarbershopId,
      payment_amount: paymentAmount,
      commission_amount: commissionAmount,
      shop_amount: shopAmount,
      commission_percentage: tierInfo?.applicableTier?.commission_percentage || arrangement.commission_percentage || 0,
      arrangement_type: arrangement.type,
      status: 'pending_payout',
      created_at: new Date().toISOString(),
      metadata: {
        booking_id: metadata.booking_id,
        service_id: metadata.service_id,
        payment_type: metadata.payment_type || 'card',
        customer_email: metadata.customer_email,
        webhook_processed_at: new Date().toISOString(),
        calculation_method: tierInfo ? 'tiered_commission' : arrangement.type,
        original_arrangement: {
          id: arrangement.id,
          commission_percentage: arrangement.commission_percentage,
          type: arrangement.type
        },
        tier_information: tierInfo ? {
          current_tier: tierInfo.currentTier,
          applicable_tier: tierInfo.applicableTier,
          tier_upgrade: tierInfo.tierUpgrade,
          tier_bonus: tierInfo.tierBonus,
          current_period_revenue: tierInfo.currentPeriodRevenue,
          projected_revenue: tierInfo.projectedRevenue
        } : null
      }
    }

    // Add tier-specific fields if using tier system
    if (tierInfo) {
      commissionTransaction.tier_id = tierInfo.applicableTier?.id
      commissionTransaction.tier_level = tierInfo.applicableTier?.tier_level
      commissionTransaction.base_commission_rate = tierInfo.currentTier?.commission_percentage
      commissionTransaction.tier_commission_rate = tierInfo.applicableTier?.commission_percentage
      commissionTransaction.tier_bonus_amount = tierInfo.tierBonus || 0
    }

    const { data: insertedTransaction, error: insertError } = await supabase
      .from('commission_transactions')
      .insert(commissionTransaction)
      .select()
      .single()

    if (insertError) {
      console.error('Error recording commission transaction:', insertError)
      await recordCommissionError(paymentIntent.id, 'transaction_insert_failed', insertError.message, supabase)
      return { success: false, reason: 'insert_error', error: insertError }
    }

    // Update barber's commission balance with atomic operations
    const balanceResult = await updateBarberCommissionBalance(
      barberId, 
      barberbarbershopId, 
      commissionAmount, 
      insertedTransaction.id, 
      supabase
    )

    if (!balanceResult.success) {
      console.error('Balance update failed:', balanceResult.error)
      // Mark transaction as failed if balance update fails
      await supabase
        .from('commission_transactions')
        .update({ 
          status: 'balance_update_failed',
          metadata: { 
            ...commissionTransaction.metadata, 
            balance_error: balanceResult.error 
          }
        })
        .eq('id', insertedTransaction.id)
      
      return balanceResult
    }

    // Update arrangement totals
    await supabase
      .from('financial_arrangements')
      .update({
        total_commissions_earned: (arrangement.total_commissions_earned || 0) + commissionAmount,
        last_commission_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', arrangementId)

    console.log(`Updated arrangement totals for arrangement ${arrangementId}`)

    // Update tier progress if tier system is active
    if (tierInfo) {
      await updateBarberTierProgressWebhook(
        barberId, 
        barberbarbershopId, 
        paymentAmount, 
        tierInfo, 
        supabase
      )
    }

    return { 
      success: true, 
      commission_amount: commissionAmount,
      shop_amount: shopAmount,
      transaction_id: insertedTransaction.id,
      arrangement_type: arrangement.type,
      tier_info: tierInfo
    }

  } catch (error) {
    console.error('Error processing commission calculation:', error)
    await recordCommissionError(paymentIntent.id, 'calculation_failed', error.message, supabase)
    return { success: false, reason: 'calculation_error', error: error.message }
  }
}

// ==========================================
// Tiered Commission Calculation for Webhooks
// ==========================================

async function calculateTieredCommissionWebhook(amount, barberId, barberbarbershopId, arrangement, supabase) {
  try {
    // Get barber's current tier assignment
    const { data: tierAssignment } = await supabase
      .from('barber_tier_assignments')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('is_active', true)
      .single()

    if (!tierAssignment) {
      return { success: false, error: 'No tier assignment found' }
    }

    // Fetch the current tier details separately
    const { data: currentTier } = await supabase
      .from('commission_tiers')
      .select('*')
      .eq('id', tierAssignment.current_tier_id)
      .single()

    // Calculate what the new revenue will be after this transaction
    const projectedRevenue = tierAssignment.current_period_revenue + amount

    // Get all tiers for this structure to find the appropriate tier
    const { data: allTiers } = await supabase
      .from('commission_tiers')
      .select('*')
      .eq('structure_id', arrangement.tier_structure_id)
      .order('tier_level', { ascending: true })

    if (!allTiers || allTiers.length === 0) {
      return { success: false, error: 'No tiers found for structure' }
    }

    // Find the highest tier this barber qualifies for with new transaction
    let applicableTier = allTiers[0] // Default to lowest tier
    for (const tier of allTiers) {
      if (projectedRevenue >= tier.threshold_amount) {
        applicableTier = tier
      } else {
        break
      }
    }

    const tierRate = applicableTier.commission_percentage / 100
    const barberAmount = amount * tierRate
    const shopAmount = amount * (1 - tierRate)

    // Calculate tier bonus if applicable
    let tierBonus = 0
    const currentTierLevel = tierAssignment.current_tier?.tier_level || 1
    const newTierLevel = applicableTier.tier_level

    if (newTierLevel > currentTierLevel) {
      // Tier upgrade bonus (2% of transaction)
      tierBonus = amount * 0.02
    }

    // Get next tier threshold for progress calculations
    const nextTierThreshold = getNextTierThresholdWebhook(allTiers, applicableTier.tier_level)
    const progressToNextTier = calculateTierProgressWebhook(projectedRevenue, allTiers, applicableTier.tier_level)

    return {
      success: true,
      barberAmount: barberAmount + tierBonus,
      shopAmount: shopAmount - tierBonus,
      commissionRate: applicableTier.commission_percentage,
      arrangementType: arrangement.type,
      tierInfo: {
        currentTier: tierAssignment.current_tier,
        applicableTier: applicableTier,
        tierUpgrade: newTierLevel > currentTierLevel,
        tierBonus: tierBonus,
        currentPeriodRevenue: tierAssignment.current_period_revenue,
        projectedRevenue: projectedRevenue,
        nextTierThreshold: nextTierThreshold,
        progressToNextTier: progressToNextTier
      }
    }
  } catch (error) {
    console.error('Error calculating tiered commission:', error)
    return { success: false, error: error.message }
  }
}

async function updateBarberTierProgressWebhook(barberId, barberbarbershopId, transactionAmount, tierInfo, supabase) {
  try {
    const { data: assignment } = await supabase
      .from('barber_tier_assignments')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('is_active', true)
      .single()

    if (!assignment) {
      console.error('No tier assignment found for progress update')
      return
    }

    const newRevenue = assignment.current_period_revenue + transactionAmount
    const newBookings = assignment.current_period_bookings + 1

    // Calculate daily average and projection
    const startDate = new Date(assignment.current_period_start)
    const now = new Date()
    const daysSinceStart = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)))
    const dailyAvg = newRevenue / daysSinceStart
    
    const endDate = new Date(assignment.current_period_end)
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    const projectedRevenue = dailyAvg * totalDays

    // Update tier assignment progress
    const { error } = await supabase
      .from('barber_tier_assignments')
      .update({
        current_period_revenue: newRevenue,
        current_period_bookings: newBookings,
        current_tier_id: tierInfo.applicableTier?.id || assignment.current_tier_id,
        daily_avg_revenue: dailyAvg,
        projected_period_revenue: projectedRevenue,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment.id)

    if (error) {
      console.error('Error updating tier progress:', error)
      return
    }

    // Log tier achievement if tier upgraded
    if (tierInfo.tierUpgrade) {
      await supabase
        .from('commission_tier_history')
        .insert({
          barber_id: barberId,
          barberbarbershop_id: barberbarbershopId,
          tier_id: tierInfo.applicableTier.id,
          period_start: assignment.current_period_start,
          period_end: assignment.current_period_end,
          achieved_at: new Date().toISOString(),
          period_revenue: newRevenue,
          period_bookings: newBookings,
          final_tier_level: tierInfo.applicableTier.tier_level,
          avg_commission_rate: tierInfo.applicableTier.commission_percentage
        })

      console.log(`Tier commission calculated successfully`)
    }

    console.log(`Commission processed: ${(commissionAmount / 100).toFixed(2)}`)
    console.log(`Arrangement type: ${arrangement.type} (${arrangement.percentage * 100}%)`)
    
  } catch (error) {
    console.error('Error updating barber tier progress:', error)
  }
}

// Helper functions for tier calculations
function getNextTierThresholdWebhook(allTiers, currentLevel) {
  const nextTier = allTiers.find(tier => tier.tier_level === currentLevel + 1)
  return nextTier ? nextTier.threshold_amount : null
}

function calculateTierProgressWebhook(currentRevenue, allTiers, currentLevel) {
  const currentTier = allTiers.find(tier => tier.tier_level === currentLevel)
  const nextTier = allTiers.find(tier => tier.tier_level === currentLevel + 1)

  if (!nextTier) return 100 // At highest tier

  const rangeStart = currentTier?.threshold_amount || 0
  const rangeEnd = nextTier.threshold_amount
  const progress = ((currentRevenue - rangeStart) / (rangeEnd - rangeStart)) * 100

  return Math.max(0, Math.min(100, progress))
}

// Helper function to update barber commission balance atomically
async function updateBarberCommissionBalance(barberId, barberbarbershopId, commissionAmount, transactionId, supabase) {
  try {
    // Use upsert with conflict resolution for atomic balance updates
    const { data: balanceData, error: balanceError } = await supabase
      .from('barber_commission_balances')
      .upsert({
        barber_id: barberId,
        barberbarbershop_id: barberbarbershopId,
        pending_amount: supabase.raw(`COALESCE(pending_amount, 0) + ${commissionAmount}`),
        total_earned: supabase.raw(`COALESCE(total_earned, 0) + ${commissionAmount}`),
        last_transaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'barber_id,barberbarbershop_id',
        returning: 'representation'
      })
      .select()

    if (balanceError) {
      // Fallback to manual update if upsert fails
      console.warn('Upsert failed, attempting manual balance update:', balanceError.message)
      
      const { data: existingBalance } = await supabase
        .from('barber_commission_balances')
        .select('*')
        .eq('barber_id', barberId)
        .eq('barberbarbershop_id', barberbarbershopId)
        .single()

      if (existingBalance) {
        const { error: updateError } = await supabase
          .from('barber_commission_balances')
          .update({
            pending_amount: (existingBalance.pending_amount || 0) + commissionAmount,
            total_earned: (existingBalance.total_earned || 0) + commissionAmount,
            last_transaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBalance.id)

        if (updateError) {
          return { success: false, error: updateError.message }
        }
      } else {
        const { error: insertError } = await supabase
          .from('barber_commission_balances')
          .insert({
            barber_id: barberId,
            barberbarbershop_id: barberbarbershopId,
            pending_amount: commissionAmount,
            paid_amount: 0,
            total_earned: commissionAmount,
            last_transaction_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          })

        if (insertError) {
          return { success: false, error: insertError.message }
        }
      }
    }

    return { success: true, balance_data: balanceData }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Helper function to record commission processing errors for debugging
async function recordCommissionError(paymentIntentId, errorType, errorMessage, supabase) {
  try {
    await supabase
      .from('commission_processing_errors')
      .insert({
        payment_intent_id: paymentIntentId,
        error_type: errorType,
        error_message: errorMessage,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to record commission error:', error.message)
  }
}

// ==========================================
// Original Email Function
// ==========================================

async function sendBookingNotification(webhookData) {
  try {
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001'
    
    const response = await fetch(`${backendUrl}/api/v1/booking-notifications/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FASTAPI_API_KEY || 'development-key'}`
      },
      body: JSON.stringify(webhookData)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Failed to send booking notification: ${response.status} ${error}`)
      return false
    }

    const result = await response.json()
    
    return true
  } catch (error) {
    console.error('Error sending booking notification:', error)
    // Don't throw - webhook should still succeed even if notification fails
    return false
  }
}

// ==========================================
// Transfer Webhook Handlers for Commission Tracking
// ==========================================

async function handleTransferCreated(transfer) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Get commission transaction associated with this transfer
    const commissionTransactionId = transfer.metadata?.commission_transaction_id
    const payoutTransactionId = transfer.metadata?.payout_transaction_id
    
    if (commissionTransactionId) {
      // This is a commission-based transfer
      await supabase
        .from('commission_transactions')
        .update({
          status: 'transferring',
          metadata: supabase.raw(`metadata || '{"stripe_transfer_id": "${transfer.id}", "transfer_created_at": "${new Date().toISOString()}"}'::jsonb`)
        })
        .eq('id', commissionTransactionId)

    } else if (payoutTransactionId) {
      // This is a manual payout transfer
      await supabase
        .from('commission_payout_records')
        .update({
          status: 'processing',
          stripe_transfer_id: transfer.id,
          metadata: supabase.raw(`metadata || '{"transfer_created_at": "${new Date().toISOString()}"}'::jsonb`)
        })
        .eq('id', payoutTransactionId)

    } else {
      
    }
    
  } catch (error) {
    console.error('Error handling transfer created:', error)
  }
}

async function handleTransferPaid(transfer) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    const commissionTransactionId = transfer.metadata?.commission_transaction_id
    const payoutTransactionId = transfer.metadata?.payout_transaction_id
    const transferAmount = transfer.amount / 100 // Convert from cents
    
    if (commissionTransactionId) {
      // Update commission transaction to completed
      const { data: commissionTx } = await supabase
        .from('commission_transactions')
        .update({
          status: 'paid_out',
          paid_out_at: new Date().toISOString(),
          metadata: supabase.raw(`metadata || '{"stripe_transfer_paid_at": "${new Date().toISOString()}", "transfer_amount": ${transferAmount}}'::jsonb`)
        })
        .eq('id', commissionTransactionId)
        .select('barber_id, barberbarbershop_id, commission_amount')
        .single()
      
      if (commissionTx) {
        // Update barber balance - move from pending to paid
        await supabase
          .from('barber_commission_balances')
          .update({
            pending_amount: supabase.raw(`GREATEST(pending_amount - ${transferAmount}, 0)`),
            paid_amount: supabase.raw(`paid_amount + ${transferAmount}`),
            updated_at: new Date().toISOString()
          })
          .eq('barber_id', commissionTx.barber_id)
          .eq('barberbarbershop_id', commissionTx.barberbarbershop_id)
        
        // Send notification to barber
        await sendCommissionPaidNotification({
          barberId: commissionTx.barber_id,
          barberbarbershopId: commissionTx.barberbarbershop_id,
          amount: transferAmount,
          transferId: transfer.id,
          method: 'stripe_transfer'
        })

      }
      
    } else if (payoutTransactionId) {
      // Update payout record to completed
      await supabase
        .from('commission_payout_records')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: supabase.raw(`metadata || '{"stripe_transfer_paid_at": "${new Date().toISOString()}"}'::jsonb`)
        })
        .eq('id', payoutTransactionId)

    }
    
  } catch (error) {
    console.error('Error handling transfer paid:', error)
  }
}

async function handleTransferFailed(transfer) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    const commissionTransactionId = transfer.metadata?.commission_transaction_id
    const payoutTransactionId = transfer.metadata?.payout_transaction_id
    const failureCode = transfer.failure_code
    const failureMessage = transfer.failure_message
    
    if (commissionTransactionId) {
      // Mark commission transaction as failed
      await supabase
        .from('commission_transactions')
        .update({
          status: 'transfer_failed',
          metadata: supabase.raw(`metadata || '{"transfer_failed_at": "${new Date().toISOString()}", "failure_code": "${failureCode}", "failure_message": "${failureMessage}"}'::jsonb`)
        })
        .eq('id', commissionTransactionId)
      
      console.error(`❌ Commission transfer failed: ${failureMessage} (${failureCode})`)
      
      // TODO: Create retry mechanism or alert shop owner
      
    } else if (payoutTransactionId) {
      // Mark payout as failed
      await supabase
        .from('commission_payout_records')
        .update({
          status: 'failed',
          metadata: supabase.raw(`metadata || '{"transfer_failed_at": "${new Date().toISOString()}", "failure_code": "${failureCode}", "failure_message": "${failureMessage}"}'::jsonb`)
        })
        .eq('id', payoutTransactionId)
      
      console.error(`❌ Payout transfer failed: ${failureMessage} (${failureCode})`)
    }
    
  } catch (error) {
    console.error('Error handling transfer failed:', error)
  }
}

async function handleTransferReversed(transfer) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    const commissionTransactionId = transfer.metadata?.commission_transaction_id
    const payoutTransactionId = transfer.metadata?.payout_transaction_id
    const reversedAmount = transfer.amount / 100
    
    if (commissionTransactionId) {
      // Reverse commission transaction
      const { data: commissionTx } = await supabase
        .from('commission_transactions')
        .update({
          status: 'transfer_reversed',
          metadata: supabase.raw(`metadata || '{"transfer_reversed_at": "${new Date().toISOString()}", "reversal_reason": "stripe_transfer_reversed"}'::jsonb`)
        })
        .eq('id', commissionTransactionId)
        .select('barber_id, barberbarbershop_id')
        .single()
      
      if (commissionTx) {
        // Reverse barber balance - move back from paid to pending
        await supabase
          .from('barber_commission_balances')
          .update({
            pending_amount: supabase.raw(`pending_amount + ${reversedAmount}`),
            paid_amount: supabase.raw(`GREATEST(paid_amount - ${reversedAmount}, 0)`),
            updated_at: new Date().toISOString()
          })
          .eq('barber_id', commissionTx.barber_id)
          .eq('barberbarbershop_id', commissionTx.barberbarbershop_id)

      }
      
    } else if (payoutTransactionId) {
      // Mark payout as reversed
      await supabase
        .from('commission_payout_records')
        .update({
          status: 'reversed',
          metadata: supabase.raw(`metadata || '{"transfer_reversed_at": "${new Date().toISOString()}"}'::jsonb`)
        })
        .eq('id', payoutTransactionId)

    }
    
  } catch (error) {
    console.error('Error handling transfer reversed:', error)
  }
}

// Helper function to send commission paid notification
async function sendCommissionPaidNotification(data) {
  try {
    const { barberId, barberbarbershopId, amount, transferId, method } = data
    
    // TODO: Integrate with notification service

    // Could send email, SMS, or push notification here
    
  } catch (error) {
    console.error('Failed to send commission paid notification:', error)
  }
}

// ==========================================
// POS Payment Link Handler
// ==========================================

async function handlePOSPaymentLinkCompleted(session) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const barberbarbershopId = session.metadata?.barberbarbershop_id
    const barberId = session.metadata?.barber_id
    const customerContact = session.metadata?.customer_contact
    const contactMethod = session.metadata?.contact_method

    console.log('Processing POS payment link completion:', {
      session_id: session.id,
      barberbarbershop_id: barberbarbershopId,
      amount: session.amount_total / 100
    })

    // Find the payment link record
    let { data: paymentLink, error: linkError } = await supabase
      .from('pos_payment_links')
      .select('*')
      .eq('stripe_session_id', session.id)
      .single()

    if (linkError && linkError.code === 'PGRST116') {
      // Try to find by metadata if not found by session_id
      const { data: linkByMetadata } = await supabase
        .from('pos_payment_links')
        .select('*')
        .eq('barberbarbershop_id', barberbarbershopId)
        .eq('status', 'pending')
        .eq('customer_contact', customerContact)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (linkByMetadata) {
        // Update with the session ID
        const { error: updateError } = await supabase
          .from('pos_payment_links')
          .update({ stripe_session_id: session.id })
          .eq('id', linkByMetadata.id)

        if (!updateError) {
          paymentLink = linkByMetadata
        }
      }
    }

    if (!paymentLink) {
      console.error('Payment link not found for session:', session.id)
      return
    }

    const cartData = paymentLink.cart_data
    const amountPaid = session.amount_total / 100

    // Update payment link status
    const { error: statusError } = await supabase
      .from('pos_payment_links')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        stripe_session_id: session.id,
        metadata: {
          ...paymentLink.metadata,
          payment_completed_at: new Date().toISOString(),
          stripe_payment_intent: session.payment_intent,
          customer_details: session.customer_details
        }
      })
      .eq('id', paymentLink.id)

    if (statusError) {
      console.error('Error updating payment link status:', statusError)
      return
    }

    // Process each item in the cart - update inventory and record sales
    const receiptNumber = `PL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    for (const item of cartData.items) {
      try {
        // Record the sale
        const { error: saleError } = await supabase
          .from('pos_sales') // Note: This table may need to be created if it doesn't exist
          .insert({
            barberbarbershop_id: barberbarbershopId,
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            barber_id: barberId,
            payment_method: 'stripe_payment_link',
            receipt_number: receiptNumber,
            payment_link_id: paymentLink.id,
            customer_contact: customerContact,
            created_at: new Date().toISOString()
          })

        if (saleError) {
          console.error(`Error recording sale for product ${item.id}:`, saleError)
        }

        // Update inventory - reduce stock
        const { error: inventoryError } = await supabase
          .rpc('update_inventory_stock', {
            p_product_id: item.id,
            p_quantity_change: -item.quantity,
            p_reason: 'pos_sale',
            p_reference_id: paymentLink.id
          })

        if (inventoryError) {
          console.error(`Error updating inventory for product ${item.id}:`, inventoryError)
        }

        // Calculate and record commission if applicable
        if (barberId && item.commission_rate) {
          const commissionAmount = (item.price * item.quantity * item.commission_rate) / 100

          const { error: commissionError } = await supabase
            .from('pos_commissions')
            .insert({
              barber_id: barberId,
              barberbarbershop_id: barberbarbershopId,
              product_id: item.id,
              sale_amount: item.price * item.quantity,
              commission_rate: item.commission_rate,
              commission_amount: commissionAmount,
              payment_link_id: paymentLink.id,
              status: 'pending_payout',
              created_at: new Date().toISOString()
            })

          if (commissionError) {
            console.error(`Error recording commission for product ${item.id}:`, commissionError)
          }
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError)
      }
    }

    // Send confirmation message to customer
    try {
      if (contactMethod === 'sms') {
        await sendPOSConfirmationSMS(customerContact, {
          receiptNumber,
          total: amountPaid,
          items: cartData.items
        })
      } else if (contactMethod === 'email') {
        await sendPOSConfirmationEmail(customerContact, {
          receiptNumber,
          total: amountPaid,
          items: cartData.items,
          barberbarbershopId
        })
      }
    } catch (confirmationError) {
      console.error('Error sending confirmation:', confirmationError)
    }

    console.log(`POS payment link completed successfully: ${receiptNumber}, Amount: $${amountPaid}`)

  } catch (error) {
    console.error('Error handling POS payment link completion:', error)
  }
}

// Helper functions for POS confirmations
async function sendPOSConfirmationSMS(phoneNumber, details) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.log('Twilio not configured for POS confirmations')
      return
    }

    const twilio = require('twilio')(accountSid, authToken)

    const itemsList = details.items
      .map(item => `${item.name} (${item.quantity}x)`)
      .join(', ')

    const message = `Payment confirmed! Receipt: ${details.receiptNumber}. Items: ${itemsList}. Total: $${details.total.toFixed(2)}. Thank you for your purchase!`

    await twilio.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber
    })

    console.log('POS confirmation SMS sent successfully')
  } catch (error) {
    console.error('Error sending POS confirmation SMS:', error)
  }
}

async function sendPOSConfirmationEmail(email, details) {
  try {
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid not configured for POS confirmations')
      return
    }

    const itemsList = details.items
      .map(item => `• ${item.name} (${item.quantity}x) - $${(item.price * item.quantity).toFixed(2)}`)
      .join('\n')

    const emailContent = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
      subject: 'Payment Confirmed - Thank you!',
      text: `
Payment Confirmed!

Receipt Number: ${details.receiptNumber}

Items:
${itemsList}

Total: $${details.total.toFixed(2)}

Thank you for your purchase!
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Confirmed</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px 0; }
        .receipt { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .items { margin: 15px 0; }
        .total { font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; background-color: #e9ecef; padding: 15px; border-radius: 8px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>✅ Payment Confirmed!</h1>
    </div>
    
    <div class="content">
        <div class="receipt">
            <h3>Receipt Number: ${details.receiptNumber}</h3>
        </div>
        
        <div class="items">
            <h3>Items Purchased:</h3>
            ${details.items.map(item => `
                <p>• ${item.name} (${item.quantity}x) - $${(item.price * item.quantity).toFixed(2)}</p>
            `).join('')}
        </div>
        
        <div class="total">Total: $${details.total.toFixed(2)}</div>
        
        <p>Thank you for your purchase!</p>
    </div>
    
    <div class="footer">
        <p>This is an automated confirmation email.</p>
    </div>
</body>
</html>
      `
    }

    await sgMail.send(emailContent)
    console.log('POS confirmation email sent successfully')
  } catch (error) {
    console.error('Error sending POS confirmation email:', error)
  }
}

async function sendSubscriptionEmail(tenantId, emailType, data) {
  
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
  
  // Email would be sent through email service here
  return true
}

// ==========================================
// UNIFIED POS PAYMENT WEBHOOK HANDLERS
// ==========================================

/**
 * Handle QR code payment completion
 */
async function handleQRPaymentCompleted(session) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const sessionId = session.id
    const barberbarbershopId = session.metadata?.barberbarbershop_id
    const barberId = session.metadata?.barber_id
    const customerId = session.metadata?.customer_id

    console.log('Processing QR payment completion:', {
      session_id: sessionId,
      barberbarbershop_id: barberbarbershopId,
      amount: session.amount_total / 100
    })

    // Find and update the QR payment session
    const { data: qrSession, error: sessionError } = await supabase
      .from('qr_payment_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (sessionError || !qrSession) {
      console.error('QR payment session not found:', sessionId)
      return
    }

    // Update session status
    const { error: updateError } = await supabase
      .from('qr_payment_sessions')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        stripe_payment_intent_id: session.payment_intent
      })
      .eq('id', qrSession.id)

    if (updateError) {
      console.error('Error updating QR session status:', updateError)
      return
    }

    // Process unified sales and inventory
    await processUnifiedPOSSale({
      barberbarbershopId,
      barberId,
      customerId,
      cartItems: qrSession.cart_items,
      paymentMethod: 'qr_code',
      paymentReference: {
        qr_session_id: qrSession.id,
        stripe_session_id: sessionId
      },
      receiptPrefix: 'QR',
      supabase
    })

    console.log(`QR payment completed successfully: ${sessionId}`)

  } catch (error) {
    console.error('Error handling QR payment completion:', error)
  }
}

/**
 * Handle Terminal payment action success
 */
async function handleTerminalActionSucceeded(reader) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Update reader status
    await supabase
      .from('terminal_readers')
      .update({ 
        status: 'online',
        last_seen_at: new Date().toISOString()
      })
      .eq('stripe_reader_id', reader.id)

    console.log(`Terminal reader ${reader.id} action succeeded`)

  } catch (error) {
    console.error('Error handling terminal action succeeded:', error)
  }
}

/**
 * Handle Terminal payment action failure
 */
async function handleTerminalActionFailed(reader) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Update reader status and log failure
    await supabase
      .from('terminal_readers')
      .update({ 
        status: 'online', // Reset to online after failure
        last_seen_at: new Date().toISOString(),
        metadata: supabase.raw(`metadata || '"action_failed_at": "${new Date().toISOString()}"}'::jsonb`)
      })
      .eq('stripe_reader_id', reader.id)

    console.error(`Terminal reader ${reader.id} action failed:`, reader.failure_reason)

  } catch (error) {
    console.error('Error handling terminal action failed:', error)
  }
}

/**
 * Enhanced Payment Intent handler for Terminal payments
 */
async function handlePaymentIntentSucceededEnhanced(paymentIntent) {
  // Check if this is a Terminal payment
  if (paymentIntent.metadata?.payment_type === 'terminal') {
    await handleTerminalPaymentSucceeded(paymentIntent)
    return
  }

  // Fall back to existing handler
  await handlePaymentIntentSucceeded(paymentIntent)
}

/**
 * Handle Terminal payment success
 */
async function handleTerminalPaymentSucceeded(paymentIntent) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const barberbarbershopId = paymentIntent.metadata?.barberbarbershop_id
    const barberId = paymentIntent.metadata?.barber_id
    const customerId = paymentIntent.metadata?.customer_id
    const readerId = paymentIntent.metadata?.reader_id

    console.log('Processing Terminal payment success:', {
      payment_intent_id: paymentIntent.id,
      barberbarbershop_id: barberbarbershopId,
      amount: paymentIntent.amount / 100
    })

    // Find and update the terminal payment intent
    const { data: terminalPayment, error: paymentError } = await supabase
      .from('terminal_payment_intents')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()

    if (paymentError || !terminalPayment) {
      console.error('Terminal payment intent not found:', paymentIntent.id)
      return
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('terminal_payment_intents')
      .update({
        status: 'succeeded',
        charges: paymentIntent.charges,
        updated_at: new Date().toISOString()
      })
      .eq('id', terminalPayment.id)

    if (updateError) {
      console.error('Error updating terminal payment status:', updateError)
      return
    }

    // Reset reader status to online
    if (readerId) {
      await supabase
        .from('terminal_readers')
        .update({ 
          status: 'online',
          last_seen_at: new Date().toISOString()
        })
        .eq('id', readerId)
    }

    // Process sales if cart items exist
    const cartItems = terminalPayment.metadata?.cart_items
    if (cartItems && cartItems.length > 0) {
      await processUnifiedPOSSale({
        barberbarbershopId,
        barberId,
        customerId,
        cartItems,
        paymentMethod: 'terminal',
        paymentReference: {
          terminal_payment_intent_id: terminalPayment.id,
          stripe_payment_intent_id: paymentIntent.id
        },
        receiptPrefix: 'TRM',
        supabase
      })
    }

    console.log(`Terminal payment completed successfully: ${paymentIntent.id}`)

  } catch (error) {
    console.error('Error handling Terminal payment success:', error)
  }
}

/**
 * Unified POS sale processing function
 * Works for all payment types: Payment Links, QR Codes, Terminal
 */
async function processUnifiedPOSSale({
  barberbarbershopId,
  barberId,
  customerId,
  cartItems,
  paymentMethod,
  paymentReference,
  receiptPrefix,
  supabase
}) {
  try {
    const receiptNumber = `${receiptPrefix}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Process each cart item
    for (const item of cartItems) {
      // Record the sale
      const saleData = {
        barberbarbershop_id: barberbarbershopId,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        barber_id: barberId,
        customer_id: customerId,
        payment_method: paymentMethod,
        receipt_number: receiptNumber,
        created_at: new Date().toISOString()
      }

      // Add payment-specific references
      if (paymentReference.payment_link_id) {
        saleData.payment_link_id = paymentReference.payment_link_id
      }
      if (paymentReference.qr_session_id) {
        saleData.qr_session_id = paymentReference.qr_session_id
      }
      if (paymentReference.terminal_payment_intent_id) {
        saleData.terminal_payment_intent_id = paymentReference.terminal_payment_intent_id
      }

      const { error: saleError } = await supabase
        .from('pos_sales')
        .insert(saleData)

      if (saleError) {
        console.error(`Error recording sale for product ${item.id}:`, saleError)
        continue
      }

      // Update inventory
      const { error: inventoryError } = await supabase
        .rpc('update_inventory_stock', {
          p_product_id: item.id,
          p_quantity_change: -item.quantity,
          p_reason: `pos_sale_${paymentMethod}`,
          p_reference_id: paymentReference.payment_link_id || paymentReference.qr_session_id || paymentReference.terminal_payment_intent_id
        })

      if (inventoryError) {
        console.error(`Error updating inventory for product ${item.id}:`, inventoryError)
      }

      // Calculate and record commission if applicable
      if (barberId && item.commission_rate) {
        const commissionAmount = (item.price * item.quantity * item.commission_rate) / 100

        const commissionData = {
          barber_id: barberId,
          barberbarbershop_id: barberbarbershopId,
          product_id: item.id,
          sale_amount: item.price * item.quantity,
          commission_rate: item.commission_rate,
          commission_amount: commissionAmount,
          status: 'pending_payout',
          created_at: new Date().toISOString()
        }

        // Add payment-specific references
        if (paymentReference.payment_link_id) {
          commissionData.payment_link_id = paymentReference.payment_link_id
        }
        if (paymentReference.qr_session_id) {
          commissionData.qr_session_id = paymentReference.qr_session_id
        }
        if (paymentReference.terminal_payment_intent_id) {
          commissionData.terminal_payment_intent_id = paymentReference.terminal_payment_intent_id
        }

        const { error: commissionError } = await supabase
          .from('pos_commissions')
          .insert(commissionData)

        if (commissionError) {
          console.error(`Error recording commission for product ${item.id}:`, commissionError)
        }
      }
    }

    console.log(`Unified POS sale processed: ${receiptNumber}, Items: ${cartItems.length}, Method: ${paymentMethod}`)

  } catch (error) {
    console.error('Error processing unified POS sale:', error)
    throw error
  }
}