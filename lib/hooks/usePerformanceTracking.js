'use client'

import { useCallback, useEffect, useRef } from 'react'
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

// Performance tracking configuration
const PERFORMANCE_CONFIG = {
  // Enable different tracking types
  enableWebVitals: true,
  enableCustomEvents: true,
  enableTimings: true,
  
  // Sampling rate (0-1) to control data collection
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // API endpoint for sending performance data
  endpoint: '/api/analytics/performance',
  
  // Batch size for sending events
  batchSize: 10,
  
  // Flush interval (ms)
  flushInterval: 30000, // 30 seconds
}

class PerformanceTracker {
  constructor() {
    this.events = []
    this.timings = {}
    this.webVitals = {}
    this.sessionId = this.generateSessionId()
    this.userId = null
    this.flushTimer = null
    
    this.init()
  }
  
  init() {
    // Start periodic flush
    this.startPeriodicFlush()
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush()
      }
    })
    
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true) // Force immediate flush
    })
  }
  
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
  
  shouldTrack() {
    return Math.random() < PERFORMANCE_CONFIG.sampleRate
  }
  
  trackEvent(name, data = {}) {
    if (!PERFORMANCE_CONFIG.enableCustomEvents || !this.shouldTrack()) return
    
    const event = {
      type: 'custom_event',
      name,
      data,
      timestamp: performance.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.pathname,
      userAgent: navigator.userAgent,
    }
    
    this.events.push(event)
    
    // Auto-flush if batch size reached
    if (this.events.length >= PERFORMANCE_CONFIG.batchSize) {
      this.flush()
    }
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}:`, data)
    }
  }
  
  trackTiming(name, duration, data = {}) {
    if (!PERFORMANCE_CONFIG.enableTimings || !this.shouldTrack()) return
    
    const timing = {
      type: 'timing',
      name,
      duration,
      data,
      timestamp: performance.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location.pathname,
    }
    
    this.events.push(timing)
    
    // Store for potential aggregation
    if (!this.timings[name]) {
      this.timings[name] = []
    }
    this.timings[name].push(duration)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Timing] ${name}: ${duration.toFixed(2)}ms`, data)
    }
  }
  
  trackWebVitals() {
    if (!PERFORMANCE_CONFIG.enableWebVitals || !this.shouldTrack()) return
    
    const handleMetric = (metric) => {
      this.webVitals[metric.name] = metric.value
      
      const event = {
        type: 'web_vital',
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        timestamp: performance.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.pathname,
      }
      
      this.events.push(event)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Web Vital] ${metric.name}: ${metric.value} (${metric.rating})`)
      }
    }
    
    // Track Core Web Vitals
    getCLS(handleMetric)
    getFID(handleMetric)
    getFCP(handleMetric)
    getLCP(handleMetric)
    getTTFB(handleMetric)
  }
  
  trackResourceTiming() {
    if (!this.shouldTrack()) return
    
    const resources = performance.getEntriesByType('resource')
    const recentResources = resources.filter(resource => 
      resource.startTime > (performance.now() - 30000) // Last 30 seconds
    )
    
    recentResources.forEach(resource => {
      if (resource.duration > 1000) { // Only track slow resources
        this.trackEvent('slow_resource', {
          name: resource.name,
          duration: resource.duration,
          transferSize: resource.transferSize,
          encodedBodySize: resource.encodedBodySize,
          decodedBodySize: resource.decodedBodySize,
        })
      }
    })
  }
  
  trackLongTasks() {
    if (!this.shouldTrack()) return
    
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.trackEvent('long_task', {
            duration: entry.duration,
            startTime: entry.startTime,
          })
        })
      })
      
      observer.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // Long task observer not supported
      console.warn('Long task observer not supported')
    }
  }
  
  trackMemoryUsage() {
    if (!this.shouldTrack() || !performance.memory) return
    
    const memory = performance.memory
    this.trackEvent('memory_usage', {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    })
  }
  
  setUserId(userId) {
    this.userId = userId
  }
  
  getAverageTimings() {
    const averages = {}
    for (const [name, durations] of Object.entries(this.timings)) {
      averages[name] = {
        average: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        count: durations.length,
      }
    }
    return averages
  }
  
  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, PERFORMANCE_CONFIG.flushInterval)
  }
  
  async flush(force = false) {
    if (this.events.length === 0) return
    
    const eventsToSend = [...this.events]
    this.events = [] // Clear the queue
    
    try {
      const payload = {
        events: eventsToSend,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }
      
      if (force && navigator.sendBeacon) {
        // Use sendBeacon for immediate sending on page unload
        navigator.sendBeacon(
          PERFORMANCE_CONFIG.endpoint,
          JSON.stringify(payload)
        )
      } else {
        // Regular fetch for normal flushing
        await fetch(PERFORMANCE_CONFIG.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] Flushed ${eventsToSend.length} events`)
      }
    } catch (error) {
      console.warn('Failed to send performance data:', error)
      // Re-add events back to queue if not force flush
      if (!force) {
        this.events.unshift(...eventsToSend)
      }
    }
  }
  
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush(true)
  }
}

