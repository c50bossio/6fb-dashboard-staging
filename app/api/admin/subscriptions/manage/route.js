import { createClient } from '../../../../../lib/supabase'
import { withAdminAuth, logAdminAction } from '../../../../../middleware/adminAuth'

/**
 * POST /api/admin/subscriptions/manage
 * Handles manual subscription management actions
 * Actions: cancel, refund, extend_trial, update_tier, pause, resume
 * Required: SUPER_ADMIN role
 */
async function handleManageSubscription(request) {
  try {
    const body = await request.json()
    const { action, userId, subscriptionId, reason, amount, newTier, days } = body

    if (!action || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: action and userId' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient()

    // Get user details for logging and validation
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          details: userError?.message 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let result = {}
    let auditDetails = { reason, originalData: user }

    switch (action) {
      case 'cancel_subscription':
        result = await handleCancelSubscription(supabase, user, reason)
        auditDetails.canceledAt = new Date().toISOString()
        break

      case 'extend_trial':
        if (!days || days < 1 || days > 90) {
          return new Response(
            JSON.stringify({ error: 'Invalid trial extension days (1-90)' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        result = await handleExtendTrial(supabase, user, days)
        auditDetails.daysExtended = days
        break

      case 'update_tier':
        if (!newTier || !['barber', 'shop', 'enterprise'].includes(newTier)) {
          return new Response(
            JSON.stringify({ error: 'Invalid subscription tier' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        result = await handleUpdateTier(supabase, user, newTier)
        auditDetails.oldTier = user.subscription_tier
        auditDetails.newTier = newTier
        break

      case 'refund_payment':
        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid refund amount' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        }
        result = await handleRefundPayment(supabase, user, amount, reason)
        auditDetails.refundAmount = amount
        break

      case 'reset_usage':
        result = await handleResetUsage(supabase, user)
        auditDetails.previousUsage = {
          sms: user.sms_credits_used,
          email: user.email_credits_used,
          ai_tokens: user.ai_tokens_used
        }
        break

      case 'pause_subscription':
        result = await handlePauseSubscription(supabase, user)
        auditDetails.pausedAt = new Date().toISOString()
        break

      case 'resume_subscription':
        result = await handleResumeSubscription(supabase, user)
        auditDetails.resumedAt = new Date().toISOString()
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // Log admin action
    await logAdminAction(
      request.adminContext.userId,
      `SUBSCRIPTION_${action.toUpperCase()}`,
      {
        targetUserId: userId,
        targetEmail: user.email,
        targetSubscriptionId: user.stripe_subscription_id,
        ...auditDetails,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent')
      }
    )

    return new Response(
      JSON.stringify({
        success: true,
        action,
        userId,
        result,
        message: `Successfully ${action.replace('_', ' ')} for user ${user.email}`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin subscription management error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process subscription management action',
        message: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Helper functions for different subscription management actions

async function handleCancelSubscription(supabase, user, reason) {
  const { data, error } = await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      subscription_canceled_at: new Date().toISOString(),
      subscription_cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  // Record in subscription history
  await supabase
    .from('subscription_history')
    .insert({
      user_id: user.id,
      subscription_tier: user.subscription_tier,
      stripe_subscription_id: user.stripe_subscription_id,
      amount: 0,
      status: 'canceled',
      billing_period: 'monthly',
      period_start: new Date(),
      period_end: new Date(),
      metadata: { 
        reason, 
        admin_canceled: true,
        original_end_date: user.subscription_current_period_end 
      }
    })

  return { canceledSubscription: data }
}

async function handleExtendTrial(supabase, user, days) {
  const currentTrialEnd = user.trial_expires_at ? new Date(user.trial_expires_at) : new Date()
  const newTrialEnd = new Date(currentTrialEnd.getTime() + (days * 24 * 60 * 60 * 1000))

  const { data, error } = await supabase
    .from('users')
    .update({
      trial_expires_at: newTrialEnd.toISOString(),
      subscription_status: 'trialing',
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  return { 
    extendedTrial: data,
    newTrialEndDate: newTrialEnd.toISOString(),
    daysAdded: days
  }
}

async function handleUpdateTier(supabase, user, newTier) {
  // Update tier limits based on new subscription
  const tierLimits = {
    barber: { staff: 1, sms: 500, email: 1000, ai_tokens: 5000 },
    shop: { staff: 15, sms: 2000, email: 5000, ai_tokens: 20000 },
    enterprise: { staff: 999999, sms: 10000, email: 25000, ai_tokens: 100000 }
  }

  const limits = tierLimits[newTier]

  const { data, error } = await supabase
    .from('users')
    .update({
      subscription_tier: newTier,
      staff_limit: limits.staff,
      sms_credits_included: limits.sms,
      email_credits_included: limits.email,
      ai_tokens_included: limits.ai_tokens,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  return { updatedUser: data, newLimits: limits }
}

async function handleRefundPayment(supabase, user, amount, reason) {
  // Create refund record (would integrate with Stripe in production)
  const { data, error } = await supabase
    .from('subscription_history')
    .insert({
      user_id: user.id,
      subscription_tier: user.subscription_tier,
      stripe_subscription_id: user.stripe_subscription_id,
      amount: -amount, // Negative for refund
      currency: 'USD',
      status: 'refunded',
      billing_period: 'monthly',
      period_start: new Date(),
      period_end: new Date(),
      metadata: { 
        reason, 
        admin_refund: true,
        refund_amount: amount
      }
    })
    .select()
    .single()

  if (error) throw error

  return { refundRecord: data, amount }
}

async function handleResetUsage(supabase, user) {
  const { data, error } = await supabase
    .from('users')
    .update({
      sms_credits_used: 0,
      email_credits_used: 0,
      ai_tokens_used: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  return { resetUsage: data }
}

async function handlePauseSubscription(supabase, user) {
  const { data, error } = await supabase
    .from('users')
    .update({
      subscription_status: 'paused',
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  return { pausedSubscription: data }
}

async function handleResumeSubscription(supabase, user) {
  const { data, error } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error

  return { resumedSubscription: data }
}

// Export with admin auth wrapper
export const POST = withAdminAuth(handleManageSubscription)