// Payment error handling utilities

export const PAYMENT_ERROR_TYPES = {
  CARD_DECLINED: 'card_declined',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  EXPIRED_CARD: 'expired_card',
  INCORRECT_CVC: 'incorrect_cvc',
  PROCESSING_ERROR: 'processing_error',
  NETWORK_ERROR: 'network_error',
  AUTHENTICATION_REQUIRED: 'authentication_required',
  RATE_LIMITED: 'rate_limited',
  INVALID_REQUEST: 'invalid_request',
  SETUP_INTENT_FAILED: 'setup_intent_failed',
  ACCOUNT_ERROR: 'account_error'
}

export const PAYMENT_ERROR_MESSAGES = {
  [PAYMENT_ERROR_TYPES.CARD_DECLINED]: 'Your card was declined. Please try a different payment method or contact your bank.',
  [PAYMENT_ERROR_TYPES.INSUFFICIENT_FUNDS]: 'Your card has insufficient funds. Please try a different payment method.',
  [PAYMENT_ERROR_TYPES.EXPIRED_CARD]: 'Your card has expired. Please update your payment information.',
  [PAYMENT_ERROR_TYPES.INCORRECT_CVC]: 'The security code (CVC) you entered is incorrect. Please check and try again.',
  [PAYMENT_ERROR_TYPES.PROCESSING_ERROR]: 'There was an error processing your payment. Please try again.',
  [PAYMENT_ERROR_TYPES.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [PAYMENT_ERROR_TYPES.AUTHENTICATION_REQUIRED]: 'This payment requires additional authentication. Please complete the verification.',
  [PAYMENT_ERROR_TYPES.RATE_LIMITED]: 'Too many payment attempts. Please wait a moment and try again.',
  [PAYMENT_ERROR_TYPES.INVALID_REQUEST]: 'Invalid payment information. Please check your details and try again.',
  [PAYMENT_ERROR_TYPES.SETUP_INTENT_FAILED]: 'Failed to set up payment method. Please try again.',
  [PAYMENT_ERROR_TYPES.ACCOUNT_ERROR]: 'Payment processing is temporarily unavailable. Please try again later.'
}

export function getPaymentErrorType(error) {
  if (!error) return PAYMENT_ERROR_TYPES.PROCESSING_ERROR

  // Stripe error types
  if (error.type === 'card_error') {
    switch (error.code) {
      case 'card_declined':
        if (error.decline_code === 'insufficient_funds') {
          return PAYMENT_ERROR_TYPES.INSUFFICIENT_FUNDS
        }
        return PAYMENT_ERROR_TYPES.CARD_DECLINED
      case 'expired_card':
        return PAYMENT_ERROR_TYPES.EXPIRED_CARD
      case 'incorrect_cvc':
        return PAYMENT_ERROR_TYPES.INCORRECT_CVC
      case 'authentication_required':
        return PAYMENT_ERROR_TYPES.AUTHENTICATION_REQUIRED
      default:
        return PAYMENT_ERROR_TYPES.CARD_DECLINED
    }
  }

  if (error.type === 'rate_limit_error') {
    return PAYMENT_ERROR_TYPES.RATE_LIMITED
  }

  if (error.type === 'invalid_request_error') {
    return PAYMENT_ERROR_TYPES.INVALID_REQUEST
  }

  if (error.type === 'api_error') {
    return PAYMENT_ERROR_TYPES.PROCESSING_ERROR
  }

  if (error.type === 'api_connection_error') {
    return PAYMENT_ERROR_TYPES.NETWORK_ERROR
  }

  // Network errors
  if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
    return PAYMENT_ERROR_TYPES.NETWORK_ERROR
  }

  // Check error message for common patterns
  const message = error.message?.toLowerCase() || ''
  
  if (message.includes('insufficient') || message.includes('funds')) {
    return PAYMENT_ERROR_TYPES.INSUFFICIENT_FUNDS
  }
  
  if (message.includes('declined') || message.includes('rejected')) {
    return PAYMENT_ERROR_TYPES.CARD_DECLINED
  }
  
  if (message.includes('expired')) {
    return PAYMENT_ERROR_TYPES.EXPIRED_CARD
  }
  
  if (message.includes('cvc') || message.includes('security code')) {
    return PAYMENT_ERROR_TYPES.INCORRECT_CVC
  }
  
  if (message.includes('network') || message.includes('connection')) {
    return PAYMENT_ERROR_TYPES.NETWORK_ERROR
  }
  
  if (message.includes('rate limit') || message.includes('too many')) {
    return PAYMENT_ERROR_TYPES.RATE_LIMITED
  }

  return PAYMENT_ERROR_TYPES.PROCESSING_ERROR
}

export function getPaymentErrorMessage(error) {
  const errorType = getPaymentErrorType(error)
  return PAYMENT_ERROR_MESSAGES[errorType] || PAYMENT_ERROR_MESSAGES[PAYMENT_ERROR_TYPES.PROCESSING_ERROR]
}

export function isRetryableError(error) {
  const errorType = getPaymentErrorType(error)
  
  // These errors are worth retrying
  const retryableTypes = [
    PAYMENT_ERROR_TYPES.PROCESSING_ERROR,
    PAYMENT_ERROR_TYPES.NETWORK_ERROR,
    PAYMENT_ERROR_TYPES.RATE_LIMITED
  ]
  
  return retryableTypes.includes(errorType)
}

export function shouldSuggestAlternativePayment(error) {
  const errorType = getPaymentErrorType(error)
  
  // These errors suggest the user should try a different payment method
  const alternativePaymentTypes = [
    PAYMENT_ERROR_TYPES.CARD_DECLINED,
    PAYMENT_ERROR_TYPES.INSUFFICIENT_FUNDS,
    PAYMENT_ERROR_TYPES.EXPIRED_CARD
  ]
  
  return alternativePaymentTypes.includes(errorType)
}

export async function retryPaymentWithBackoff(paymentFunction, maxRetries = 3) {
  let lastError = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await paymentFunction()
    } catch (error) {
      lastError = error
      
      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Payment analytics and logging
export function logPaymentError(error, context = {}) {
  const errorType = getPaymentErrorType(error)
  const errorData = {
    type: errorType,
    message: error.message,
    code: error.code,
    timestamp: new Date().toISOString(),
    context
  }
  
  console.error('Payment Error:', errorData)
  
  // In production, send to analytics service
  // analytics.track('payment_error', errorData)
  
  return errorData
}