import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

/**
 * Hook for getting real-time cross-selling suggestions for POS checkout
 */
export function useCrossSellingSuggestions(shopId, currentItems, options = {}) {
  const { serviceId, customerId, sessionId, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.crossSelling.suggestions(shopId, currentItems, serviceId, customerId),
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId,
        currentItems: JSON.stringify(currentItems || [])
      })

      if (serviceId) params.append('serviceId', serviceId)
      if (customerId) params.append('customerId', customerId)
      if (sessionId) params.append('sessionId', sessionId)

      const response = await fetch(`/api/pos/cross-sell-suggestions?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cross-sell suggestions: ${response.status}`)
      }

      return response.json()
    },
    enabled: enabled && !!shopId && Array.isArray(currentItems),
    staleTime: 2 * 60 * 1000, // 2 minutes - suggestions can be cached briefly
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  })
}

/**
 * Hook for getting product affinity analysis data
 */
export function useProductAffinityData(shopId, options = {}) {
  const { 
    productId, 
    minScore = 0.3, 
    minConfidence = 70, 
    limit = 20, 
    category,
    enabled = true 
  } = options

  return useQuery({
    queryKey: queryKeys.crossSelling.productAffinity(shopId, {
      productId, minScore, minConfidence, limit, category
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId,
        minScore: minScore.toString(),
        minConfidence: minConfidence.toString(),
        limit: limit.toString()
      })

      if (productId) params.append('productId', productId)
      if (category) params.append('category', category)

      const response = await fetch(`/api/analytics/product-affinity?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch product affinity data: ${response.status}`)
      }

      return response.json()
    },
    enabled: enabled && !!shopId,
    staleTime: 15 * 60 * 1000, // 15 minutes - affinity data changes slowly
    retry: 2,
  })
}

/**
 * Hook for getting upsell opportunities in POS context
 */
export function useUpsellOpportunities(shopId, options = {}) {
  const { customerId, serviceId, currentTotal = 0, sessionId, enabled = true } = options

  return useQuery({
    queryKey: queryKeys.crossSelling.upsellOpportunities(shopId, {
      customerId, serviceId, currentTotal
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId,
        currentTotal: currentTotal.toString()
      })

      if (customerId) params.append('customerId', customerId)
      if (serviceId) params.append('serviceId', serviceId)
      if (sessionId) params.append('sessionId', sessionId)

      const response = await fetch(`/api/pos/upsell-opportunities?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch upsell opportunities: ${response.status}`)
      }

      return response.json()
    },
    enabled: enabled && !!shopId,
    staleTime: 3 * 60 * 1000, // 3 minutes - opportunities can change frequently
    retry: 2,
  })
}

/**
 * Hook for getting seasonal product recommendations
 */
export function useSeasonalRecommendations(shopId, options = {}) {
  const { month, location, enabled = true } = options
  const currentMonth = month || new Date().getMonth() + 1

  return useQuery({
    queryKey: queryKeys.crossSelling.seasonal(shopId, currentMonth, location),
    queryFn: async () => {
      // This would be a separate endpoint in a full implementation
      // For now, it's included in the upsell opportunities
      const params = new URLSearchParams({
        shopId,
        currentTotal: '0' // Base case for seasonal suggestions
      })

      const response = await fetch(`/api/pos/upsell-opportunities?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch seasonal recommendations: ${response.status}`)
      }

      const data = await response.json()
      
      // Filter for seasonal opportunities only
      const seasonalOpportunities = data.opportunities?.filter(
        opp => opp.type === 'seasonal_promotion'
      ) || []

      return {
        success: true,
        recommendations: seasonalOpportunities,
        month: currentMonth,
        location
      }
    },
    enabled: enabled && !!shopId,
    staleTime: 60 * 60 * 1000, // 1 hour - seasonal data changes infrequently
    retry: 1,
  })
}

/**
 * Mutation hook for tracking cross-sell suggestion interactions
 */
