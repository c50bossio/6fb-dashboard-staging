export const SECURITY_CONFIG = {
  password: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    historyCount: 12
  },
  
  session: {
    maxAge: 15 * 60 * 1000, // 15 minutes
    refreshThreshold: 5 * 60 * 1000, // 5 minutes
    maxConcurrent: 3, // Max concurrent sessions per user
    secureFlag: true,
    sameSite: 'strict'
  },
  
  rateLimit: {
    auth: { requests: 5, window: 60000 }, // 5 per minute
    api: { requests: 100, window: 60000 }, // 100 per minute
    upload: { requests: 10, window: 300000 }, // 10 per 5 minutes
    reset: { requests: 3, window: 3600000 } // 3 per hour
  },
  
  input: {
    maxLength: {
      general: 1000,
      message: 10000,
      description: 5000,
      name: 100,
      email: 254
    },
    fileUpload: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      scanForMalware: true
    }
  },
  
  headers: {
    csp: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'img-src': ["'self'", "data:", "https:", "blob:"],
      'connect-src': ["'self'", "https://*.supabase.co", "https://api.openai.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'frame-src': ["'self'", "https://js.stripe.com"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  monitoring: {
    logLevel: process.env.NODE_ENV === 'production' ? 'warning' : 'info',
    alertThresholds: {
      failedLogins: 5,
      rateLimitViolations: 10,
      suspiciousActivity: 1
    },
    retentionDays: 90
  }
}

export default SECURITY_CONFIG
