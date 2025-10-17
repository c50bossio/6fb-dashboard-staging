/**
 * Sentry Edge Configuration for Next.js
 * Production-grade error monitoring for Edge Runtime and Middleware
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',
  
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  transportOptions: {
    fetchOptions: {
      keepalive: true,
    },
  },
  
  beforeSend(event, hint) {
    if (event.request && event.request.url) {
      const url = event.request.url
      if (url.includes('auth/callback') || url.includes('oauth')) {
        event.tags = event.tags || {}
        event.tags['oauth.middleware'] = true
        event.tags['edge.runtime'] = true
        event.fingerprint = ['oauth-middleware-error']
        
        event.contexts = event.contexts || {}
        event.contexts.middleware = {
          url: url,
          timestamp: new Date().toISOString(),
          runtime: 'edge'
        }
      }
    }
    
    if (event.message && event.message.includes('security')) {
      event.tags = event.tags || {}
      event.tags['security.middleware'] = true
    }
    
    if (event.request) {
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
  
  beforeSendTransaction(event) {
    if (event.transaction && event.transaction.includes('middleware')) {
      event.tags = event.tags || {}
      event.tags['middleware.transaction'] = true
      
      const duration = (event.timestamp || 0) - (event.start_timestamp || 0)
      if (duration > 0.5) { // 500ms threshold for middleware
        event.tags['middleware.slow'] = true
        event.tags['middleware.duration'] = Math.round(duration * 1000) + 'ms'
      }
    }
    
    if (event.transaction && (event.transaction.includes('auth') || event.transaction.includes('oauth'))) {
      event.tags = event.tags || {}
      event.tags['auth.middleware'] = true
    }
    
    return event
  },
  
  ignoreErrors: [
    'EdgeRuntimeError',
    'FetchError',
    'WorkerError',
    'TimeoutError',
    /Module not found/,
  ],
  
  attachStacktrace: true,
  debug: process.env.NODE_ENV === 'development',
  serverName: process.env.SERVER_NAME || 'edge-runtime',
  
  integrations: [
    Sentry.httpIntegration({
      tracing: true,
    }),
  ],
})

export default Sentry