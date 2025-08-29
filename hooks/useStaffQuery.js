/**
 * React Query hooks for staff data
 * Replaces StaffContext and direct Supabase queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import supabaseService from '@/lib/supabase-service'
import { createClient } from '@/lib/supabase/browser-client'
import { toast } from 'react-hot-toast'

// Query keys for consistent caching
export const staffKeys = {
  all: ['staff'],
  byShop: (shopId) => ['staff', 'shop', shopId],
  active: (shopId) => ['staff', 'shop', shopId, 'active'],
  inactive: (shopId) => ['staff', 'shop', shopId, 'inactive'],
}

/**
 * Get all staff for a shop
 */
export function useStaff(shopId, options = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: staffKeys.byShop(shopId),
    queryFn: () => supabaseService.getStaff(shopId, options),
    enabled: enabled && !!shopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get only active staff members
 */
export function useActiveStaff(shopId) {
  return useQuery({
    queryKey: staffKeys.active(shopId),
    queryFn: () => supabaseService.getStaff(shopId, { isActive: true }),
    enabled: !!shopId,
    staleTime: 5 * 60 * 1000,
    select: (data) => data?.filter(staff => staff.is_active === true) || []
  })
}

/**
 * Get staff member by ID
 */
export function useStaffMember(staffId) {
  return useQuery({
    queryKey: ['staff', 'member', staffId],
    queryFn: async () => {
      const client = supabaseService.client || createClient()
      if (!client) throw new Error('Supabase client not available')
      
      const { data, error } = await client
        .from('barbershop_staff')
        .select('*, profiles(*)')
        .eq('id', staffId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!staffId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Create staff member mutation
 */
export function useCreateStaffMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (staffData) => supabaseService.createStaffMember(staffData),
    onSuccess: (newStaff) => {
      toast.success('Staff member added successfully')
      
      // Invalidate staff queries
      queryClient.invalidateQueries({ 
        queryKey: staffKeys.byShop(newStaff.barbershop_id) 
      })
    },
    onError: (error) => {
      console.error('Failed to create staff member:', error)
      toast.error('Failed to add staff member')
    }
  })
}

/**
 * Update staff member mutation
 */
export function useUpdateStaffMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ staffId, updates }) => 
      supabaseService.updateStaffMember(staffId, updates),
    onSuccess: (updatedStaff) => {
      toast.success('Staff member updated successfully')
      
      // Invalidate staff queries
      queryClient.invalidateQueries({ 
        queryKey: staffKeys.byShop(updatedStaff.barbershop_id) 
      })
      
      // Update specific staff member cache
      queryClient.invalidateQueries({ 
        queryKey: ['staff', 'member', updatedStaff.id] 
      })
    },
    onError: (error) => {
      console.error('Failed to update staff member:', error)
      toast.error('Failed to update staff member')
    }
  })
}

/**
 * Deactivate staff member mutation
 */
export function useDeactivateStaffMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (staffId) => 
      supabaseService.updateStaffMember(staffId, { is_active: false }),
    onSuccess: (deactivatedStaff) => {
      toast.success('Staff member deactivated')
      
      // Invalidate staff queries
      queryClient.invalidateQueries({ 
        queryKey: staffKeys.byShop(deactivatedStaff.barbershop_id) 
      })
    },
    onError: (error) => {
      console.error('Failed to deactivate staff member:', error)
      toast.error('Failed to deactivate staff member')
    }
  })
}

/**
 * Optimized real-time staff updates hook with targeted cache updates
 */
export function useRealtimeStaff(shopId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!shopId) return

    const unsubscribe = supabaseService.subscribeToChanges(
      'barbershop_staff',
      { barbershop_id: shopId },
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        
        // Update main staff query cache
        queryClient.setQueryData(staffKeys.byShop(shopId), (oldData) => {
          if (!oldData) return oldData

          switch (eventType) {
            case 'INSERT':
              // Add new staff member if not already present
              const exists = oldData.find(staff => staff.id === newRecord.id)
              if (exists) return oldData
              
              // We need profile data for display, so fetch it
              // For now, add with minimal data and trigger a background refetch
              const staffWithProfile = {
                ...newRecord,
                profile: { full_name: 'Loading...', email: '', phone: '', avatar_url: null }
              }
              
              // Trigger background refetch to get full profile data
              queryClient.invalidateQueries({ queryKey: staffKeys.byShop(shopId) })
              
              return [...oldData, staffWithProfile]

            case 'UPDATE':
              // Update existing staff member
              return oldData.map(staff => 
                staff.id === newRecord.id ? { ...staff, ...newRecord } : staff
              )

            case 'DELETE':
              // Remove staff member
              return oldData.filter(staff => staff.id !== oldRecord.id)

            default:
              return oldData
          }
        })

        // Update active staff cache if needed
        if (newRecord?.is_active !== undefined || oldRecord?.is_active !== undefined) {
          queryClient.invalidateQueries({ queryKey: staffKeys.active(shopId) })
        }

        // Update specific staff member cache if available
        const staffId = (newRecord || oldRecord)?.id
        if (staffId) {
          queryClient.invalidateQueries({ 
            queryKey: ['staff', 'member', staffId] 
          })
        }
      }
    )

    return unsubscribe
  }, [shopId, queryClient])
}

/**
 * Combined hook for staff with real-time updates
 */
export function useStaffWithRealtime(shopId, options = {}) {
  // Set up real-time subscription
  useRealtimeStaff(shopId)
  
  // Return the staff query
  return useStaff(shopId, options)
}

/**
 * Get staff members as options for select components
 */
export function useStaffOptions(shopId) {
  const { data: staff, ...rest } = useActiveStaff(shopId)

  return {
    ...rest,
    data: staff?.map(member => ({
      value: member.user_id,
      label: member.profile?.full_name || member.profile?.email || 'Unknown',
      staff: member
    })) || []
  }
}