// Global performance tracker instance
let globalTracker = null

export function usePerformanceTracking(componentName = 'unknown') {
  const componentStartTime = useRef(performance.now())
  const renderCount = useRef(0)
  
  // Initialize global tracker
  useEffect(() => {
    if (!globalTracker) {
      globalTracker = new PerformanceTracker()
    }
  }, [])
  
  // Track component mount/unmount
  useEffect(() => {
    if (!globalTracker) return
    
    const mountTime = performance.now() - componentStartTime.current
    globalTracker.trackTiming(`component_mount_${componentName}`, mountTime)
    
    // Track component renders
    renderCount.current++
    globalTracker.trackEvent(`component_render_${componentName}`, {
      renderCount: renderCount.current
    })
    
    return () => {
      globalTracker.trackEvent(`component_unmount_${componentName}`, {
        totalRenders: renderCount.current,
        lifespan: performance.now() - componentStartTime.current
      })
    }
  }, [componentName])
  
  // Memoized tracking functions
  const trackEvent = useCallback((name, data = {}) => {
    if (globalTracker) {
      globalTracker.trackEvent(`${componentName}_${name}`, {
        component: componentName,
        ...data
      })
    }
  }, [componentName])
  
  const trackTiming = useCallback((name, duration, data = {}) => {
    if (globalTracker) {
      globalTracker.trackTiming(`${componentName}_${name}`, duration, {
        component: componentName,
        ...data
      })
    }
  }, [componentName])
  
  const trackWebVitals = useCallback(() => {
    if (globalTracker) {
      globalTracker.trackWebVitals()
    }
  }, [])
  
  const trackResourceTiming = useCallback(() => {
    if (globalTracker) {
      globalTracker.trackResourceTiming()
    }
  }, [])
  
  const trackMemoryUsage = useCallback(() => {
    if (globalTracker) {
      globalTracker.trackMemoryUsage()
    }
  }, [])
  
  const setUserId = useCallback((userId) => {
    if (globalTracker) {
      globalTracker.setUserId(userId)
    }
  }, [])
  
  const getMetrics = useCallback(() => {
    if (!globalTracker) return {}
    return {
      webVitals: globalTracker.webVitals,
      averageTimings: globalTracker.getAverageTimings(),
    }
  }, [])
  
  return {
    trackEvent,
    trackTiming,
    trackWebVitals,
    trackResourceTiming,
    trackMemoryUsage,
    setUserId,
    getMetrics,
  }
}

// Utility function for marking performance milestones
export function markPerformance(name) {
  if (performance && performance.mark) {
    performance.mark(name)
  }
}

// Utility function for measuring performance between marks
export function measurePerformance(name, startMark, endMark) {
  if (performance && performance.measure) {
    performance.measure(name, startMark, endMark)
    const measure = performance.getEntriesByName(name, 'measure')[0]
    return measure ? measure.duration : 0
  }
  return 0
}