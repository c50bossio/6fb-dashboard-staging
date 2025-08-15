/**
 * Sentry Client Configuration for Next.js
 * Production-grade error monitoring for 6FB AI Agent System
 */

import * as Sentry from '@sentry/nextjs'

// Initialize Sentry
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment configuration
  environment: process.env.NODE_ENV || 'development',
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true, // Privacy protection
      blockAllMedia: false,
      // Capture OAuth callback issues
      maskRequestHeaders: ['authorization', 'cookie'],
      networkDetailAllowUrls: ['/api/', '/auth/'],
    }),
  ],
  
  // OAuth callback monitoring
  beforeSend(event, hint) {
    // Track OAuth-specific errors
    if (window.location.pathname.includes('auth/callback')) {
      event.tags = event.tags || {}
      event.tags['oauth.callback'] = true
      event.fingerprint = ['oauth-callback-error']
      
      // Add OAuth context
      event.contexts = event.contexts || {}
      event.contexts.oauth = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        referrer: document.referrer
      }
    }
    
    // Filter sensitive data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key']
        sensitiveHeaders.forEach(header => {
          if (event.request.headers[header]) {
            event.request.headers[header] = '[REDACTED]'
          }
        })
      }
      
      // Remove sensitive data from body
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
  
  // Performance monitoring for OAuth flows
  beforeSendTransaction(event) {
    // Track OAuth callback performance
    if (event.transaction && event.transaction.includes('auth/callback')) {
      event.tags = event.tags || {}
      event.tags['transaction.type'] = 'oauth_callback'
      
      // Calculate and flag slow OAuth callbacks
      const duration = (event.timestamp || 0) - (event.start_timestamp || 0)
      if (duration > 3) {
        event.tags['performance.slow'] = true
        event.tags['performance.duration'] = Math.round(duration * 1000) + 'ms'
      }
      
      // Add memory context for slow operations
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
  
  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    // Network errors
    'NetworkError',
    'Failed to fetch',
    // User-caused errors
    'NavigationDuplicated',
    'cancelled',
    // Development noise
    /^Warning:/,
  ],
  
  // Allow specific URLs
  allowUrls: [
    /https?:\/\/localhost/,
    /https?:\/\/.*\.vercel\.app/,
    /https?:\/\/.*\.bookedbarber\.com/,
  ],
  
  // Additional options
  autoSessionTracking: true,
  attachStacktrace: true,
  debug: process.env.NODE_ENV === 'development',
})

// Export for use in other modules
export default Sentry