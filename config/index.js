/**
 * Centralized Configuration
 * Single source of truth for all environment variables and configuration
 * Validates required variables on startup
 */

import { logger } from '@/lib/logger'

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development'
const isDevelopment = NODE_ENV === 'development'
const isProduction = NODE_ENV === 'production'
const isTest = NODE_ENV === 'test'

/**
 * Validate required environment variables
 */
function validateEnvVars(requiredVars) {
  const missing = []
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  }
  
  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`
    logger.fatal('Configuration validation failed', new Error(error))
    
    if (isProduction) {
      // In production, throw to prevent startup with missing config
      throw new Error(error)
    } else {
      // In development, warn but continue
      logger.warn('Running with missing environment variables', { missing })
    }
  }
}

// Required environment variables
const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]

// Validate on module load
if (!isTest) {
  validateEnvVars(REQUIRED_VARS)
}

/**
 * Main configuration object
 * All environment variables should be accessed through this object
 */
export const config = {
  // Environment
  env: {
    NODE_ENV,
    isDevelopment,
    isProduction,
    isTest,
    isLocal: process.env.IS_LOCAL === 'true',
    debug: process.env.DEBUG === 'true' || isDevelopment
  },

  // Application
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || '6FB AI Agent System',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999',
    domain: process.env.NEXT_PUBLIC_DOMAIN || 'bookedbarber.com',
    port: parseInt(process.env.PORT || '9999', 10),
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
  },

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
    dbUrl: process.env.SUPABASE_DB_URL,
    pooling: {
      min: parseInt(process.env.SUPABASE_POOL_MIN || '2', 10),
      max: parseInt(process.env.SUPABASE_POOL_MAX || '10', 10)
    }
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET_KEY || process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    sessionSecret: process.env.SESSION_SECRET,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET
      }
    },
    mfa: {
      enabled: process.env.MFA_ENABLED === 'true',
      issuer: process.env.MFA_ISSUER || '6FB Barbershop'
    }
  },

  // AI Services
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229'
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      model: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-pro'
    },
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'openai'
  },

  // Payment
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    connectClientId: process.env.STRIPE_CONNECT_CLIENT_ID,
    testMode: process.env.STRIPE_TEST_MODE === 'true' || !isProduction
  },

  // Email
  email: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
      fromName: process.env.SENDGRID_FROM_NAME || '6FB Barbershop'
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      secure: process.env.SMTP_SECURE === 'true'
    }
  },

  // SMS
  sms: {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_PHONE_NUMBER,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
    }
  },

  // Real-time
  realtime: {
    pusher: {
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      encrypted: true
    },
    websocket: {
      url: process.env.WEBSOCKET_URL || 'ws://localhost:8001/ws',
      reconnectInterval: parseInt(process.env.WS_RECONNECT_INTERVAL || '5000', 10)
    }
  },

  // Caching
  cache: {
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
      ttl: parseInt(process.env.CACHE_TTL || '3600', 10)
    }
  },

  // Monitoring
  monitoring: {
    sentry: {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || NODE_ENV,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      debug: process.env.SENTRY_DEBUG === 'true'
    },
    posthog: {
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
    }
  },

  // Security
  security: {
    cors: {
      origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:9999'],
      credentials: process.env.CORS_CREDENTIALS !== 'false'
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY,
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'
    },
    turnstile: {
      siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      secretKey: process.env.TURNSTILE_SECRET_KEY
    }
  },

  // Features
  features: {
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    debugMode: process.env.DEBUG_MODE === 'true',
    mockMode: process.env.MOCK_MODE === 'true' && !isProduction,
    featureFlags: {
      newDashboard: process.env.FEATURE_NEW_DASHBOARD === 'true',
      aiCoach: process.env.FEATURE_AI_COACH !== 'false', // Default true
      advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
      enterpriseMode: process.env.FEATURE_ENTERPRISE_MODE === 'true'
    }
  },

  // External Services
  external: {
    cin7: {
      accountId: process.env.CIN7_ACCOUNT_ID,
      username: process.env.CIN7_USERNAME,
      password: process.env.CIN7_PASSWORD,
      apiUrl: process.env.CIN7_API_URL || 'https://api.cin7.com/api/v1'
    },
    googleMaps: {
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    },
    googleMyBusiness: {
      clientId: process.env.GMB_CLIENT_ID,
      clientSecret: process.env.GMB_CLIENT_SECRET
    }
  },

  // API Configuration
  api: {
    timeout: parseInt(process.env.API_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.API_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.API_RETRY_DELAY || '1000', 10),
    maxPayloadSize: process.env.API_MAX_PAYLOAD_SIZE || '10mb'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    pretty: process.env.LOG_PRETTY === 'true' || isDevelopment,
    file: process.env.LOG_FILE,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '7', 10)
  }
}

// Freeze config to prevent mutations
Object.freeze(config)

// Helper function to check if a feature is enabled
export function isFeatureEnabled(featureName) {
  return config.features.featureFlags[featureName] === true
}

// Helper function to get API headers
export function getApiHeaders(additionalHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    'X-App-Version': process.env.npm_package_version || '1.0.0',
    'X-Request-ID': crypto.randomUUID?.() || Date.now().toString(),
    ...additionalHeaders
  }
}

// Helper function to check if service is configured
export function isServiceConfigured(service) {
  switch (service) {
    case 'supabase':
      return !!(config.supabase.url && config.supabase.anonKey)
    case 'stripe':
      return !!(config.stripe.secretKey && config.stripe.publishableKey)
    case 'sendgrid':
      return !!config.email.sendgrid.apiKey
    case 'twilio':
      return !!(config.sms.twilio.accountSid && config.sms.twilio.authToken)
    case 'pusher':
      return !!(config.realtime.pusher.key && config.realtime.pusher.secret)
    case 'redis':
      return !!config.cache.redis.url || !!config.cache.redis.host
    case 'sentry':
      return !!config.monitoring.sentry.dsn
    default:
      return false
  }
}

export default config