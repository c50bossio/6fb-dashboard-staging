/**
 * GLOBAL INPUT FORMATTERS
 * 
 * Auto-formatting functions for various input types
 * Works seamlessly with NuclearInput component
 */

/**
 * Format phone number to (XXX) XXX-XXXX format
 * Handles US/CA phone numbers
 */
export const formatPhoneNumber = (value) => {
  if (!value) return value
  
  const phoneNumber = value.replace(/[^\d]/g, '')
  const phoneNumberLength = phoneNumber.length
  
  if (phoneNumberLength < 4) return phoneNumber
  
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
  }
  
  if (phoneNumberLength <= 10) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }
  
  if (phoneNumberLength === 11 && phoneNumber.startsWith('1')) {
    return `+1 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 11)}`
  }
  
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
}

/**
 * Format international phone number with country code
 */
export const formatInternationalPhone = (value) => {
  if (!value) return value
  
  const cleaned = value.replace(/[^\d+]/g, '')
  
  if (cleaned.startsWith('+1')) {
    const digits = cleaned.slice(2)
    if (digits.length >= 10) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    } else if (digits.length >= 6) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    } else if (digits.length >= 3) {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return `+1 ${digits}`
    }
  }
  
  if (cleaned.startsWith('+')) {
    const countryCode = cleaned.slice(0, cleaned.length >= 3 ? 3 : cleaned.length)
    const remainder = cleaned.slice(countryCode.length)
    
    if (remainder.length > 6) {
      return `${countryCode} ${remainder.slice(0, 3)} ${remainder.slice(3, 6)} ${remainder.slice(6)}`
    } else if (remainder.length > 3) {
      return `${countryCode} ${remainder.slice(0, 3)} ${remainder.slice(3)}`
    } else {
      return `${countryCode} ${remainder}`
    }
  }
  
  return cleaned
}

/**
 * Format email to lowercase and validate basic structure
 */
export const formatEmail = (value) => {
  if (!value) return value
  
  let formatted = value.toLowerCase().trim()
  
  const atIndex = formatted.indexOf('@')
  if (atIndex !== -1) {
    const beforeAt = formatted.slice(0, atIndex)
    const afterAt = formatted.slice(atIndex + 1).replace(/@/g, '')
    formatted = beforeAt + '@' + afterAt
  }
  
  return formatted
}

/**
 * Format currency input
 */
export const formatCurrency = (value) => {
  if (!value) return value
  
  const numericValue = value.replace(/[^\d.]/g, '')
  
  const parts = numericValue.split('.')
  if (parts.length > 2) {
    const formatted = parts[0] + '.' + parts.slice(1).join('')
    return '$' + formatted
  }
  
  if (parts[1] && parts[1].length > 2) {
    parts[1] = parts[1].slice(0, 2)
  }
  
  const result = parts.join('.')
  return result ? '$' + result : ''
}

/**
 * Format ZIP/Postal Code
 */
export const formatZipCode = (value) => {
  if (!value) return value
  
  const cleaned = value.replace(/[^\d]/g, '')
  
  if (cleaned.length <= 5) {
    return cleaned
  } else if (cleaned.length <= 9) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
  }
  
  return cleaned.slice(0, 9)
}

/**
 * Format credit card number
 */
export const formatCreditCard = (value) => {
  if (!value) return value
  
  const cleaned = value.replace(/[^\d]/g, '')
  const groups = cleaned.match(/.{1,4}/g) || []
  
  return groups.join(' ').substr(0, 19) // Max 16 digits with spaces
}

/**
 * Format Social Security Number
 */
export const formatSSN = (value) => {
  if (!value) return value
  
  const cleaned = value.replace(/[^\d]/g, '')
  
  if (cleaned.length <= 3) {
    return cleaned
  } else if (cleaned.length <= 5) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  } else {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`
  }
}

/**
 * Format business hours (12-hour format)
 */
export const formatTime12Hour = (value) => {
  if (!value) return value
  
  const digits = value.replace(/[^\d]/g, '')
  
  if (digits.length <= 2) {
    return digits
  } else if (digits.length <= 4) {
    const hours = digits.slice(0, 2)
    const minutes = digits.slice(2)
    return `${hours}:${minutes}`
  }
  
  return digits.slice(0, 4)
}

/**
 * Auto-detect and apply appropriate formatter based on input type and name
 */
export const autoFormat = (value, inputType, inputName, placeholder) => {
  if (!value) return value
  
  const lowerName = (inputName || '').toLowerCase()
  const lowerPlaceholder = (placeholder || '').toLowerCase()
  
  if (inputType === 'tel' || 
      lowerName.includes('phone') || 
      lowerPlaceholder.includes('phone') ||
      lowerPlaceholder.includes('mobile')) {
    
    if (value.includes('+') || value.length > 10) {
      return formatInternationalPhone(value)
    } else {
      return formatPhoneNumber(value)
    }
  }
  
  if (inputType === 'email' || 
      lowerName.includes('email') || 
      lowerPlaceholder.includes('email')) {
    return formatEmail(value)
  }
  
  if (lowerName.includes('price') || 
      lowerName.includes('cost') || 
      lowerName.includes('amount') || 
      lowerPlaceholder.includes('$')) {
    return formatCurrency(value)
  }
  
  if (lowerName.includes('zip') || 
      lowerName.includes('postal') || 
      lowerPlaceholder.includes('zip')) {
    return formatZipCode(value)
  }
  
  if (lowerName.includes('card') || 
      lowerPlaceholder.includes('card number')) {
    return formatCreditCard(value)
  }
  
  if (lowerName.includes('ssn') || 
      lowerName.includes('social') || 
      lowerPlaceholder.includes('social security')) {
    return formatSSN(value)
  }
  
  if (inputType === 'time' || 
      lowerName.includes('time') || 
      lowerPlaceholder.includes('time')) {
    return formatTime12Hour(value)
  }
  
  return value
}

/**
 * Validation helpers
 */
export const validators = {
  phone: (value) => {
    const digits = value.replace(/[^\d]/g, '')
    return digits.length >= 10
  },
  
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  },
  
  zipCode: (value) => {
    const digits = value.replace(/[^\d]/g, '')
    return digits.length === 5 || digits.length === 9
  },
  
  creditCard: (value) => {
    const digits = value.replace(/[^\d]/g, '')
    return digits.length >= 13 && digits.length <= 19
  },
  
  ssn: (value) => {
    const digits = value.replace(/[^\d]/g, '')
    return digits.length === 9
  }
}

export default {
  formatPhoneNumber,
  formatInternationalPhone,
  formatEmail,
  formatCurrency,
  formatZipCode,
  formatCreditCard,
  formatSSN,
  formatTime12Hour,
  autoFormat,
  validators
}