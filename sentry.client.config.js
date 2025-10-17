/**
 * Sentry Client Configuration for Next.js
 * Production-grade error monitoring for 6FB AI Agent System
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.NODE_ENV || 'development',
  
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // Privacy protection
      blockAllMedia: false,
      maskRequestHeaders: ['authorization', 'cookie'],
      networkDetailAllowUrls: ['/api/', '/auth/'],
    }),
  ],
  
  beforeSend(event, hint) {
    if (window.location.pathname.includes('auth/callback')) {
      event.tags = event.tags || {}
      event.tags['oauth.callback'] = true
      event.fingerprint = ['oauth-callback-error']
      
      event.contexts = event.contexts || {}
      event.contexts.oauth = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        referrer: document.referrer
      }
    }
    
    if (event.request) {
      if (event.request.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
        sensitiveHeaders.forEach(header => {
          if (event.request.headers[header]) {
            event.request.headers[header] = '[REDACTED]'
          }
        })
      }
      
      if (event.request.data) {
        const sensitiveFields = ['password', 'token', 'api_key', 'secret']
        sensitiveFields.forEach(field => {
          if (event.request.data[field]) {
            event.request.data[field] = '[REDACTED]'
          }
        })
      }
    }
    
    return event
  },
  
  beforeSendTransaction(event) {
    if (event.transaction && event.transaction.includes('auth/callback')) {
      event.tags = event.tags || {}
      event.tags['transaction.type'] = 'oauth_callback'
      
      const duration = (event.timestamp || 0) - (event.start_timestamp || 0)
      if (duration > 3) {
        event.tags['performance.slow'] = true
        event.tags['performance.duration'] = Math.round(duration * 1000) + 'ms'
      }
      
      if (duration > 5 && window.performance && window.performance.memory) {
        event.contexts = event.contexts || {}
        event.contexts.memory = {
          usedJSHeapSize: Math.round(window.performance.memory.usedJSHeapSize / 1048576) + 'MB',
          totalJSHeapSize: Math.round(window.performance.memory.totalJSHeapSize / 1048576) + 'MB',
          jsHeapSizeLimit: Math.round(window.performance.memory.jsHeapSizeLimit / 1048576) + 'MB'
        }
      }
    }
    
    return event
  },
  
  ignoreErrors: [
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'NetworkError',
    'Failed to fetch',
    'NavigationDuplicated',
    'cancelled',
    /^Warning:/,
  ],
  
  allowUrls: [
    /https?:\/\/localhost/,
    /https?:\/\/.*\.vercel\.app/,
    /https?:\/\/.*\.bookedbarber\.com/,
  ],
  
  autoSessionTracking: true,
  attachStacktrace: true,
  debug: process.env.NODE_ENV === 'development',
})

export default Sentry