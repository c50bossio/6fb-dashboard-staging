/**
 * Shared Form Validation Utilities
 * Feature: 001-complete-feature-011
 *
 * Provides reusable validation functions for forms across the application
 */

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }

  return { valid: true }
}

/**
 * Validate phone number (E.164 format)
 * Accepts formats like: +1-555-123-4567, +15551234567, (555) 123-4567
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) {
    // Phone is optional in most forms
    return { valid: true }
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '')

  // Check if it starts with + and has 10-15 digits
  const phoneRegex = /^\+?[1-9]\d{9,14}$/

  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid phone number (e.g., +1-555-123-4567)' }
  }

  return { valid: true }
}

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string = 'This field'): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` }
  }

  // For arrays, check if not empty
  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, error: `${fieldName} must have at least one item` }
  }

  return { valid: true }
}

/**
 * Validate text length
 */
export function validateLength(
  value: string,
  min?: number,
  max?: number,
  fieldName: string = 'This field'
): { valid: boolean; error?: string } {
  const length = value?.length || 0

  if (min && length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` }
  }

  if (max && length > max) {
    return { valid: false, error: `${fieldName} must be no more than ${max} characters` }
  }

  return { valid: true }
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min?: number,
  max?: number,
  fieldName: string = 'This value'
): { valid: boolean; error?: string } {
  if (min !== undefined && value < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` }
  }

  if (max !== undefined && value > max) {
    return { valid: false, error: `${fieldName} must be no more than ${max}` }
  }

  return { valid: true }
}

/**
 * Validate booking slug format (kebab-case)
 */
export function validateBookingSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Booking slug is required' }
  }

  // Check length
  if (slug.length < 3 || slug.length > 100) {
    return { valid: false, error: 'Booking slug must be 3-100 characters' }
  }

  // Check kebab-case format (lowercase, numbers, hyphens only)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

  if (!slugRegex.test(slug)) {
    return { valid: false, error: 'Booking slug must be kebab-case (lowercase letters, numbers, and hyphens only)' }
  }

  return { valid: true }
}

/**
 * Validate commission percentage (0-100)
 */
export function validateCommission(percentage: number): { valid: boolean; error?: string } {
  if (percentage === null || percentage === undefined) {
    return { valid: false, error: 'Commission percentage is required' }
  }

  return validateRange(percentage, 0, 100, 'Commission percentage')
}

/**
 * Validate booth rent amount (must be positive)
 */
export function validateBoothRent(amount: number): { valid: boolean; error?: string } {
  if (amount === null || amount === undefined) {
    return { valid: false, error: 'Booth rent amount is required' }
  }

  if (amount <= 0) {
    return { valid: false, error: 'Booth rent amount must be greater than 0' }
  }

  return { valid: true }
}

/**
 * Validate specialties array (max 10 items, each max 50 chars)
 */
export function validateSpecialties(specialties: string[]): { valid: boolean; error?: string } {
  if (!Array.isArray(specialties)) {
    return { valid: false, error: 'Specialties must be an array' }
  }

  if (specialties.length > 10) {
    return { valid: false, error: 'Maximum 10 specialties allowed' }
  }

  for (const specialty of specialties) {
    if (specialty.length > 50) {
      return { valid: false, error: 'Each specialty must be no more than 50 characters' }
    }
  }

  return { valid: true }
}

/**
 * Validate form object with multiple fields
 * Returns object with field errors
 */
export function validateForm(
  data: Record<string, any>,
  rules: Record<string, Array<(value: any) => { valid: boolean; error?: string }>>
): {
  valid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const result = validator(data[field])
      if (!result.valid) {
        errors[field] = result.error || 'Invalid value'
        break // Stop at first error for this field
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
