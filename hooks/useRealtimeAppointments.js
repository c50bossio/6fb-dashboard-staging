/**
 * Realtime Appointments Hook
 * Uses consolidated supabase service for real-time updates
 * This replaces the legacy versions with multiple supabase clients
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import supabaseService from '@/lib/supabase-service'
import { appointmentKeys } from './useAppointments'

export function useRealtimeAppointments(shopId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!shopId) return

    const unsubscribe = supabaseService.subscribeToChanges(
      'appointments',
      { barbershop_id: shopId },
      (payload) => {
        // Invalidate appointment queries to refetch fresh data
        queryClient.invalidateQueries({ 
          queryKey: appointmentKeys.byShop(shopId) 
        })
      }
    )

    return unsubscribe
  }, [shopId, queryClient])
}

// Export for backward compatibility
export default useRealtimeAppointments