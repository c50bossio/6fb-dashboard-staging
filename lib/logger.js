/**
 * Simplified Logger Service - No Circular Dependencies
 * Simple console-based logging to prevent circular dependency issues
 * 
 * Features:
 * - Environment-aware logging
 * - Category-based prefixes
 * - Compatible with existing logger API
 * - No dynamic imports or complex dependencies
 */

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// Simple logger creator function
const createSimpleLogger = (category = 'APP') => ({
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(`[${category}:DEBUG]`, ...args)
    }
  },
  info: (...args) => {
    console.info(`[${category}:INFO]`, ...args)
  },
  log: (...args) => {
    console.log(`[${category}:LOG]`, ...args)
  },
  warn: (...args) => {
    console.warn(`[${category}:WARN]`, ...args)
  },
  error: (...args) => {
    console.error(`[${category}:ERROR]`, ...args)
  },
  fatal: (...args) => {
    console.error(`[${category}:FATAL]`, ...args)
  }
})

// Default logger
const logger = createSimpleLogger('APP')

// Specialized loggers for different components
export const apiLogger = createSimpleLogger('API')
export const dbLogger = createSimpleLogger('DB')
export const authLogger = createSimpleLogger('AUTH')
export const paymentLogger = createSimpleLogger('PAYMENT')
export const analyticsLogger = createSimpleLogger('ANALYTICS')
export const webhookLogger = createSimpleLogger('WEBHOOK')

// Export default logger
export default logger
export { logger }

// Legacy compatibility exports
export const createLogger = createSimpleLogger
export { createSimpleLogger }