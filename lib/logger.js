/**
 * Simplified Logger Service - No Circular Dependencies
 * Simple console-based logging to prevent circular dependency issues
 *
 * Features:
 * - Environment-aware logging
 * - Category-based prefixes
 * - Component-level log filtering
 * - Compatible with existing logger API
 * - No dynamic imports or complex dependencies
 */

// Environment detection
const isDevelopment = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'development'
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))

const isProduction = typeof process !== 'undefined'
  ? process.env.NODE_ENV === 'production'
  : !isDevelopment

// Component-specific verbosity levels
// Set to 'error' to silence, 'warn' for warnings only, 'info' for normal logs, 'debug' for all logs
const COMPONENT_VERBOSITY = {
  'SupabaseAuthProvider': 'warn',      // Reduce auth spam
  'GlobalDashboardContext': 'info',    // Keep important context switches
  'AppointmentBookingModal': 'warn',   // Stop modal spam
  'unified-staff-service': 'info',     // Keep API calls visible
  'EnhancedProfessionalCalendar': 'info', // Keep calendar events visible
  'FloatingAIChat': 'warn',            // Reduce AI chat noise
  'TenantContext': 'info',             // Keep tenant switches visible
  'ServiceWorkerProvider': 'error',    // Silence PWA logs
}

// Log level hierarchy
const LOG_LEVELS = {
  'debug': 0,
  'info': 1,
  'warn': 2,
  'error': 3
}

// Check if log should be shown based on component verbosity
const shouldLog = (category, level) => {
  // Always show errors
  if (level === 'error') return true

  // In production, only show warnings and errors
  if (isProduction && LOG_LEVELS[level] < LOG_LEVELS['warn']) return false

  // Check component-specific verbosity
  const componentLevel = COMPONENT_VERBOSITY[category]
  if (componentLevel) {
    return LOG_LEVELS[level] >= LOG_LEVELS[componentLevel]
  }

  // Default: show info and above in development, warn and above in production
  const defaultLevel = isDevelopment ? 'info' : 'warn'
  return LOG_LEVELS[level] >= LOG_LEVELS[defaultLevel]
}

// Simple logger creator function with verbosity control
const createSimpleLogger = (category = 'APP') => ({
  debug: (...args) => {
    if (shouldLog(category, 'debug')) {
      console.debug(`[${category}:DEBUG]`, ...args)
    }
  },
  info: (...args) => {
    if (shouldLog(category, 'info')) {
      console.info(`[${category}:INFO]`, ...args)
    }
  },
  log: (...args) => {
    if (shouldLog(category, 'info')) {
      console.log(`[${category}:LOG]`, ...args)
    }
  },
  warn: (...args) => {
    if (shouldLog(category, 'warn')) {
      console.warn(`[${category}:WARN]`, ...args)
    }
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