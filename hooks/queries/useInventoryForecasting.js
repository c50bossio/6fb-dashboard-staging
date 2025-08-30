import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

/**
 * Hook for getting inventory demand forecasts and predictions
 */
export function useInventoryForecasting(barbershopId, options = {}) {
  const { 
    horizon = 30, 
    productId, 
    includeRecommendations = true,
    enabled = true 
  } = options

  return useQuery({
    queryKey: queryKeys.inventory.forecasting(barbershopId, { horizon, productId, includeRecommendations }),
    queryFn: async () => {
      const params = new URLSearchParams({
        barbershopId,
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
    enabled: enabled && !!barbershopId,
    staleTime: 10 * 60 * 1000, // 10 minutes - forecasts change slowly
    retry: 2,
  })
}

/**
 * Hook for getting reorder recommendations
 */
export function useReorderRecommendations(barbershopId, options = {}) {
  const { 
    status, 
    urgency, 
    limit = 20,
    enabled = true 
  } = options

  return useQuery({
    queryKey: queryKeys.inventory.reorderRecommendations(barbershopId, { status, urgency, limit }),
    queryFn: async () => {
      const params = new URLSearchParams({
        barbershopId,
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
    enabled: enabled && !!barbershopId,
    staleTime: 5 * 60 * 1000, // 5 minutes - recommendations can change frequently
    retry: 2,
  })
}

/**
 * Hook for getting inventory alerts
 */
export function useInventoryAlerts(barbershopId, options = {}) {
  const { 
    alertType, 
    severity, 
    status = 'active', 
    limit = 50,
    enabled = true 
  } = options

  return useQuery({
    queryKey: queryKeys.inventory.alerts(barbershopId, { alertType, severity, status, limit }),
    queryFn: async () => {
      const params = new URLSearchParams({
        barbershopId,
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
    enabled: enabled && !!barbershopId,
    staleTime: 2 * 60 * 1000, // 2 minutes - alerts should be fresh
    retry: 2,
  })
}

/**
 * Hook for seasonal inventory planning data
 */
export function useSeasonalInventoryPlanning(barbershopId, options = {}) {
  const { year, season, enabled = true } = options
  const currentYear = year || new Date().getFullYear()

  return useQuery({
    queryKey: queryKeys.inventory.seasonalPlanning(barbershopId, currentYear, season),
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
    enabled: enabled && !!barbershopId,
    staleTime: 60 * 60 * 1000, // 1 hour - seasonal data changes infrequently
    retry: 1,
  })
}

/**
 * Hook for stock level alerts with real-time updates
 */
export function useStockLevelAlerts(barbershopId, options = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: queryKeys.inventory.stockLevels(barbershopId),
    queryFn: async () => {
      // Get current alerts filtered for stock-related issues
      const response = await fetch(`/api/inventory/alerts?barbershopId=${barbershopId}&alertType=low_stock&status=active`)
      
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
    enabled: enabled && !!barbershopId,
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
    mutationFn: async ({ barbershopId, forecastDays, recalculateAll, productIds }) => {
      const response = await fetch('/api/inventory/forecasting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershopId,
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
        queryKey: queryKeys.inventory.forecasting(variables.barbershopId)
      })
      
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.reorderRecommendations(variables.barbershopId)
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
    mutationFn: async ({ action, recommendationIds, barbershopId, productIds }) => {
      const response = await fetch('/api/inventory/reorder-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          recommendationIds,
          barbershopId,
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
        queryKey: queryKeys.inventory.reorderRecommendations(variables.barbershopId)
      })
      
      // If generating new recommendations, also invalidate forecasts
      if (variables.action === 'generate') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.forecasting(variables.barbershopId)
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
    mutationFn: async ({ action, alertIds, barbershopId, alertData }) => {
      const response = await fetch('/api/inventory/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          alertIds,
          barbershopId,
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
        queryKey: queryKeys.inventory.alerts(variables.barbershopId)
      })
      
      // Also invalidate stock level alerts
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.stockLevels(variables.barbershopId)
      })
    },
  })
}

/**
 * Hook for inventory performance metrics
 */
export function useInventoryPerformance(barbershopId, options = {}) {
  const { period = 'last_30_days', enabled = true } = options

  return useQuery({
    queryKey: queryKeys.inventory.performance(barbershopId, period),
    queryFn: async () => {
      // This would be a dedicated performance endpoint
      // For now, combine data from existing endpoints
      const [forecastData, alertsData, reorderData] = await Promise.all([
        fetch(`/api/inventory/forecasting?barbershopId=${barbershopId}&includeRecommendations=true`).then(r => r.json()),
        fetch(`/api/inventory/alerts?barbershopId=${barbershopId}&status=active`).then(r => r.json()),
        fetch(`/api/inventory/reorder-recommendations?barbershopId=${barbershopId}&status=pending`).then(r => r.json())
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
        barbershop_id: barbershopId,
        generated_at: new Date().toISOString()
      }
    },
    enabled: enabled && !!barbershopId,
    staleTime: 15 * 60 * 1000, // 15 minutes - performance metrics change slowly
    retry: 1,
  })
}

/**
 * Combined hook for inventory dashboard data
 */
export function useInventoryDashboard(barbershopId) {
  const forecasting = useInventoryForecasting(barbershopId, { horizon: 30 })
  const alerts = useInventoryAlerts(barbershopId, { status: 'active', limit: 10 })
  const reorderRecommendations = useReorderRecommendations(barbershopId, { status: 'pending', limit: 10 })
  const stockLevels = useStockLevelAlerts(barbershopId)

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