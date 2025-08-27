import { NextResponse } from 'next/server'
import { SUBSCRIPTION_TIERS, normalizeTierName, getTierLimits } from '@/lib/subscription-tiers'
import { createClient } from '@/lib/supabase/server-client'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { plan, currentPlan } = await request.json()
    
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan name is required' },
        { status: 400 }
      )
    }
    
    // Normalize the plan name to match our tier constants
    const normalizedPlan = normalizeTierName(plan)
    const validTiers = Object.values(SUBSCRIPTION_TIERS)
    
    if (!validTiers.includes(normalizedPlan)) {
      return NextResponse.json(
        { error: 'Invalid plan name' },
        { status: 400 }
      )
    }
    
    // Get current user profile
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('Error fetching user profile:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      )
    }
    
    // Check if user is actually changing plans
    if (userData.subscription_tier === normalizedPlan) {
      return NextResponse.json(
        { error: 'Already on this plan' },
        { status: 400 }
      )
    }
    
    // Update the subscription tier in the database
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        subscription_tier: normalizedPlan,
        subscription_status: normalizedPlan === SUBSCRIPTION_TIERS.FREE ? 'free' : 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }
    
    // Get the tier limits for the new plan
    const tierLimits = getTierLimits(normalizedPlan)
    
    // Log the subscription change

    return NextResponse.json({
      success: true,
      message: `Successfully changed to ${plan} plan`,
      subscription: {
        tier: normalizedPlan,
        status: normalizedPlan === SUBSCRIPTION_TIERS.FREE ? 'free' : 'active',
        plan_name: getDisplayName(normalizedPlan),
        limits: tierLimits
      }
    })
    
  } catch (error) {
    console.error('Subscription change error:', error)
    return NextResponse.json(
      { error: 'Failed to change subscription plan' },
      { status: 500 }
    )
  }
}

function getDisplayName(tier) {
  const displayNames = {
    [SUBSCRIPTION_TIERS.FREE]: 'Free',
    [SUBSCRIPTION_TIERS.INDIVIDUAL]: 'Individual',
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: 'Professional',
    [SUBSCRIPTION_TIERS.ENTERPRISE]: 'Enterprise'
  }
  
  return displayNames[tier] || 'Free'
}