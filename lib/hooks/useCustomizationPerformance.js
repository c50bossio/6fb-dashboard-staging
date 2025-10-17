/**
 * Performance Optimization Hooks for Advanced Customization Features
 * 6FB AI Agent System - Enterprise-Grade Performance Management
 * 
 * Provides performance monitoring, caching, and optimization utilities
 */

import { debounce, throttle } from 'lodash'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

/**
 * High-performance template management with caching and virtualization
 */
export function useTemplatePerformance() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cache, setCache] = useState(new Map())
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    cachedRequests: 0
  })

  const requestStartTime = useRef(0)

  /**
   * Load templates with intelligent caching
   */
  const loadTemplates = useCallback(async (filters = {}) => {
    const cacheKey = JSON.stringify(filters)
    requestStartTime.current = performance.now()

    // Check cache first
    if (cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey)
      
      // Check if cache is still valid (5 minutes)
      if (Date.now() - cachedData.timestamp < 300000) {
        setTemplates(cachedData.data)
        setMetrics(prev => ({
          ...prev,
          loadTime: performance.now() - requestStartTime.current,
          totalRequests: prev.totalRequests + 1,
          cachedRequests: prev.cachedRequests + 1,
          cacheHitRate: ((prev.cachedRequests + 1) / (prev.totalRequests + 1)) * 100
        }))
        return cachedData.data
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/customization/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(filters)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const templateData = data.templates || []

      // Update cache
      const newCacheEntry = {
        data: templateData,
        timestamp: Date.now()
      }
      setCache(prev => new Map(prev.set(cacheKey, newCacheEntry)))

      setTemplates(templateData)
      setMetrics(prev => ({
        ...prev,
        loadTime: performance.now() - requestStartTime.current,
        totalRequests: prev.totalRequests + 1,
        cacheHitRate: (prev.cachedRequests / (prev.totalRequests + 1)) * 100
      }))

      return templateData

    } catch (err) {
      console.error('Template loading error:', err)
      setError(err.message)
      return []
    } finally {
      setLoading(false)
    }
  }, [cache])

  /**
   * Preload templates based on usage patterns
   */
  const preloadTemplates = useCallback(async (predictiveFilters) => {
    const preloadPromises = predictiveFilters.map(filters => 
      loadTemplates(filters).catch(() => null) // Fail silently for preloads
    )
    
    await Promise.allSettled(preloadPromises)
  }, [loadTemplates])

  /**
   * Clear cache when needed
   */
  const clearCache = useCallback(() => {
    setCache(new Map())
    setMetrics(prev => ({ ...prev, cacheHitRate: 0, cachedRequests: 0, totalRequests: 0 }))
  }, [])

  return {
    templates,
    loading,
    error,
    metrics,
    loadTemplates,
    preloadTemplates,
    clearCache
  }
}

/**
 * Real-time analytics performance optimization
 */
