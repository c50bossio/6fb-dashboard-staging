/**
 * Comprehensive shop data hook
 * Combines multiple data sources for dashboard and shop management
 * Replaces GlobalDashboardContext and other complex contexts
 */

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { useAppointmentsWithRealtime } from './useAppointments'
import { useCustomersWithRealtime } from './useCustomersQuery'
import { useServices } from './useServicesQuery'
import { useStaffWithRealtime } from './useStaffQuery'

/**
 * Get comprehensive shop data for dashboard
 */
export function useShopData(barbershopId, options = {}) {
  const {
    includeAppointments = true,
    includeStaff = true,
    includeServices = true,
    includeCustomers = true,
    appointmentDateRange = null
  } = options

  // Core shop information - with development mode fallback
  const shopQuery = useQuery({
    queryKey: ['barbershop', barbershopId],
    queryFn: async () => {
      // In development mode, return mock data
      if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
        return {
          id: barbershopId || 'b1234567-89ab-cdef-0123-456789abcdef',
          name: 'Dev Barbershop',
          address: '123 Dev Street, Dev City, DC 12345',
          phone: '(555) 123-4567',
          email: 'dev@6fb.local'
        }
      }
      // Production: would call actual API
      const client = createClient()
      const { data, error } = await client
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!barbershopId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Business hours - with development mode fallback
  const businessHoursQuery = useQuery({
    queryKey: ['business-hours', barbershopId],
    queryFn: async () => {
      // In development mode, return mock data
      if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
        return {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { closed: true }
        }
      }
      // Production: would fetch from barbershops.business_hours
      const client = createClient()
      const { data, error } = await client
        .from('barbershops')
        .select('business_hours')
        .eq('id', barbershopId)
        .single()
      if (error) throw error
      return data?.business_hours || {}
    },
    enabled: !!barbershopId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  })

  // Dashboard metrics - with development mode fallback
  const metricsQuery = useQuery({
    queryKey: ['dashboard-metrics', barbershopId],
    queryFn: async () => {
      // In development mode, return mock data
      if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true') {
        return {
          total_revenue: 5432.10,
          total_appointments: 42,
          total_customers: 28,
          average_rating: 4.8,
          today_appointments: 8,
          week_appointments: 35,
          month_appointments: 142
        }
      }
      // Production: would calculate metrics from appointments
      return {
        total_revenue: 0,
        total_appointments: 0,
        total_customers: 0,
        average_rating: 0
      }
    },
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Optional data queries with real-time updates
  const appointmentsQuery = useAppointmentsWithRealtime(barbershopId, {
    enabled: includeAppointments && !!barbershopId,
    ...appointmentDateRange
  })

  const staffQuery = useStaffWithRealtime(barbershopId, {
    enabled: includeStaff && !!barbershopId
  })

  const servicesQuery = useServices(barbershopId, {
    enabled: includeServices && !!barbershopId
  })

  const customersQuery = useCustomersWithRealtime(barbershopId, {
    enabled: includeCustomers && !!barbershopId,
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
          .reduce((sum, apt) => sum + (apt.total_price_cents ? apt.total_price_cents / 100 : 0), 0)
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
export function useShopHeader(barbershopId) {
  return useShopData(barbershopId, {
    includeAppointments: false,
    includeStaff: false,
    includeServices: false,
    includeCustomers: false
  })
}

/**
 * Dashboard-focused shop data with today's appointments
 */
export function useShopDashboard(barbershopId) {
  const today = new Date()
  const startDate = today.toISOString().split('T')[0]
  const endDate = startDate

  return useShopData(barbershopId, {
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
  const currentShopId = createClient().getCurrentShopId()
  
  return useShopData(currentShopId, {
    includeAppointments: true,
    includeStaff: true,
    includeServices: false, // Services loaded separately as needed
    includeCustomers: false // Customers loaded separately as needed
  })
}