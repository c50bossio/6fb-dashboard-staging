'use client'

import { useEffect, useState } from 'react'
import { getPerformanceMonitor } from '../lib/performance'

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    FCP: null,
    LCP: null,
    FID: null,
    CLS: null,
    TTFB: null
  })
  
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const monitor = getPerformanceMonitor()
    
    // Original monitoring logic
    const reportInterval = setInterval(() => {
      const metrics = monitor?.getMetrics()
      const recommendations = monitor?.getRecommendations()
      
      if (process.env.NODE_ENV === 'development' && Object.keys(metrics || {}).length > 0) {
        console.group('🚀 Performance Report')
        console.table(metrics)
        if (recommendations.length > 0) {
          console.warn('Performance Recommendations:', recommendations)
        }
        console.groupEnd()
      }
    }, 30000) // Report every 30 seconds in development
    
    // Enhanced Web Vitals monitoring
    if (typeof window !== 'undefined' && window.performance) {
      // First Contentful Paint
      const paintEntries = performance.getEntriesByType('paint')
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcp) {
        setMetrics(prev => ({ ...prev, FCP: Math.round(fcp.startTime) }))
      }

      // Time to First Byte
      const navigation = performance.getEntriesByType('navigation')[0]
      if (navigation) {
        const ttfb = Math.round(navigation.responseStart - navigation.requestStart)
        setMetrics(prev => ({ ...prev, TTFB: ttfb }))
      }

      // Observe LCP
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          setMetrics(prev => ({ ...prev, LCP: Math.round(lastEntry.renderTime || lastEntry.loadTime) }))
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        // LCP observation not supported
      }

      // Observe CLS
      let clsValue = 0
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
              setMetrics(prev => ({ ...prev, CLS: clsValue.toFixed(3) }))
            }
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (e) {
        // CLS observation not supported
      }
    }
    
    // Keyboard shortcut to toggle visibility (Ctrl/Cmd + Shift + P)
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('keydown', handleKeyPress)
    }
    
    return () => {
      clearInterval(reportInterval)
      if (process.env.NODE_ENV === 'development') {
        window.removeEventListener('keydown', handleKeyPress)
      }
    }
  }, [])

  // Visual performance widget for development
  if (process.env.NODE_ENV !== 'development' || !isVisible) return null

  const getMetricColor = (metric, value) => {
    if (value === null) return 'text-gray-400'
    
    const thresholds = {
      FCP: { good: 1800, needsImprovement: 3000 },
      LCP: { good: 2500, needsImprovement: 4000 },
      FID: { good: 100, needsImprovement: 300 },
      CLS: { good: 0.1, needsImprovement: 0.25 },
      TTFB: { good: 800, needsImprovement: 1800 }
    }

    const threshold = thresholds[metric]
    if (!threshold) return 'text-gray-600'

    if (value <= threshold.good) return 'text-green-600'
    if (value <= threshold.needsImprovement) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 max-w-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Performance</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
      <div className="space-y-1 text-xs">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="text-gray-600">{key}:</span>
            <span className={getMetricColor(key, value)}>
              {value !== null ? (
                key === 'CLS' ? value : `${value}ms`
              ) : 'pending'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  )
}