/**
 * Phone Number Utilities for SMS and Communication
 * 
 * Provides comprehensive phone number handling including:
 * - Twilio-compatible normalization with country codes
 * - Smart country code detection
 * - User-friendly display formatting
 * - Validation utilities
 */

/**
 * Normalize phone number for Twilio SMS delivery
 * Ensures proper country code format that Twilio accepts
 * 
 * @param {string} phoneNumber - Raw phone number in any format
 * @param {string} defaultCountryCode - Default country code (default: 'US')
 * @returns {string} - Twilio-compatible phone number with country code
 */
export function normalizePhoneForTwilio(phoneNumber, defaultCountryCode = 'US') {
  if (!phoneNumber) return null
  
  // Remove all non-numeric characters
  let digits = phoneNumber.replace(/[^\d]/g, '')
  
  if (!digits) return null
  
  // Handle different country scenarios
  switch (defaultCountryCode) {
    case 'US':
    case 'CA':
      // Handle US/Canada phone numbers
      if (digits.length === 10) {
        // Standard 10-digit US number, add +1
        return `+1${digits}`
      } else if (digits.length === 11 && digits.startsWith('1')) {
        // 11-digit number starting with 1, add +
        return `+${digits}`
      } else if (digits.length === 11 && !digits.startsWith('1')) {
        // Assume first digit is country code
        return `+${digits}`
      } else if (digits.length > 11) {
        // International number, add + if not present
        return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
      }
      break
      
    default:
      // For other countries, assume international format
      if (digits.length >= 10) {
        return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
      }
  }
  
  // Fallback: if we can't determine format, try adding +1 for US
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`
}

/**
 * Detect country code from phone number format
 * 
 * @param {string} phoneNumber - Phone number to analyze
 * @returns {string} - Detected country code
 */
export function detectCountryCode(phoneNumber) {
  if (!phoneNumber) return 'US'
  
  const digits = phoneNumber.replace(/[^\d]/g, '')
  
  // US/Canada detection
  if (digits.length === 10) return 'US'
  if (digits.length === 11 && digits.startsWith('1')) return 'US'
  
  // Common international prefixes
  const countryPrefixes = {
    '44': 'GB',  // UK
    '33': 'FR',  // France
    '49': 'DE',  // Germany
    '39': 'IT',  // Italy
    '34': 'ES',  // Spain
    '61': 'AU',  // Australia
    '81': 'JP',  // Japan
    '86': 'CN',  // China
    '91': 'IN',  // India
    '55': 'BR',  // Brazil
  }
  
  for (const [prefix, code] of Object.entries(countryPrefixes)) {
    if (digits.startsWith(prefix)) {
      return code
    }
  }
  
  return 'US' // Default fallback
}

/**
 * Format phone number for user display
 * 
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - User-friendly formatted phone number
 */
export function formatPhoneForDisplay(phoneNumber) {
  if (!phoneNumber) return ''
  
  const digits = phoneNumber.replace(/[^\d]/g, '')
  
  // US/Canada formatting
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  
  if (digits.length === 11 && digits.startsWith('1')) {
    const usDigits = digits.slice(1)
    return `+1 (${usDigits.slice(0, 3)}) ${usDigits.slice(3, 6)}-${usDigits.slice(6)}`
  }
  
  // International formatting
  if (phoneNumber.startsWith('+')) {
    return phoneNumber
  }
  
  return phoneNumber
}

/**
 * Validate phone number format
 * 
 * @param {string} phoneNumber - Phone number to validate
 * @returns {object} - Validation result with isValid boolean and error message
 */
export function validatePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return { isValid: false, error: 'Phone number is required' }
  }
  
  const digits = phoneNumber.replace(/[^\d]/g, '')
  
  if (digits.length < 10) {
    return { isValid: false, error: 'Phone number must be at least 10 digits' }
  }
  
  if (digits.length > 15) {
    return { isValid: false, error: 'Phone number cannot exceed 15 digits' }
  }
  
  // Additional validation patterns can be added here
  
  return { isValid: true, error: null }
}

/**
 * Clean phone number for database storage
 * Removes formatting but preserves country code structure
 * 
 * @param {string} phoneNumber - Phone number to clean
 * @returns {string} - Cleaned phone number suitable for database storage
 */
export function cleanPhoneForStorage(phoneNumber) {
  if (!phoneNumber) return null
  
  // For storage, we'll keep the normalized format
  return normalizePhoneForTwilio(phoneNumber)
}

/**
 * Check if phone number is SMS-capable (Twilio compatible)
 * 
 * @param {string} phoneNumber - Phone number to check
 * @returns {boolean} - Whether number can receive SMS
 */
export function isSMSCapable(phoneNumber) {
  const normalized = normalizePhoneForTwilio(phoneNumber)
  if (!normalized) return false
  
  // Twilio supports SMS for most mobile numbers
  // Additional carrier/type checking could be added here
  return normalized.startsWith('+') && normalized.length >= 12
}

/**
 * Get phone number formatting hints for user input
 * 
 * @param {string} countryCode - Country code for specific hints
 * @returns {object} - Formatting hints and examples
 */
export function getPhoneFormattingHints(countryCode = 'US') {
  const hints = {
    'US': {
      example: '(555) 123-4567',
      pattern: 'US format: (XXX) XXX-XXXX',
      placeholder: 'Enter US phone number'
    },
    'GB': {
      example: '+44 20 7123 4567',
      pattern: 'UK format: +44 XX XXXX XXXX',
      placeholder: 'Enter UK phone number'
    },
    'CA': {
      example: '(555) 123-4567',
      pattern: 'Canadian format: (XXX) XXX-XXXX',
      placeholder: 'Enter Canadian phone number'
    }
  }
  
  return hints[countryCode] || hints['US']
}

/**
 * Convert phone number between different formats
 * 
 * @param {string} phoneNumber - Source phone number
 * @param {string} targetFormat - Target format ('twilio', 'display', 'storage', 'digits')
 * @returns {string} - Converted phone number
 */
export function convertPhoneFormat(phoneNumber, targetFormat) {
  if (!phoneNumber) return null
  
  switch (targetFormat) {
    case 'twilio':
      return normalizePhoneForTwilio(phoneNumber)
    case 'display':
      return formatPhoneForDisplay(phoneNumber)
    case 'storage':
      return cleanPhoneForStorage(phoneNumber)
    case 'digits':
      return phoneNumber.replace(/[^\d]/g, '')
    default:
      return phoneNumber
  }
}

// Default export with all utilities
export default {
  normalizePhoneForTwilio,
  detectCountryCode,
  formatPhoneForDisplay,
  validatePhoneNumber,
  cleanPhoneForStorage,
  isSMSCapable,
  getPhoneFormattingHints,
  convertPhoneFormat
}