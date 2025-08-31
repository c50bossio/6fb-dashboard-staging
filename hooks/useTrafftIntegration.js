/**
 * Custom React Hook for Trafft Integration
 * Manages Trafft API interactions and data synchronization
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

export function useTrafftIntegration(barbershopId = 'default') {
  const [integration, setIntegration] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [syncHistory, setSyncHistory] = useState([])
  const [businessAnalytics, setBusinessAnalytics] = useState(null)

  /**
   * Check integration status
   */
  const checkIntegrationStatus = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/integrations/trafft/auth?barbershopId=${barbershopId}`)
      const data = await response.json()
      
      if (response.ok) {
        setIntegration(data.integration)
        return data.integration
      } else {
        setError(data.error)
        return null
      }
    } catch (err) {
      setError('Failed to check integration status')
      return null
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  /**
   * Authenticate with Trafft
   */
  const authenticate = useCallback(async (apiKey, apiSecret) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/integrations/trafft/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          apiSecret,
          barbershopId
        })
      })

      const data = await response.json()

      if (response.ok) {
        await checkIntegrationStatus()
        return { success: true, data }
      } else {
        setError(data.error)
        return { success: false, error: data.error }
      }
    } catch (err) {
      const errorMsg = 'Failed to authenticate with Trafft'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [barbershopId, checkIntegrationStatus])

  /**
   * Disconnect integration
   */
  const disconnect = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/integrations/trafft/auth', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ barbershopId })
      })

      if (response.ok) {
        setIntegration(null)
        setSyncHistory([])
        setBusinessAnalytics(null)
        return { success: true }
      } else {
        const data = await response.json()
        setError(data.error)
        return { success: false, error: data.error }
      }
    } catch (err) {
      const errorMsg = 'Failed to disconnect integration'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  /**
   * Sync data from Trafft
   */
  const sync = useCallback(async (syncType = 'full', dateFrom = null, dateTo = null) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/integrations/trafft/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId,
          syncType,
          dateFrom,
          dateTo
        })
      })

      const data = await response.json()

      if (response.ok) {
        setBusinessAnalytics(data.analytics)
        await getSyncHistory() // Refresh sync history
        return { success: true, data }
      } else {
        setError(data.error)
        return { success: false, error: data.error }
      }
    } catch (err) {
      const errorMsg = 'Failed to sync data'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  /**
   * Get sync history
   */
  const getSyncHistory = useCallback(async (limit = 10) => {
    try {
      const response = await fetch(`/api/integrations/trafft/sync?barbershopId=${barbershopId}&limit=${limit}`)
      const data = await response.json()
      
      if (response.ok) {
        setSyncHistory(data.syncHistory || [])
        return data.syncHistory
      } else {
        setError(data.error)
        return []
      }
    } catch (err) {
      setError('Failed to get sync history')
      return []
    }
  }, [barbershopId])

  /**
   * Get business analytics
   */
  const getAnalytics = useCallback(async (dateFrom = null, dateTo = null) => {
    try {
      const syncResult = await sync('analytics', dateFrom, dateTo)
      if (syncResult.success) {
        return syncResult.data.analytics
      }
      return null
    } catch (err) {
      setError('Failed to get analytics')
      return null
    }
  }, [sync])

  useEffect(() => {
    checkIntegrationStatus()
    getSyncHistory()
  }, [checkIntegrationStatus, getSyncHistory])

  useEffect(() => {
    if (!integration) return

    const interval = setInterval(() => {
      checkIntegrationStatus()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [integration, checkIntegrationStatus])

  return {
    integration,
    loading,
    error,
    syncHistory,
    businessAnalytics,
    
    isConnected: integration?.status === 'active',
    lastSync: syncHistory[0]?.syncedAt || integration?.lastSyncAt,
    
    authenticate,
    disconnect,
    sync,
    getSyncHistory,
    getAnalytics,
    checkIntegrationStatus,
    
    clearError: () => setError(null)
  }
}

/**
 * Hook for real-time Trafft data updates
 */
export function useTrafftRealtimeData(barbershopId = 'default') {
  const [realtimeData, setRealtimeData] = useState({
    appointments: [],
    customers: [],
    todayStats: {
      appointments: 0,
      revenue: 0,
      newClients: 0
    }
  })
  const [lastUpdate, setLastUpdate] = useState(null)

  const { integration, sync } = useTrafftIntegration(barbershopId)

  /**
   * Simulate real-time updates (in production, use WebSocket or polling)
   */
  useEffect(() => {
    if (!integration?.status === 'active') return

    const pollForUpdates = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const result = await sync('appointments', today, today)
        
        if (result.success) {
          const data = result.data
          setRealtimeData({
            appointments: data.analytics?.rawData?.appointments || [],
            customers: data.analytics?.rawData?.customers || [],
            todayStats: {
              appointments: data.summary?.appointments || 0,
              revenue: data.summary?.totalRevenue || 0,
              newClients: data.analytics?.clients?.new || 0
            }
          })
          setLastUpdate(new Date())
        }
      } catch (error) {
        console.error('Error polling for updates:', error)
      }
    }

    pollForUpdates()

    const interval = setInterval(pollForUpdates, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [integration, sync])

  return {
    realtimeData,
    lastUpdate,
    isUpdating: false // Could add loading state here
  }
}

/**
 * Hook for Trafft business insights and AI context
 */
export function useTrafftBusinessInsights(barbershopId = 'default') {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState([])

  const { businessAnalytics, getAnalytics } = useTrafftIntegration(barbershopId)

  /**
   * Generate business insights from analytics data
   */
  const generateInsights = useCallback((analyticsData) => {
    if (!analyticsData) return null

    const insights = {
      performance: {
        revenue: {
          current: analyticsData.revenue?.total || 0,
          target: 15000, // Could be user-configurable
          progress: ((analyticsData.revenue?.total || 0) / 15000) * 100,
          trend: 'up' // Could calculate from historical data
        },
        clients: {
          total: analyticsData.clients?.total || 0,
          new: analyticsData.clients?.new || 0,
          retention: analyticsData.clients?.retentionRate || 0
        },
        capacity: {
          utilization: analyticsData.businessInsights?.capacityUtilization?.utilizationRate || 0,
          availableSlots: analyticsData.businessInsights?.capacityUtilization?.availableSlots || 0
        }
      },
      opportunities: {
        pricing: analyticsData.businessInsights?.pricingOptimization?.slice(0, 3) || [],
        services: analyticsData.services?.popular?.slice(0, 3) || [],
        scheduling: analyticsData.scheduling?.peakHours || []
      },
      recommendations: [
        ...(analyticsData.businessInsights?.revenueGrowthPotential?.recommendations || []),
        generateSmartRecommendations(analyticsData)
      ].flat().filter(Boolean).slice(0, 5)
    }

    const newAlerts = []
    
    if (insights.performance.capacity.utilization < 50) {
      newAlerts.push({
        type: 'warning',
        title: 'Low Capacity Utilization',
        message: `Only ${insights.performance.capacity.utilization}% of capacity is being used`,
        action: 'Consider marketing campaigns or schedule optimization'
      })
    }

    if (insights.performance.clients.retention < 60) {
      newAlerts.push({
        type: 'alert',
        title: 'Client Retention Issue',
        message: `Client retention rate is ${insights.performance.clients.retention}%`,
        action: 'Implement loyalty programs or follow-up campaigns'
      })
    }

    if (insights.performance.revenue.progress < 50) {
      newAlerts.push({
        type: 'info',
        title: 'Revenue Goal Tracking',
        message: `${insights.performance.revenue.progress.toFixed(1)}% of monthly revenue goal achieved`,
        action: 'Focus on premium services or increase appointment frequency'
      })
    }

    setAlerts(newAlerts)
    return insights
  }, [])

  /**
   * Generate smart recommendations based on data patterns
   */
  const generateSmartRecommendations = (analyticsData) => {
    const recommendations = []

    if (analyticsData.revenue?.avgTicket < 60) {
      recommendations.push('Consider introducing premium services to increase average ticket value')
    }

    if (analyticsData.clients?.new > analyticsData.clients?.returning) {
      recommendations.push('Focus on client retention strategies to build a loyal customer base')
    }

    if (analyticsData.scheduling?.peakHours?.length > 0) {
      const peakHour = analyticsData.scheduling.peakHours[0]?.hour
      if (peakHour) {
        recommendations.push(`Peak demand at ${peakHour}:00 - consider premium pricing for peak hours`)
      }
    }

    return recommendations
  }

  useEffect(() => {
    if (businessAnalytics) {
      setLoading(true)
      const newInsights = generateInsights(businessAnalytics)
      setInsights(newInsights)
      setLoading(false)
    }
  }, [businessAnalytics, generateInsights])

  /**
   * Refresh insights with new date range
   */
  const refreshInsights = useCallback(async (dateFrom, dateTo) => {
    setLoading(true)
    const analyticsData = await getAnalytics(dateFrom, dateTo)
    if (analyticsData) {
      const newInsights = generateInsights(analyticsData)
      setInsights(newInsights)
    }
    setLoading(false)
  }, [getAnalytics, generateInsights])

  return {
    insights,
    alerts,
    loading,
    refreshInsights
  }
}

export default useTrafftIntegration