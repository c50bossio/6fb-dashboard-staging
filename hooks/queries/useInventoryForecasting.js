import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

/**
 * Hook for getting inventory demand forecasts and predictions
 */
export function useInventoryForecasting(shopId, options = {}) {
  const { 
    horizon = 30, 
    productId, 
    includeRecommendations = true,
    enabled = true 
  } = options

  return useQuery({
    queryKey: queryKeys.inventory.forecasting(shopId, { horizon, productId, includeRecommendations }),
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId,
        horizon: horizon.toString(),
        includeRecommendations: includeRecommendations.toString()
      })

      if (productId) params.append('productId', productId)

      const response = await fetch(`/api/inventory/forecasting?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory forecasts: ${response.status}`)
      }

      return response.json()
    },
    enabled: enabled && !!shopId,
    staleTime: 10 * 60 * 1000, // 10 minutes - forecasts change slowly
    retry: 2,
  })
}

/**
 * Hook for getting reorder recommendations
 */
export function useReorderRecommendations(shopId, options = {}) {
  const { 
    status, 
    urgency, 
    limit = 20,
    enabled = true 
  } = options

  return useQuery({
    queryKey: queryKeys.inventory.reorderRecommendations(shopId, { status, urgency, limit }),
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId,
        limit: limit.toString()
      })

      if (status) params.append('status', status)
      if (urgency) params.append('urgency', urgency)

      const response = await fetch(`/api/inventory/reorder-recommendations?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reorder recommendations: ${response.status}`)
      }

      return response.json()
    },
    enabled: enabled && !!shopId,
    staleTime: 5 * 60 * 1000, // 5 minutes - recommendations can change frequently
    retry: 2,
  })
}

/**
 * Hook for getting inventory alerts
 */
export function useInventoryAlerts(shopId, options = {}) {
  const { 
    alertType, 
    severity, 
    status = 'active', 
    limit = 50,
    enabled = true 
  } = options

  return useQuery({
    queryKey: queryKeys.inventory.alerts(shopId, { alertType, severity, status, limit }),
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId,
        status,
        limit: limit.toString()
      })

      if (alertType) params.append('alertType', alertType)
      if (severity) params.append('severity', severity)

      const response = await fetch(`/api/inventory/alerts?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory alerts: ${response.status}`)
      }

      return response.json()
    },
    enabled: enabled && !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes - alerts should be fresh
    retry: 2,
  })
}

/**
 * Hook for seasonal inventory planning data
 */
export function useSeasonalInventoryPlanning(shopId, options = {}) {
  const { year, season, enabled = true } = options
  const currentYear = year || new Date().getFullYear()

  return useQuery({
    queryKey: queryKeys.inventory.seasonalPlanning(shopId, currentYear, season),
    queryFn: async () => {
      // This would be a separate endpoint in a full implementation
      // For now, returning a mock structure
      return {
        success: true,
        seasonal_plans: [],
        year: currentYear,
        season: season || 'all',
        recommendations: []
      }
    },
    enabled: enabled && !!shopId,
    staleTime: 60 * 60 * 1000, // 1 hour - seasonal data changes infrequently
    retry: 1,
  })
}

/**
 * Hook for stock level alerts with real-time updates
 */
export function useStockLevelAlerts(shopId, options = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: queryKeys.inventory.stockLevels(shopId),
    queryFn: async () => {
      // Get current alerts filtered for stock-related issues
      const response = await fetch(`/api/inventory/alerts?shopId=${shopId}&alertType=low_stock&status=active`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stock alerts: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        low_stock_alerts: data.alerts || [],
        summary: data.summary
      }
    },
    enabled: enabled && !!shopId,
    staleTime: 30 * 1000, // 30 seconds - stock levels should be very fresh
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 2,
  })
}

/**
 * Mutation hook for generating new forecasts
 */
export function useGenerateForecasts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, forecastDays, recalculateAll, productIds }) => {
      const response = await fetch('/api/inventory/forecasting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId,
          forecastDays,
          recalculateAll,
          productIds,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate forecasts: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant forecasting queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.forecasting(variables.shopId)
      })
      
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.reorderRecommendations(variables.shopId)
      })
    },
  })
}

/**
 * Mutation hook for managing reorder recommendations
 */
export function useManageReorderRecommendations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ action, recommendationIds, shopId, productIds }) => {
      const response = await fetch('/api/inventory/reorder-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          recommendationIds,
          shopId,
          productIds,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} recommendations: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate recommendations queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.reorderRecommendations(variables.shopId)
      })
      
      // If generating new recommendations, also invalidate forecasts
      if (variables.action === 'generate') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.forecasting(variables.shopId)
        })
      }
    },
  })
}

