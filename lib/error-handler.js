/**
 * Global Error Handler - Centralized error handling and reporting
 * Provides consistent error handling across the application
 */

import * as Sentry from '@sentry/nextjs'

export class ApplicationError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500, details = {}) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

export class ValidationError extends ApplicationError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', 400, { field, value })
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = 'Insufficient permissions') {
    super(message, 'AUTHZ_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NetworkError extends ApplicationError {
  constructor(message = 'Network request failed', url = null, method = null) {
    super(message, 'NETWORK_ERROR', 500, { url, method })
    this.name = 'NetworkError'
  }
}

export class APIError extends ApplicationError {
  constructor(message, statusCode = 500, endpoint = null, response = null) {
    super(message, 'API_ERROR', statusCode, { endpoint, response })
    this.name = 'APIError'
  }
}

/**
 * Global error handler for the application
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      logToConsole: process.env.NODE_ENV === 'development',
      reportToSentry: process.env.NODE_ENV === 'production',
      showUserFriendlyMessages: true,
      ...options
    }
    
    this.setupGlobalHandlers()
  }
  
  setupGlobalHandlers() {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, 'unhandledrejection')
        event.preventDefault()
      })
      
      // Handle global JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error, 'javascript_error', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      })
    }
  }
  
  /**
   * Main error handling method
   */
  handleError(error, context = 'unknown', metadata = {}) {
    const classification = this.classifyError(error, context)
    const errorInfo = this.normalizeError(error, context, metadata)
    
    // If error was filtered out, return early
    if (!errorInfo) {
      return null
    }
    
    // Add classification to error info
    errorInfo.classification = classification
    
    // Enhanced logging based on classification
    if (this.options.logToConsole && classification.shouldLog) {
      const severityIcon = {
        info: '📝',
        low: '⚠️',
        medium: '🚨',
        high: '🔥'
      }[classification.severity] || '🚨'
      
      const categoryLabel = classification.category.toUpperCase()
      
      console.group(`${severityIcon} [${categoryLabel}] ${errorInfo.code}`)
      console.error('Message:', errorInfo.message)
      console.error('Severity:', classification.severity)
      console.error('Context:', errorInfo.context)
      
      // Only show stack trace for medium+ severity errors
      if (classification.severity !== 'info' && classification.severity !== 'low') {
        console.error('Stack:', errorInfo.stack)
      }
      
      console.error('Metadata:', errorInfo.metadata)
      console.groupEnd()
    }
    
    // Report to Sentry in production (with enhanced classification)
    if (this.options.reportToSentry && classification.shouldAlert) {
      Sentry.withScope((scope) => {
        scope.setTag('errorContext', context)
        scope.setTag('errorCategory', classification.category)
        scope.setTag('errorSeverity', classification.severity)
        
        // Set Sentry level based on classification
        const sentryLevel = {
          info: 'info',
          low: 'warning', 
          medium: 'error',
          high: 'fatal'
        }[classification.severity] || 'error'
        
        scope.setLevel(sentryLevel)
        scope.setContext('errorInfo', {
          code: errorInfo.code,
          statusCode: errorInfo.statusCode,
          metadata: errorInfo.metadata,
          classification: classification
        })
        
        if (errorInfo.user) {
          scope.setUser(errorInfo.user)
        }
        
        Sentry.captureException(error)
      })
    }
    
    return errorInfo
  }
  
  /**
   * Classify error severity and context
   */
  classifyError(error, context) {
    const classification = {
      severity: 'medium',
      category: 'unknown',
      isDevelopmentNoise: false,
      shouldAlert: true,
      shouldLog: true
    }
    
    // Development environment specific classifications
    if (process.env.NODE_ENV === 'development') {
      // Authentication and session related
      if (context && context.includes('auth')) {
        classification.category = 'authentication'
        classification.severity = 'low'
        
        // Common auth development noise
        const authNoisePatterns = [
          'Session timeout',
          'Profile fetch timed out', 
          'Session check timed out',
          'Authentication session unavailable'
        ]
        
        const errorMessage = error?.message || String(error)
        if (authNoisePatterns.some(pattern => errorMessage.includes(pattern))) {
          classification.isDevelopmentNoise = true
          classification.shouldAlert = false
          classification.severity = 'info'
        }
      }
      
      // Console errors
      if (context === 'console_error') {
        classification.category = 'console'
        classification.severity = 'low'
      }
      
      // Network and API errors
      if (context && (context.includes('api') || context.includes('network'))) {
        classification.category = 'network'
        classification.severity = 'medium'
      }
    } else {
      // Production environment - everything is potentially critical
      classification.severity = 'high'
      classification.shouldAlert = true
    }
    
    // Critical error patterns (always important)
    if (error instanceof Error) {
      const criticalPatterns = [
        'Cannot read property',
        'Maximum update depth exceeded',
        'ChunkLoadError',
        'Script error',
        'Network Error'
      ]
      
      const errorMessage = error.message
      if (criticalPatterns.some(pattern => errorMessage.includes(pattern))) {
        classification.severity = 'high'
        classification.category = 'critical'
        classification.isDevelopmentNoise = false
        classification.shouldAlert = true
      }
    }
    
    // Null/undefined errors
    if (error === null || error === undefined) {
      classification.category = 'null_reference'
      classification.isDevelopmentNoise = process.env.NODE_ENV === 'development'
      classification.severity = classification.isDevelopmentNoise ? 'info' : 'medium'
      classification.shouldAlert = !classification.isDevelopmentNoise
    }
    
    return classification
  }

  /**
   * Check if error should be filtered out in development
   */
  shouldFilterError(error, context) {
    const classification = this.classifyError(error, context)
    
    // Filter development noise in development mode
    if (process.env.NODE_ENV === 'development' && classification.isDevelopmentNoise) {
      return true
    }
    
    return false
  }

  /**
   * Normalize error to consistent format
   */
  normalizeError(error, context, metadata = {}) {
    // Pre-filter errors that shouldn't be processed
    if (this.shouldFilterError(error, context)) {
      return null
    }
    
    const normalized = {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      context,
      metadata,
      timestamp: new Date().toISOString(),
      stack: null,
      user: null
    }
    
    // Handle different error types
    if (error instanceof ApplicationError) {
      normalized.message = error.message
      normalized.code = error.code
      normalized.statusCode = error.statusCode
      normalized.metadata = { ...normalized.metadata, ...error.details }
      normalized.stack = error.stack
    } else if (error instanceof Error) {
      normalized.message = error.message
      normalized.stack = error.stack
      
      // Try to extract more info from common error types
      if (error.name === 'TypeError') {
        normalized.code = 'TYPE_ERROR'
      } else if (error.name === 'ReferenceError') {
        normalized.code = 'REFERENCE_ERROR'
      } else if (error.name === 'SyntaxError') {
        normalized.code = 'SYNTAX_ERROR'
      } else if (error.response) {
        // Axios or fetch error
        normalized.code = 'HTTP_ERROR'
        normalized.statusCode = error.response.status || 500
        normalized.metadata.response = error.response.data
      }
    } else if (typeof error === 'string') {
      normalized.message = error
    } else if (typeof error === 'object' && error && error.message) {
      normalized.message = error.message
      normalized.metadata = { ...normalized.metadata, ...error }
    } else if (error === null || error === undefined) {
      // Provide more context for null/undefined errors
      if (context && context.includes('auth')) {
        normalized.message = 'Authentication session unavailable (development mode)'
        normalized.code = 'AUTH_SESSION_NULL'
      } else {
        normalized.message = 'Null or undefined error occurred'
        normalized.code = 'NULL_ERROR'
      }
    }
    
    // Add user context if available
    if (typeof window !== 'undefined' && window.user) {
      normalized.user = {
        id: window.user.id,
        email: window.user.email
      }
    }
    
    return normalized
  }
  
  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error) {
    if (error instanceof ValidationError) {
      return error.message
    }
    
    if (error instanceof AuthenticationError) {
      return 'Please log in to continue'
    }
    
    if (error instanceof AuthorizationError) {
      return 'You don\'t have permission to perform this action'
    }
    
    if (error instanceof NetworkError) {
      return 'Network connection failed. Please check your internet connection and try again.'
    }
    
    if (error instanceof APIError) {
      if (error.statusCode === 404) {
        return 'The requested resource was not found'
      }
      if (error.statusCode === 429) {
        return 'Too many requests. Please wait a moment and try again.'
      }
      if (error.statusCode >= 500) {
        return 'Server error. Please try again later.'
      }
      return error.message
    }
    
    // Generic errors in production
    if (process.env.NODE_ENV === 'production') {
      return 'Something went wrong. Please try again.'
    }
    
    return error.message || 'An unexpected error occurred'
  }
  
  /**
   * Handle API errors specifically
   */
  handleAPIError(response, endpoint, method = 'GET') {
    let message = 'API request failed'
    let code = 'API_ERROR'
    
    if (response.status === 400) {
      message = 'Invalid request data'
      code = 'BAD_REQUEST'
    } else if (response.status === 401) {
      message = 'Authentication required'
      code = 'UNAUTHORIZED'
    } else if (response.status === 403) {
      message = 'Access denied'
      code = 'FORBIDDEN'
    } else if (response.status === 404) {
      message = 'Resource not found'
      code = 'NOT_FOUND'
    } else if (response.status === 422) {
      message = 'Validation failed'
      code = 'UNPROCESSABLE_ENTITY'
    } else if (response.status === 429) {
      message = 'Rate limit exceeded'
      code = 'RATE_LIMITED'
    } else if (response.status >= 500) {
      message = 'Server error'
      code = 'SERVER_ERROR'
    }
    
    const apiError = new APIError(message, response.status, endpoint, response.data)
    apiError.code = code
    
    return this.handleError(apiError, 'api_request', { endpoint, method })
  }
  
  /**
   * Wrap async functions with error handling
   */
  wrapAsync(fn, context = 'async_operation') {
    return async (...args) => {
      try {
        return await fn(...args)
      } catch (error) {
        this.handleError(error, context)
        throw error
      }
    }
  }
  
  /**
   * Wrap functions with error handling
   */
  wrap(fn, context = 'operation') {
    return (...args) => {
      try {
        return fn(...args)
      } catch (error) {
        this.handleError(error, context)
        throw error
      }
    }
  }
}