export function useTrackCrossSellInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (interactionData) => {
      const response = await fetch('/api/pos/cross-sell-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interactionData),
      })

      if (!response.ok) {
        throw new Error(`Failed to track interaction: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to refresh analytics
      queryClient.invalidateQueries({
        queryKey: queryKeys.crossSelling.analytics(variables.shopId)
      })

      // If the interaction was successful, we might want to refresh suggestions
      if (variables.action === 'accepted') {
        queryClient.invalidateQueries({
          queryKey: queryKeys.crossSelling.suggestions(variables.shopId)
        })
      }
    },
    onError: (error, variables) => {
      console.error('Failed to track cross-sell interaction:', error)
      // Could implement retry logic or offline storage here
    },
  })
}

/**
 * Mutation hook for tracking upsell opportunity interactions
 */
export function useTrackUpsellInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (interactionData) => {
      const response = await fetch('/api/pos/upsell-opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interactionData),
      })

      if (!response.ok) {
        throw new Error(`Failed to track upsell interaction: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate analytics queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.crossSelling.analytics(variables.shopId)
      })
    },
  })
}

/**
 * Mutation hook for calculating/updating product affinities
 */
export function useCalculateProductAffinities() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ shopId, analysisWindow, minTransactions, recalculateAll }) => {
      const response = await fetch('/api/analytics/product-affinity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId,
          analysisWindow,
          minTransactions,
          recalculateAll,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to calculate affinities: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate all affinity-related queries for this shop
      queryClient.invalidateQueries({
        queryKey: queryKeys.crossSelling.productAffinity(variables.shopId)
      })
      
      // Also invalidate suggestions since they depend on affinities
      queryClient.invalidateQueries({
        queryKey: queryKeys.crossSelling.suggestions(variables.shopId)
      })
    },
  })
}

/**
 * Hook for real-time cross-sell performance analytics
 */
export function useCrossSellingAnalytics(shopId, options = {}) {
  const { 
    dateRange = 'last_30_days', 
    productId, 
    customerId, 
    enabled = true 
  } = options

  return useQuery({
    queryKey: queryKeys.crossSelling.analytics(shopId, { dateRange, productId, customerId }),
    queryFn: async () => {
      // This would be a dedicated analytics endpoint
      // For now, returning mock structure
      return {
        success: true,
        analytics: {
          total_suggestions: 0,
          total_acceptances: 0,
          conversion_rate: 0,
          total_revenue_impact: 0,
          top_performing_products: [],
          performance_by_suggestion_type: {},
          daily_performance: []
        },
        date_range: dateRange,
        shop_id: shopId
      }
    },
    enabled: enabled && !!shopId,
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics can be cached
    retry: 1,
  })
}

/**
 * Hook for getting customer cross-sell receptivity data
 */
export function useCustomerReceptivity(shopId, customerId, options = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: queryKeys.crossSelling.customerReceptivity(shopId, customerId),
    queryFn: async () => {
      // This would query customer_purchase_patterns table
      // Mock implementation for now
      return {
        success: true,
        customer_id: customerId,
        cross_sell_receptivity: 0.65,
        purchase_patterns: [],
        recommendation_history: [],
        preferred_categories: []
      }
    },
    enabled: enabled && !!shopId && !!customerId,
    staleTime: 30 * 60 * 1000, // 30 minutes - customer data changes slowly
    retry: 1,
  })
}

// Helper hook for combining multiple cross-selling data sources
export function useCrossSellingDashboard(shopId) {
  const affinityData = useProductAffinityData(shopId, { limit: 10 })
  const analytics = useCrossSellingAnalytics(shopId)
  const seasonalRecommendations = useSeasonalRecommendations(shopId)

  return {
    affinityData: affinityData.data,
    analytics: analytics.data,
    seasonalRecommendations: seasonalRecommendations.data,
    isLoading: affinityData.isLoading || analytics.isLoading || seasonalRecommendations.isLoading,
    error: affinityData.error || analytics.error || seasonalRecommendations.error,
    refetch: () => {
      affinityData.refetch()
      analytics.refetch()
      seasonalRecommendations.refetch()
    }
  }
}