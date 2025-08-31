/**
 * Production-Safe Centralized Logger Service
 * Replaces all console.log statements to prevent data leaks and improve debugging
 * Uses Sentry for production error tracking
 * 
 * Features:
 * - Environment-aware logging (dev shows all, prod shows errors only)
 * - Caller file/line information in development
 * - Structured logging with timestamps
 * - Sensitive data sanitization
 * - Category-based filtering
 * - Drop-in console replacement
 * - Performance optimized for production
 */

// Import Sentry with graceful fallback - simplified approach
let Sentry = {
  addBreadcrumb: () => {},
  captureMessage: () => {},
  captureException: () => {}
}

// Try to load Sentry, but don't fail if it's not available
try {
  import('@sentry/nextjs').then(sentryModule => {
    Sentry = sentryModule.default || sentryModule
  }).catch(() => {
    // Keep the mock Sentry if import fails
  })
} catch (e) {
  // Keep the mock Sentry
}

// Environment detection with fallbacks
const NODE_ENV = process.env.NODE_ENV || 'development'
const NEXT_PUBLIC_ENV = process.env.NEXT_PUBLIC_ENV || NODE_ENV

const isDevelopment = NODE_ENV === 'development' || NEXT_PUBLIC_ENV === 'development'
const isProduction = NODE_ENV === 'production' || NEXT_PUBLIC_ENV === 'production'
const isTest = NODE_ENV === 'test' || process.env.NODE_ENV === 'test'

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  LOG: 1, // Alias for INFO to match console.log
  WARN: 2,
  ERROR: 3,
  FATAL: 4
}

// Current log level - production only shows errors and warnings by default
const getLogLevel = () => {
  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase()
  if (envLevel && LogLevel[envLevel] !== undefined) {
    return LogLevel[envLevel]
  }
  
  // Default log levels by environment
  if (isProduction) {
    return LogLevel.WARN // Only warnings and errors in production
  } else if (isTest) {
    return LogLevel.ERROR // Only errors in tests
  } else {
    return LogLevel.DEBUG // Everything in development
  }
}

const currentLogLevel = getLogLevel()

// Disabled log categories (can be set via environment)
const getDisabledCategories = () => {
  const disabled = process.env.NEXT_PUBLIC_DISABLED_LOG_CATEGORIES || ''
  return new Set(disabled.split(',').map(cat => cat.trim().toLowerCase()).filter(Boolean))
}

const disabledCategories = getDisabledCategories()

// Get caller information in development mode
const getCallerInfo = () => {
  if (isProduction || isTest) return null
  
  try {
    const stack = new Error().stack
    if (!stack) return null
    
    const lines = stack.split('\n')
    // Skip Error, getCallerInfo, and the logger method calling this
    const callerLine = lines[4] || lines[3] || ''
    
    // Extract file and line number
    const match = callerLine.match(/at.*\((.*):(\d+):(\d+)\)/) || 
                  callerLine.match(/at (.*):(\d+):(\d+)/)
    
    if (match) {
      const [, filePath, lineNum, colNum] = match
      const fileName = filePath.split('/').pop() || filePath
      return `${fileName}:${lineNum}:${colNum}`
    }
    
    return null
  } catch (e) {
    return null
  }
}

class Logger {
  constructor(context = 'app') {
    this.context = context
    this.isEnabled = !disabledCategories.has(context.toLowerCase())
    
    // Performance optimization: bind methods once
    this.debug = this.debug.bind(this)
    this.info = this.info.bind(this)
    this.log = this.log.bind(this) // Alias for console.log compatibility
    this.warn = this.warn.bind(this)
    this.error = this.error.bind(this)
    this.fatal = this.fatal.bind(this)
  }
  
  /**
   * Check if this logger instance is enabled
   */
  get enabled() {
    return this.isEnabled
  }
  
  /**
   * Enable or disable this logger instance
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  /**
   * Create a child logger with additional context
   */
  child(childContext) {
    return new Logger(`${this.context}:${childContext}`)
  }

