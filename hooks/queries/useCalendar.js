/**
 * React Query Hooks for Google Calendar Integration
 * Phase 5-6: Calendar & AI Integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

/**
 * Fetch connected calendar accounts for a barbershop
 */
export function useCalendarAccounts(barbershopId) {
  return useQuery({
    queryKey: queryKeys.calendar.accounts(barbershopId),
    queryFn: async () => {
      const response = await fetch(`/api/calendar/accounts?barbershopId=${barbershopId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch calendar accounts')
      }
      return response.json()
    },
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Connect a new Google Calendar account
 */
export function useConnectCalendar() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (barbershopId) => {
      // Initiate OAuth flow
      window.location.href = `/api/calendar/google/auth?barbershopId=${barbershopId}`
    },
    onSuccess: (data, barbershopId) => {
      // Invalidate accounts list after connection
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.accounts(barbershopId)
      })
    }
  })
}

/**
 * Disconnect a calendar account
 */
export function useDisconnectCalendar() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ barbershopId, accountId }) => {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to disconnect calendar')
      }
      return response.json()
    },
    onSuccess: (data, { barbershopId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.accounts(barbershopId)
      })
    }
  })
}

/**
 * Sync calendar appointments
 */
export function useSyncCalendar() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ barbershopId, accountId }) => {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbershopId, accountId })
      })
      if (!response.ok) {
        throw new Error('Failed to sync calendar')
      }
      return response.json()
    },
    onMutate: async ({ barbershopId }) => {
      // Show sync in progress
      queryClient.setQueryData(
        queryKeys.calendar.syncStatus(barbershopId),
        { status: 'syncing', progress: 0 }
      )
    },
    onSuccess: (data, { barbershopId }) => {
      // Update sync status
      queryClient.setQueryData(
        queryKeys.calendar.syncStatus(barbershopId),
        { status: 'completed', progress: 100, lastSync: new Date() }
      )
      // Invalidate appointments after sync
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byShop(barbershopId)
      })
    },
    onError: (error, { barbershopId }) => {
      // Update sync status on error
      queryClient.setQueryData(
        queryKeys.calendar.syncStatus(barbershopId),
        { status: 'error', error: error.message }
      )
    }
  })
}

/**
 * Get calendar sync status
 */
export function useCalendarSyncStatus(barbershopId) {
  return useQuery({
    queryKey: queryKeys.calendar.syncStatus(barbershopId),
    queryFn: async () => {
      const response = await fetch(`/api/calendar/sync/status?barbershopId=${barbershopId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch sync status')
      }
      return response.json()
    },
    enabled: !!barbershopId,
    refetchInterval: (data) => {
      // Poll while syncing
      return data?.status === 'syncing' ? 1000 : false
    }
  })
}

/**
 * Get calendar settings
 */
export function useCalendarSettings(barbershopId) {
  return useQuery({
    queryKey: queryKeys.calendar.settings(barbershopId),
    queryFn: async () => {
      const response = await fetch(`/api/calendar/settings?barbershopId=${barbershopId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch calendar settings')
      }
      return response.json()
    },
    enabled: !!barbershopId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Update calendar settings
 */
export function useUpdateCalendarSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ barbershopId, settings }) => {
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barbershopId, ...settings })
      })
      if (!response.ok) {
        throw new Error('Failed to update calendar settings')
      }
      return response.json()
    },
    onMutate: async ({ barbershopId, settings }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.calendar.settings(barbershopId)
      })
      
      // Snapshot previous value
      const previousSettings = queryClient.getQueryData(
        queryKeys.calendar.settings(barbershopId)
      )
      
      // Optimistically update
      queryClient.setQueryData(
        queryKeys.calendar.settings(barbershopId),
        (old) => ({ ...old, ...settings })
      )
      
      return { previousSettings, barbershopId }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(
          queryKeys.calendar.settings(context.barbershopId),
          context.previousSettings
        )
      }
    },
    onSettled: (data, error, { barbershopId }) => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.settings(barbershopId)
      })
    }
  })
}

/**
 * Get calendar conflicts
 */
export function useCalendarConflicts(barbershopId, dateRange) {
  return useQuery({
    queryKey: queryKeys.calendar.conflicts(barbershopId, dateRange),
    queryFn: async () => {
      const params = new URLSearchParams({
        barbershopId,
        startDate: dateRange?.start || '',
        endDate: dateRange?.end || ''
      })
      const response = await fetch(`/api/calendar/conflicts?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch calendar conflicts')
      }
      return response.json()
    },
    enabled: !!barbershopId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Resolve a calendar conflict
 */
export function useResolveConflict() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ conflictId, resolution }) => {
      const response = await fetch(`/api/calendar/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      })
      if (!response.ok) {
        throw new Error('Failed to resolve conflict')
      }
      return response.json()
    },
    onSuccess: (data, { barbershopId }) => {
      // Invalidate conflicts and appointments
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.conflicts(barbershopId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byShop(barbershopId)
      })
    }
  })
}

/**
 * Prefetch calendar data for navigation
 */
export function usePrefetchCalendarData() {
  const queryClient = useQueryClient()
  
  return (barbershopId) => {
    // Prefetch accounts
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar.accounts(barbershopId),
      queryFn: async () => {
        const response = await fetch(`/api/calendar/accounts?barbershopId=${barbershopId}`)
        return response.json()
      },
      staleTime: 5 * 60 * 1000,
    })
    
    // Prefetch settings
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar.settings(barbershopId),
      queryFn: async () => {
        const response = await fetch(`/api/calendar/settings?barbershopId=${barbershopId}`)
        return response.json()
      },
      staleTime: 10 * 60 * 1000,
    })
  }
}