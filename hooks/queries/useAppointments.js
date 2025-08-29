/**
 * React Query Hooks for Appointments with Real-time Support
 * Phase 3-4: Performance Optimization with Live Updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@/lib/query-client'
import supabaseService from '@/lib/supabase-service'

/**
 * Fetch appointments for a barbershop
 */
export function useAppointments(shopId, options = {}) {
  return useQuery({
    queryKey: queryKeys.appointments.byShop(shopId),
    queryFn: async () => {
      // Ensure service is initialized
      if (!supabaseService.isReady()) {
        await supabaseService.initialize()
      }
      return supabaseService.getAppointments(shopId, options)
    },
    enabled: !!shopId,
    staleTime: 2 * 60 * 1000, // Appointments change frequently - 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    ...options.queryOptions,
  })
}

/**
 * Fetch appointments with real-time updates
 */
export function useRealtimeAppointments(shopId, options = {}) {
  const queryClient = useQueryClient()
  const query = useAppointments(shopId, options)
  
  useEffect(() => {
    if (!shopId) return
    
    // Ensure service is initialized before subscribing
    const setupSubscription = async () => {
      if (!supabaseService.isReady()) {
        await supabaseService.initialize()
      }
    }
    
    setupSubscription()
    
    // For now, skip real-time subscription since currentShopId might not be set
    // This would need proper auth context to work
    // Subscribe to real-time changes
    const unsubscribe = () => {} // Temporarily disabled
    
    /* Will re-enable when auth context is available:
    const unsubscribe = supabaseService.subscribeToChanges(
      'appointments',
      { barbershop_id: shopId },
      (payload) => {
        const queryKey = queryKeys.appointments.byShop(shopId)
        
        // Update cache based on change type
        queryClient.setQueryData(queryKey, (oldData) => {
          if (!oldData) return oldData
          
          switch (payload.eventType) {
            case 'INSERT':
              // Add new appointment
              return [...oldData, payload.new]
              
            case 'UPDATE':
              // Update existing appointment
              return oldData.map(apt => 
                apt.id === payload.new.id ? payload.new : apt
              )
              
            case 'DELETE':
              // Remove deleted appointment
              return oldData.filter(apt => apt.id !== payload.old.id)
              
            default:
              return oldData
          }
        })
      }
    )
    */
    
    // Cleanup subscription on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [shopId, queryClient])
  
  return query
}

/**
 * Fetch appointments for a specific date
 */
export function useAppointmentsByDate(shopId, date) {
  return useQuery({
    queryKey: queryKeys.appointments.byDate(shopId, date),
    queryFn: async () => {
      // Ensure service is initialized
      if (!supabaseService.isReady()) {
        await supabaseService.initialize()
      }
      return supabaseService.getAppointments(shopId, {
        startDate: date,
        endDate: date,
      })
    },
    enabled: !!shopId && !!date,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Create a new appointment with optimistic update
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (appointmentData) => 
      supabaseService.createAppointment(appointmentData),
    
    // Optimistic update
    onMutate: async (newAppointment) => {
      const barbershop_id = newAppointment.barbershop_id
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.appointments.byShop(barbershop_id) 
      })
      
      const previousAppointments = queryClient.getQueryData(
        queryKeys.appointments.byShop(barbershop_id)
      )
      
      // Add temporary appointment to cache
      const tempAppointment = {
        ...newAppointment,
        id: 'temp-' + Date.now(),
        status: 'pending',
        created_at: new Date().toISOString(),
      }
      
      queryClient.setQueryData(
        queryKeys.appointments.byShop(barbershop_id),
        (old) => [...(old || []), tempAppointment]
      )
      
      return { previousAppointments, barbershop_id }
    },
    
    onError: (err, newAppointment, context) => {
      // Rollback on error
      queryClient.setQueryData(
        queryKeys.appointments.byShop(context.barbershop_id),
        context.previousAppointments
      )
      console.error('Failed to create appointment:', err)
    },
    
    onSuccess: (data, variables) => {
      console.log('Appointment created successfully:', data)
    },
    
    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.byShop(variables.barbershop_id) 
      })
    }
  })
}

/**
 * Update an appointment (e.g., status change, reschedule)
 */
export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ appointmentId, updates }) => 
      supabaseService.updateAppointment(appointmentId, updates),
    
    onMutate: async ({ appointmentId, updates, barbershop_id }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.appointments.byShop(barbershop_id) 
      })
      
      const previousAppointments = queryClient.getQueryData(
        queryKeys.appointments.byShop(barbershop_id)
      )
      
      // Optimistically update the appointment
      queryClient.setQueryData(
        queryKeys.appointments.byShop(barbershop_id),
        (old) => old?.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, ...updates, updated_at: new Date().toISOString() }
            : apt
        )
      )
      
      return { previousAppointments, barbershop_id }
    },
    
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.appointments.byShop(context.barbershop_id),
        context.previousAppointments
      )
      console.error('Failed to update appointment:', err)
    },
    
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.byShop(variables.barbershop_id) 
      })
    }
  })
}

/**
 * Cancel an appointment
 */
export function useCancelAppointment() {
  const updateAppointment = useUpdateAppointment()
  
  return useMutation({
    mutationFn: ({ appointmentId, barbershop_id }) => 
      updateAppointment.mutate({
        appointmentId,
        barbershop_id,
        updates: { 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        }
      })
  })
}

/**
 * Delete an appointment (hard delete)
 */
export function useDeleteAppointment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (appointmentId) => 
      supabaseService.deleteAppointment(appointmentId),
    
    onSuccess: (data, appointmentId) => {
      // Invalidate all appointment queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.appointments.all() 
      })
    }
  })
}

/**
 * Prefetch appointments for navigation
 */
export function usePrefetchAppointments() {
  const queryClient = useQueryClient()
  
  return (shopId, date) => {
    return queryClient.prefetchQuery({
      queryKey: date 
        ? queryKeys.appointments.byDate(shopId, date)
        : queryKeys.appointments.byShop(shopId),
      queryFn: () => supabaseService.getAppointments(shopId, {
        startDate: date,
        endDate: date,
      }),
      staleTime: 2 * 60 * 1000,
    })
  }
}