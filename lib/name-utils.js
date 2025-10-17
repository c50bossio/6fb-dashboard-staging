/**
 * Name Utilities
 * Standardized name handling for the 6FB AI Agent System
 * 
 * Handles conversion between full_name and first_name/last_name formats
 * Provides consistent name display and validation across the system
 */

/**
 * Split a full name into first and last name components
 * @param {string} fullName - Complete name string
 * @returns {object} Object with firstName and lastName properties
 */
export function splitFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' }
  }

  const trimmed = fullName.trim()
  if (!trimmed) {
    return { firstName: '', lastName: '' }
  }

  // Split by spaces and filter out empty parts
  const parts = trimmed.split(/\s+/).filter(part => part.length > 0)

  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  } else if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  } else if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] }
  } else {
    // Multiple parts: first word is first name, rest is last name
    return { 
      firstName: parts[0], 
      lastName: parts.slice(1).join(' ') 
    }
  }
}

/**
 * Combine first and last name into a full name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name  
 * @returns {string} Combined full name
 */
export function combineNames(firstName, lastName) {
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()

  if (first && last) {
    return `${first} ${last}`
  } else if (first) {
    return first
  } else if (last) {
    return last
  } else {
    return ''
  }
}

/**
 * Get a display name with fallback options
 * @param {object} options - Name and fallback options
 * @param {string} options.firstName - First name
 * @param {string} options.lastName - Last name
 * @param {string} options.fullName - Full name (fallback)
 * @param {string} options.email - Email (fallback)
 * @param {string} options.defaultName - Default name (final fallback)
 * @returns {string} Best available display name
 */
export function getDisplayName({ 
  firstName, 
  lastName, 
  fullName, 
  email, 
  defaultName = 'Unknown User' 
}) {
  // Try first + last name first
  const combinedName = combineNames(firstName, lastName)
  if (combinedName) {
    return combinedName
  }

  // Fall back to full name
  if (fullName && fullName.trim()) {
    return fullName.trim()
  }

  // Fall back to email username
  if (email && email.includes('@')) {
    return email.split('@')[0].replace(/[._]/g, ' ').trim()
  }

  // Final fallback
  return defaultName
}

/**
 * Get initials from name components
 * @param {object} options - Name options
 * @param {string} options.firstName - First name
 * @param {string} options.lastName - Last name
 * @param {string} options.fullName - Full name (fallback)
 * @returns {string} Initials (1-2 characters)
 */
export function getInitials({ firstName, lastName, fullName }) {
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase()
  } else if (first) {
    return first[0].toUpperCase()
  } else if (last) {
    return last[0].toUpperCase()
  } else if (fullName && fullName.trim()) {
    const { firstName: splitFirst, lastName: splitLast } = splitFullName(fullName)
    return getInitials({ firstName: splitFirst, lastName: splitLast })
  } else {
    return '?'
  }
}

/**
 * Format a name for display in different contexts
 * @param {object} options - Name and formatting options
 * @param {string} options.firstName - First name
 * @param {string} options.lastName - Last name
 * @param {string} options.fullName - Full name (fallback)
 * @param {string} format - Format type: 'full', 'firstLast', 'lastFirst', 'first', 'initials'
 * @returns {string} Formatted name
 */
export function formatName({ firstName, lastName, fullName }, format = 'full') {
  const first = (firstName || '').trim()
  const last = (lastName || '').trim()

  switch (format) {
    case 'full':
    case 'firstLast':
      return getDisplayName({ firstName, lastName, fullName })
    
    case 'lastFirst':
      if (first && last) {
        return `${last}, ${first}`
      } else {
        return getDisplayName({ firstName, lastName, fullName })
      }
    
    case 'first':
      return first || splitFullName(fullName).firstName || 'Unknown'
    
    case 'last':
      return last || splitFullName(fullName).lastName || ''
    
    case 'initials':
      return getInitials({ firstName, lastName, fullName })
    
    default:
      return getDisplayName({ firstName, lastName, fullName })
  }
}

