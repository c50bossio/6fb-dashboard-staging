/**
 * Sentry Server Configuration for Next.js
 * Production-grade error monitoring for 6FB AI Agent System
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',
  
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  autoSessionTracking: false, // Sessions don't make sense on the server
  
  beforeSend(event, hint) {
    if (event.request && event.request.url && event.request.url.includes('auth/callback')) {
      event.tags = event.tags || {}
      event.tags['oauth.server'] = true
      event.fingerprint = ['oauth-server-error']
    }
    
    if (event.request) {
      if (event.request.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-supabase-auth']
        sensitiveHeaders.forEach(header => {
          if (event.request.headers[header]) {
            event.request.headers[header] = '[REDACTED]'
          }
        })
      }
      
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
  
  beforeSendTransaction(event) {
    if (event.transaction && event.transaction.includes('api/auth')) {
      event.tags = event.tags || {}
      event.tags['api.auth'] = true
      
      const duration = (event.timestamp || 0) - (event.start_timestamp || 0)
      if (duration > 2) {
        event.tags['api.slow'] = true
      }
    }
    
    if (event.transaction && event.transaction.includes('database')) {
      event.tags = event.tags || {}
      event.tags['database.operation'] = true
    }
    
    return event
  },
  
  ignoreErrors: [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    /Module not found/,
    /Cannot find module/,
  ],
  
  attachStacktrace: true,
  debug: process.env.NODE_ENV === 'development',
  serverName: process.env.SERVER_NAME || 'nextjs-server',
  
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn']
    }),
    Sentry.httpIntegration({
      tracing: true,
      breadcrumbs: true
    }),
  ],
})

export default Sentry