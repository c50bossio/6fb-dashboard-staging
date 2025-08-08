'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { 
  initPerformanceMonitoring,
  getPerformanceReport,
  optimizeImageLoading,
  preloadCriticalResources,
  optimizeThirdPartyScripts,
  cleanupPerformanceMonitoring
} from '../lib/performance'

const PerformanceContext = createContext({})

export function usePerformance() {
  return useContext(PerformanceContext)
}

export function PerformanceProvider({ children }) {
  const initialized = useRef(false)
  const reportRef = useRef(null)

  useEffect(() => {
    if (initialized.current || typeof window === 'undefined') return

    initialized.current = true

    // Initialize comprehensive performance monitoring
    try {
      // Core Web Vitals monitoring
      initPerformanceMonitoring()

      // Optimize critical resources
      preloadCriticalResources()

      // Optimize images
      optimizeImageLoading()

      // Optimize third-party scripts
      optimizeThirdPartyScripts()

      console.log('🚀 Performance optimization suite initialized')

      // Set up periodic reporting
      const reportInterval = setInterval(() => {
        reportRef.current = getPerformanceReport()
        
        // Send report to analytics in production
        if (process.env.NODE_ENV === 'production' && reportRef.current.score < 75) {
          console.warn('⚠️ Performance score below threshold:', reportRef.current.score)
        }
      }, 30000) // Every 30 seconds

      return () => {
        clearInterval(reportInterval)
        cleanupPerformanceMonitoring()
      }
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error)
    }
  }, [])

  const contextValue = {
    getReport: () => reportRef.current || getPerformanceReport(),
    isInitialized: initialized.current
  }

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  )
}