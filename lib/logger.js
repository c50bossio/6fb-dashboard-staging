/**
 * Centralized Logger Service
 * Replaces all console.log statements to prevent data leaks and improve debugging
 * Uses Sentry for production error tracking
 */

import * as Sentry from '@sentry/nextjs'

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
}

// Current log level from environment or default to INFO
const currentLogLevel = LogLevel[process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase()] || LogLevel.INFO

class Logger {
  constructor(context = 'app') {
    this.context = context
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext) {
    return new Logger(`${this.context}:${childContext}`)
  }

  /**
   * Format log message with context and timestamp
   */
  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString()
    const formattedMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`
    
    if (data && Object.keys(data).length > 0) {
      // Sanitize sensitive data
      const sanitized = this.sanitizeData(data)
      return { message: formattedMessage, data: sanitized }
    }
    
    return { message: formattedMessage }
  }

  /**
   * Sanitize sensitive data from logs
   */
  sanitizeData(data) {
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization',
      'api_key', 'apiKey', 'access_token', 'refresh_token',
      'credit_card', 'cvv', 'ssn', 'email', 'phone'
    ]
    
    const sanitized = { ...data }
    
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        const lowerKey = key.toLowerCase()
        
        // Check if key contains sensitive data
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          obj[key] = '[REDACTED]'
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key])
        }
      }
      return obj
    }
    
    return sanitizeObject(sanitized)
  }

  /**
   * Debug level logging (only in development)
   */
  debug(message, data = {}) {
    if (currentLogLevel > LogLevel.DEBUG) return
    
    const formatted = this.formatMessage('DEBUG', message, data)
    
    if (isDevelopment && !isTest) {
      console.debug(formatted.message, formatted.data || '')
    }
    
    Sentry.addBreadcrumb({
      message: formatted.message,
      level: 'debug',
      category: this.context,
      data: formatted.data
    })
  }

  /**
   * Info level logging
   */
  info(message, data = {}) {
    if (currentLogLevel > LogLevel.INFO) return
    
    const formatted = this.formatMessage('INFO', message, data)
    
    if (isDevelopment && !isTest) {
      console.info(formatted.message, formatted.data || '')
    }
    
    Sentry.addBreadcrumb({
      message: formatted.message,
      level: 'info',
      category: this.context,
      data: formatted.data
    })
  }

  /**
   * Warning level logging
   */
  warn(message, data = {}) {
    if (currentLogLevel > LogLevel.WARN) return
    
    const formatted = this.formatMessage('WARN', message, data)
    
    if (isDevelopment && !isTest) {
      console.warn(formatted.message, formatted.data || '')
    }
    
    Sentry.captureMessage(formatted.message, 'warning')
    Sentry.addBreadcrumb({
      message: formatted.message,
      level: 'warning',
      category: this.context,
      data: formatted.data
    })
  }

  /**
   * Error level logging
   */
  error(message, error = null, data = {}) {
    if (currentLogLevel > LogLevel.ERROR) return
    
    const formatted = this.formatMessage('ERROR', message, data)
    
    if (isDevelopment && !isTest) {
      console.error(formatted.message, error || '', formatted.data || '')
    }
    
    if (error instanceof Error) {
      Sentry.captureException(error, {
        contexts: {
          logger: {
            context: this.context,
            message: formatted.message,
            data: formatted.data
          }
        }
      })
    } else {
      Sentry.captureMessage(formatted.message, 'error')
    }
    
    Sentry.addBreadcrumb({
      message: formatted.message,
      level: 'error',
      category: this.context,
      data: formatted.data,
      ...(error && { error: error.toString() })
    })
  }

  /**
   * Fatal level logging (always logs)
   */
  fatal(message, error = null, data = {}) {
    const formatted = this.formatMessage('FATAL', message, data)
    
    // Fatal always logs to console in development
    if (isDevelopment) {
      console.error('🚨 FATAL ERROR:', formatted.message, error || '', formatted.data || '')
    }
    
    if (error instanceof Error) {
      Sentry.captureException(error, {
        level: 'fatal',
        contexts: {
          logger: {
            context: this.context,
            message: formatted.message,
            data: formatted.data
          }
        }
      })
    } else {
      Sentry.captureMessage(formatted.message, 'fatal')
    }
  }

  /**
   * Performance timing helper
   */
  time(label) {
    if (isDevelopment && !isTest) {
      console.time(`[${this.context}] ${label}`)
    }
    return Date.now()
  }

  timeEnd(label, startTime = null) {
    if (isDevelopment && !isTest) {
      console.timeEnd(`[${this.context}] ${label}`)
    }
    
    if (startTime) {
      const duration = Date.now() - startTime
      this.debug(`${label} took ${duration}ms`)
      return duration
    }
  }

  /**
   * Group related logs (development only)
   */
  group(label) {
    if (isDevelopment && !isTest) {
      console.group(`[${this.context}] ${label}`)
    }
  }

  groupEnd() {
    if (isDevelopment && !isTest) {
      console.groupEnd()
    }
  }

  /**
   * Table logging for structured data (development only)
   */
  table(data, columns) {
    if (isDevelopment && !isTest) {
      console.table(data, columns)
    }
    
    this.debug('Table data', { data, columns })
  }
}

// Create default logger instance
const logger = new Logger()

// Export both the class and default instance
export { Logger, logger }

// Convenience exports for quick usage
export default logger

// Named exports for specific contexts
export const authLogger = new Logger('auth')
export const dbLogger = new Logger('database')
export const apiLogger = new Logger('api')
export const uiLogger = new Logger('ui')
export const performanceLogger = new Logger('performance')
export const securityLogger = new Logger('security')