  /**
   * Format log message with context, timestamp, and caller info
   */
  formatMessage(level, message, data, includeStack = false) {
    const timestamp = new Date().toISOString()
    const callerInfo = getCallerInfo()
    
    let formattedMessage = `[${timestamp}] [${level}] [${this.context}]`
    
    if (callerInfo && isDevelopment) {
      formattedMessage += ` [${callerInfo}]`
    }
    
    formattedMessage += ` ${message}`
    
    if (data && Object.keys(data).length > 0) {
      // Sanitize sensitive data
      const sanitized = this.sanitizeData(data)
      return { message: formattedMessage, data: sanitized }
    }
    
    return { message: formattedMessage }
  }

  /**
   * Sanitize sensitive data from logs - enhanced security
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') return data
    
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'authorization', 'auth',
      'api_key', 'apikey', 'apiKey', 'access_token', 'accesstoken',
      'refresh_token', 'refreshtoken', 'session', 'cookie',
      'credit_card', 'creditcard', 'cvv', 'ssn', 'social',
      'email', 'phone', 'address', 'ip', 'user_id', 'userid',
      'private', 'confidential', 'sensitive', 'pin', 'otp',
      'stripe', 'paypal', 'billing', 'payment'
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
    if (!this.isEnabled || currentLogLevel > LogLevel.DEBUG) return
    
    try {
      const formatted = this.formatMessage('DEBUG', message, data)
      
      if (isDevelopment && !isTest) {
        console.debug(formatted.message, formatted.data || '')
      }
      
      // Only add breadcrumbs in development to avoid noise
      if (isDevelopment) {
        Sentry.addBreadcrumb({
          message: formatted.message,
          level: 'debug',
          category: this.context,
          data: formatted.data
        })
      }
    } catch (e) {
      // Silent fail in production to prevent logger from breaking app
      if (isDevelopment) {
        console.error('Logger debug error:', e)
      }
    }
  }

  /**
   * Info level logging
   */
  info(message, data = {}) {
    if (!this.isEnabled || currentLogLevel > LogLevel.INFO) return
    
    try {
      const formatted = this.formatMessage('INFO', message, data)
      
      if (isDevelopment && !isTest) {
        console.info(formatted.message, formatted.data || '')
      }
      
      // Only add breadcrumbs for important info in production
      if (isDevelopment || isProduction && message.includes('CRITICAL')) {
        Sentry.addBreadcrumb({
          message: formatted.message,
          level: 'info',
          category: this.context,
          data: formatted.data
        })
      }
    } catch (e) {
      if (isDevelopment) {
        console.error('Logger info error:', e)
      }
    }
  }
  
  /**
   * Log level logging - alias for info() to match console.log
   */
  log(message, data = {}) {
    this.info(message, data)
  }

  /**
   * Warning level logging - always shown in production for critical warnings
   */
  warn(message, data = {}) {
    if (!this.isEnabled || currentLogLevel > LogLevel.WARN) return
    
    try {
      const formatted = this.formatMessage('WARN', message, data)
      
      // Always show warnings (unless in test mode)
      if (!isTest) {
        console.warn(formatted.message, formatted.data || '')
      }
      
      // Capture warnings in Sentry (production and development)
      Sentry.captureMessage(formatted.message, 'warning')
      Sentry.addBreadcrumb({
        message: formatted.message,
        level: 'warning',
        category: this.context,
        data: formatted.data
      })
    } catch (e) {
      if (isDevelopment) {
        console.error('Logger warn error:', e)
      }
    }
  }

