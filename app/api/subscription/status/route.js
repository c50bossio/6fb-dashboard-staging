import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Get user subscription details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        subscription_tier,
        subscription_status,
        subscription_current_period_start,
        subscription_current_period_end,
        subscription_cancel_at_period_end,
        stripe_customer_id,
        stripe_subscription_id,
        sms_credits_included,
        sms_credits_used,
        email_credits_included,
        email_credits_used,
        ai_tokens_included,
        ai_tokens_used,
        staff_limit,
        created_at
      `)
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('Error fetching user data:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500 }
      )
    }
    
    // Calculate usage percentages
    const smsUsagePercent = userData.sms_credits_included > 0 
      ? Math.round((userData.sms_credits_used / userData.sms_credits_included) * 100)
      : 0
    
    const emailUsagePercent = userData.email_credits_included > 0
      ? Math.round((userData.email_credits_used / userData.email_credits_included) * 100)
      : 0
    
    const aiUsagePercent = userData.ai_tokens_included > 0
      ? Math.round((userData.ai_tokens_used / userData.ai_tokens_included) * 100)
      : 0
    
    // Get subscription history (last 5 payments)
    const { data: history } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    // Format the response
    const response = {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        memberSince: userData.created_at
      },
      subscription: {
        tier: userData.subscription_tier,
        status: userData.subscription_status,
        isActive: userData.subscription_status === 'active',
        currentPeriodStart: userData.subscription_current_period_start,
        currentPeriodEnd: userData.subscription_current_period_end,
        cancelAtPeriodEnd: userData.subscription_cancel_at_period_end,
        daysRemaining: userData.subscription_current_period_end 
          ? Math.max(0, Math.ceil((new Date(userData.subscription_current_period_end) - new Date()) / (1000 * 60 * 60 * 24)))
          : 0
      },
      usage: {
        sms: {
          used: userData.sms_credits_used || 0,
          included: userData.sms_credits_included || 0,
          remaining: Math.max(0, (userData.sms_credits_included || 0) - (userData.sms_credits_used || 0)),
          percentage: smsUsagePercent
        },
        email: {
          used: userData.email_credits_used || 0,
          included: userData.email_credits_included || 0,
          remaining: Math.max(0, (userData.email_credits_included || 0) - (userData.email_credits_used || 0)),
          percentage: emailUsagePercent
        },
        ai: {
          used: userData.ai_tokens_used || 0,
          included: userData.ai_tokens_included || 0,
          remaining: Math.max(0, (userData.ai_tokens_included || 0) - (userData.ai_tokens_used || 0)),
          percentage: aiUsagePercent
        },
        staff: {
          limit: userData.staff_limit || 1
        }
      },
      billing: {
        stripeCustomerId: userData.stripe_customer_id,
        stripeSubscriptionId: userData.stripe_subscription_id,
        history: history || []
      },
      features: getFeaturesByTier(userData.subscription_tier)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}

// Get feature list based on subscription tier
function getFeaturesByTier(tier) {
  const features = {
    barber: {
      name: 'Individual Barber',
      features: [
        'Personal booking page',
        '1 staff member',
        '500 SMS credits/month',
        '1,000 email credits/month',
        '5,000 AI tokens/month',
        'Basic analytics',
        'Standard support'
      ]
    },
    shop: {
      name: 'Barbershop',
      features: [
        'Custom shop domain',
        'Up to 15 barbers',
        '2,000 SMS credits/month',
        '5,000 email credits/month',
        '20,000 AI tokens/month',
        'Advanced analytics',
        'Priority support',
        'Team management',
        'Inventory tracking'
      ]
    },
    enterprise: {
      name: 'Multi-Location Enterprise',
      features: [
        'Multiple shop locations',
        'Unlimited barbers',
        '10,000 SMS credits/month',
        '25,000 email credits/month',
        '100,000 AI tokens/month',
        'Enterprise analytics',
        'Dedicated support',
        'Custom integrations',
        'White-label options',
        'API access'
      ]
    }
  }
  
  return features[tier] || {
    name: 'Free',
    features: ['Limited access']
  }
}

// POST endpoint to update usage (for internal use)
export async function POST(request) {
  try {
    const supabase = createClient()
    const { type, amount } = await request.json()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    // Validate usage type
    const validTypes = ['sms', 'email', 'ai']
    if (!validTypes.includes(type) || !amount || amount < 0) {
      return NextResponse.json(
        { error: 'Invalid usage update request' },
        { status: 400 }
      )
    }
    
    // Get current usage
    const { data: currentData } = await supabase
      .from('users')
      .select(`
        sms_credits_used,
        sms_credits_included,
        email_credits_used,
        email_credits_included,
        ai_tokens_used,
        ai_tokens_included
      `)
      .eq('id', user.id)
      .single()
    
    if (!currentData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Calculate new usage
    let updateData = {}
    let overageAmount = 0
    
    switch (type) {
      case 'sms':
        const newSmsUsage = (currentData.sms_credits_used || 0) + amount
        updateData.sms_credits_used = newSmsUsage
        if (newSmsUsage > currentData.sms_credits_included) {
          overageAmount = newSmsUsage - currentData.sms_credits_included
        }
        break
      
      case 'email':
        const newEmailUsage = (currentData.email_credits_used || 0) + amount
        updateData.email_credits_used = newEmailUsage
        if (newEmailUsage > currentData.email_credits_included) {
          overageAmount = newEmailUsage - currentData.email_credits_included
        }
        break
      
      case 'ai':
        const newAiUsage = (currentData.ai_tokens_used || 0) + amount
        updateData.ai_tokens_used = newAiUsage
        if (newAiUsage > currentData.ai_tokens_included) {
          overageAmount = newAiUsage - currentData.ai_tokens_included
        }
        break
    }
    
    // Update usage in database
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
    
    if (updateError) {
      console.error('Error updating usage:', updateError)
      return NextResponse.json(
        { error: 'Failed to update usage' },
        { status: 500 }
      )
    }
    
    // If there's overage, create overage record
    if (overageAmount > 0) {
      await supabase
        .from('overage_charges')
        .insert({
          user_id: user.id,
          usage_type: type,
          overage_amount: overageAmount,
          usage_date: new Date().toISOString()
        })
    }
    
    // Track usage in usage_tracking table
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: user.id,
        usage_type: type,
        amount: amount,
        timestamp: new Date().toISOString()
      })
    
    return NextResponse.json({
      success: true,
      usage: updateData,
      hasOverage: overageAmount > 0,
      overageAmount
    })
    
  } catch (error) {
    console.error('Usage update error:', error)
    return NextResponse.json(
      { error: 'Failed to update usage' },
      { status: 500 }
    )
  }
}