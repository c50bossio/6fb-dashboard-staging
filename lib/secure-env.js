/**
 * Secure Environment Variable Utility
 * Provides safe access to environment variables with logging protection
 */

// List of sensitive environment variables that should never be logged
const SENSITIVE_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SENDGRID_API_KEY',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_ACCOUNT_SID',
  'PUSHER_SECRET',
  'NOVU_API_KEY',
  'JWT_SECRET',
  'SESSION_SECRET',
  'DATABASE_ENCRYPTION_KEY',
  'ADMIN_PASSWORD',
  'HEALTH_CHECK_SECRET',
  'REDIS_PASSWORD',
  'SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_DSN',
  'EDGE_CONFIG'
]

// Public environment variables that are safe to display
const PUBLIC_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_PUSHER_KEY',
  'NEXT_PUBLIC_PUSHER_CLUSTER',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NODE_ENV',
  'DEPLOYMENT_ENV',
  'DEPLOYMENT_ID'
]

/**
 * Safely get environment variable value
 * @param {string} key - Environment variable key
 * @param {string} defaultValue - Default value if not found
 * @returns {string} Environment variable value or default
 */
export function getEnv(key, defaultValue = undefined) {
  return process.env[key] || defaultValue
}

/**
 * Check if environment variable exists
 * @param {string} key - Environment variable key
 * @returns {boolean} True if variable exists and is not empty
 */
export function hasEnv(key) {
  return !!(process.env[key] && process.env[key].trim().length > 0)
}

/**
 * Get masked version of environment variable for safe logging
 * @param {string} key - Environment variable key
 * @returns {string} Masked value or status
 */
export function getMaskedEnv(key) {
  const value = process.env[key]
  
  if (!value) {
    return '❌ Missing'
  }
  
  // Check if this is a sensitive variable
  if (SENSITIVE_ENV_VARS.includes(key)) {
    // For sensitive vars, just show status and length
    return `✅ Set (${value.length} chars)`
  }
  
  // For public vars, show first/last characters
  if (PUBLIC_ENV_VARS.includes(key)) {
    if (value.length <= 10) {
      return value
    }
    return `${value.substring(0, 6)}...${value.substring(value.length - 4)}`
  }
  
  // For unknown vars, be conservative and mask
  return `✅ Set (${value.length} chars)`
}

/**
 * Validate that required environment variables are present
 * @param {string[]} requiredVars - Array of required environment variable keys
 * @returns {Object} Validation result with missing variables
 */
export function validateRequiredEnv(requiredVars) {
  const missing = []
  const present = []
  
  for (const key of requiredVars) {
    if (hasEnv(key)) {
      present.push(key)
    } else {
      missing.push(key)
    }
  }
  
  return {
    isValid: missing.length === 0,
    missing,
    present,
    summary: `${present.length}/${requiredVars.length} required variables present`
  }
}

/**
 * Get safe environment status for debugging
 * @param {string[]} keys - Environment variable keys to check
 * @returns {Object} Status of each environment variable
 */
export function getEnvStatus(keys = []) {
  const status = {}
  
  for (const key of keys) {
    status[key] = getMaskedEnv(key)
  }
  
  return status
}

/**
 * Log environment status safely (development only)
 * @param {string[]} keys - Environment variable keys to check
 * @param {string} title - Title for the log output
 */
export function logEnvStatus(keys, title = 'Environment Status') {
  // Only log in development mode
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  
  console.log(`\n🔍 ${title}:`)
  console.log('==========================================')
  
  for (const key of keys) {
    console.log(`  ${key}: ${getMaskedEnv(key)}`)
  }
  
  console.log('==========================================\n')
}

/**
 * Check if we're in a secure environment (production)
 * @returns {boolean} True if in production environment
 */
export function isProductionEnv() {
  return process.env.NODE_ENV === 'production'
}

/**
 * Get database connection status without exposing credentials
 * @returns {Object} Connection status information
 */
export function getDatabaseStatus() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  return {
    supabase: {
      configured: !!(supabaseUrl && serviceKey),
      url: supabaseUrl ? `${supabaseUrl.split('.')[0]}...supabase.co` : 'Not configured',
      serviceKey: serviceKey ? '✅ Present' : '❌ Missing'
    }
  }
}

/**
 * Get AI services status without exposing API keys
 * @returns {Object} AI services status
 */
export function getAIServicesStatus() {
  return {
    openai: hasEnv('OPENAI_API_KEY') ? '✅ Configured' : '❌ Not configured',
    anthropic: hasEnv('ANTHROPIC_API_KEY') ? '✅ Configured' : '❌ Not configured',
    google: hasEnv('GOOGLE_GEMINI_API_KEY') ? '✅ Configured' : '❌ Not configured'
  }
}

/**
 * Get third-party services status
 * @returns {Object} Services status
 */
export function getServicesStatus() {
  return {
    stripe: hasEnv('STRIPE_SECRET_KEY') ? '✅ Configured' : '❌ Not configured',
    sendgrid: hasEnv('SENDGRID_API_KEY') ? '✅ Configured' : '❌ Not configured',
    twilio: hasEnv('TWILIO_AUTH_TOKEN') ? '✅ Configured' : '❌ Not configured',
    pusher: hasEnv('PUSHER_SECRET') ? '✅ Configured' : '❌ Not configured',
    posthog: hasEnv('NEXT_PUBLIC_POSTHOG_KEY') ? '✅ Configured' : '❌ Not configured',
    sentry: hasEnv('NEXT_PUBLIC_SENTRY_DSN') ? '✅ Configured' : '❌ Not configured'
  }
}

/**
 * Comprehensive environment check for application startup
 * @returns {Object} Complete environment status
 */
export function getCompleteEnvStatus() {
  const requiredForBasic = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const validation = validateRequiredEnv(requiredForBasic)
  
  return {
    validation,
    database: getDatabaseStatus(),
    aiServices: getAIServicesStatus(),
    thirdPartyServices: getServicesStatus(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      deploymentEnv: process.env.DEPLOYMENT_ENV || 'development',
      isProduction: isProductionEnv(),
      debug: process.env.DEBUG === 'true'
    }
  }
}

// Export default object with all functions
export default {
  getEnv,
  hasEnv,
  getMaskedEnv,
  validateRequiredEnv,
  getEnvStatus,
  logEnvStatus,
  isProductionEnv,
  getDatabaseStatus,
  getAIServicesStatus,
  getServicesStatus,
  getCompleteEnvStatus
}