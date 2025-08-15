/**
 * Comprehensive error tracking and monitoring system
 */

class ErrorTracker {
  constructor() {
    this.errors = []
    this.errorCounts = new Map()
    this.errorPatterns = new Map()
    this.maxErrors = 100
    this.sentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN
    this.initialized = false
    this.userId = null
    this.sessionId = this.generateSessionId()
  }

  init(options = {}) {
    if (this.initialized) return

    const { userId, metadata = {} } = options
    this.userId = userId
    this.metadata = metadata

    this.setupGlobalHandlers()
    
    if (this.sentryDSN) {
      this.initSentry()
    }

    this.setupPerformanceMonitoring()

    this.initialized = true
    console.log('Error tracker initialized')
  }

  setupGlobalHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError(event.error || new Error(event.message), {
          type: 'unhandled_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          component: 'global'
        })
      })

      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(new Error(event.reason), {
          type: 'unhandled_rejection',
          promise: event.promise,
          component: 'promise'
        })
      })
      
      if (window.location.pathname.includes('auth/callback')) {
        let callbackCount = 0
        const checkInterval = setInterval(() => {
          callbackCount++
          if (callbackCount > 10) {  // More than 10 seconds on callback page
            this.captureError(new Error('OAuth callback timeout - possible loop'), {
              type: 'oauth_timeout',
              url: window.location.href,
              duration: callbackCount,
              component: 'oauth'
            })
            clearInterval(checkInterval)
          }
        }, 1000)
        
        window.addEventListener('beforeunload', () => clearInterval(checkInterval))
      }

      const originalConsoleError = console.error
      console.error = (...args) => {
        this.captureError(new Error(args.join(' ')), {
          type: 'console_error',
          arguments: args
        })
        originalConsoleError.apply(console, args)
      }
    }
  }

  async initSentry() {
    if (typeof window !== 'undefined') {
      try {
        const Sentry = await import('@sentry/nextjs')
        
        Sentry.init({
          dsn: this.sentryDSN,
          environment: process.env.NODE_ENV || 'development',
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: false
            })
          ],
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          beforeSend: (event, hint) => {
            return this.sanitizeErrorEvent(event, hint)
          },
          beforeSendTransaction: (event) => {
            if (event.transaction && event.transaction.includes('auth/callback')) {
              event.tags = event.tags || {}
              event.tags['oauth.callback'] = true
              
              const duration = (event.timestamp || 0) - (event.start_timestamp || 0)
              if (duration > 3) {
                event.tags['oauth.slow'] = true
              }
            }
            return event
          }
        })

        if (this.userId) {
          Sentry.setUser({ id: this.userId })
        }
        
        console.log('✅ Sentry initialized in frontend')
        this.Sentry = Sentry
      } catch (error) {
        console.warn('Sentry initialization failed:', error)
      }
    }
  }

  captureError(error, context = {}) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      type: error.name || 'Error',
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : null,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        userId: this.userId,
        sessionId: this.sessionId
      }
    }

    this.storeError(errorInfo)

    this.trackErrorPattern(errorInfo)

    if (this.Sentry) {
      this.Sentry.captureException(error, {
        extra: context,
        tags: {
          component: context.component || 'unknown',
          severity: this.isCriticalError(errorInfo) ? 'critical' : 'normal'
        }
      })
    }

    this.sendToBackend(errorInfo)

    if (this.isCriticalError(errorInfo)) {
      this.handleCriticalError(errorInfo)
    }

    return errorInfo.id
  }

  storeError(errorInfo) {
    this.errors.push(errorInfo)
    
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }

    const errorKey = `${errorInfo.type}:${errorInfo.message}`
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1)

    if (typeof window !== 'undefined') {
      try {
        const storedErrors = JSON.parse(localStorage.getItem('error-log') || '[]')
        storedErrors.push(errorInfo)
        
        if (storedErrors.length > 50) {
          storedErrors.splice(0, storedErrors.length - 50)
        }
        
        localStorage.setItem('error-log', JSON.stringify(storedErrors))
      } catch (e) {
      }
    }
  }

  trackErrorPattern(errorInfo) {
    const pattern = this.extractErrorPattern(errorInfo)
    const patternKey = JSON.stringify(pattern)
    
    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        pattern,
        count: 0,
        firstSeen: errorInfo.timestamp,
        lastSeen: errorInfo.timestamp,
        examples: []
      })
    }
    
    const patternData = this.errorPatterns.get(patternKey)
    patternData.count++
    patternData.lastSeen = errorInfo.timestamp
    
    if (patternData.examples.length < 3) {
      patternData.examples.push(errorInfo)
    }
    
    if (patternData.count > 5 && patternData.count % 5 === 0) {
      this.alertRecurringError(patternData)
    }
  }

  extractErrorPattern(errorInfo) {
    const stackLines = (errorInfo.stack || '').split('\n').slice(0, 3)
    return {
      type: errorInfo.type,
      message: errorInfo.message.replace(/\d+/g, 'N'), // Replace numbers with N
      stackSignature: stackLines.map(line => 
        line.replace(/:\d+:\d+/g, ':N:N') // Replace line numbers
      ).join('|')
    }
  }

  async sendToBackend(errorInfo) {
    if (typeof window === 'undefined') return

    try {
      const endpoints = [
        '/api/errors'  // Next.js API route only
      ]
      
      const promises = endpoints.map(endpoint => 
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorInfo)
        }).catch(err => {
          console.debug(`Error reporting to ${endpoint} failed:`, err.message)
        })
      )
      
      await Promise.allSettled(promises)
    } catch (error) {
      console.warn('Error tracker backend failed:', error.message)
    }
  }

  isCriticalError(errorInfo) {
    const criticalPatterns = [
      /database.*connection/i,
      /authentication.*failed/i,
      /payment.*error/i,
      /security.*violation/i,
      /out.*of.*memory/i,
      /maximum.*call.*stack/i
    ]

    return criticalPatterns.some(pattern => 
      pattern.test(errorInfo.message) || pattern.test(errorInfo.type)
    )
  }

  handleCriticalError(errorInfo) {
    console.error('CRITICAL ERROR DETECTED:', errorInfo)

    if (typeof window !== 'undefined') {
      this.showErrorNotification({
        title: 'System Error',
        message: 'A critical error has occurred. Our team has been notified.',
        severity: 'error'
      })
    }

    this.sendAlert({
      level: 'critical',
      error: errorInfo,
      timestamp: new Date().toISOString()
    })
  }

  alertRecurringError(patternData) {
    console.warn('Recurring error pattern detected:', patternData)
    
    this.sendAlert({
      level: 'warning',
      type: 'recurring_error',
      pattern: patternData.pattern,
      count: patternData.count,
      examples: patternData.examples
    })
  }

  async sendAlert(alert) {
    if (process.env.NEXT_PUBLIC_ALERT_WEBHOOK) {
      try {
        await fetch(process.env.NEXT_PUBLIC_ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        })
      } catch (error) {
        console.error('Failed to send alert:', error)
      }
    }
  }

  showErrorNotification(options) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast({
        title: options.title,
        description: options.message,
        variant: 'destructive'
      })
    }
  }

  sanitizeErrorEvent(event, hint) {
    const sensitiveFields = ['password', 'token', 'api_key', 'secret', 'credit_card']
    
    if (event.extra) {
      sensitiveFields.forEach(field => {
        if (event.extra[field]) {
          event.extra[field] = '[REDACTED]'
        }
      })
    }

    if (event.request && event.request.data) {
      sensitiveFields.forEach(field => {
        if (event.request.data[field]) {
          event.request.data[field] = '[REDACTED]'
        }
      })
    }

    return event
  }

  setupPerformanceMonitoring() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.captureError(new Error('Long task detected'), {
              type: 'performance',
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            })
          }
        }
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    } catch (e) {
    }

    if (performance.memory) {
      setInterval(() => {
        const memoryUsage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit
        if (memoryUsage > 0.9) {
          this.captureError(new Error('High memory usage'), {
            type: 'performance',
            memoryUsage: memoryUsage * 100,
            usedHeap: performance.memory.usedJSHeapSize,
            heapLimit: performance.memory.jsHeapSizeLimit
          })
        }
      }, 60000) // Check every minute
    }
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getStatistics() {
    const stats = {
      totalErrors: this.errors.length,
      errorCounts: Object.fromEntries(this.errorCounts),
      patterns: Array.from(this.errorPatterns.values()).map(p => ({
        ...p.pattern,
        count: p.count,
        firstSeen: p.firstSeen,
        lastSeen: p.lastSeen
      })),
      criticalErrors: this.errors.filter(e => this.isCriticalError(e)).length,
      recentErrors: this.errors.slice(-10)
    }
    
    return stats
  }

  clear() {
    this.errors = []
    this.errorCounts.clear()
    this.errorPatterns.clear()
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error-log')
    }
  }
}

const errorTracker = new ErrorTracker()

export function useErrorHandler() {
  return {
    captureError: (error, context) => errorTracker.captureError(error, context),
    getStatistics: () => errorTracker.getStatistics(),
    clear: () => errorTracker.clear()
  }
}

export default errorTracker