export function useAnalyticsPerformance(options = {}) {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageResponseTime: 0,
    totalRequests: 0,
    errorRate: 0,
    dataFreshness: 0
  })

  const eventSource = useRef(null)
  const retryCount = useRef(0)
  const maxRetries = options.maxRetries || 3
  const retryDelay = options.retryDelay || 5000

  /**
   * Establish real-time analytics connection
   */
  const connectAnalytics = useCallback(() => {
    if (eventSource.current) {
      eventSource.current.close()
    }

    setConnectionStatus('connecting')
    
    const authToken = localStorage.getItem('auth_token')
    const url = `/api/customization/analytics/stream?token=${authToken}`

    eventSource.current = new EventSource(url)

    eventSource.current.onopen = () => {
      setConnectionStatus('connected')
      setIsStreaming(true)
      retryCount.current = 0
    }

    eventSource.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        setAnalyticsData(prevData => ({
          ...prevData,
          ...data,
          lastUpdate: Date.now()
        }))

        // Update performance metrics
        setPerformanceMetrics(prev => ({
          ...prev,
          totalRequests: prev.totalRequests + 1,
          dataFreshness: Date.now() - (data.generated_at ? new Date(data.generated_at).getTime() : Date.now())
        }))

      } catch (error) {
        console.error('Analytics data parsing error:', error)
      }
    }

    eventSource.current.onerror = () => {
      setConnectionStatus('error');
      setIsStreaming(false);

      if (retryCount.current < maxRetries) {
        retryCount.current++;
        setTimeout(() => {
          connectAnalytics();
        }, retryDelay * retryCount.current);
      } else {
        setConnectionStatus('failed');
        console.error('Max analytics connection retries exceeded');
      }
    }

  }, [maxRetries, retryDelay]);

  /**
   * Disconnect analytics stream
   */
  const disconnectAnalytics = useCallback(() => {
    if (eventSource.current) {
      eventSource.current.close();
      eventSource.current = null;
    }
    setIsStreaming(false);
    setConnectionStatus('disconnected');
  }, []);

  /**
   * Request one-time analytics update
   */
  const refreshAnalytics = useCallback(async (dateRange = '24h') => {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`/api/customization/analytics?date_range=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Analytics fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      const responseTime = performance.now() - startTime;

      setAnalyticsData(data.analytics);
      setPerformanceMetrics(prev => ({
        averageResponseTime: (prev.averageResponseTime * prev.totalRequests + responseTime) / (prev.totalRequests + 1),
        totalRequests: prev.totalRequests + 1,
        errorRate: prev.errorRate, // No error, so rate stays same
        dataFreshness: Date.now() - new Date(data.metadata.generated_at).getTime()
      }))

      return data.analytics

    } catch (error) {
      console.error('Analytics refresh error:', error)
      setPerformanceMetrics(prev => ({
        ...prev,
        totalRequests: prev.totalRequests + 1,
        errorRate: ((prev.errorRate * (prev.totalRequests - 1)) + 1) / prev.totalRequests
      }))
      throw error
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource.current) {
        eventSource.current.close()
      }
    }
  }, [])

  return {
    analyticsData,
    isStreaming,
    connectionStatus,
    performanceMetrics,
    connectAnalytics,
    disconnectAnalytics,
    refreshAnalytics
  }
}

/**
 * Virtual scrolling for large template lists
 */
export function useVirtualizedTemplates(templates, itemHeight = 120) {
  const [visibleItems, setVisibleItems] = useState([])
  const [scrollPosition, setScrollPosition] = useState(0)
  const containerRef = useRef(null)
  const [containerHeight, setContainerHeight] = useState(600)

  // Calculate visible items based on scroll position
  const calculateVisibleItems = useCallback(() => {
    if (!templates || templates.length === 0) {
      setVisibleItems([])
      return
    }

    const startIndex = Math.floor(scrollPosition / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      templates.length
    )

    const visible = templates.slice(startIndex, endIndex).map((template, index) => ({
      ...template,
      virtualIndex: startIndex + index,
      offsetY: (startIndex + index) * itemHeight
    }))

    setVisibleItems(visible)
  }, [templates, scrollPosition, containerHeight, itemHeight])

  // Throttled scroll handler
  const handleScroll = useCallback(
    throttle((event) => {
      setScrollPosition(event.target.scrollTop)
    }, 16), // ~60fps
    []
  )

  // Recalculate on dependencies change
  useEffect(() => {
    calculateVisibleItems()
  }, [calculateVisibleItems])

  // Observe container resize
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const totalHeight = templates ? templates.length * itemHeight : 0
  const offsetY = visibleItems.length > 0 ? visibleItems[0].offsetY : 0

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  }
}

/**
 * Optimized A/B testing performance tracking
 */
export function useABTestingPerformance() {
  const [experiments, setExperiments] = useState([])
  const [activeExperiment, setActiveExperiment] = useState(null)
  const [variantAssignments, setVariantAssignments] = useState(new Map())
  const [trackingQueue, setTrackingQueue] = useState([])
  const [batchMetrics, setBatchMetrics] = useState({
    eventsQueued: 0,
    eventsSent: 0,
    batchesSent: 0,
    averageBatchSize: 0
  })

  const trackingInterval = useRef(null)
  const batchSize = 10 // Events per batch
  const batchInterval = 5000 // 5 seconds

  /**
   * Assign user to experiment variant with caching
   */
  const assignToVariant = useCallback((experimentId, userId) => {
    const cacheKey = `${experimentId}-${userId}`
    
    if (variantAssignments.has(cacheKey)) {
      return variantAssignments.get(cacheKey)
    }

    // Simple hash-based assignment for consistency
    const hash = hashCode(`${experimentId}-${userId}`)
    const variantIndex = Math.abs(hash) % 2 // Assuming 2 variants
    const variant = variantIndex === 0 ? 'control' : 'test'

    setVariantAssignments(prev => new Map(prev.set(cacheKey, variant)))
    
    return variant
  }, [variantAssignments])

  /**
   * Queue tracking event for batch processing
   */
  const trackEvent = useCallback((experimentId, eventType, metadata = {}) => {
    const event = {
      experiment_id: experimentId,
      event_type: eventType,
      metadata,
      timestamp: Date.now(),
      user_id: getCurrentUserId(), // Implement this based on your auth system
      session_id: getSessionId() // Implement this based on your session management
    }

    setTrackingQueue(prev => [...prev, event])
    setBatchMetrics(prev => ({ ...prev, eventsQueued: prev.eventsQueued + 1 }))
  }, [])

  /**
   * Process tracking queue in batches
   */
  const processBatchQueue = useCallback(async () => {
    if (trackingQueue.length === 0) return

    const batch = trackingQueue.slice(0, batchSize)
    const remainingQueue = trackingQueue.slice(batchSize)

    try {
      const response = await fetch('/api/customization/ab-testing/track-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ events: batch })
      })

      if (response.ok) {
        setTrackingQueue(remainingQueue)
        setBatchMetrics(prev => ({
          ...prev,
          eventsSent: prev.eventsSent + batch.length,
          batchesSent: prev.batchesSent + 1,
          averageBatchSize: ((prev.averageBatchSize * (prev.batchesSent - 1)) + batch.length) / prev.batchesSent
        }))
      } else {
        console.error('Batch tracking failed:', response.statusText)
      }

    } catch (error) {
      console.error('Batch processing error:', error)
    }
  }, [trackingQueue, batchSize])

  // Start batch processing interval
  useEffect(() => {
    trackingInterval.current = setInterval(processBatchQueue, batchInterval)
    
    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current)
      }
    }
  }, [processBatchQueue, batchInterval])

  /**
   * Get experiment results with caching
   */
  const getExperimentResults = useCallback(async (experimentId) => {
    try {
      const response = await fetch(`/api/customization/ab-testing/results/${experimentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error(`Results fetch failed: ${response.statusText}`)
      }

      return await response.json()

    } catch (error) {
      console.error('Experiment results error:', error)
      throw error
    }
  }, [])

  return {
    experiments,
    setExperiments,
    activeExperiment,
    setActiveExperiment,
    assignToVariant,
    trackEvent,
    getExperimentResults,
    batchMetrics,
    trackingQueue: trackingQueue.length
  }
}

