/**
 * Development Mode Error Suppressor
 * Additional filtering for development environment to reduce console noise
 */

class DevErrorSuppressor {
  constructor() {
    this.suppressedPatterns = new Set()
    this.suppressedCounts = new Map()
    this.maxSuppressedMessages = 50 // Limit to prevent memory leaks
    
    // Common development noise patterns
    this.commonNoisePatterns = [
      // React/Next.js warnings
      'Warning: validateDOMNesting',
      'Warning: Each child in a list should have a unique "key" prop',
      'Warning: Failed prop type',
      'Warning: React.createFactory',
      
      // Auth related development noise
      'Session timeout',
      'Profile fetch timed out',
      'Session check timed out', 
      'Authentication session unavailable',
      'No session found',
      
      // Network related development noise (when backend is down)
      'Failed to fetch',
      'NetworkError when attempting to fetch resource',
      'TypeError: Failed to fetch',
      
      // Development server noise
      'HMR',
      'Hot reload',
      'Fast Refresh',
      
      // Browser dev tools
      'Manifest: Line: 1, column: 1, Syntax error',
      '.well-known/appspecific',
      
      // Common null/undefined in development
      'Cannot read properties of undefined',
      'Cannot read properties of null',
      
      // Supabase development warnings
      'SUPABASE_URL is not set',
      'SUPABASE_ANON_KEY is not set',
      'No project URL found',
      
      // PostCSS/Tailwind development warnings
      'autoprefixer',
      '@tailwindcss',
    ]
    
    this.initialize()
  }
  
  initialize() {
    if (process.env.NODE_ENV !== 'development') {
      return // Only active in development
    }
    
    this.setupConsoleFiltering()
  }
  
  setupConsoleFiltering() {
    const originalWarn = console.warn
    const originalError = console.error
    const originalLog = console.log
    
    console.warn = (...args) => {
      if (!this.shouldSuppressMessage(args[0], 'warn')) {
        originalWarn.apply(console, args)
      }
    }
    
    console.error = (...args) => {
      if (!this.shouldSuppressMessage(args[0], 'error')) {
        originalError.apply(console, args)
      }
    }
    
    console.log = (...args) => {
      if (!this.shouldSuppressMessage(args[0], 'log')) {
        originalLog.apply(console, args)
      }
    }
  }
  
  shouldSuppressMessage(message, type = 'log') {
    if (process.env.NODE_ENV !== 'development') {
      return false
    }
    
    if (!message || typeof message !== 'string') {
      return false
    }
    
    // Check against common noise patterns
    const shouldSuppress = this.commonNoisePatterns.some(pattern => 
      message.includes(pattern)
    )
    
    if (shouldSuppress) {
      this.trackSuppressed(message, type)
      return true
    }
    
    return false
  }
  
  trackSuppressed(message, type) {
    const key = `${type}:${message.substring(0, 100)}` // Truncate for storage
    const count = this.suppressedCounts.get(key) || 0
    
    this.suppressedCounts.set(key, count + 1)
    
    // Clean up old entries to prevent memory leaks
    if (this.suppressedCounts.size > this.maxSuppressedMessages) {
      const oldestKey = this.suppressedCounts.keys().next().value
      this.suppressedCounts.delete(oldestKey)
    }
  }
  
  addSuppressPattern(pattern) {
    this.commonNoisePatterns.push(pattern)
  }
  
  removeSuppressPattern(pattern) {
    const index = this.commonNoisePatterns.indexOf(pattern)
    if (index > -1) {
      this.commonNoisePatterns.splice(index, 1)
    }
  }
  
  getSuppressedStats() {
    if (process.env.NODE_ENV !== 'development') {
      return {}
    }
    
    const stats = {}
    for (const [key, count] of this.suppressedCounts) {
      stats[key] = count
    }
    return stats
  }
  
  // Show stats in development console
  showStats() {
    if (process.env.NODE_ENV !== 'development') {
      return
    }
    
    const stats = this.getSuppressedStats()
    const totalSuppressed = Object.values(stats).reduce((sum, count) => sum + count, 0)
    
    if (totalSuppressed > 0) {
      console.group(`🤫 DevErrorSuppressor Stats - ${totalSuppressed} messages suppressed`)
      Object.entries(stats)
        .sort(([,a], [,b]) => b - a) // Sort by count descending
        .slice(0, 10) // Show top 10
        .forEach(([message, count]) => {
          console.log(`${count}x: ${message}`)
        })
      console.groupEnd()
    }
  }
  
  reset() {
    this.suppressedCounts.clear()
  }
}

// Create singleton instance
const devErrorSuppressor = new DevErrorSuppressor()

// Development utilities
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Make available on window for debugging
  window.devErrorSuppressor = devErrorSuppressor
  
  // Show stats every 30 seconds in development
  setInterval(() => {
    devErrorSuppressor.showStats()
  }, 30000)
}

export default devErrorSuppressor