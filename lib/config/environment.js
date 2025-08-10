/**
 * Environment configuration
 * Manages environment-specific settings and feature flags
 */

const env = process.env.NODE_ENV || 'development'

const config = {
  development: {
    requireAuth: false, // Allow unauthenticated access in dev
    enableRateLimit: false,
    enableLogging: true,
    logLevel: 'debug',
    allowTestData: true,
    database: {
      enableRLS: false, // Row Level Security off in dev
      connectionPool: 5
    },
    features: {
      recurringAppointments: true,
      onlinePayments: true,
      smsNotifications: false, // Disabled to save costs in dev
      emailNotifications: true,
      aiRecommendations: true
    }
  },
  
  staging: {
    requireAuth: true,
    enableRateLimit: true,
    enableLogging: true,
    logLevel: 'info',
    allowTestData: true,
    database: {
      enableRLS: true,
      connectionPool: 10
    },
    features: {
      recurringAppointments: true,
      onlinePayments: true,
      smsNotifications: true,
      emailNotifications: true,
      aiRecommendations: true
    }
  },
  
  production: {
    requireAuth: true,
    enableRateLimit: true,
    enableLogging: true,
    logLevel: 'error',
    allowTestData: false,
    database: {
      enableRLS: true,
      connectionPool: 20
    },
    features: {
      recurringAppointments: true,
      onlinePayments: true,
      smsNotifications: true,
      emailNotifications: true,
      aiRecommendations: true
    }
  }
}

export function getConfig() {
  return config[env] || config.development
}

export function isProduction() {
  return env === 'production'
}

export function isDevelopment() {
  return env === 'development'
}

export function isStaging() {
  return env === 'staging'
}

export function getFeatureFlag(feature) {
  const currentConfig = getConfig()
  return currentConfig.features?.[feature] ?? false
}

export default {
  getConfig,
  isProduction,
  isDevelopment,
  isStaging,
  getFeatureFlag,
  env
}