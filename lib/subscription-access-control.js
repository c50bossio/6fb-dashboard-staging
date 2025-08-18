/**
 * Subscription Tier-Based Access Control for Review Features
 * Implements hierarchical access control based on subscription tiers
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Subscription tier definitions and feature access matrix
 */
export const SUBSCRIPTION_TIERS = {
  BASIC: {
    id: 'basic',
    name: 'Basic',
    features: {
      single_location_reviews: true,
      basic_attribution: true,
      standard_display: true,
      review_export: false,
      multi_location_access: false,
      advanced_analytics: false,
      enterprise_dashboard: false,
      ai_insights: false,
      custom_branding: false,
      api_access: false
    },
    limits: {
      locations: 1,
      reviews_per_month: 500,
      export_frequency: 0,
      analytics_history_days: 30
    }
  },

  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    features: {
      single_location_reviews: true,
      basic_attribution: true,
      standard_display: true,
      review_export: true,
      multi_location_access: true,
      advanced_analytics: true,
      enterprise_dashboard: false,
      ai_insights: true,
      custom_branding: true,
      api_access: true
    },
    limits: {
      locations: 5,
      reviews_per_month: 2000,
      export_frequency: 4, // per month
      analytics_history_days: 90
    }
  },

  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    features: {
      single_location_reviews: true,
      basic_attribution: true,
      standard_display: true,
      review_export: true,
      multi_location_access: true,
      advanced_analytics: true,
      enterprise_dashboard: true,
      ai_insights: true,
      custom_branding: true,
      api_access: true
    },
    limits: {
      locations: -1, // Unlimited
      reviews_per_month: -1, // Unlimited
      export_frequency: -1, // Unlimited
      analytics_history_days: 365
    }
  }
}

/**
 * Get user's subscription tier and permissions
 */
export async function getUserSubscriptionTier(userId, barbershopId = null) {
  try {
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role, ai_agent_subscription_tier, subscription_status')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    // For enterprise owners, check organization subscription
    if (user.role === 'ENTERPRISE_OWNER') {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('subscription_tier, subscription_status')
        .eq('owner_id', userId)
        .single()

      if (!orgError && org) {
        return {
          tier: org.subscription_tier || 'enterprise',
          status: org.subscription_status || 'active',
          features: SUBSCRIPTION_TIERS.ENTERPRISE.features,
          limits: SUBSCRIPTION_TIERS.ENTERPRISE.limits,
          user_role: user.role
        }
      }
    }

    // For shop owners, check barbershop subscription
    if (user.role === 'SHOP_OWNER' && barbershopId) {
      const { data: barbershop, error: shopError } = await supabase
        .from('barbershops')
        .select('subscription_tier, subscription_status, owner_id')
        .eq('id', barbershopId)
        .eq('owner_id', userId)
        .single()

      if (!shopError && barbershop) {
        const tierConfig = SUBSCRIPTION_TIERS[barbershop.subscription_tier?.toUpperCase()] || SUBSCRIPTION_TIERS.BASIC
        return {
          tier: barbershop.subscription_tier || 'basic',
          status: barbershop.subscription_status || 'active',
          features: tierConfig.features,
          limits: tierConfig.limits,
          user_role: user.role
        }
      }
    }

    // Default to user's individual subscription tier
    const tierConfig = SUBSCRIPTION_TIERS[user.ai_agent_subscription_tier?.toUpperCase()] || SUBSCRIPTION_TIERS.BASIC
    
    return {
      tier: user.ai_agent_subscription_tier || 'basic',
      status: user.subscription_status || 'trial',
      features: tierConfig.features,
      limits: tierConfig.limits,
      user_role: user.role
    }

  } catch (error) {
    console.error('Error getting user subscription tier:', error)
    
    // Return basic tier as fallback
    return {
      tier: 'basic',
      status: 'unknown',
      features: SUBSCRIPTION_TIERS.BASIC.features,
      limits: SUBSCRIPTION_TIERS.BASIC.limits,
      user_role: 'CLIENT',
      error: error.message
    }
  }
}

/**
 * Check if user has access to specific review feature
 */
export async function checkReviewFeatureAccess(userId, feature, barbershopId = null) {
  try {
    const subscription = await getUserSubscriptionTier(userId, barbershopId)
    
    // Check subscription status
    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      return {
        allowed: false,
        reason: 'inactive_subscription',
        subscription_status: subscription.status
      }
    }

    // Check feature access
    const hasFeature = subscription.features[feature] === true
    
    if (!hasFeature) {
      return {
        allowed: false,
        reason: 'feature_not_available',
        current_tier: subscription.tier,
        required_tier: getMinimumTierForFeature(feature),
        upgrade_needed: true
      }
    }

    return {
      allowed: true,
      tier: subscription.tier,
      features: subscription.features,
      limits: subscription.limits
    }

  } catch (error) {
    console.error('Error checking review feature access:', error)
    return {
      allowed: false,
      reason: 'error',
      error: error.message
    }
  }
}

/**
 * Get minimum subscription tier required for a feature
 */
