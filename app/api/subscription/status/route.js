import { NextResponse } from 'next/server'
import { getTierLimits, normalizeTierName, SUBSCRIPTION_TIERS } from '@/lib/subscription-tiers'
import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient()
    
    let { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Development mode fallback when NEXT_PUBLIC_ENABLE_DEV_AUTH is true
    if ((authError || !user) && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
      console.log('🔐 API: Using development auth fallback for subscription status')
      user = {
        id: 'dev-user-123',
        email: 'dev@6fb.local',
        user_metadata: { full_name: 'Development User' }
      }
      authError = null
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    let { data: userData, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        subscription_tier,
        subscription_status,
        role,
        shop_id,
        barbershop_id,
        created_at
      `)
      .eq('id', user.id)
      .single()
    
    // Development mode fallback for profile data
    if (userError && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true' && user.id === 'dev-user-123') {
      console.log('🔐 API: Using development profile fallback for subscription status')
      userData = {
        id: 'dev-user-123',
        email: 'dev@6fb.local',
        full_name: 'Development User',
        subscription_tier: 'pro',
        subscription_status: 'active',
        role: 'SHOP_OWNER',
        shop_id: 'dev-shop-123',
        barbershop_id: 'dev-shop-123',
        created_at: new Date().toISOString()
      }
      userError = null
    }
    
    if (userError) {
      console.error('Error fetching profile data:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500 }
      )
    }
    
    // For now, return basic subscription info without usage data
    // Usage tracking will be implemented when needed
    
    // Skip subscription history for now
    const history = []
    
    // Normalize the subscription tier for consistent display
    const normalizedTier = normalizeTierName(userData.subscription_tier || 'free')
    const tierDisplayInfo = getTierDisplayInfo(normalizedTier)
    
    const response = {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.full_name,
        memberSince: userData.created_at
      },
      subscription: {
        tier: tierDisplayInfo.name, // Use display-friendly tier name
        status: userData.subscription_status || 'active',
        isActive: userData.subscription_status === 'active',
        plan_name: tierDisplayInfo.name,
        currentPeriodStart: null, // TODO: Add these fields to profiles if needed
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        daysRemaining: 0
      },
      usage: {
        sms: { used: 0, included: getTierLimits(userData.subscription_tier).smsCredits, remaining: getTierLimits(userData.subscription_tier).smsCredits, percentage: 0 },
        email: { used: 0, included: getTierLimits(userData.subscription_tier).emailCredits, remaining: getTierLimits(userData.subscription_tier).emailCredits, percentage: 0 },
        ai: { used: 0, included: getTierLimits(userData.subscription_tier).aiTokens, remaining: getTierLimits(userData.subscription_tier).aiTokens, percentage: 0 },
        staff: { limit: getTierLimits(userData.subscription_tier).staff }
      },
      billing: {
        stripeCustomerId: null, // TODO: Add to profiles if needed
        stripeSubscriptionId: null,
        history: history
      },
      profile: {
        role: userData.role,
        shop_id: userData.shop_id,
        barbershop_id: userData.barbershop_id
      },
      features: getFeaturesByTier(normalizedTier)
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

function getTierDisplayInfo(tier) {
  const displayNames = {
    [SUBSCRIPTION_TIERS.FREE]: 'Free',
    [SUBSCRIPTION_TIERS.INDIVIDUAL]: 'Individual Barber',
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: 'Shop Owner',
    [SUBSCRIPTION_TIERS.ENTERPRISE]: 'Enterprise'
  }
  
  return {
    name: displayNames[tier] || 'Free',
    tier: tier
  }
}

function getFeaturesByTier(tier) {
  const features = {
    [SUBSCRIPTION_TIERS.FREE]: {
      name: 'Free',
      features: [
        'Full barbershop management',
        'Up to 15 staff members',
        '500 SMS credits/month',
        '1,000 email credits/month', 
        '5,000 AI tokens/month',
        'Complete booking system',
        'Basic analytics',
        'Single location'
      ]
    },
    [SUBSCRIPTION_TIERS.INDIVIDUAL]: {
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
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
      name: 'Shop Owner',
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
    [SUBSCRIPTION_TIERS.ENTERPRISE]: {
      name: 'Enterprise',
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
    name: 'Free Plan',
    features: ['Basic access only']
  }
}

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { type, amount } = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const validTypes = ['sms', 'email', 'ai']
    if (!validTypes.includes(type) || !amount || amount < 0) {
      return NextResponse.json(
        { error: 'Invalid usage update request' },
        { status: 400 }
      )
    }
    
    // For now, return success without actually updating usage
    // TODO: Implement usage tracking tables later if needed
    return NextResponse.json({
      success: true,
      message: 'Usage tracking not implemented yet',
      type,
      amount
    })
    
  } catch (error) {
    console.error('Usage update error:', error)
    return NextResponse.json(
      { error: 'Failed to update usage' },
      { status: 500 }
    )
  }
}