/**
 * Sentry Edge Configuration for Next.js
 * Production-grade error monitoring for Edge Runtime and Middleware
 */

import * as Sentry from '@sentry/nextjs'

// Initialize Sentry for Edge Runtime
Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment configuration
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring for Edge
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Edge-specific configuration
  transportOptions: {
    // Use fetch for Edge Runtime compatibility
    fetchOptions: {
      keepalive: true,
    },
  },
  
  // OAuth middleware monitoring
  beforeSend(event, hint) {
    // Track OAuth middleware errors
    if (event.request && event.request.url) {
      const url = event.request.url
      if (url.includes('auth/callback') || url.includes('oauth')) {
        event.tags = event.tags || {}
        event.tags['oauth.middleware'] = true
        event.tags['edge.runtime'] = true
        event.fingerprint = ['oauth-middleware-error']
        
        // Add middleware context
        event.contexts = event.contexts || {}
        event.contexts.middleware = {
          url: url,
          timestamp: new Date().toISOString(),
          runtime: 'edge'
        }
      }
    }
    
    // Track security middleware errors
    if (event.message && event.message.includes('security')) {
      event.tags = event.tags || {}
      event.tags['security.middleware'] = true
    }
    
    // Filter sensitive edge data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        const sensitiveHeaders = [
          'authorization',
          'cookie',
          'x-api-key',
          'cf-ray',
          'cf-connecting-ip'
        ]
        sensitiveHeaders.forEach(header => {
          if (event.request.headers[header]) {
            event.request.headers[header] = '[REDACTED]'
          }
        })
      }
    }
    
    return event
  },
  
  // Performance monitoring for middleware
  beforeSendTransaction(event) {
    // Track middleware performance
    if (event.transaction && event.transaction.includes('middleware')) {
      event.tags = event.tags || {}
      event.tags['middleware.transaction'] = true
      
      // Flag slow middleware
      const duration = (event.timestamp || 0) - (event.start_timestamp || 0)
      if (duration > 0.5) { // 500ms threshold for middleware
        event.tags['middleware.slow'] = true
        event.tags['middleware.duration'] = Math.round(duration * 1000) + 'ms'
      }
    }
    
    // Track authentication middleware specifically
    if (event.transaction && (event.transaction.includes('auth') || event.transaction.includes('oauth'))) {
      event.tags = event.tags || {}
      event.tags['auth.middleware'] = true
    }
    
    return event
  },
  
  // Ignore specific edge errors
  ignoreErrors: [
    // Edge-specific errors to ignore
    'EdgeRuntimeError',
    'FetchError',
    // Cloudflare/Vercel Edge
    'WorkerError',
    'TimeoutError',
    // Development noise
    /Module not found/,
  ],
  
  // Additional edge options
  attachStacktrace: true,
  debug: process.env.NODE_ENV === 'development',
  serverName: process.env.SERVER_NAME || 'edge-runtime',
  
  // Minimal integrations for Edge Runtime
  integrations: [
    // Only include Edge-compatible integrations
    Sentry.httpIntegration({
      tracing: true,
    }),
  ],
})

// Export for use in middleware
export default Sentry