function getMinimumTierForFeature(feature) {
  for (const [tierName, tierConfig] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (tierConfig.features[feature] === true) {
      return tierConfig.id
    }
  }
  return 'enterprise' // Default to highest tier
}

/**
 * Check location access permissions based on subscription tier
 */
export async function checkLocationAccess(userId, requestedLocationIds = []) {
  try {
    const subscription = await getUserSubscriptionTier(userId)
    
    // Get user's accessible locations
    let accessibleLocations = []
    
    if (subscription.user_role === 'ENTERPRISE_OWNER') {
      // Enterprise owners can access all locations in their organization
      const { data: orgLocations } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('organization_id', subscription.organization_id)
      
      accessibleLocations = orgLocations || []
      
    } else if (subscription.user_role === 'SHOP_OWNER') {
      // Shop owners can access their owned locations
      const { data: ownedLocations } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('owner_id', userId)
      
      accessibleLocations = ownedLocations || []
      
    } else if (subscription.user_role === 'BARBER') {
      // Barbers can access locations where they work
      const { data: workLocations } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, barbershops(id, name)')
        .eq('user_id', userId)
        .eq('is_active', true)
      
      accessibleLocations = workLocations?.map(loc => loc.barbershops) || []
    }

    // Check tier limits
    const maxLocations = subscription.limits.locations
    if (maxLocations > 0 && accessibleLocations.length > maxLocations) {
      accessibleLocations = accessibleLocations.slice(0, maxLocations)
    }

    // Filter requested locations
    const allowedLocationIds = accessibleLocations.map(loc => loc.id)
    const deniedLocations = requestedLocationIds.filter(id => !allowedLocationIds.includes(id))

    return {
      allowed_locations: accessibleLocations,
      denied_locations: deniedLocations,
      max_locations: maxLocations,
      tier: subscription.tier,
      access_granted: deniedLocations.length === 0
    }

  } catch (error) {
    console.error('Error checking location access:', error)
    return {
      allowed_locations: [],
      denied_locations: requestedLocationIds,
      access_granted: false,
      error: error.message
    }
  }
}

/**
 * Get filtered review data based on subscription tier permissions
 */
export async function getFilteredReviewData(userId, barbershopId, options = {}) {
  try {
    const subscription = await getUserSubscriptionTier(userId, barbershopId)
    const locationAccess = await checkLocationAccess(userId, [barbershopId])

    if (!locationAccess.access_granted) {
      return {
        success: false,
        error: 'Access denied for requested location',
        accessible_locations: locationAccess.allowed_locations
      }
    }

    // Build query based on subscription features
    const queryOptions = {
      ...options,
      include_attribution: subscription.features.basic_attribution,
      include_analytics: subscription.features.advanced_analytics,
      include_ai_insights: subscription.features.ai_insights,
      history_days: Math.min(options.history_days || 30, subscription.limits.analytics_history_days)
    }

    // Apply tier-specific data filtering
    if (subscription.tier === 'basic') {
      // Basic tier: limited to essential review data
      queryOptions.fields = [
        'id', 'reviewer_name', 'review_text', 'star_rating', 'review_date'
      ]
    } else if (subscription.tier === 'professional') {
      // Professional tier: includes attribution and analytics
      queryOptions.fields = [
        'id', 'reviewer_name', 'review_text', 'star_rating', 'review_date',
        'gmb_review_attributions', 'sentiment_score'
      ]
    } else {
      // Enterprise tier: full data access
      queryOptions.fields = '*'
    }

    return {
      success: true,
      subscription,
      query_options: queryOptions,
      features_enabled: subscription.features
    }

  } catch (error) {
    console.error('Error filtering review data:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Log subscription-based access events for analytics
 */
export async function logSubscriptionAccess({
  userId,
  feature,
  barbershopId,
  accessGranted,
  tier,
  reason = null
}) {
  try {
    await supabase
      .from('subscription_access_logs')
      .insert({
        user_id: userId,
        feature_accessed: feature,
        barbershop_id: barbershopId,
        access_granted: accessGranted,
        subscription_tier: tier,
        denial_reason: reason,
        timestamp: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log subscription access:', error)
  }
}

/**
 * Get upgrade recommendations based on attempted feature access
 */
export function getUpgradeRecommendation(currentTier, requestedFeature) {
  const minimumTier = getMinimumTierForFeature(requestedFeature)
  const currentTierConfig = SUBSCRIPTION_TIERS[currentTier.toUpperCase()]
  const requiredTierConfig = SUBSCRIPTION_TIERS[minimumTier.toUpperCase()]

  if (!requiredTierConfig) {
    return null
  }

  return {
    current_tier: currentTier,
    recommended_tier: minimumTier,
    benefits: {
      new_features: Object.entries(requiredTierConfig.features)
        .filter(([feature, enabled]) => enabled && !currentTierConfig?.features[feature])
        .map(([feature]) => feature),
      increased_limits: Object.entries(requiredTierConfig.limits)
        .filter(([limit, value]) => {
          const currentValue = currentTierConfig?.limits[limit] || 0
          return value === -1 || (currentValue >= 0 && value > currentValue)
        })
        .map(([limit, value]) => ({ limit, value }))
    }
  }
}