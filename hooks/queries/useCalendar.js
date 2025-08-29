/**
 * React Query Hooks for Google Calendar Integration
 * Phase 5-6: Calendar & AI Integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'

/**
 * Fetch connected calendar accounts for a barbershop
 */
export function useCalendarAccounts(shopId) {
  return useQuery({
    queryKey: queryKeys.calendar.accounts(shopId),
    queryFn: async () => {
      const response = await fetch(`/api/calendar/accounts?shopId=${shopId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch calendar accounts')
      }
      return response.json()
    },
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Connect a new Google Calendar account
 */
export function useConnectCalendar() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (shopId) => {
      // Initiate OAuth flow
      window.location.href = `/api/calendar/google/auth?shopId=${shopId}`
    },
    onSuccess: (data, shopId) => {
      // Invalidate accounts list after connection
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.accounts(shopId)
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
    mutationFn: async ({ shopId, accountId }) => {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to disconnect calendar')
      }
      return response.json()
    },
    onSuccess: (data, { shopId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.accounts(shopId)
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
    mutationFn: async ({ shopId, accountId }) => {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, accountId })
      })
      if (!response.ok) {
        throw new Error('Failed to sync calendar')
      }
      return response.json()
    },
    onMutate: async ({ shopId }) => {
      // Show sync in progress
      queryClient.setQueryData(
        queryKeys.calendar.syncStatus(shopId),
        { status: 'syncing', progress: 0 }
      )
    },
    onSuccess: (data, { shopId }) => {
      // Update sync status
      queryClient.setQueryData(
        queryKeys.calendar.syncStatus(shopId),
        { status: 'completed', progress: 100, lastSync: new Date() }
      )
      // Invalidate appointments after sync
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byShop(shopId)
      })
    },
    onError: (error, { shopId }) => {
      // Update sync status on error
      queryClient.setQueryData(
        queryKeys.calendar.syncStatus(shopId),
        { status: 'error', error: error.message }
      )
    }
  })
}

/**
 * Get calendar sync status
 */
export function useCalendarSyncStatus(shopId) {
  return useQuery({
    queryKey: queryKeys.calendar.syncStatus(shopId),
    queryFn: async () => {
      const response = await fetch(`/api/calendar/sync/status?shopId=${shopId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch sync status')
      }
      return response.json()
    },
    enabled: !!shopId,
    refetchInterval: (data) => {
      // Poll while syncing
      return data?.status === 'syncing' ? 1000 : false
    }
  })
}

/**
 * Get calendar settings
 */
export function useCalendarSettings(shopId) {
  return useQuery({
    queryKey: queryKeys.calendar.settings(shopId),
    queryFn: async () => {
      const response = await fetch(`/api/calendar/settings?shopId=${shopId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch calendar settings')
      }
      return response.json()
    },
    enabled: !!shopId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Update calendar settings
 */
export function useUpdateCalendarSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ shopId, settings }) => {
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, ...settings })
      })
      if (!response.ok) {
        throw new Error('Failed to update calendar settings')
      }
      return response.json()
    },
    onMutate: async ({ shopId, settings }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: queryKeys.calendar.settings(shopId)
      })
      
      // Snapshot previous value
      const previousSettings = queryClient.getQueryData(
        queryKeys.calendar.settings(shopId)
      )
      
      // Optimistically update
      queryClient.setQueryData(
        queryKeys.calendar.settings(shopId),
        (old) => ({ ...old, ...settings })
      )
      
      return { previousSettings, shopId }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(
          queryKeys.calendar.settings(context.shopId),
          context.previousSettings
        )
      }
    },
    onSettled: (data, error, { shopId }) => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.settings(shopId)
      })
    }
  })
}

/**
 * Get calendar conflicts
 */
export function useCalendarConflicts(shopId, dateRange) {
  return useQuery({
    queryKey: queryKeys.calendar.conflicts(shopId, dateRange),
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId,
        startDate: dateRange?.start || '',
        endDate: dateRange?.end || ''
      })
      const response = await fetch(`/api/calendar/conflicts?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch calendar conflicts')
      }
      return response.json()
    },
    enabled: !!shopId,
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
    onSuccess: (data, { shopId }) => {
      // Invalidate conflicts and appointments
      queryClient.invalidateQueries({
        queryKey: queryKeys.calendar.conflicts(shopId)
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.byShop(shopId)
      })
    }
  })
}

/**
 * Prefetch calendar data for navigation
 */
export function usePrefetchCalendarData() {
  const queryClient = useQueryClient()
  
  return (shopId) => {
    // Prefetch accounts
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar.accounts(shopId),
      queryFn: async () => {
        const response = await fetch(`/api/calendar/accounts?shopId=${shopId}`)
        return response.json()
      },
      staleTime: 5 * 60 * 1000,
    })
    
    // Prefetch settings
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar.settings(shopId),
      queryFn: async () => {
        const response = await fetch(`/api/calendar/settings?shopId=${shopId}`)
        return response.json()
      },
      staleTime: 10 * 60 * 1000,
    })
  }
}