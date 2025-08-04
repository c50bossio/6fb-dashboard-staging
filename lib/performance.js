'use client'

// Import web-vitals v5 API - use dynamic imports to avoid SSR issues
// In v5, the API changed to onCLS, onFID, etc.

// Performance metrics collection
class PerformanceMonitor {
  constructor() {
    this.metrics = {}
    this.isInitialized = false
    this.init()
  }

  async init() {
    if (typeof window === 'undefined' || this.isInitialized) return
    
    this.isInitialized = true
    
    // Dynamically import web-vitals v5 API
    try {
      const { onCLS, onFID, onFCP, onLCP } = await import('web-vitals')
      
      // Collect Core Web Vitals using v5 API
      onCLS(this.onMetric.bind(this))
      onFID(this.onMetric.bind(this))
      onFCP(this.onMetric.bind(this))
      onLCP(this.onMetric.bind(this))
    } catch (error) {
      console.warn('Failed to load web-vitals:', error)
    }

    // Additional performance metrics
    this.collectCustomMetrics()
  }

  onMetric(metric) {
    this.metrics[metric.name] = metric.value
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance Metric: ${metric.name}`, {
        value: metric.value,
        rating: this.getRating(metric.name, metric.value),
        entries: metric.entries
      })
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric)
    }
  }

  getRating(name, value) {
    const thresholds = {
      CLS: [0.1, 0.25],      // Good: ≤0.1, Needs Improvement: ≤0.25, Poor: >0.25
      FID: [100, 300],       // Good: ≤100ms, Needs Improvement: ≤300ms, Poor: >300ms
      FCP: [1800, 3000],     // Good: ≤1.8s, Needs Improvement: ≤3s, Poor: >3s
      LCP: [2500, 4000],     // Good: ≤2.5s, Needs Improvement: ≤4s, Poor: >4s
      TTFB: [800, 1800]      // Good: ≤800ms, Needs Improvement: ≤1.8s, Poor: >1.8s
    }

    const [good, needsImprovement] = thresholds[name] || [0, 0]
    
    if (value <= good) return 'good'
    if (value <= needsImprovement) return 'needs-improvement'
    return 'poor'
  }

  collectCustomMetrics() {
    // Navigation timing
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing
      this.metrics.navigationStart = timing.navigationStart
      this.metrics.loadComplete = timing.loadEventEnd - timing.navigationStart
      this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart
    }

    // Resource timing
    if (window.performance && window.performance.getEntriesByType) {
      const resources = window.performance.getEntriesByType('resource')
      this.metrics.resourceCount = resources.length
      this.metrics.resourceSize = resources.reduce((total, resource) => 
        total + (resource.transferSize || 0), 0
      )
    }
  }

  sendToAnalytics(metric) {
    // PostHog integration
    if (window.posthog) {
      window.posthog.capture('performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_rating: this.getRating(metric.name, metric.value),
        page: window.location.pathname
      })
    }

    // Sentry performance monitoring
    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'performance',
        message: `${metric.name}: ${metric.value}`,
        level: 'info',
        data: {
          metric: metric.name,
          value: metric.value,
          rating: this.getRating(metric.name, metric.value)
        }
      })
    }
  }

  getMetrics() {
    return this.metrics
  }

  // Performance recommendations based on metrics
  getRecommendations() {
    const recommendations = []
    
    if (this.metrics.LCP > 4000) {
      recommendations.push({
        type: 'LCP',
        message: 'Largest Contentful Paint is slow. Consider optimizing images and reducing server response time.',
        priority: 'high'
      })
    }

    if (this.metrics.FID > 300) {
      recommendations.push({
        type: 'FID',
        message: 'First Input Delay is high. Consider reducing JavaScript bundle size and optimizing event handlers.',
        priority: 'high'
      })
    }

    if (this.metrics.CLS > 0.25) {
      recommendations.push({
        type: 'CLS',
        message: 'Cumulative Layout Shift is poor. Ensure images have dimensions and avoid inserting content above existing content.',
        priority: 'medium'
      })
    }

    return recommendations
  }
}

// Singleton instance
let performanceMonitor = null

export function getPerformanceMonitor() {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = new PerformanceMonitor()
  }
  return performanceMonitor
}

// Hook for React components
export function usePerformanceMonitor() {
  const monitor = getPerformanceMonitor()
  return {
    metrics: monitor?.getMetrics() || {},
    recommendations: monitor?.getRecommendations() || []
  }
}

// Performance optimization utilities
export const PerformanceUtils = {
  // Image lazy loading observer
  createImageObserver(callback) {
    if (typeof IntersectionObserver === 'undefined') return null
    
    return new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target)
        }
      })
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    })
  },

  // Prefetch resources
  prefetchResource(href, as = 'fetch') {
    if (typeof document === 'undefined') return
    
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href
    link.as = as
    document.head.appendChild(link)
  },

  // Measure performance
  measurePerformance(name, fn) {
    if (typeof performance === 'undefined') return fn()
    
    const startTime = performance.now()
    const result = fn()
    const endTime = performance.now()
    
    console.log(`Performance: ${name} took ${endTime - startTime} milliseconds`)
    return result
  }
}

export default getPerformanceMonitor