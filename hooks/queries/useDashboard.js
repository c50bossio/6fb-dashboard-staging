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
export function useDashboardData(barbershopId) {
  const queries = useQueries({
    queries: [
      {
        queryKey: queryKeys.metrics.dashboard(barbershopId),
        queryFn: () => createServiceRoleClient().getDashboardMetrics(barbershopId),
        enabled: !!barbershopId,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
      {
        queryKey: queryKeys.appointments.byShop(barbershopId),
        queryFn: () => createServiceRoleClient().getAppointments(barbershopId, {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        }),
        enabled: !!barbershopId,
        staleTime: 2 * 60 * 1000, // 2 minutes
      },
      {
        queryKey: queryKeys.services.byShop(barbershopId),
        queryFn: () => createServiceRoleClient().getServices(barbershopId),
        enabled: !!barbershopId,
        staleTime: 10 * 60 * 1000, // 10 minutes
      },
      {
        queryKey: queryKeys.staff.byShop(barbershopId),
        queryFn: () => createServiceRoleClient().getStaff(barbershopId),
        enabled: !!barbershopId,
        staleTime: 10 * 60 * 1000, // 10 minutes
      },
      {
        queryKey: queryKeys.customers.byShop(barbershopId),
        queryFn: () => createServiceRoleClient().getCustomers(barbershopId, { limit: 10 }),
        enabled: !!barbershopId,
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
export function useDashboardMetrics(barbershopId, options = {}) {
  return useQuery({
    queryKey: queryKeys.metrics.dashboard(barbershopId),
    queryFn: () => createServiceRoleClient().getDashboardMetrics(barbershopId, options),
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
  })
}

/**
 * Fetch revenue metrics for a specific period
 */
export function useRevenueMetrics(barbershopId, period = 'month') {
  return useQuery({
    queryKey: queryKeys.metrics.revenue(barbershopId, period),
    queryFn: async () => {
      const now = new Date()
      let dateRange = { startDate: null, endDate: null }
      
      switch (period) {
        case 'day':
          dateRange.startDate = new Date(now.setHours(0, 0, 0, 0))
          dateRange.endDate = new Date(now.setHours(23, 59, 59, 999))
          break
        case 'week':
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          dateRange.startDate = weekStart
          dateRange.endDate = new Date()
          break
        case 'month':
          dateRange.startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          dateRange.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          break
        case 'year':
          dateRange.startDate = new Date(now.getFullYear(), 0, 1)
          dateRange.endDate = new Date(now.getFullYear(), 11, 31)
          break
        default:
          dateRange.startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          dateRange.endDate = new Date()
      }
      
      return createServiceRoleClient().getDashboardMetrics(barbershopId, {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      })
    },
    enabled: !!barbershopId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Fetch today's appointments with auto-refresh
 */
export function useTodayAppointments(barbershopId) {
  const today = new Date().toISOString().split('T')[0]
  
  return useQuery({
    queryKey: queryKeys.appointments.byDate(barbershopId, today),
    queryFn: () => createServiceRoleClient().getAppointments(barbershopId, {
      startDate: today,
      endDate: today,
    }),
    enabled: !!barbershopId,
    staleTime: 1 * 60 * 1000, // 1 minute for today's appointments
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  })
}

/**
 * Fetch upcoming appointments
 */
export function useUpcomingAppointments(barbershopId, days = 7) {
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + days)
  
  return useQuery({
    queryKey: ['appointments', 'upcoming', barbershopId, days],
    queryFn: () => createServiceRoleClient().getAppointments(barbershopId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }),
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Legacy compatibility wrapper for components still using context
 * This allows gradual migration from GlobalDashboardContext
 */
export function useLegacyDashboardCompat(barbershopId) {
  const dashboardData = useDashboardData(barbershopId)
  
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