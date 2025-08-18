/**
 * Performance monitoring utility
 * Tracks Core Web Vitals and custom metrics
 */

export function reportWebVitals(metric) {
  if (process.env.NODE_ENV === 'development') {
  }

  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: window.location.href,
      timestamp: new Date().toISOString()
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, body)
    } else {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        body,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
      }).catch(console.error)
    }
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true,
    })
  }
}

class PerformanceMonitor {
  constructor() {
    this.marks = new Map()
    this.measures = new Map()
  }

  mark(name) {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(name)
      this.marks.set(name, performance.now())
    }
  }

  measure(name, startMark, endMark) {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        performance.measure(name, startMark, endMark)
        const measure = performance.getEntriesByName(name, 'measure')[0]
        this.measures.set(name, measure.duration)
        return measure.duration
      } catch (e) {
        console.error('Performance measurement failed:', e)
      }
    }
    return null
  }

  getMarks() {
    return Array.from(this.marks.entries())
  }

  getMeasures() {
    return Array.from(this.measures.entries())
  }

  clear() {
    if (typeof window !== 'undefined' && window.performance) {
      performance.clearMarks()
      performance.clearMeasures()
    }
    this.marks.clear()
    this.measures.clear()
  }

  logSummary() {
    console.group('Performance Summary')
    console.table(Object.fromEntries(this.marks))
    console.table(Object.fromEntries(this.measures))
    console.groupEnd()
  }
}

export const perfMonitor = new PerformanceMonitor()

export function observeResourceTiming() {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration > 500) {
        console.warn('Slow resource detected:', {
          name: entry.name,
          duration: entry.duration,
          type: entry.initiatorType,
          size: entry.transferSize
        })
      }
    }
  })

  observer.observe({ entryTypes: ['resource'] })
  return observer
}

export function observeLongTasks() {
  if (typeof window === 'undefined' || !window.PerformanceObserver) return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.warn('Long task detected:', {
          duration: entry.duration,
          startTime: entry.startTime,
          name: entry.name
        })
      }
    })

    observer.observe({ entryTypes: ['longtask'] })
    return observer
  } catch (e) {
    console.debug('Long task observation not supported')
  }
}

export function monitorMemory() {
  if (typeof window === 'undefined') return

  if (performance.memory) {
    const logMemory = () => {
      const memory = performance.memory
      const used = (memory.usedJSHeapSize / 1048576).toFixed(2)
      const total = (memory.totalJSHeapSize / 1048576).toFixed(2)
      const limit = (memory.jsHeapSizeLimit / 1048576).toFixed(2)
      
      
      if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
        console.warn('High memory usage detected!')
      }
    }

    if (process.env.NODE_ENV === 'development') {
      setInterval(logMemory, 30000)
    }
    
    return logMemory
  }
}

export function trackBundleSize() {
  if (typeof window === 'undefined') return

  const scripts = performance.getEntriesByType('resource')
    .filter(entry => entry.name.includes('.js'))
    .map(entry => ({
      name: entry.name.split('/').pop(),
      size: (entry.transferSize / 1024).toFixed(2) + 'KB',
      duration: entry.duration.toFixed(2) + 'ms'
    }))

  console.table(scripts)
  
  const totalSize = scripts.reduce((acc, script) => 
    acc + parseFloat(script.size), 0
  )
  
  
  return scripts
}

export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  observeResourceTiming()
  observeLongTasks()
  monitorMemory()

  window.addEventListener('load', () => {
    perfMonitor.mark('page-loaded')
    
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      if (navigation) {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive,
          domComplete: navigation.domComplete
        })
      }
      
      trackBundleSize()
    }, 0)
  })
}

export default perfMonitor