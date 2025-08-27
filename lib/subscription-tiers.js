/**
 * Centralized Subscription Tier Management
 * 
 * This utility ensures consistent subscription tier handling across the entire application.
 * All tier-related logic should use these utilities to prevent naming inconsistencies.
 */

/**
 * Standardized tier constants
 */
export const SUBSCRIPTION_TIERS = {
  FREE: 'FREE',
  INDIVIDUAL: 'INDIVIDUAL',       // Individual Barber - $35/month
  PROFESSIONAL: 'PROFESSIONAL',   // Shop Owner - $99/month  
  ENTERPRISE: 'ENTERPRISE'        // Multi-location - $249/month
}

/**
 * Tier pricing information
 */
export const TIER_PRICING = {
  [SUBSCRIPTION_TIERS.FREE]: { monthly: 0, yearly: 0, name: 'Free' },
  [SUBSCRIPTION_TIERS.INDIVIDUAL]: { monthly: 35, yearly: 350, name: 'Individual Barber' },
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: { monthly: 99, yearly: 950, name: 'Shop Owner' },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: { monthly: 249, yearly: 2390, name: 'Enterprise' }
}

/**
 * Legacy tier mapping for backwards compatibility
 * Maps old/mixed format tier names to standardized format
 */
export const LEGACY_TIER_MAPPING = {
  // Lowercase variants
  'free': SUBSCRIPTION_TIERS.FREE,
  'individual': SUBSCRIPTION_TIERS.INDIVIDUAL,
  'barber': SUBSCRIPTION_TIERS.INDIVIDUAL,
  'shop': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'shop_owner': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'professional': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'premium': SUBSCRIPTION_TIERS.PROFESSIONAL,  // Legacy premium tier
  'enterprise': SUBSCRIPTION_TIERS.ENTERPRISE,
  
  // Mixed case variants
  'Free': SUBSCRIPTION_TIERS.FREE,
  'Individual': SUBSCRIPTION_TIERS.INDIVIDUAL,
  'Barber': SUBSCRIPTION_TIERS.INDIVIDUAL,
  'Shop': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'Shop_Owner': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'Professional': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'Premium': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'Enterprise': SUBSCRIPTION_TIERS.ENTERPRISE,
  
  // Uppercase variants (already standard)
  [SUBSCRIPTION_TIERS.FREE]: SUBSCRIPTION_TIERS.FREE,
  [SUBSCRIPTION_TIERS.INDIVIDUAL]: SUBSCRIPTION_TIERS.INDIVIDUAL,
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: SUBSCRIPTION_TIERS.PROFESSIONAL,
  [SUBSCRIPTION_TIERS.ENTERPRISE]: SUBSCRIPTION_TIERS.ENTERPRISE
}

/**
 * Tier access levels for hierarchical permission checking
 */
export const TIER_ACCESS_LEVELS = {
  [SUBSCRIPTION_TIERS.FREE]: 0,
  [SUBSCRIPTION_TIERS.INDIVIDUAL]: 1,
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: 2,
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 3
}

/**
 * Role to tier mapping for new signups
 */
export const STRIPE_PLAN_TO_TIER = {
  'barber': SUBSCRIPTION_TIERS.INDIVIDUAL,
  'shop': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'enterprise': SUBSCRIPTION_TIERS.ENTERPRISE
}

export const TIER_TO_ROLE = {
  [SUBSCRIPTION_TIERS.INDIVIDUAL]: 'BARBER',
  [SUBSCRIPTION_TIERS.PROFESSIONAL]: 'SHOP_OWNER',
  [SUBSCRIPTION_TIERS.ENTERPRISE]: 'ENTERPRISE_OWNER'
}

/**
 * Normalize any tier name to the standard format
 * @param {string} tierName - The tier name to normalize
 * @returns {string} Normalized tier name or FREE if unrecognized
 */
export function normalizeTierName(tierName) {
  if (!tierName || typeof tierName !== 'string') {
    return SUBSCRIPTION_TIERS.FREE
  }
  
  const normalized = LEGACY_TIER_MAPPING[tierName]
  return normalized || SUBSCRIPTION_TIERS.FREE
}

/**
 * Check if user has access to a required tier
 * @param {string} userTier - User's current subscription tier
 * @param {string} requiredTier - Required tier for access
 * @returns {boolean} True if user has sufficient access
 */