// Create global error handler instance
export const errorHandler = new ErrorHandler()

/**
 * Hook for handling errors in React components
 */
export function useErrorHandler() {
  const handleError = (error, context = 'component') => {
    // Add null checks before calling error handler methods
    if (!error || !errorHandler || typeof errorHandler.handleError !== 'function') {
      return 'An error occurred'
    }
    
    const errorInfo = errorHandler.handleError(error, context)
    
    // Add null check for getUserFriendlyMessage
    if (typeof errorHandler.getUserFriendlyMessage === 'function') {
      return errorHandler.getUserFriendlyMessage(error)
    }
    
    return errorInfo?.message || 'An error occurred'
  }
  
  const wrapAsync = (fn, context = 'component_async') => {
    // Add null check for wrapAsync method
    if (!errorHandler || typeof errorHandler.wrapAsync !== 'function') {
      return fn // Return original function if wrapper is not available
    }
    
    return errorHandler.wrapAsync(fn, context)
  }
  
  return { handleError, wrapAsync }
}

/**
 * Utility functions
 */
export const createError = (type, message, details = {}) => {
  switch (type) {
    case 'validation':
      return new ValidationError(message, details.field, details.value)
    case 'auth':
      return new AuthenticationError(message)
    case 'authz':
      return new AuthorizationError(message)
    case 'network':
      return new NetworkError(message, details.url, details.method)
    case 'api':
      return new APIError(message, details.statusCode, details.endpoint, details.response)
    default:
      return new ApplicationError(message, type, details.statusCode || 500, details)
  }
}

export const isRetryableError = (error) => {
  if (error instanceof NetworkError) return true
  if (error instanceof APIError) {
    // Retry on server errors and rate limits (with backoff)
    return error.statusCode >= 500 || error.statusCode === 429
  }
  return false
}

export const getRetryDelay = (attempt, maxDelay = 30000) => {
  // Exponential backoff with jitter
  const baseDelay = Math.min(1000 * Math.pow(2, attempt), maxDelay)
  return baseDelay + Math.random() * 1000
}

export default errorHandler