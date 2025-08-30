/**
 * React Query hooks for appointments data
 * Replaces AppointmentsContext and direct Supabase queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'react-hot-toast'
import supabaseService from '@/lib/supabase-service'

// Query keys for consistent caching
export const appointmentKeys = {
  all: ['appointments'],
  byShop: (shopId) => ['appointments', 'shop', shopId],
  byDateRange: (shopId, startDate, endDate) => ['appointments', 'shop', shopId, 'dateRange', startDate, endDate],
  byBarber: (shopId, barberId) => ['appointments', 'shop', shopId, 'barber', barberId],
  byStatus: (shopId, status) => ['appointments', 'shop', shopId, 'status', status]
}

/**
 * Get appointments for a shop with optional filters
 */
export function useAppointments(shopId, options = {}) {
  const {
    startDate,
    endDate,
    barberId,
    status,
    enabled = true
  } = options

  return useQuery({
    queryKey: appointmentKeys.byDateRange(shopId, startDate, endDate),
    queryFn: () => supabaseService.getAppointments(shopId, {
      startDate,
      endDate,
      barberId,
      status
    }),
    enabled: enabled && !!shopId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get appointments for today
 */
export function useTodayAppointments(shopId) {
  const today = new Date()
  const startDate = today.toISOString().split('T')[0]
  const endDate = startDate

  return useAppointments(shopId, {
    startDate,
    endDate
  })
}

/**
 * Get upcoming appointments (next 7 days)
 */
export function useUpcomingAppointments(shopId) {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const startDate = today.toISOString().split('T')[0]
  const endDate = nextWeek.toISOString().split('T')[0]

  return useAppointments(shopId, {
    startDate,
    endDate
  })
}

/**
 * Get appointments by barber
 */
export function useBarberAppointments(shopId, barberId, options = {}) {
  return useQuery({
    queryKey: appointmentKeys.byBarber(shopId, barberId),
    queryFn: () => supabaseService.getAppointments(shopId, {
      barberId,
      ...options
    }),
    enabled: !!shopId && !!barberId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Create appointment mutation with optimistic updates
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (appointmentData) => supabaseService.createAppointment(appointmentData),
    onMutate: async (appointmentData) => {
      const shopId = appointmentData.barbershop_id
      const queryKey = appointmentKeys.byDateRange(shopId, 
        appointmentData.appointment_date?.split('T')[0],
        appointmentData.appointment_date?.split('T')[0]
      )

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousAppointments = queryClient.getQueryData(queryKey)

      // Optimistically update cache
      if (previousAppointments) {
        const optimisticAppointment = {
          ...appointmentData,
          id: `temp-${Date.now()}`, // Temporary ID
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: appointmentData.status || 'confirmed'
        }

        queryClient.setQueryData(queryKey, [...previousAppointments, optimisticAppointment])
      }

      // Return rollback context
      return { previousAppointments, queryKey, shopId }
    },
    onSuccess: (newAppointment, variables, context) => {
      toast.success('Appointment created successfully')
      
      // Update cache with real data
      const { queryKey } = context
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return [newAppointment]
        
        // Replace optimistic entry with real data
        return old.map(apt => 
          apt.id?.startsWith('temp-') ? newAppointment : apt
        )
      })

      // Update dashboard metrics
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-metrics', newAppointment.barbershop_id] 
      })
    },
    onError: (error, variables, context) => {
      console.error('Failed to create appointment:', error)
      toast.error('Failed to create appointment')
      
      // Rollback optimistic update
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousAppointments)
      }
    }
  })
}

/**
 * Update appointment mutation
 */
export function useUpdateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ appointmentId, updates }) => 
      supabaseService.updateAppointment(appointmentId, updates),
    onSuccess: (updatedAppointment) => {
      toast.success('Appointment updated successfully')
      
      // Invalidate and refetch appointments
      queryClient.invalidateQueries({ 
        queryKey: appointmentKeys.byShop(updatedAppointment.barbershop_id) 
      })
    },
    onError: (error) => {
      console.error('Failed to update appointment:', error)
      toast.error('Failed to update appointment')
    }
  })
}

/**
 * Delete appointment mutation
 */
export function useDeleteAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (appointmentId) => supabaseService.deleteAppointment(appointmentId),
    onSuccess: (deletedAppointment) => {
      toast.success('Appointment deleted successfully')
      
      // Invalidate and refetch appointments
      queryClient.invalidateQueries({ 
        queryKey: appointmentKeys.byShop(deletedAppointment.barbershop_id) 
      })
    },
    onError: (error) => {
      console.error('Failed to delete appointment:', error)
      toast.error('Failed to delete appointment')
    }
  })
}

/**
 * Optimized real-time appointments hook with targeted cache updates
 */
export function useRealtimeAppointments(shopId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!shopId) return

    const unsubscribe = supabaseService.subscribeToChanges(
      'appointments',
      { barbershop_id: shopId },
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        
        // Get appointment date for targeted cache updates
        const appointmentDate = (newRecord || oldRecord)?.appointment_date?.split('T')[0]
        
        if (appointmentDate) {
          const specificQueryKey = appointmentKeys.byDateRange(shopId, appointmentDate, appointmentDate)
          
          // Update specific date range cache
          queryClient.setQueryData(specificQueryKey, (oldData) => {
            if (!oldData) return oldData

            switch (eventType) {
              case 'INSERT':
                // Add new appointment if not already present
                const exists = oldData.find(apt => apt.id === newRecord.id)
                return exists ? oldData : [...oldData, newRecord]

              case 'UPDATE':
                // Update existing appointment
                return oldData.map(apt => 
                  apt.id === newRecord.id ? newRecord : apt
                )

              case 'DELETE':
                // Remove deleted appointment
                return oldData.filter(apt => apt.id !== oldRecord.id)

              default:
                return oldData
            }
          })
        }

        // Update broader shop queries only if specific update failed
        if (!appointmentDate) {
          queryClient.invalidateQueries({ 
            queryKey: appointmentKeys.byShop(shopId) 
          })
        }

        // Update dashboard metrics for significant changes
        if (eventType === 'INSERT' || eventType === 'DELETE') {
          queryClient.invalidateQueries({ 
            queryKey: ['dashboard-metrics', shopId] 
          })
        }
      }
    )

    return unsubscribe
  }, [shopId, queryClient])
}

/**
 * Combined hook for appointments with real-time updates
 */
export function useAppointmentsWithRealtime(shopId, options = {}) {
  // Set up real-time subscription
  useRealtimeAppointments(shopId)
  
  // Return the appointments query
  return useAppointments(shopId, options)
}