export function hasAccessToTier(userTier, requiredTier) {
  const userLevel = TIER_ACCESS_LEVELS[normalizeTierName(userTier)] || 0
  const requiredLevel = TIER_ACCESS_LEVELS[normalizeTierName(requiredTier)] || 0
  
  return userLevel >= requiredLevel
}

/**
 * Check if tier name matches any of the provided tiers
 * @param {string} tierName - Tier name to check
 * @param {string|string[]} targetTiers - Tier(s) to match against
 * @returns {boolean} True if tier matches
 */
export function isTier(tierName, targetTiers) {
  const normalizedTier = normalizeTierName(tierName)
  const targets = Array.isArray(targetTiers) ? targetTiers : [targetTiers]
  
  return targets.some(target => normalizeTierName(target) === normalizedTier)
}

/**
 * Get tier display information
 * @param {string} tierName - Tier name
 * @returns {object} Tier display info (name, pricing, etc.)
 */
export function getTierInfo(tierName) {
  const normalizedTier = normalizeTierName(tierName)
  return {
    tier: normalizedTier,
    ...TIER_PRICING[normalizedTier],
    accessLevel: TIER_ACCESS_LEVELS[normalizedTier]
  }
}

/**
 * Get all available tiers for display/selection
 * @returns {array} Array of tier objects with display information
 */
export function getAllTiers() {
  return Object.values(SUBSCRIPTION_TIERS).map(tier => getTierInfo(tier))
}

/**
 * Validate subscription tier consistency across user profile
 * @param {object} profile - User profile object
 * @returns {object} Validation result with any issues
 */
export function validateProfileTierConsistency(profile) {
  const issues = []
  const suggestions = []
  
  if (!profile) {
    return { valid: false, issues: ['Profile is null or undefined'] }
  }
  
  const normalizedTier = normalizeTierName(profile.subscription_tier)
  const expectedRole = TIER_TO_ROLE[normalizedTier]
  
  // Check role-tier consistency
  if (profile.role !== expectedRole && profile.role !== 'SUPER_ADMIN') {
    issues.push(`Role ${profile.role} doesn't match tier ${normalizedTier}`)
    suggestions.push(`Expected role: ${expectedRole} for tier ${normalizedTier}`)
  }
  
  // Check subscription status
  if (profile.subscription_status !== 'active' && normalizedTier !== SUBSCRIPTION_TIERS.FREE) {
    issues.push(`Subscription status '${profile.subscription_status}' but tier is '${normalizedTier}'`)
    suggestions.push('Update subscription status to active or tier to FREE')
  }
  
  return {
    valid: issues.length === 0,
    issues,
    suggestions,
    normalizedTier,
    expectedRole
  }
}

/**
 * Convert legacy tier format to standardized format for database updates
 * @param {string} tierName - Current tier name
 * @returns {string} Standardized tier name
 */
export function standardizeTierForStorage(tierName) {
  return normalizeTierName(tierName)
}

/**
 * Get tier-based feature limits
 * @param {string} tierName - Subscription tier
 * @returns {object} Feature limits for the tier
 */
export function getTierLimits(tierName) {
  const normalizedTier = normalizeTierName(tierName)
  
  const limits = {
    [SUBSCRIPTION_TIERS.FREE]: {
      staff: 15,        // Full barbershop capacity - up to 15 barbers
      locations: 1,     // Single location barbershop
      smsCredits: 500,  // Same as Individual - basic SMS marketing
      emailCredits: 1000, // Same as Individual - basic email marketing
      aiTokens: 5000,   // Same as Individual - basic AI features
      storageGB: 5      // Same as Individual - basic storage
    },
    [SUBSCRIPTION_TIERS.INDIVIDUAL]: {
      staff: 1,
      locations: 1, 
      smsCredits: 500,
      emailCredits: 1000,
      aiTokens: 5000,
      storageGB: 5
    },
    [SUBSCRIPTION_TIERS.PROFESSIONAL]: {
      staff: 15,
      locations: 1,
      smsCredits: 2000,
      emailCredits: 5000,
      aiTokens: 20000,
      storageGB: 25
    },
    [SUBSCRIPTION_TIERS.ENTERPRISE]: {
      staff: 999,
      locations: 999,
      smsCredits: 10000,
      emailCredits: 25000,
      aiTokens: 100000,
      storageGB: 500
    }
  }
  
  return limits[normalizedTier] || limits[SUBSCRIPTION_TIERS.FREE]
}