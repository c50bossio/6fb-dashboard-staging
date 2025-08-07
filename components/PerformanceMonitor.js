'use client'

import { useEffect } from 'react'

import { getPerformanceMonitor } from '../lib/performance'

export default function PerformanceMonitor() {
  useEffect(() => {
    // Initialize performance monitoring
    const monitor = getPerformanceMonitor()
    
    // Optional: Report performance metrics periodically
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
    
    return () => clearInterval(reportInterval)
  }, [])

  // This component doesn't render anything
  return null
}