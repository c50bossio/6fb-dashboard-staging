/**
 * React Query Hooks for Dashboard Data
 * Phase 3-4: Replaces GlobalDashboardContext with efficient queries
 */

import { useQuery, useQueries } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

/**
 * Fetch all dashboard data in parallel
 * Replaces the complex GlobalDashboardContext
 */
export function useDashboardData(shopId) {
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.metrics.dashboard(shopId),
        queryFn: () => createServiceRoleClient().getDashboardMetrics(shopId),
        enabled: !!shopId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
      {
        queryKey: queryKeys.appointments.byShop(shopId),
        queryFn: () => createServiceRoleClient().getAppointments(shopId, {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        }),
        enabled: !!shopId,
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
      {
        queryKey: queryKeys.services.byShop(shopId),
        queryFn: () => createServiceRoleClient().getServices(shopId),
        enabled: !!shopId,
        staleTime: 10 * 60 * 1000, // 10 minutes
      },
      {
        queryKey: queryKeys.staff.byShop(shopId),
        queryFn: () => createServiceRoleClient().getStaff(shopId),
        enabled: !!shopId,
        staleTime: 10 * 60 * 1000, // 10 minutes
      },
      {
        queryKey: queryKeys.customers.byShop(shopId),
        queryFn: () => createServiceRoleClient().getCustomers(shopId, { limit: 10 }),
        enabled: !!shopId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    ]
  })
  
  const [metrics, appointments, services, staff, customers] = queries
  
  // Combine loading states
  const isLoading = queries.some(query => query.isLoading)
  const isError = queries.some(query => query.isError)
  const error = queries.find(query => query.error)?.error
  
  // Calculate derived metrics
  const derivedMetrics = {
    todayAppointments: appointments.data?.length || 0,
    activeServices: services.data?.filter(s => s.active)?.length || 0,
    activeStaff: staff.data?.filter(s => s.is_active)?.length || 0,
    recentCustomers: customers.data?.length || 0,
  }
  
  return {
    metrics: metrics.data,
    appointments: appointments.data,
    services: services.data,
    staff: staff.data,
    customers: customers.data,
    derivedMetrics,
    isLoading,
    isError,
    error,
    refetch: () => queries.forEach(q => q.refetch()),
  }
}

/**
 * Fetch dashboard metrics only
 */
export function useDashboardMetrics(shopId, options = {}) {
  return useQuery({
    queryKey: queryKeys.metrics.dashboard(shopId),
    queryFn: () => createServiceRoleClient().getDashboardMetrics(shopId, options),
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  })
}

/**
 * Fetch revenue metrics for a specific period
 */
export function useRevenueMetrics(shopId, period = 'month') {
  return useQuery({
    queryKey: queryKeys.metrics.revenue(shopId, period),
    queryFn: async () => {
      const now = new Date()
      let startDate, endDate
      
      switch (period) {
        case 'day':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          endDate = new Date(now.setHours(23, 59, 59, 999))
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          startDate = weekStart
          endDate = new Date()
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = new Date(now.getFullYear(), 11, 31)
          break
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date()
      }
      
      return createServiceRoleClient().getDashboardMetrics(shopId, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
    },
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch today's appointments with auto-refresh
 */
export function useTodayAppointments(shopId) {
  const today = new Date().toISOString().split('T')[0]
  
  return useQuery({
    queryKey: queryKeys.appointments.byDate(shopId, today),
    queryFn: () => createServiceRoleClient().getAppointments(shopId, {
      startDate: today,
      endDate: today,
    }),
    enabled: !!shopId,
    staleTime: 1 * 60 * 1000, // 1 minute for today's appointments
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  })
}

/**
 * Fetch upcoming appointments
 */
export function useUpcomingAppointments(shopId, days = 7) {
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + days)
  
  return useQuery({
    queryKey: ['appointments', 'upcoming', shopId, days],
    queryFn: () => createServiceRoleClient().getAppointments(shopId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Legacy compatibility wrapper for components still using context
 * This allows gradual migration from GlobalDashboardContext
 */
export function useLegacyDashboardCompat(shopId) {
  const dashboardData = useDashboardData(shopId)
  
  // Map to old context shape for backward compatibility
  return {
    // Data
    appointments: dashboardData.appointments || [],
    services: dashboardData.services || [],
    staff: dashboardData.staff || [],
    customers: dashboardData.customers || [],
    metrics: dashboardData.metrics || {},
    
    // States
    loading: dashboardData.isLoading,
    error: dashboardData.error,
    
    // Methods (simplified)
    refreshData: dashboardData.refetch,
    
    // Derived data
    todayRevenue: dashboardData.metrics?.totalRevenue || 0,
    todayAppointments: dashboardData.derivedMetrics.todayAppointments,
    activeServices: dashboardData.derivedMetrics.activeServices,
    
    // For components expecting specific shapes
    dashboardData: {
      ...dashboardData.metrics,
      appointments: dashboardData.appointments,
    }
  }
}