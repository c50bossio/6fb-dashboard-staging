/**
 * Comprehensive shop data hook
 * Combines multiple data sources for dashboard and shop management
 * Replaces GlobalDashboardContext and other complex contexts
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import supabaseService from '@/lib/supabase-service'
import { useAppointmentsWithRealtime } from './useAppointments'
import { useStaffWithRealtime } from './useStaffQuery'
import { useServices } from './useServicesQuery'
import { useCustomersWithRealtime } from './useCustomersQuery'

/**
 * Get comprehensive shop data for dashboard
 */
export function useShopData(shopId, options = {}) {
  const {
    includeAppointments = true,
    includeStaff = true,
    includeServices = true,
    includeCustomers = true,
    appointmentDateRange = null
  } = options

  // Core shop information
  const shopQuery = useQuery({
    queryKey: ['barbershop', shopId],
    queryFn: () => supabaseService.getBarbershop(shopId),
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Business hours
  const businessHoursQuery = useQuery({
    queryKey: ['business-hours', shopId],
    queryFn: () => supabaseService.getBusinessHours(shopId),
    enabled: !!shopId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })

  // Dashboard metrics
  const metricsQuery = useQuery({
    queryKey: ['dashboard-metrics', shopId],
    queryFn: () => supabaseService.getDashboardMetrics(shopId, appointmentDateRange),
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Optional data queries with real-time updates
  const appointmentsQuery = useAppointmentsWithRealtime(shopId, {
    enabled: includeAppointments && !!shopId,
    ...appointmentDateRange
  })

  const staffQuery = useStaffWithRealtime(shopId, {
    enabled: includeStaff && !!shopId
  })

  const servicesQuery = useServices(shopId, {
    enabled: includeServices && !!shopId
  })

  const customersQuery = useCustomersWithRealtime(shopId, {
    enabled: includeCustomers && !!shopId,
    limit: 100 // Reasonable limit for dashboard
  })

  // Compute loading state
  const isLoading = useMemo(() => {
    const queries = [shopQuery, businessHoursQuery, metricsQuery]
    
    if (includeAppointments) queries.push(appointmentsQuery)
    if (includeStaff) queries.push(staffQuery)
    if (includeServices) queries.push(servicesQuery)
    if (includeCustomers) queries.push(customersQuery)
    
    return queries.some(query => query.isLoading)
  }, [
    shopQuery.isLoading,
    businessHoursQuery.isLoading,
    metricsQuery.isLoading,
    appointmentsQuery.isLoading,
    staffQuery.isLoading,
    servicesQuery.isLoading,
    customersQuery.isLoading,
    includeAppointments,
    includeStaff,
    includeServices,
    includeCustomers
  ])

  // Compute error state
  const error = useMemo(() => {
    return shopQuery.error || 
           businessHoursQuery.error || 
           metricsQuery.error ||
           appointmentsQuery.error ||
           staffQuery.error ||
           servicesQuery.error ||
           customersQuery.error
  }, [
    shopQuery.error,
    businessHoursQuery.error,
    metricsQuery.error,
    appointmentsQuery.error,
    staffQuery.error,
    servicesQuery.error,
    customersQuery.error
  ])

  // Computed analytics
  const analytics = useMemo(() => {
    if (!appointmentsQuery.data || !servicesQuery.data || !customersQuery.data) {
      return null
    }

    const appointments = appointmentsQuery.data
    const services = servicesQuery.data
    const customers = customersQuery.data

    const completedAppointments = appointments.filter(apt => apt.status === 'completed')
    const todayAppointments = appointments.filter(apt => {
      const today = new Date().toISOString().split('T')[0]
      return apt.appointment_date?.startsWith(today)
    })

    const popularServices = services.map(service => {
      const serviceAppointments = appointments.filter(apt => apt.service_id === service.id)
      return {
        ...service,
        appointmentCount: serviceAppointments.length,
        revenue: serviceAppointments
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (apt.price || 0), 0)
      }
    }).sort((a, b) => b.appointmentCount - a.appointmentCount)

    return {
      totalAppointments: appointments.length,
      completedAppointments: completedAppointments.length,
      todayAppointments: todayAppointments.length,
      totalCustomers: customers.length,
      totalServices: services.length,
      activeServices: services.filter(s => s.is_active).length,
      popularServices: popularServices.slice(0, 5)
    }
  }, [appointmentsQuery.data, servicesQuery.data, customersQuery.data])

  return {
    // Loading states
    isLoading,
    error,
    
    // Core shop data
    shop: shopQuery.data,
    businessHours: businessHoursQuery.data,
    metrics: metricsQuery.data,
    
    // Optional data
    appointments: appointmentsQuery.data,
    staff: staffQuery.data,
    services: servicesQuery.data,
    customers: customersQuery.data,
    
    // Computed analytics
    analytics,
    
    // Individual query states for fine-grained control
    queries: {
      shop: shopQuery,
      businessHours: businessHoursQuery,
      metrics: metricsQuery,
      appointments: appointmentsQuery,
      staff: staffQuery,
      services: servicesQuery,
      customers: customersQuery
    },
    
    // Refetch functions
    refetch: () => {
      shopQuery.refetch()
      businessHoursQuery.refetch()
      metricsQuery.refetch()
      if (includeAppointments) appointmentsQuery.refetch()
      if (includeStaff) staffQuery.refetch()
      if (includeServices) servicesQuery.refetch()
      if (includeCustomers) customersQuery.refetch()
    }
  }
}

/**
 * Lightweight shop data for header/navigation
 */
export function useShopHeader(shopId) {
  return useShopData(shopId, {
    includeAppointments: false,
    includeStaff: false,
    includeServices: false,
    includeCustomers: false
  })
}

/**
 * Dashboard-focused shop data with today's appointments
 */
export function useShopDashboard(shopId) {
  const today = new Date()
  const startDate = today.toISOString().split('T')[0]
  const endDate = startDate

  return useShopData(shopId, {
    includeAppointments: true,
    includeStaff: true,
    includeServices: true,
    includeCustomers: true,
    appointmentDateRange: {
      startDate,
      endDate
    }
  })
}

/**
 * Current user's shop context
 * Automatically gets the shop ID from the service
 */
export function useCurrentShop() {
  const currentShopId = supabaseService.getCurrentShopId()
  
  return useShopData(currentShopId, {
    includeAppointments: true,
    includeStaff: true,
    includeServices: false, // Services loaded separately as needed
    includeCustomers: false // Customers loaded separately as needed
  })
}