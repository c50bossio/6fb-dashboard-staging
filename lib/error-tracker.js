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

  // Initialize error tracking
  init(options = {}) {
    if (this.initialized) return

    const { userId, metadata = {} } = options
    this.userId = userId
    this.metadata = metadata

    // Set up global error handlers
    this.setupGlobalHandlers()
    
    // Initialize Sentry if configured
    if (this.sentryDSN) {
      this.initSentry()
    }

    // Set up performance monitoring
    this.setupPerformanceMonitoring()

    this.initialized = true
    console.log('Error tracker initialized')
  }

  // Set up global error handlers
  setupGlobalHandlers() {
    // Catch unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError(event.error || new Error(event.message), {
          type: 'unhandled_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        })
      })

      // Catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(new Error(event.reason), {
          type: 'unhandled_rejection',
          promise: event.promise
        })
      })

      // Track console errors
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

  // Initialize Sentry
  initSentry() {
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.init({
        dsn: this.sentryDSN,
        environment: process.env.NODE_ENV,
        integrations: [
          new window.Sentry.BrowserTracing(),
          new window.Sentry.Replay()
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend: (event, hint) => {
          // Filter sensitive data
          return this.sanitizeErrorEvent(event, hint)
        }
      })

      // Set user context
      if (this.userId) {
        window.Sentry.setUser({ id: this.userId })
      }
    }
  }

  // Capture an error
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

    // Store error locally
    this.storeError(errorInfo)

    // Track error patterns
    this.trackErrorPattern(errorInfo)

    // Send to Sentry if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        extra: context
      })
    }

    // Send to backend
    this.sendToBackend(errorInfo)

    // Check for critical errors
    if (this.isCriticalError(errorInfo)) {
      this.handleCriticalError(errorInfo)
    }

    return errorInfo.id
  }

  // Store error locally
  storeError(errorInfo) {
    this.errors.push(errorInfo)
    
    // Limit stored errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }

    // Update error counts
    const errorKey = `${errorInfo.type}:${errorInfo.message}`
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1)

    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        const storedErrors = JSON.parse(localStorage.getItem('error-log') || '[]')
        storedErrors.push(errorInfo)
        
        // Keep only last 50 errors in localStorage
        if (storedErrors.length > 50) {
          storedErrors.splice(0, storedErrors.length - 50)
        }
        
        localStorage.setItem('error-log', JSON.stringify(storedErrors))
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }

  // Track error patterns
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
    
    // Alert on recurring patterns
    if (patternData.count > 5 && patternData.count % 5 === 0) {
      this.alertRecurringError(patternData)
    }
  }

  // Extract error pattern for grouping
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

  // Send error to backend
  async sendToBackend(errorInfo) {
    if (typeof window === 'undefined') return

    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo)
      })

      if (!response.ok) {
        console.warn('Failed to send error to backend')
      }
    } catch (error) {
      // Silently fail - don't create error loop
      console.warn('Error tracker backend failed:', error.message)
    }
  }

  // Check if error is critical
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

  // Handle critical errors
  handleCriticalError(errorInfo) {
    console.error('CRITICAL ERROR DETECTED:', errorInfo)

    // Show user notification
    if (typeof window !== 'undefined') {
      this.showErrorNotification({
        title: 'System Error',
        message: 'A critical error has occurred. Our team has been notified.',
        severity: 'error'
      })
    }

    // Send immediate alert
    this.sendAlert({
      level: 'critical',
      error: errorInfo,
      timestamp: new Date().toISOString()
    })
  }

  // Alert on recurring errors
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

  // Send alert to monitoring service
  async sendAlert(alert) {
    // Send to webhook or monitoring service
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

  // Show error notification to user
  showErrorNotification(options) {
    if (typeof window !== 'undefined' && window.toast) {
      window.toast({
        title: options.title,
        description: options.message,
        variant: 'destructive'
      })
    }
  }

  // Sanitize error event for privacy
  sanitizeErrorEvent(event, hint) {
    // Remove sensitive data
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

  // Set up performance monitoring
  setupPerformanceMonitoring() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return

    // Monitor long tasks
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
      // Long task API not supported
    }

    // Monitor memory usage
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

  // Generate unique error ID
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Generate session ID
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get error statistics
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

  // Clear error logs
  clear() {
    this.errors = []
    this.errorCounts.clear()
    this.errorPatterns.clear()
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error-log')
    }
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker()

// React hook for error tracking
export function useErrorHandler() {
  return {
    captureError: (error, context) => errorTracker.captureError(error, context),
    getStatistics: () => errorTracker.getStatistics(),
    clear: () => errorTracker.clear()
  }
}

export default errorTracker