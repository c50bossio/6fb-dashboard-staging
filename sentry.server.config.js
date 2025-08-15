/**
 * Sentry Server Configuration for Next.js
 * Production-grade error monitoring for 6FB AI Agent System
 */

import * as Sentry from '@sentry/nextjs'

// Initialize Sentry for server-side
Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment configuration
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Server-specific configuration
  autoSessionTracking: false, // Sessions don't make sense on the server
  
  // OAuth callback monitoring
  beforeSend(event, hint) {
    // Track OAuth-related server errors
    if (event.request && event.request.url && event.request.url.includes('auth/callback')) {
      event.tags = event.tags || {}
      event.tags['oauth.server'] = true
      event.fingerprint = ['oauth-server-error']
    }
    
    // Filter sensitive server data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-supabase-auth']
        sensitiveHeaders.forEach(header => {
          if (event.request.headers[header]) {
            event.request.headers[header] = '[REDACTED]'
          }
        })
      }
      
      // Remove sensitive environment variables
      if (event.extra && event.extra.env) {
        const sensitiveEnvVars = [
          'SUPABASE_SERVICE_ROLE_KEY',
          'OPENAI_API_KEY',
          'ANTHROPIC_API_KEY',
          'STRIPE_SECRET_KEY',
          'JWT_SECRET_KEY',
          'DATABASE_URL'
        ]
        sensitiveEnvVars.forEach(envVar => {
          if (event.extra.env[envVar]) {
            event.extra.env[envVar] = '[REDACTED]'
          }
        })
      }
    }
    
    return event
  },
  
  // Performance monitoring
  beforeSendTransaction(event) {
    // Track OAuth API performance
    if (event.transaction && event.transaction.includes('api/auth')) {
      event.tags = event.tags || {}
      event.tags['api.auth'] = true
      
      // Flag slow API calls
      const duration = (event.timestamp || 0) - (event.start_timestamp || 0)
      if (duration > 2) {
        event.tags['api.slow'] = true
      }
    }
    
    // Track database operations
    if (event.transaction && event.transaction.includes('database')) {
      event.tags = event.tags || {}
      event.tags['database.operation'] = true
    }
    
    return event
  },
  
  // Ignore specific server errors
  ignoreErrors: [
    // Common server errors to ignore
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    // Next.js specific
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    // Development noise
    /Module not found/,
    /Cannot find module/,
  ],
  
  // Additional server options
  attachStacktrace: true,
  debug: process.env.NODE_ENV === 'development',
  serverName: process.env.SERVER_NAME || 'nextjs-server',
  
  // Integrations
  integrations: [
    // Capture console logs
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn']
    }),
    // HTTP integration for tracking requests
    Sentry.httpIntegration({
      tracing: true,
      breadcrumbs: true
    }),
  ],
})

// Export for use in other modules
export default Sentry