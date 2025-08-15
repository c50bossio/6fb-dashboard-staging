/**
 * User-friendly error messages and feedback utilities
 */

export const ERROR_MESSAGES = {
  'auth/user-not-found': 'No account found with this email address. Please check your email or sign up for a new account.',
  'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
  'auth/weak-password': 'Password should be at least 6 characters long and include numbers or special characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a few minutes before trying again.',
  
  'api/network-error': 'Unable to connect to our servers. Please check your internet connection.',
  'api/timeout': 'Request timed out. Please try again.',
  'api/server-error': 'Something went wrong on our end. Please try again in a few moments.',
  'api/not-found': 'The requested resource was not found.',
  'api/unauthorized': 'You need to be signed in to perform this action.',
  'api/forbidden': 'You don\'t have permission to perform this action.',
  'api/rate-limit': 'Too many requests. Please wait a moment before trying again.',
  
  'validation/required': 'This field is required.',
  'validation/email': 'Please enter a valid email address.',
  'validation/phone': 'Please enter a valid phone number.',
  'validation/min-length': 'This field must be at least {min} characters long.',
  'validation/max-length': 'This field must be no more than {max} characters long.',
  'validation/pattern': 'Please enter a valid format.',
  
  'upload/file-too-large': 'File size must be less than {maxSize}MB.',
  'upload/invalid-type': 'Only {allowedTypes} files are allowed.',
  'upload/network-error': 'Upload failed. Please check your connection and try again.',
  
  'payment/card-declined': 'Your card was declined. Please try a different payment method.',
  'payment/insufficient-funds': 'Insufficient funds. Please try a different payment method.',
  'payment/expired-card': 'Your card has expired. Please use a different payment method.',
  'payment/invalid-card': 'Invalid card information. Please check your details and try again.',
  'payment/processing-error': 'Payment processing failed. Please try again.',
  
  'ai/quota-exceeded': 'You\'ve reached your AI chat limit for today. Please try again tomorrow or upgrade your plan.',
  'ai/model-unavailable': 'AI assistant is temporarily unavailable. Please try again in a few moments.',
  'ai/content-filtered': 'Your message couldn\'t be processed. Please rephrase and try again.',
  
  'default': 'Something went wrong. Please try again or contact support if the problem persists.'
}

export const SUCCESS_MESSAGES = {
  'auth/signed-in': 'Welcome back! You\'ve been signed in successfully.',
  'auth/signed-up': 'Account created successfully! Please check your email to verify your account.',
  'auth/password-reset': 'Password reset email sent. Please check your inbox.',
  'auth/email-verified': 'Email verified successfully! You can now access all features.',
  
  'profile/updated': 'Profile updated successfully!',
  'settings/saved': 'Settings saved successfully!',
  'booking/created': 'Booking created successfully! You\'ll receive a confirmation email shortly.',
  'booking/cancelled': 'Booking cancelled successfully. Any applicable refund will be processed within 3-5 business days.',
  
  'payment/successful': 'Payment processed successfully!',
  'upload/successful': 'File uploaded successfully!',
  
  'ai/response-generated': 'AI response generated successfully!'
}

/**
 * Get user-friendly error message
 * @param {string|Error} error - Error code, message, or Error object
 * @param {Object} params - Parameters to interpolate into message
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error, params = {}) {
  let errorCode = error
  
  if (error instanceof Error) {
    errorCode = error.code || error.message || 'default'
  }
  
  if (typeof error === 'object' && error.error) {
    errorCode = error.error.code || error.error.message || 'default'
  }
  
  let message = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default
  
  Object.keys(params).forEach(key => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), params[key])
  })
  
  return message
}

/**
 * Get success message
 * @param {string} code - Success code
 * @param {Object} params - Parameters to interpolate
 * @returns {string} Success message
 */
export function getSuccessMessage(code, params = {}) {
  let message = SUCCESS_MESSAGES[code] || 'Operation completed successfully!'
  
  Object.keys(params).forEach(key => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), params[key])
  })
  
  return message
}

/**
 * Format API error for user display
 * @param {Object} apiError - API error response
 * @returns {Object} Formatted error with user-friendly message
 */
export function formatApiError(apiError) {
  const { status, statusText, data } = apiError
  
  let errorCode = 'api/server-error'
  
  switch (status) {
    case 400:
      errorCode = 'validation/required'
      break
    case 401:
      errorCode = 'api/unauthorized'
      break
    case 403:
      errorCode = 'api/forbidden'
      break
    case 404:
      errorCode = 'api/not-found'
      break
    case 429:
      errorCode = 'api/rate-limit'
      break
    case 500:
      errorCode = 'api/server-error'
      break
    default:
      errorCode = 'api/network-error'
  }
  
  return {
    code: errorCode,
    message: getErrorMessage(errorCode),
    originalError: {
      status,
      statusText,
      data
    }
  }
}

/**
 * Create error notification object
 * @param {string|Error} error - Error to format
 * @param {Object} options - Notification options
 * @returns {Object} Notification object
 */
export function createErrorNotification(error, options = {}) {
  const {
    title = 'Error',
    duration = 5000,
    action = null,
    persistent = false
  } = options
  
  return {
    id: `error-${Date.now()}`,
    type: 'error',
    title,
    message: getErrorMessage(error),
    duration,
    action,
    persistent,
    timestamp: new Date().toISOString()
  }
}

/**
 * Create success notification object
 * @param {string} code - Success code
 * @param {Object} options - Notification options
 * @returns {Object} Notification object
 */
export function createSuccessNotification(code, options = {}) {
  const {
    title = 'Success',
    duration = 3000,
    action = null
  } = options
  
  return {
    id: `success-${Date.now()}`,
    type: 'success',
    title,
    message: getSuccessMessage(code),
    duration,
    action,
    timestamp: new Date().toISOString()
  }
}

/**
 * Validation helper functions
 */
export const ValidationHelpers = {
  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) ? null : getErrorMessage('validation/email')
  },
  
  required: (value) => {
    return value && value.toString().trim() ? null : getErrorMessage('validation/required')
  },
  
  minLength: (value, min) => {
    return value && value.length >= min ? null : getErrorMessage('validation/min-length', { min })
  },
  
  maxLength: (value, max) => {
    return value && value.length <= max ? null : getErrorMessage('validation/max-length', { max })
  },
  
  phone: (phone) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/\s/g, '')) ? null : getErrorMessage('validation/phone')
  }
}

export default {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  getErrorMessage,
  getSuccessMessage,
  formatApiError,
  createErrorNotification,
  createSuccessNotification,
  ValidationHelpers
}