/**
 * Validate name components
 * @param {object} nameData - Name data to validate
 * @param {string} nameData.firstName - First name
 * @param {string} nameData.lastName - Last name
 * @param {string} nameData.fullName - Full name
 * @returns {object} Validation result
 */
export function validateNames({ firstName, lastName, fullName }) {
  const errors = []
  const warnings = []

  const first = (firstName || '').trim()
  const last = (lastName || '').trim()
  const full = (fullName || '').trim()

  // Check if we have at least some name information
  if (!first && !last && !full) {
    errors.push('At least first name, last name, or full name is required')
  }

  // Check for reasonable name lengths
  if (first && first.length > 50) {
    errors.push('First name is too long (maximum 50 characters)')
  }
  if (last && last.length > 50) {
    errors.push('Last name is too long (maximum 50 characters)')
  }
  if (full && full.length > 100) {
    errors.push('Full name is too long (maximum 100 characters)')
  }

  // Check for potentially problematic characters
  const nameRegex = /^[a-zA-Z\s\-'.]*$/
  if (first && !nameRegex.test(first)) {
    warnings.push('First name contains unusual characters')
  }
  if (last && !nameRegex.test(last)) {
    warnings.push('Last name contains unusual characters')
  }

  // Check for consistency between full name and first/last names
  if (first && last && full) {
    const expectedFull = combineNames(first, last)
    if (expectedFull !== full) {
      warnings.push('Full name does not match first + last name')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Normalize name data for database storage
 * @param {object} nameData - Raw name data
 * @returns {object} Normalized name data
 */
export function normalizeNameData(nameData) {
  const {
    firstName,
    lastName,
    fullName,
    first_name,
    last_name,
    full_name
  } = nameData || {}

  // Support both camelCase and snake_case field names
  const first = (firstName || first_name || '').trim()
  const last = (lastName || last_name || '').trim()
  const full = (fullName || full_name || '').trim()

  // If we have full name but not first/last, split it
  let finalFirst = first
  let finalLast = last

  if (!first && !last && full) {
    const split = splitFullName(full)
    finalFirst = split.firstName
    finalLast = split.lastName
  }

  // Generate full name from parts if missing
  let finalFull = full
  if (!full && (first || last)) {
    finalFull = combineNames(finalFirst, finalLast)
  }

  return {
    firstName: finalFirst || null,
    lastName: finalLast || null,
    fullName: finalFull || null,
    // Also provide snake_case versions for database compatibility
    first_name: finalFirst || null,
    last_name: finalLast || null,
    full_name: finalFull || null
  }
}

/**
 * Create name update object for API calls
 * @param {object} nameData - Name data
 * @returns {object} Update object with both formats
 */
export function createNameUpdateObject(nameData) {
  const normalized = normalizeNameData(nameData)
  
  return {
    firstName: normalized.firstName,
    lastName: normalized.lastName,
    fullName: normalized.fullName,
    first_name: normalized.first_name,
    last_name: normalized.last_name,
    full_name: normalized.full_name
  }
}

/**
 * Search/filter helper for name matching
 * @param {object} nameData - Name data to search in
 * @param {string} searchTerm - Term to search for
 * @returns {boolean} Whether the name matches the search term
 */
export function nameMatches(nameData, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) {
    return true
  }

  const search = searchTerm.toLowerCase().trim()
  const displayName = getDisplayName(nameData).toLowerCase()
  const firstName = (nameData.firstName || '').toLowerCase()
  const lastName = (nameData.lastName || '').toLowerCase()

  return displayName.includes(search) || 
         firstName.includes(search) || 
         lastName.includes(search)
}

// Export commonly used functions as default
export default {
  splitFullName,
  combineNames,
  getDisplayName,
  getInitials,
  formatName,
  validateNames,
  normalizeNameData,
  createNameUpdateObject,
  nameMatches
}