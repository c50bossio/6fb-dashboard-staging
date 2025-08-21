/**
 * Badge System Utilities
 * Comprehensive badge configuration and logic for customer gamification
 */

// Badge rarity levels with associated styling and points multipliers
export const BADGE_RARITY = {
  COMMON: {
    value: 'common',
    label: 'Common',
    color: '#6B7280',
    glowColor: '#9CA3AF',
    pointsMultiplier: 1,
    sparkles: 1
  },
  RARE: {
    value: 'rare',
    label: 'Rare',
    color: '#3B82F6',
    glowColor: '#60A5FA',
    pointsMultiplier: 2,
    sparkles: 2
  },
  EPIC: {
    value: 'epic',
    label: 'Epic',
    color: '#8B5CF6',
    glowColor: '#A78BFA',
    pointsMultiplier: 3,
    sparkles: 3
  },
  LEGENDARY: {
    value: 'legendary',
    label: 'Legendary',
    color: '#F59E0B',
    glowColor: '#FBBF24',
    pointsMultiplier: 5,
    sparkles: 5
  }
}

// Badge categories with metadata
export const BADGE_CATEGORIES = {
  LOYALTY: {
    value: 'loyalty',
    label: 'Loyalty',
    description: 'Badges earned through regular visits and dedication',
    icon: '❤️',
    color: '#EF4444'
  },
  MILESTONE: {
    value: 'milestone',
    label: 'Milestone',
    description: 'Celebrate major achievement milestones',
    icon: '🏆',
    color: '#F59E0B'
  },
  SPENDING: {
    value: 'spending',
    label: 'Spending',
    description: 'Recognition for investment in quality service',
    icon: '💰',
    color: '#10B981'
  },
  SPECIAL: {
    value: 'special',
    label: 'Special',
    description: 'Unique achievements and special occasions',
    icon: '✨',
    color: '#8B5CF6'
  },
  SEASONAL: {
    value: 'seasonal',
    label: 'Seasonal',
    description: 'Limited-time seasonal achievements',
    icon: '🌟',
    color: '#06B6D4'
  }
}

// Badge calculation functions
export const BadgeCalculators = {
  /**
   * Calculate visits-based badge progress
   */
  visits: (customerData, criteria) => {
    const current = customerData.total_visits || 0
    const target = criteria.threshold
    return {
      current,
      target,
      percentage: Math.min(100, (current / target) * 100),
      eligible: current >= target
    }
  },

  /**
   * Calculate spending-based badge progress
   */
  spending: (customerData, criteria) => {
    const current = parseFloat(customerData.total_spent || 0)
    const target = criteria.threshold
    return {
      current,
      target,
      percentage: Math.min(100, (current / target) * 100),
      eligible: current >= target
    }
  },

  /**
   * Calculate referral-based badge progress
   */
  referrals: (customerData, criteria) => {
    const current = customerData.referral_count || 0
    const target = criteria.threshold
    return {
      current,
      target,
      percentage: Math.min(100, (current / target) * 100),
      eligible: current >= target
    }
  },

  /**
   * Calculate early arrival badge progress
   */
  early_arrivals: (customerData, criteria) => {
    const current = customerData.early_arrivals || 0
    const target = criteria.threshold
    return {
      current,
      target,
      percentage: Math.min(100, (current / target) * 100),
      eligible: current >= target
    }
  },

  /**
   * Calculate birthday visit badge
   */
  birthday_visit: (customerData, criteria) => {
    const current = customerData.birthday_visits || 0
    const target = criteria.threshold
    return {
      current,
      target,
      percentage: Math.min(100, (current / target) * 100),
      eligible: current >= target
    }
  },

  /**
   * Calculate review-based badge progress
   */
  reviews: (customerData, criteria) => {
    const current = customerData.review_count || 0
    const target = criteria.threshold
    return {
      current,
      target,
      percentage: Math.min(100, (current / target) * 100),
      eligible: current >= target
    }
  },

  /**
   * Calculate seasonal visits badge progress
   */
  seasonal_visits: (customerData, criteria) => {
    const seasonKey = `${criteria.season}_visits`
    const current = customerData[seasonKey] || 0
    const target = criteria.threshold
    return {
      current,
      target,
      percentage: Math.min(100, (current / target) * 100),
      eligible: current >= target
    }
  }
}

/**
 * Get badge rarity styling information
 */
export function getBadgeRarityStyle(rarity) {
  return BADGE_RARITY[rarity.toUpperCase()] || BADGE_RARITY.COMMON
}

/**
 * Get badge category information
 */
export function getBadgeCategoryInfo(category) {
  return BADGE_CATEGORIES[category.toUpperCase()] || BADGE_CATEGORIES.LOYALTY
}

/**
 * Calculate badge progress for a customer
 */
export function calculateBadgeProgress(customerData, badgeDefinition) {
  const { criteria } = badgeDefinition
  const calculator = BadgeCalculators[criteria.type]
  
  if (!calculator) {
    console.warn(`No calculator found for badge type: ${criteria.type}`)
    return {
      current: 0,
      target: criteria.threshold || 1,
      percentage: 0,
      eligible: false
    }
  }
  
  return calculator(customerData, criteria)
}

