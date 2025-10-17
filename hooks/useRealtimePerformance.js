/**
 * Performance monitoring hook for real-time subscription system
 * Provides metrics and connection status for the optimized subscription manager
 */

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'
// Simple console logging to prevent circular dependencies
const logger = {
  error: (...args) => console.error('[REALTIME_PERFORMANCE]', ...args),
  warn: (...args) => console.warn('[REALTIME_PERFORMANCE]', ...args),
  info: (...args) => console.info('[REALTIME_PERFORMANCE]', ...args)
}
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

const performanceLogger = logger

/**
 * Monitor real-time subscription performance
 */
export function useRealtimePerformance(refreshInterval = 5000) {
  const [connectionStatus, setConnectionStatus] = useState('unknown')
  const [lastUpdate, setLastUpdate] = useState(null)

  // Get subscription metrics
  const metricsQuery = useQuery({
    queryKey: ['realtime-metrics'],
    queryFn: () => {
      const subscriptionManager = createClient().getSubscriptionManager()
      return subscriptionManager.getMetrics()
    },
    refetchInterval: refreshInterval,
    staleTime: 1000, // Always fresh for performance monitoring
    gcTime: 60000, // Keep for 1 minute
  })

  // Monitor connection status
  useEffect(() => {
    const interval = setInterval(() => {
      const subscriptionManager = createClient().getSubscriptionManager()
      const isOnline = subscriptionManager.isOnline()
      const newStatus = isOnline ? 'connected' : 'disconnected'
      
      if (newStatus !== connectionStatus) {
        setConnectionStatus(newStatus)
        setLastUpdate(new Date())
        
        performanceLogger.info('Connection status changed', { 
          status: newStatus,
          metrics: subscriptionManager.getMetrics()
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [connectionStatus])

  // Calculate performance insights
  const insights = useCallback((metrics) => {
    if (!metrics) return null

    const connectionEfficiency = metrics.activeConnections > 0 
      ? (metrics.subscriptionsWithCallbacks / metrics.activeConnections) 
      : 0

    const messageRate = metrics.messagesReceived > 0 
      ? metrics.messagesReceived / Math.max(1, Math.floor((Date.now() - (metrics.lastConnected || Date.now())) / 1000))
      : 0

    return {
      connectionEfficiency: Math.round(connectionEfficiency * 100) / 100,
      messageRate: Math.round(messageRate * 100) / 100,
      averageLatency: Math.round(metrics.averageLatency * 100) / 100,
      isHealthy: connectionEfficiency >= 2 && metrics.averageLatency < 100, // 2+ subscriptions per connection, <100ms latency
      recommendedOptimizations: getOptimizationRecommendations(metrics, connectionEfficiency)
    }
  }, [])

  return {
    metrics: metricsQuery.data,
    connectionStatus,
    lastUpdate,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    insights: insights(metricsQuery.data),
    refetch: metricsQuery.refetch
  }
}

/**
 * Get optimization recommendations based on metrics
 */
function getOptimizationRecommendations(metrics, connectionEfficiency) {
  const recommendations = []

  if (connectionEfficiency < 2) {
    recommendations.push({
      type: 'warning',
      message: 'Low connection efficiency - consider consolidating subscriptions',
      priority: 'high'
    })
  }

  if (metrics.averageLatency > 100) {
    recommendations.push({
      type: 'warning',
      message: 'High latency detected - check network connection',
      priority: 'medium'
    })
  }

  if (metrics.reconnectAttempts > 5) {
    recommendations.push({
      type: 'error',
      message: 'Frequent reconnections - investigate connection stability',
      priority: 'high'
    })
  }

  if (metrics.activeConnections > 10) {
    recommendations.push({
      type: 'info',
      message: 'High number of connections - monitor resource usage',
      priority: 'low'
    })
  }

  return recommendations
}

/**
 * Simple connection status hook for UI indicators
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(false)
  const [lastConnected, setLastConnected] = useState(null)

  useEffect(() => {
    const checkStatus = () => {
      const subscriptionManager = createClient().getSubscriptionManager()
      const online = subscriptionManager.isOnline()
      
      if (online !== isOnline) {
        setIsOnline(online)
        if (online) {
          setLastConnected(new Date())
        }
      }
    }

    // Check immediately
    checkStatus()

    // Check every 2 seconds
    const interval = setInterval(checkStatus, 2000)
    
    return () => clearInterval(interval)
  }, [isOnline])

  return {
    isOnline,
    lastConnected,
    status: isOnline ? 'connected' : 'disconnected'
  }
}

/**
 * Hook to track subscription count for a specific shop
 */
export function useShopSubscriptionCount(barbershopId) {
  const [subscriptionCount, setSubscriptionCount] = useState(0)

  useEffect(() => {
    if (!barbershopId) {
      setSubscriptionCount(0)
      return
    }

    const interval = setInterval(() => {
      const subscriptionManager = createClient().getSubscriptionManager()
      const metrics = subscriptionManager.getMetrics()
      
      // Count subscriptions for this shop
      const shopSubscriptions = metrics.activeSubscriptionKeys?.filter(key => 
        key.endsWith(`_${barbershopId}`)
      ).length || 0
      
      setSubscriptionCount(shopSubscriptions)
    }, 3000)

    return () => clearInterval(interval)
  }, [barbershopId])

  return subscriptionCount
}

/**
 * Performance benchmark hook - measures improvement over time
 */
export function usePerformanceBenchmark() {
  const [baseline, setBaseline] = useState(null)
  const { metrics } = useRealtimePerformance(10000) // Every 10 seconds

  useEffect(() => {
    // Set baseline on first load
    if (metrics && !baseline) {
      setBaseline({
        timestamp: Date.now(),
        activeConnections: metrics.activeConnections,
        totalSubscriptions: metrics.totalSubscriptions,
        averageLatency: metrics.averageLatency
      })
    }
  }, [metrics, baseline])

  const benchmark = useCallback(() => {
    if (!metrics || !baseline) return null

    const now = Date.now()
    const timeElapsed = (now - baseline.timestamp) / 1000 / 60 // minutes

    return {
      connectionReduction: baseline.activeConnections - metrics.activeConnections,
      connectionReductionPercent: baseline.activeConnections > 0 
        ? Math.round(((baseline.activeConnections - metrics.activeConnections) / baseline.activeConnections) * 100)
        : 0,
      subscriptionIncrease: metrics.totalSubscriptions - baseline.totalSubscriptions,
      latencyImprovement: baseline.averageLatency - metrics.averageLatency,
      efficiencyRatio: metrics.activeConnections > 0 
        ? Math.round((metrics.totalSubscriptions / metrics.activeConnections) * 100) / 100
        : 0,
      timeElapsed: Math.round(timeElapsed * 100) / 100,
      isImproved: (baseline.activeConnections - metrics.activeConnections) > 0 &&
                   (baseline.averageLatency - metrics.averageLatency) > 0
    }
  }, [metrics, baseline])

  return {
    metrics,
    baseline,
    benchmark: benchmark(),
    resetBaseline: () => setBaseline(null)
  }
}