/**
 * Performance monitoring for entire customization system
 */
export function useCustomizationSystemPerformance() {
  const [systemMetrics, setSystemMetrics] = useState({
    memoryUsage: 0,
    renderTime: 0,
    apiResponseTimes: [],
    errorCount: 0,
    cacheEfficiency: 0
  })
  const [performanceEntries, setPerformanceEntries] = useState([])

  const metricsInterval = useRef(null)
  const performanceObserver = useRef(null)

  /**
   * Start performance monitoring
   */
  const startMonitoring = useCallback(() => {
    // Memory usage monitoring
    if ('memory' in performance) {
      metricsInterval.current = setInterval(() => {
        const memory = performance.memory
        setSystemMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
        }))
      }, 5000)
    }

    // Performance observer for navigation and resource timing
    if ('PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        setPerformanceEntries(prev => [...prev, ...entries].slice(-100)) // Keep last 100 entries
        
        // Calculate API response times
        const apiEntries = entries.filter(entry => 
          entry.name.includes('/api/customization')
        )
        
        if (apiEntries.length > 0) {
          setSystemMetrics(prev => ({
            ...prev,
            apiResponseTimes: [...prev.apiResponseTimes, ...apiEntries.map(e => e.duration)].slice(-50)
          }))
        }
      })

      performanceObserver.current.observe({ entryTypes: ['navigation', 'resource', 'measure'] })
    }
  }, [])

  /**
   * Stop performance monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (metricsInterval.current) {
      clearInterval(metricsInterval.current)
    }
    
    if (performanceObserver.current) {
      performanceObserver.current.disconnect()
    }
  }, [])

  /**
   * Generate performance report
   */
  const generateReport = useCallback(() => {
    const avgApiResponseTime = systemMetrics.apiResponseTimes.length > 0 
      ? systemMetrics.apiResponseTimes.reduce((a, b) => a + b, 0) / systemMetrics.apiResponseTimes.length
      : 0

    return {
      summary: {
        memory_usage_percentage: Math.round(systemMetrics.memoryUsage * 100),
        average_api_response_time: Math.round(avgApiResponseTime),
        total_errors: systemMetrics.errorCount,
        cache_efficiency: Math.round(systemMetrics.cacheEfficiency)
      },
      detailed_metrics: systemMetrics,
      performance_entries: performanceEntries.slice(-10), // Last 10 entries
      recommendations: generatePerformanceRecommendations(systemMetrics, avgApiResponseTime)
    }
  }, [systemMetrics, performanceEntries])

  // Auto-start monitoring on mount
  useEffect(() => {
    startMonitoring()
    return stopMonitoring
  }, [startMonitoring, stopMonitoring])

  return {
    systemMetrics,
    performanceEntries,
    startMonitoring,
    stopMonitoring,
    generateReport
  }
}

// Utility functions
function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

function getCurrentUserId() {
  // Implement based on your auth system
  return localStorage.getItem('user_id') || 'anonymous'
}

function getSessionId() {
  // Implement based on your session management
  let sessionId = sessionStorage.getItem('session_id')
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    sessionStorage.setItem('session_id', sessionId)
  }
  return sessionId
}

function generatePerformanceRecommendations(metrics, avgResponseTime) {
  const recommendations = []

  if (metrics.memoryUsage > 0.8) {
    recommendations.push({
      type: 'memory',
      priority: 'high',
      message: 'High memory usage detected. Consider implementing more aggressive cache cleanup.'
    })
  }

  if (avgResponseTime > 1000) {
    recommendations.push({
      type: 'network',
      priority: 'medium',
      message: 'API response times are slow. Consider implementing request caching or optimizing endpoints.'
    })
  }

  if (metrics.errorCount > 10) {
    recommendations.push({
      type: 'reliability',
      priority: 'high',
      message: 'High error count detected. Review error logs and implement better error handling.'
    })
  }

  if (metrics.cacheEfficiency < 0.5) {
    recommendations.push({
      type: 'caching',
      priority: 'medium',
      message: 'Low cache efficiency. Review caching strategy and cache invalidation policies.'
    })
  }

  return recommendations
}