  /**
   * Error level logging - always shown and captured
   */
  error(message, error = null, data = {}) {
    if (!this.isEnabled || currentLogLevel > LogLevel.ERROR) return
    
    try {
      const formatted = this.formatMessage('ERROR', message, data, true)
      
      // Always show errors (unless in test mode)
      if (!isTest) {
        console.error(formatted.message, error || '', formatted.data || '')
      }
      
      // Always capture errors in Sentry
      if (error instanceof Error) {
        Sentry.captureException(error, {
          contexts: {
            logger: {
              context: this.context,
              message: formatted.message,
              data: formatted.data
            }
          },
          tags: {
            logger_context: this.context,
            environment: NODE_ENV
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
    } catch (e) {
      // If logger itself fails, fallback to console
      if (!isTest) {
        console.error('Logger error (fallback):', message, error, e)
      }
    }
  }

  /**
   * Fatal level logging (always logs and captures)
   */
  fatal(message, error = null, data = {}) {
    try {
      const formatted = this.formatMessage('FATAL', message, data, true)
      
      // Fatal always logs to console (except in tests)
      if (!isTest) {
        console.error('🚨 FATAL ERROR:', formatted.message, error || '', formatted.data || '')
      }
      
      // Always capture fatal errors
      if (error instanceof Error) {
        Sentry.captureException(error, {
          level: 'fatal',
          contexts: {
            logger: {
              context: this.context,
              message: formatted.message,
              data: formatted.data
            }
          },
          tags: {
            logger_context: this.context,
            environment: NODE_ENV,
            fatal: true
          }
        })
      } else {
        Sentry.captureMessage(formatted.message, 'fatal')
      }
    } catch (e) {
      // If logger fails on fatal, use direct console
      if (!isTest) {
        console.error('FATAL (logger failed):', message, error, e)
      }
    }
  }

  /**
   * Performance timing helper - optimized for production
   */
  time(label) {
    if (!this.isEnabled) return Date.now()
    
    if (isDevelopment && !isTest) {
      console.time(`[${this.context}] ${label}`)
    }
    return Date.now()
  }

  timeEnd(label, startTime = null) {
    if (!this.isEnabled) return
    
    if (isDevelopment && !isTest) {
      console.timeEnd(`[${this.context}] ${label}`)
    }
    
    if (startTime) {
      const duration = Date.now() - startTime
      
      // Only log slow operations in production
      if (isProduction && duration > 1000) {
        this.warn(`Slow operation: ${label} took ${duration}ms`, { duration, label })
      } else {
        this.debug(`${label} took ${duration}ms`, { duration })
      }
      
      return duration
    }
  }

  /**
   * Group related logs (development only)
   */
  group(label) {
    if (!this.isEnabled || isProduction || isTest) return
    
    if (isDevelopment) {
      console.group(`[${this.context}] ${label}`)
    }
  }

  groupEnd() {
    if (!this.isEnabled || isProduction || isTest) return
    
    if (isDevelopment) {
      console.groupEnd()
    }
  }
  
  /**
   * Group collapsed - useful for verbose logging
   */
  groupCollapsed(label) {
    if (!this.isEnabled || isProduction || isTest) return
    
    if (isDevelopment) {
      console.groupCollapsed(`[${this.context}] ${label}`)
    }
  }

  /**
   * Table logging for structured data (development only)
   */
  table(data, columns) {
    if (!this.isEnabled || isProduction || isTest) return
    
    if (isDevelopment) {
      console.table(data, columns)
    }
    
    this.debug('Table data', { dataLength: Array.isArray(data) ? data.length : 'N/A', columns })
  }
  
  /**
   * Count occurrences (development only)
   */
  count(label = 'default') {
    if (!this.isEnabled || isProduction || isTest) return
    
    if (isDevelopment) {
      console.count(`[${this.context}] ${label}`)
    }
  }
  
  /**
   * Reset count (development only)
   */
  countReset(label = 'default') {
    if (!this.isEnabled || isProduction || isTest) return
    
    if (isDevelopment) {
      console.countReset(`[${this.context}] ${label}`)
    }
  }
  
  /**
   * Assert logging (development only)
   */
  assert(condition, message, data = {}) {
    if (!this.isEnabled || isProduction || isTest) return
    
    if (isDevelopment) {
      console.assert(condition, `[${this.context}] ${message}`, data)
    }
    
    if (!condition) {
      this.error(`Assertion failed: ${message}`, null, data)
    }
  }
  
  /**
   * Clear console (development only)
   */
  clear() {
    if (!this.isEnabled || isProduction || isTest) return
    
    if (isDevelopment) {
      console.clear()
    }
  }
  
  /**
   * Trace stack (development only)
   */
  trace(message, data = {}) {
    if (!this.isEnabled) return
    
    if (isDevelopment && !isTest) {
      console.trace(`[${this.context}] ${message}`, data)
    }
    
    this.debug(`TRACE: ${message}`, { ...data, trace: true })
  }
}

// Create default logger instance
const logger = new Logger()

// Create console replacement object for drop-in replacement
const createConsoleReplacement = (context = 'console') => {
  const contextLogger = new Logger(context)
  
  // Store original console methods to avoid circular references
  const originalConsole = {
    log: globalThis.console.log,
    info: globalThis.console.info,
    warn: globalThis.console.warn,
    error: globalThis.console.error,
    debug: globalThis.console.debug,
    dir: globalThis.console.dir,
    dirxml: globalThis.console.dirxml
  }
  
  return {
    // Core methods - bound to avoid context issues
    log: contextLogger.log.bind(contextLogger),
    info: contextLogger.info.bind(contextLogger),
    warn: contextLogger.warn.bind(contextLogger),
    error: contextLogger.error.bind(contextLogger),
    debug: contextLogger.debug.bind(contextLogger),
    
    // Development-only methods
    group: contextLogger.group.bind(contextLogger),
    groupEnd: contextLogger.groupEnd.bind(contextLogger),
    groupCollapsed: contextLogger.groupCollapsed.bind(contextLogger),
    table: contextLogger.table.bind(contextLogger),
    count: contextLogger.count.bind(contextLogger),
    countReset: contextLogger.countReset.bind(contextLogger),
    assert: contextLogger.assert.bind(contextLogger),
    clear: contextLogger.clear.bind(contextLogger),
    trace: contextLogger.trace.bind(contextLogger),
    time: contextLogger.time.bind(contextLogger),
    timeEnd: contextLogger.timeEnd.bind(contextLogger),
    
    // Utility methods - use original console methods to avoid loops
    dir: (obj) => isDevelopment && !isTest ? originalConsole.dir(obj) : contextLogger.debug('Object inspection', obj),
    dirxml: (obj) => isDevelopment && !isTest ? originalConsole.dirxml(obj) : contextLogger.debug('XML inspection', obj)
  }
}

// Console replacement for drop-in usage
const consoleReplacement = createConsoleReplacement('app')

// Utility functions
const createLogger = (context) => new Logger(context)

const getLoggerConfig = () => ({
  isDevelopment,
  isProduction,
  isTest,
  currentLogLevel,
  disabledCategories: Array.from(disabledCategories),
  environment: NODE_ENV
})

const setLogLevel = (level) => {
  const levelNum = typeof level === 'string' ? LogLevel[level.toUpperCase()] : level
  if (levelNum !== undefined) {
    process.env.NEXT_PUBLIC_LOG_LEVEL = Object.keys(LogLevel).find(key => LogLevel[key] === levelNum)
  }
}

// Export both the class and default instance
export { Logger, logger, createLogger, createConsoleReplacement, getLoggerConfig, setLogLevel }

// Convenience exports for quick usage
export default logger

// Console replacement export - use different name to avoid conflicts
export const loggerConsole = consoleReplacement

// Named exports for specific contexts - commonly used loggers
export const authLogger = new Logger('auth')
export const dbLogger = new Logger('database')
export const apiLogger = new Logger('api')
export const uiLogger = new Logger('ui')
export const performanceLogger = new Logger('performance')
export const securityLogger = new Logger('security')
export const paymentLogger = new Logger('payment')
export const webhookLogger = new Logger('webhook')
export const cacheLogger = new Logger('cache')
export const analyticsLogger = new Logger('analytics')

// Environment info export for debugging
export const loggerInfo = {
  version: '2.0.0',
  environment: NODE_ENV,
  logLevel: currentLogLevel,
  isProduction,
  isDevelopment,
  isTest,
  features: {
    callerInfo: isDevelopment,
    sentryIntegration: true,
    categoryFiltering: true,
    dataSanitization: true,
    consoleReplacement: true
  }
}

// Initialize logger and log startup info
if (!isTest && isDevelopment) {
  logger.info('Logger initialized', loggerInfo)
} else if (!isTest && isProduction) {
  logger.info('Production logger active', { version: loggerInfo.version, level: currentLogLevel })
}