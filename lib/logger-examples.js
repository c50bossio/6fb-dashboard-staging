#!/usr/bin/env node

/**
 * Production-Safe Logger Usage Examples
 * 
 * This file demonstrates how to use the enhanced logger as a drop-in
 * replacement for console statements throughout the codebase.
 */

import { 
  logger, 
  loggerConsole, 
  createLogger, 
  authLogger, 
  dbLogger, 
  apiLogger,
  getLoggerConfig 
} from './logger.js'

console.log('🚀 Logger Usage Examples\n')

// ==========================================
// 1. BASIC USAGE - Default Logger
// ==========================================
console.log('=== 1. Basic Usage ===')
logger.info('Application started', { version: '1.0.0' })
logger.debug('Debug information', { user: 'test', action: 'login' })
logger.warn('Deprecated API used', { endpoint: '/old-api' })
logger.error('Database connection failed', new Error('Connection timeout'))

// ==========================================
// 2. CONSOLE REPLACEMENT
// ==========================================
console.log('\n=== 2. Console Replacement ===')

// Instead of: console.log('User logged in')
loggerConsole.log('User logged in with logger replacement')

// Instead of: console.error('API failed')  
loggerConsole.error('API failed with logger replacement')

// Instead of: console.warn('Slow query')
loggerConsole.warn('Slow query with logger replacement')

// ==========================================
// 3. CONTEXT-SPECIFIC LOGGERS
// ==========================================
console.log('\n=== 3. Context-Specific Loggers ===')

// Authentication context
authLogger.info('User authentication successful', { userId: '123' })
authLogger.warn('Failed login attempt', { ip: '192.168.1.1', attempts: 3 })

// Database context
dbLogger.info('Database query executed', { query: 'SELECT * FROM users', duration: '45ms' })
dbLogger.error('Database query failed', new Error('Table not found'))

// API context
apiLogger.info('API request processed', { 
  method: 'POST', 
  endpoint: '/api/users', 
  statusCode: 200,
  duration: '123ms' 
})

// ==========================================
// 4. CUSTOM LOGGERS FOR SPECIFIC FEATURES
// ==========================================
console.log('\n=== 4. Custom Loggers ===')

const paymentLogger = createLogger('payment')
const webhookLogger = createLogger('webhook')
const cacheLogger = createLogger('cache')

paymentLogger.info('Payment processed', { 
  amount: 99.99, 
  currency: 'USD',
  paymentId: 'pay_123' 
})

webhookLogger.warn('Webhook retry attempted', { 
  url: 'https://example.com/webhook',
  attempt: 2,
  maxAttempts: 3 
})

cacheLogger.debug('Cache hit', { 
  key: 'user:123',
  ttl: 3600 
})

// ==========================================
// 5. PERFORMANCE MONITORING
// ==========================================
console.log('\n=== 5. Performance Monitoring ===')

const performanceLogger = createLogger('performance')

const operationStart = performanceLogger.time('database-migration')
// Simulate work
await new Promise(resolve => setTimeout(resolve, 100))
const duration = performanceLogger.timeEnd('database-migration', operationStart)

performanceLogger.info('Operation completed', { 
  operation: 'database-migration',
  duration: `${duration}ms` 
})

// ==========================================
// 6. SENSITIVE DATA HANDLING
// ==========================================
console.log('\n=== 6. Sensitive Data Handling ===')

const securityLogger = createLogger('security')

// This will automatically sanitize sensitive fields
securityLogger.info('User registration', {
  email: 'user@example.com',      // Will be redacted
  password: 'secret123',          // Will be redacted
  apiKey: 'sk_live_123',         // Will be redacted
  name: 'John Doe',              // Will be shown
  age: 30                        // Will be shown
})

// ==========================================
// 7. PRODUCTION VS DEVELOPMENT
// ==========================================
console.log('\n=== 7. Environment-Aware Logging ===')

const config = getLoggerConfig()
console.log('Current logger configuration:', {
  environment: config.environment,
  isDevelopment: config.isDevelopment,
  isProduction: config.isProduction,
  currentLogLevel: config.currentLogLevel
})

// These will behave differently in development vs production
logger.debug('Detailed debug info - only in development')
logger.info('General information - only in development')  
logger.warn('Warning message - shown in production')
logger.error('Error message - shown in production')

// ==========================================
// 8. ERROR HANDLING WITH CONTEXT
// ==========================================
console.log('\n=== 8. Error Handling ===')

try {
  // Simulate an error
  throw new Error('Database connection failed')
} catch (error) {
  dbLogger.error('Critical database error', error, {
    operation: 'user-lookup',
    userId: '123',
    timestamp: new Date().toISOString(),
    retryable: true
  })
}

// ==========================================
// 9. REPLACING EXISTING CONSOLE STATEMENTS
// ==========================================
console.log('\n=== 9. Migration Examples ===')

// OLD: console.log('Processing payment for user', userId)
// NEW:
const userId = '123'
paymentLogger.info('Processing payment for user', { userId })

// OLD: console.error('Payment failed:', error.message)
// NEW:
const mockError = new Error('Insufficient funds')
paymentLogger.error('Payment failed', mockError, { userId, amount: 99.99 })

// OLD: console.warn('User has exceeded rate limit')
// NEW:
apiLogger.warn('User has exceeded rate limit', { 
  userId, 
  limit: 100, 
  current: 105,
  window: '1hour' 
})

// ==========================================
// 10. ADVANCED FEATURES
// ==========================================
console.log('\n=== 10. Advanced Features ===')

if (config.isDevelopment) {
  // Development-only features
  logger.group('User Registration Flow')
  logger.info('Step 1: Validate input')
  logger.info('Step 2: Check existing user')
  logger.info('Step 3: Create user record')
  logger.groupEnd()
  
  // Table logging for structured data
  logger.table([
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' }
  ])
  
  // Assertions
  logger.assert(userId === '123', 'User ID should be 123')
}

console.log('\n✅ Logger examples completed!')
console.log('\n📝 Usage Tips:')
console.log('1. Replace console.* calls with appropriate logger methods')
console.log('2. Use context-specific loggers (authLogger, dbLogger, etc.)')
console.log('3. Include structured data objects for better debugging')
console.log('4. Sensitive data is automatically sanitized')
console.log('5. Production mode filters out debug/info logs automatically')
console.log('6. Development mode shows caller file/line information')

export default {
  basicUsage: () => logger.info('Basic usage example'),
  contextLogger: (context) => createLogger(context),
  consoleReplacement: loggerConsole
}