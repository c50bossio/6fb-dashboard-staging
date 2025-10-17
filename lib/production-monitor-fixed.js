/**
 * Fixed Production Monitoring and Error Tracking System
 * Prevents excessive API calls and implements proper singleton pattern
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Singleton instance
let monitorInstance = null

// Debounce helper
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Production metrics collection
class ProductionMonitor {
  constructor() {
    // Prevent multiple instances
    if (monitorInstance) {
      return monitorInstance
    }
    
    this.metricsQueue = []
    this.errorQueue = []
    this.isOnline = true
    this.lastHeartbeat = Date.now()
    this.isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
    this.heartbeatInterval = null
    this.maxRetries = 3
    this.retryCount = 0
    
    this.thresholds = {
      responseTime: 3000, // 3 seconds
      errorRate: 0.05, // 5%
      aiCostPerHour: 1.00, // $1/hour
      memoryUsage: 0.85, // 85%
      cpuUsage: 0.80 // 80%
    }
    
    // Only start monitoring in production
    if (!this.isDevMode) {
      this.startHeartbeat()
      this.setupErrorHandlers()
    }
    
    monitorInstance = this
  }
  
  // System health monitoring with longer interval
  startHeartbeat() {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    // Use longer interval to reduce API calls (5 minutes instead of 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.collectSystemMetrics()
      this.debouncedFlushMetrics()
      this.checkThresholds()
      this.lastHeartbeat = Date.now()
    }, 300000) // Every 5 minutes
  }
  
  // Debounced flush to prevent rapid API calls
  debouncedFlushMetrics = debounce(() => {
    this.flushMetrics()
  }, 5000) // Wait 5 seconds before flushing
  
  // Collect performance metrics
  async collectSystemMetrics() {
    // Skip in dev mode
    if (this.isDevMode) {
      return null
    }
    
    const metrics = {
      timestamp: new Date().toISOString(),
      type: 'system_health',
      data: {
        memory: this.getMemoryUsage(),
        responseTime: this.getAverageResponseTime(),
        activeUsers: this.getActiveUserCount(),
        errorRate: this.getErrorRate(),
        isOnline: navigator.onLine
      }
    }
    
    this.metricsQueue.push(metrics)
    return metrics
  }
  
  // Memory usage monitoring
  getMemoryUsage() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = performance.memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: memory.usedJSHeapSize / memory.totalJSHeapSize
      }
    }
    return { used: 0, total: 0, percentage: 0 }
  }
  
  // Placeholder methods
  getAverageResponseTime() {
    return Math.random() * 1000 // Mock value
  }
  
  getActiveUserCount() {
    return 1 // Mock value
  }
  
  getErrorRate() {
    return 0 // Mock value
  }
  
  // Check performance thresholds
  checkThresholds() {
    const memory = this.getMemoryUsage()
    if (memory.percentage > this.thresholds.memoryUsage) {
      console.warn('High memory usage detected:', memory.percentage)
    }
  }
  
  // Setup global error handlers
  setupErrorHandlers() {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          message: event.message,
          source: event.filename,
          line: event.lineno,
          column: event.colno,
          error: event.error
        })
      })
      
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          message: 'Unhandled Promise Rejection',
          error: event.reason
        })
      })
    }
  }
  
  // Log errors with deduplication
  logError(error) {
    // Skip in dev mode
    if (this.isDevMode) {
      return
    }
    
    // Deduplicate errors
    const errorKey = `${error.message}-${error.source}-${error.line}`
    const existingError = this.errorQueue.find(e => e.key === errorKey)
    
    if (!existingError) {
      this.errorQueue.push({
        ...error,
        key: errorKey,
        timestamp: new Date().toISOString(),
        count: 1
      })
    } else {
      existingError.count++
    }
    
    // Limit error queue size
    if (this.errorQueue.length > 50) {
      this.errorQueue = this.errorQueue.slice(-50)
    }
  }
  
  // Metrics persistence with retry logic
  async flushMetrics() {
    // Skip in dev mode or if queues are empty
    if (this.isDevMode || (this.metricsQueue.length === 0 && this.errorQueue.length === 0)) {
      return
    }
    
    // Implement exponential backoff for retries
    if (this.retryCount >= this.maxRetries) {
      console.warn('Max retries reached for monitoring API')
      this.metricsQueue = []
      this.errorQueue = []
      this.retryCount = 0
      return
    }
    
    try {
      // Batch metrics to reduce API calls
      if (this.metricsQueue.length > 0) {
        const batchedMetrics = {
          type: 'batch_metrics',
          data: this.metricsQueue.slice(0, 10), // Send max 10 at a time
          timestamp: new Date().toISOString()
        }
        
        const response = await fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchedMetrics)
        })
        
        if (response.ok) {
          this.metricsQueue = this.metricsQueue.slice(10)
          this.retryCount = 0
        } else {
          throw new Error(`API returned ${response.status}`)
        }
      }
      
      // Batch errors
      if (this.errorQueue.length > 0) {
        const batchedErrors = {
          type: 'batch_errors',
          data: this.errorQueue.slice(0, 10),
          timestamp: new Date().toISOString()
        }
        
        const response = await fetch('/api/monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchedErrors)
        })
        
        if (response.ok) {
          this.errorQueue = this.errorQueue.slice(10)
          this.retryCount = 0
        } else {
          throw new Error(`API returned ${response.status}`)
        }
      }
    } catch (err) {
      this.retryCount++
      const backoffDelay = Math.min(1000 * Math.pow(2, this.retryCount), 30000)
      console.error(`Failed to flush metrics, retrying in ${backoffDelay}ms:`, err)
      
      setTimeout(() => {
        this.flushMetrics()
      }, backoffDelay)
    }
  }
  
  // Clean shutdown
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    // Final flush
    this.flushMetrics()
    
    // Clear singleton
    monitorInstance = null
  }
}

// Export singleton getter
export function getProductionMonitor() {
  if (!monitorInstance) {
    monitorInstance = new ProductionMonitor()
  }
  return monitorInstance
}

// Auto-initialize only in production
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH !== 'true') {
  getProductionMonitor()
}

export default ProductionMonitor