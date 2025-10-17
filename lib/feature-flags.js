import { get } from '@vercel/edge-config'

export const FLAGS = {
  NEW_BOOKING_FLOW: 'new_booking_flow',
  ENHANCED_CALENDAR: 'enhanced_calendar',
  DARK_MODE: 'dark_mode',
  
  STRIPE_PAYMENT_ELEMENT: 'stripe_payment_element',
  CRYPTO_PAYMENTS: 'crypto_payments',
  INSTALLMENT_PAYMENTS: 'installment_payments',
  
  CLAUDE_CHAT: 'claude_chat',
  AI_RECOMMENDATIONS: 'ai_recommendations',
  SMART_SCHEDULING: 'smart_scheduling',
  
  BETA_FEATURES: 'beta_features',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  VIDEO_CONSULTATIONS: 'video_consultations',
  
  IMAGE_OPTIMIZATION: 'image_optimization',
  LAZY_LOADING: 'lazy_loading',
  PWA_FEATURES: 'pwa_features',
}

const DEFAULT_FLAGS = {
  [FLAGS.NEW_BOOKING_FLOW]: false,
  [FLAGS.ENHANCED_CALENDAR]: true,
  [FLAGS.DARK_MODE]: false,
  [FLAGS.STRIPE_PAYMENT_ELEMENT]: true,
  [FLAGS.CRYPTO_PAYMENTS]: false,
  [FLAGS.INSTALLMENT_PAYMENTS]: false,
  [FLAGS.CLAUDE_CHAT]: true,
  [FLAGS.AI_RECOMMENDATIONS]: false,
  [FLAGS.SMART_SCHEDULING]: false,
  [FLAGS.BETA_FEATURES]: false,
  [FLAGS.ADVANCED_ANALYTICS]: true,
  [FLAGS.VIDEO_CONSULTATIONS]: false,
  [FLAGS.IMAGE_OPTIMIZATION]: true,
  [FLAGS.LAZY_LOADING]: true,
  [FLAGS.PWA_FEATURES]: false,
}

export async function getFeatureFlag(flagName) {
  try {
    const value = await get(flagName)
    if (value !== undefined) {
      return value
    }
  } catch (error) {
    console.error(`Error fetching feature flag ${flagName}:`, error)
  }
  
  return DEFAULT_FLAGS[flagName] ?? false
}

export async function getAllFeatureFlags() {
  try {
    const edgeFlags = await get('feature_flags') || {}
    
    return {
      ...DEFAULT_FLAGS,
      ...edgeFlags,
    }
  } catch (error) {
    console.error('Error fetching feature flags:', error)
    return DEFAULT_FLAGS
  }
}

export async function getUserFeatureFlags(userId, userProperties = {}) {
  try {
    const baseFlags = await getAllFeatureFlags()
    
    const userOverrides = await get(`user_flags_${userId}`) || {}
    
    const targetingRules = await get('targeting_rules') || []
    
    const targetedFlags = {}
    for (const rule of targetingRules) {
      if (evaluateTargeting(rule, userProperties)) {
        Object.assign(targetedFlags, rule.flags)
      }
    }
    
    return {
      ...baseFlags,
      ...targetedFlags,
      ...userOverrides,
    }
  } catch (error) {
    console.error('Error fetching user feature flags:', error)
    return DEFAULT_FLAGS
  }
}

function evaluateTargeting(rule, userProperties) {
  if (!rule.conditions) return false
  
  for (const condition of rule.conditions) {
    const userValue = userProperties[condition.property]
    
    switch (condition.operator) {
      case 'equals':
        if (userValue !== condition.value) return false
        break
      case 'contains':
        if (!userValue?.includes?.(condition.value)) return false
        break
      case 'greater_than':
        if (userValue <= condition.value) return false
        break
      case 'less_than':
        if (userValue >= condition.value) return false
        break
      case 'in':
        if (!condition.value.includes(userValue)) return false
        break
      default:
        return false
    }
  }
  
  return true
}

let cachedFlags = null
let cacheExpiry = null

export async function getCachedFeatureFlags() {
  const now = Date.now()
  
  if (cachedFlags && cacheExpiry && now < cacheExpiry) {
    return cachedFlags
  }
  
  cachedFlags = await getAllFeatureFlags()
  cacheExpiry = now + 60000 // Cache for 1 minute
  
  return cachedFlags
}