/**
 * Mutation hook for managing inventory alerts
 */
export function useManageInventoryAlerts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ action, alertIds, shopId, alertData }) => {
      const response = await fetch('/api/inventory/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          alertIds,
          shopId,
          alertData,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} alerts: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate alerts queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.alerts(variables.shopId)
      })
      
      // Also invalidate stock level alerts
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.stockLevels(variables.shopId)
      })
    },
  })
}

/**
 * Hook for inventory performance metrics
 */
export function useInventoryPerformance(shopId, options = {}) {
  const { period = 'last_30_days', enabled = true } = options

  return useQuery({
    queryKey: queryKeys.inventory.performance(shopId, period),
    queryFn: async () => {
      // This would be a dedicated performance endpoint
      // For now, combine data from existing endpoints
      const [forecastData, alertsData, reorderData] = await Promise.all([
        fetch(`/api/inventory/forecasting?shopId=${shopId}&includeRecommendations=true`).then(r => r.json()),
        fetch(`/api/inventory/alerts?shopId=${shopId}&status=active`).then(r => r.json()),
        fetch(`/api/inventory/reorder-recommendations?shopId=${shopId}&status=pending`).then(r => r.json())
      ])

      // Calculate performance metrics
      const performance = {
        forecast_accuracy: calculateForecastAccuracy(forecastData.forecasts || []),
        alert_resolution_rate: calculateAlertResolutionRate(alertsData.alerts || []),
        stockout_prevention: calculateStockoutPrevention(reorderData.recommendations || []),
        inventory_turnover: calculateInventoryTurnover(forecastData.forecasts || []),
        cost_optimization: calculateCostOptimization(reorderData.recommendations || [])
      }

      return {
        success: true,
        performance,
        period,
        shop_id: shopId,
        generated_at: new Date().toISOString()
      }
    },
    enabled: enabled && !!shopId,
    staleTime: 15 * 60 * 1000, // 15 minutes - performance metrics change slowly
    retry: 1,
  })
}

/**
 * Combined hook for inventory dashboard data
 */
export function useInventoryDashboard(shopId) {
  const forecasting = useInventoryForecasting(shopId, { horizon: 30 })
  const alerts = useInventoryAlerts(shopId, { status: 'active', limit: 10 })
  const reorderRecommendations = useReorderRecommendations(shopId, { status: 'pending', limit: 10 })
  const stockLevels = useStockLevelAlerts(shopId)

  return {
    forecasting: forecasting.data,
    alerts: alerts.data,
    reorderRecommendations: reorderRecommendations.data,
    stockLevels: stockLevels.data,
    isLoading: forecasting.isLoading || alerts.isLoading || reorderRecommendations.isLoading || stockLevels.isLoading,
    error: forecasting.error || alerts.error || reorderRecommendations.error || stockLevels.error,
    refetch: () => {
      forecasting.refetch()
      alerts.refetch()
      reorderRecommendations.refetch()
      stockLevels.refetch()
    }
  }
}

// Helper functions for performance calculations
function calculateForecastAccuracy(forecasts) {
  // Mock calculation - in production, this would compare predictions to actual results
  const totalForecasts = forecasts.length
  const accurateForecasts = forecasts.filter(f => f.confidence_level > 0.7).length
  return totalForecasts > 0 ? (accurateForecasts / totalForecasts * 100).toFixed(1) : 0
}

function calculateAlertResolutionRate(alerts) {
  // Mock calculation
  return alerts.length > 0 ? Math.random() * 30 + 70 : 0 // 70-100%
}

function calculateStockoutPrevention(recommendations) {
  // Count how many critical stockout situations were prevented
  const criticalRecommendations = recommendations.filter(r => 
    r.insights?.urgency_level === 'critical' || r.insights?.urgency_level === 'high'
  ).length
  return criticalRecommendations
}

function calculateInventoryTurnover(forecasts) {
  // Simple inventory turnover estimation
  const totalDemand = forecasts.reduce((sum, f) => sum + f.predicted_demand, 0)
  const avgStock = forecasts.reduce((sum, f) => sum + (f.products?.current_stock || 0), 0) / Math.max(forecasts.length, 1)
  
  return avgStock > 0 ? (totalDemand / avgStock * 12).toFixed(1) : 0 // Annualized turnover
}

function calculateCostOptimization(recommendations) {
  // Sum up potential cost savings from following recommendations
  return recommendations.reduce((sum, r) => sum + (r.total_cost_optimization || 0), 0)
}