/**
 * Check if customer is eligible for a badge
 */
export function isEligibleForBadge(customerData, badgeDefinition) {
  const progress = calculateBadgeProgress(customerData, badgeDefinition)
  return progress.eligible
}

/**
 * Get all eligible badges for a customer
 */
export function getEligibleBadges(customerData, badgeDefinitions) {
  return badgeDefinitions.filter(badge => 
    isEligibleForBadge(customerData, badge)
  )
}

/**
 * Calculate total points from earned badges
 */
export function calculateTotalBadgePoints(earnedBadges) {
  return earnedBadges.reduce((total, badge) => {
    const rarityInfo = getBadgeRarityStyle(badge.rarity)
    return total + (badge.points * rarityInfo.pointsMultiplier)
  }, 0)
}

/**
 * Group badges by category
 */
export function groupBadgesByCategory(badges) {
  return badges.reduce((groups, badge) => {
    const category = badge.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(badge)
    return groups
  }, {})
}

/**
 * Sort badges by rarity and points
 */
export function sortBadgesByImportance(badges) {
  const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 }
  
  return [...badges].sort((a, b) => {
    // First sort by rarity
    const rarityDiff = rarityOrder[b.rarity] - rarityOrder[a.rarity]
    if (rarityDiff !== 0) return rarityDiff
    
    // Then by points
    return b.points - a.points
  })
}

/**
 * Get next badge to earn in a category
 */
export function getNextBadgeInCategory(customerData, badgeDefinitions, category) {
  const categoryBadges = badgeDefinitions.filter(badge => 
    badge.category === category && !badge.earned
  )
  
  // Calculate progress for each badge and sort by closest to completion
  const badgesWithProgress = categoryBadges.map(badge => ({
    ...badge,
    progress: calculateBadgeProgress(customerData, badge)
  }))
  
  // Sort by progress percentage (descending) to get closest to earning
  badgesWithProgress.sort((a, b) => b.progress.percentage - a.progress.percentage)
  
  return badgesWithProgress[0] || null
}

/**
 * Get badge leaderboard data
 */
export function calculateBadgeLeaderboard(customers) {
  return customers.map(customer => {
    const totalBadges = customer.badges?.length || 0
    const totalPoints = calculateTotalBadgePoints(customer.badges || [])
    const rarityBreakdown = customer.badges?.reduce((breakdown, badge) => {
      breakdown[badge.rarity] = (breakdown[badge.rarity] || 0) + 1
      return breakdown
    }, {}) || {}
    
    return {
      customer_id: customer.id,
      name: customer.name,
      totalBadges,
      totalPoints,
      rarityBreakdown,
      rank: 0 // Will be calculated after sorting
    }
  }).sort((a, b) => {
    // Sort by total points first, then by number of badges
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints
    }
    return b.totalBadges - a.totalBadges
  }).map((item, index) => ({
    ...item,
    rank: index + 1
  }))
}

/**
 * Check for seasonal badge eligibility
 */
export function getCurrentSeason() {
  const month = new Date().getMonth() + 1 // JavaScript months are 0-indexed
  
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

/**
 * Get badge notification message
 */
export function getBadgeNotificationMessage(badge) {
  const rarityInfo = getBadgeRarityStyle(badge.rarity)
  const rarityEmoji = '✨'.repeat(rarityInfo.sparkles)
  
  return {
    title: `${rarityEmoji} New ${rarityInfo.label} Badge Earned! ${rarityEmoji}`,
    message: `Congratulations! You've earned the "${badge.name}" badge. ${badge.description}`,
    points: badge.points * rarityInfo.pointsMultiplier
  }
}

/**
 * Format progress display text
 */
export function formatProgressText(progress) {
  const { current, target, percentage } = progress
  
  if (percentage >= 100) {
    return 'Completed!'
  }
  
  return `${current.toLocaleString()} / ${target.toLocaleString()} (${Math.round(percentage)}%)`
}

/**
 * Get badge sharing message
 */
export function getBadgeSharingMessage(badge, customerName) {
  return `🎉 ${customerName} just earned the "${badge.name}" badge! ${badge.description} #Achievement #Barbershop`
}

// Add missing export for sortBadgesByDifficulty (alias for sortBadgesByImportance)
export const sortBadgesByDifficulty = sortBadgesByImportance

export default {
  BADGE_RARITY,
  BADGE_CATEGORIES,
  BadgeCalculators,
  getBadgeRarityStyle,
  getBadgeCategoryInfo,
  calculateBadgeProgress,
  isEligibleForBadge,
  getEligibleBadges,
  calculateTotalBadgePoints,
  groupBadgesByCategory,
  sortBadgesByImportance,
  sortBadgesByDifficulty,
  getNextBadgeInCategory,
  calculateBadgeLeaderboard,
  getCurrentSeason,
  getBadgeNotificationMessage,
  formatProgressText,
  getBadgeSharingMessage
}