/**
 * User Data Extraction Utility
 * Extracts and processes user data from OAuth providers and email sign-ups
 * for pre-populating onboarding forms
 */

/**
 * Extract user data from Supabase auth user object
 * @param {Object} user - Supabase auth user object
 * @returns {Object} Extracted and processed user data
 */
export function extractUserData(user) {
  if (!user) {
    return {
      email: '',
      fullName: '',
      firstName: '',
      lastName: '',
      avatar: '',
      provider: 'email',
      suggestedShopName: '',
      phone: ''
    }
  }

  // Extract basic data
  const email = user.email || ''
  const rawMetaData = user.raw_user_meta_data || {}
  const userMetaData = user.user_metadata || {}
  
  // Determine provider
  const provider = user.app_metadata?.provider || 'email'
  
  // Extract name data with fallbacks across different OAuth providers
  let fullName = ''
  let firstName = ''
  let lastName = ''
  
  if (provider === 'google') {
    // Google OAuth provides structured name data
    fullName = rawMetaData.full_name || rawMetaData.name || userMetaData.full_name || ''
    firstName = rawMetaData.given_name || userMetaData.given_name || ''
    lastName = rawMetaData.family_name || userMetaData.family_name || ''
  } else if (provider === 'github') {
    // GitHub OAuth structure
    fullName = rawMetaData.full_name || rawMetaData.name || userMetaData.name || ''
    // GitHub doesn't always provide separate first/last names
    if (fullName && !firstName && !lastName) {
      const nameParts = fullName.split(' ')
      firstName = nameParts[0] || ''
      lastName = nameParts.slice(1).join(' ') || ''
    }
  } else if (provider === 'email') {
    // Email sign-up - might have full_name if collected during sign-up
    fullName = rawMetaData.full_name || userMetaData.full_name || ''
    firstName = rawMetaData.first_name || userMetaData.first_name || ''
    lastName = rawMetaData.last_name || userMetaData.last_name || ''
  }
  
  // If no structured names, try to parse from full name
  if (fullName && !firstName && !lastName) {
    const nameParts = fullName.trim().split(' ')
    firstName = nameParts[0] || ''
    lastName = nameParts.slice(1).join(' ') || ''
  }
  
  // Extract avatar/profile picture
  let avatar = ''
  if (provider === 'google') {
    avatar = rawMetaData.avatar_url || rawMetaData.picture || userMetaData.avatar_url || ''
  } else if (provider === 'github') {
    avatar = rawMetaData.avatar_url || userMetaData.avatar_url || ''
  }
  
  // Extract phone if available
  const phone = rawMetaData.phone || userMetaData.phone || rawMetaData.phone_number || ''
  
  // Generate smart barbershop name suggestions
  const suggestedShopName = generateShopNameSuggestions(firstName, lastName, fullName, email)
  
  return {
    email,
    fullName,
    firstName,
    lastName,
    avatar,
    provider,
    suggestedShopName,
    phone,
    // Raw data for debugging
    _debug: {
      rawMetaData,
      userMetaData,
      appMetaData: user.app_metadata
    }
  }
}

/**
 * Generate smart barbershop name suggestions based on user data
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name  
 * @param {string} fullName - User's full name
 * @param {string} email - User's email address
 * @returns {Object} Suggested shop name with alternatives
 */
export function generateShopNameSuggestions(firstName, lastName, fullName, email) {
  const suggestions = []
  
  // Primary suggestion based on available names
  if (firstName && lastName) {
    suggestions.push(`${firstName} ${lastName} Barbershop`)
    suggestions.push(`${lastName} Cuts`)
    suggestions.push(`${firstName}'s Barber Shop`)
  } else if (firstName) {
    suggestions.push(`${firstName}'s Barbershop`)
    suggestions.push(`${firstName} Cuts`)
  } else if (fullName) {
    const firstWord = fullName.split(' ')[0]
    suggestions.push(`${firstWord}'s Barbershop`)
    suggestions.push(`${firstWord} Cuts`)
  } else if (email) {
    // Fallback to email username
    const emailUser = email.split('@')[0]
    const cleanUser = emailUser.replace(/[^a-zA-Z0-9]/g, '')
    if (cleanUser) {
      const capitalizedUser = cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1)
      suggestions.push(`${capitalizedUser} Barbershop`)
      suggestions.push(`${capitalizedUser} Cuts`)
    }
  }
  
  // Add generic professional suggestions
  suggestions.push('Elite Cuts Barbershop')
  suggestions.push('Premium Barber Studio')
  suggestions.push('Classic Cuts')
  
  return {
    primary: suggestions[0] || 'My Barbershop',
    alternatives: suggestions.slice(1, 4), // Max 3 alternatives
    all: suggestions
  }
}

/**
 * Check if user has completed onboarding based on profile data
 * @param {Object} profile - User profile from database
 * @returns {boolean} True if onboarding is complete
 */
export function isOnboardingComplete(profile) {
  if (!profile) return false
  
  // Check if user has essential onboarding data
  const hasRole = profile.role && profile.role !== 'CLIENT'
  const hasShopId = profile.shop_id || profile.barbershop_id
  
  // For shop owners, they need a barbershop created
  if (profile.role === 'SHOP_OWNER') {
    return hasRole && hasShopId
  }
  
  // For barbers, they need to be associated with a shop
  if (profile.role === 'BARBER') {
    return hasRole && hasShopId
  }
  
  // For other roles, just having a role is sufficient
  return hasRole
}

/**
 * Get user's current onboarding status and next steps
 * @param {Object} user - Supabase auth user
 * @param {Object} profile - User profile from database
 * @returns {Object} Onboarding status and next steps
 */
export function getOnboardingStatus(user, profile) {
  const userData = extractUserData(user)
  const isComplete = isOnboardingComplete(profile)
  
  let nextStep = 'welcome'
  let requiredFields = []
  
  if (!profile?.role) {
    nextStep = 'profile'
    requiredFields.push('role', 'barbershop_name')
  } else if (profile.role === 'SHOP_OWNER' && !profile.shop_id) {
    nextStep = 'shop_creation'
    requiredFields.push('shop_creation')
  } else if (profile.role === 'BARBER' && !profile.shop_id) {
    nextStep = 'shop_association'
    requiredFields.push('shop_association')
  }
  
  return {
    isComplete,
    nextStep,
    requiredFields,
    userData,
    profile: profile || {},
    canPrePopulate: !!(userData.firstName || userData.fullName || userData.email)
  }
}

/**
 * Format user data for form pre-population
 * @param {Object} userData - Extracted user data
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted data ready for form fields
 */
export function formatForForm(userData, options = {}) {
  const {
    includeDebug = false,
    preferFullName = true
  } = options
  
  const formatted = {
    // Basic fields
    email: userData.email || '',
    phone: userData.phone || '',
    
    // Name fields
    displayName: preferFullName 
      ? (userData.fullName || `${userData.firstName} ${userData.lastName}`.trim())
      : userData.firstName || userData.fullName || '',
    
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    fullName: userData.fullName || '',
    
    // Barbershop suggestions
    barbershopName: userData.suggestedShopName.primary || '',
    barbershopAlternatives: userData.suggestedShopName.alternatives || [],
    
    // Additional data
    avatar: userData.avatar || '',
    provider: userData.provider || 'email',
    
    // Helper flags
    hasName: !!(userData.firstName || userData.lastName || userData.fullName),
    hasPhone: !!userData.phone,
    hasAvatar: !!userData.avatar,
    isOAuthUser: userData.provider !== 'email'
  }
  
  if (includeDebug) {
    formatted._debug = userData._debug
  }
  
  return formatted
}