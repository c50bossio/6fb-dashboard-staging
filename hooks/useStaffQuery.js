/**
 * React Query hooks for staff data
 * Replaces StaffContext and direct Supabase queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Query keys for consistent caching
export const staffKeys = {
  all: ['staff'],
  byShop: (barbershopId) => ['staff', 'shop', barbershopId],
  active: (barbershopId) => ['staff', 'shop', barbershopId, 'active'],
  inactive: (barbershopId) => ['staff', 'shop', barbershopId, 'inactive'],
  canTakeAppointments: (barbershopId) => ['staff', 'shop', barbershopId, 'can_take_appointments'],
  appointmentProviders: (barbershopId) => ['staff', 'shop', barbershopId, 'appointment_providers'],
}

/**
 * Get all staff for a shop
 */
export function useStaff(barbershopId, options = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: staffKeys.byShop(barbershopId),
    queryFn: async () => {
      if (!barbershopId) {
        throw new Error('Barbershop ID is required')
      }

      const response = await fetch(`/api/staff?barbershop_id=${barbershopId}`)
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to fetch staff: ${response.status} ${error}`)
      }
      
      const data = await response.json()
      return data.staff || []
    },
    enabled: enabled && !!barbershopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get only active staff members
 */
export function useActiveStaff(barbershopId) {
  return useQuery({
    queryKey: staffKeys.active(barbershopId),
    queryFn: async () => {
      if (!barbershopId) {
        throw new Error('Barbershop ID is required')
      }

      const response = await fetch(`/api/staff?barbershop_id=${barbershopId}`)
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to fetch staff: ${response.status} ${error}`)
      }
      
      const data = await response.json()
      const allStaff = data.staff || []
      
      // Filter only active staff
      return allStaff.filter(staff => staff.is_active === true)
    },
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get staff members who can take appointments (for booking dropdowns)
 */
export function useAppointmentProviders(barbershopId) {
  return useQuery({
    queryKey: staffKeys.appointmentProviders(barbershopId),
    queryFn: async () => {
      if (!barbershopId) {
        throw new Error('Barbershop ID is required')
      }

      const response = await fetch(`/api/staff?barbershop_id=${barbershopId}`)
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to fetch staff: ${response.status} ${error}`)
      }
      
      const data = await response.json()
      const allStaff = data.staff || []
      
      // Filter staff who can take appointments and are active and visible for booking
      return allStaff.filter(staff => 
        staff.is_active === true && 
        staff.can_take_appointments === true &&
        staff.is_visible_for_booking !== false
      )
    },
    enabled: !!barbershopId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Get staff members who can take appointments (backward compatible with existing booking logic)
 */
export function useAvailableBarbers(barbershopId) {
  // Alias for appointment providers to maintain compatibility
  return useAppointmentProviders(barbershopId)
}

/**
 * Get staff member by ID
 */
export function useStaffMember(staffId) {
  return useQuery({
    queryKey: ['staff', 'member', staffId],
    queryFn: async () => {
      if (!staffId) throw new Error('Staff ID is required')
      
      const client = createClient()
      const { data, error } = await client
        .from('profiles')
        .select(`
          *,
          can_take_appointments,
          is_visible_for_booking,
          service_provider_since
        `)
        .eq('id', staffId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Staff member not found')
        }
        throw error
      }
      
      // Transform to staff format for compatibility with role-based defaults
      const defaultCanTakeAppointments = data.can_take_appointments ?? (
        data.role === 'BARBER' ? true : 
        data.role === 'ENTERPRISE_OWNER' ? true :
        data.role === 'SHOP_OWNER' ? true :
        data.role === 'MANAGER' ? false :
        false // STAFF role defaults to false
      )
      
      return {
        id: data.id,
        user_id: data.id,
        barbershop_id: data.barbershop_id,
        role: data.role,
        is_active: data.is_active ?? true,
        can_take_appointments: defaultCanTakeAppointments,
        is_visible_for_booking: data.is_visible_for_booking ?? true,
        service_provider_since: data.service_provider_since || data.created_at,
        profile: data,
        ...data
      }
    },
    enabled: !!staffId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Create staff member mutation
 * TODO: Implement proper API endpoint for staff creation
 */
export function useCreateStaffMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (staffData) => {
      // For now, use direct profile creation since staff are stored in profiles table
      const client = createClient()
      const { data, error } = await client
        .from('profiles')
        .insert([{
          ...staffData,
          role: staffData.role || 'BARBER',
          is_active: true,
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    },
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
    mutationFn: async ({ staffId, updates }) => {
      // Update profile directly since staff are stored in profiles table
      const client = createClient()
      const { data, error } = await client
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (updatedStaff) => {
      toast.success('Staff member updated successfully')
      
      // Invalidate all relevant staff queries
      queryClient.invalidateQueries({ 
        queryKey: staffKeys.byShop(updatedStaff.barbershop_id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: staffKeys.active(updatedStaff.barbershop_id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: staffKeys.appointmentProviders(updatedStaff.barbershop_id) 
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
 * Toggle appointment capability for staff member
 */
export function useToggleAppointmentCapability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ staffId, canTakeAppointments }) => {
      const client = createClient()
      const { data, error } = await client
        .from('profiles')
        .update({
          can_take_appointments: canTakeAppointments,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (updatedStaff) => {
      const action = updatedStaff.can_take_appointments ? 'enabled' : 'disabled'
      toast.success(`Appointment capability ${action} for ${updatedStaff.full_name || 'staff member'}`)
      
      // Invalidate all relevant staff queries - especially appointment providers
      queryClient.invalidateQueries({ 
        queryKey: staffKeys.byShop(updatedStaff.barbershop_id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: staffKeys.appointmentProviders(updatedStaff.barbershop_id) 
      })
      
      // Update specific staff member cache
      queryClient.invalidateQueries({ 
        queryKey: ['staff', 'member', updatedStaff.id] 
      })
    },
    onError: (error) => {
      console.error('Failed to toggle appointment capability:', error)
      toast.error('Failed to update appointment capability')
    }
  })
}

/**
 * Deactivate staff member mutation
 */
export function useDeactivateStaffMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (staffId) => {
      // Deactivate by updating profile
      const client = createClient()
      const { data, error } = await client
        .from('profiles')
        .update({ is_active: false })
        .eq('id', staffId)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
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
export function useRealtimeStaff(barbershopId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!barbershopId) return

    const unsubscribe = createClient().subscribeToChanges(
      'barbershop_staff',
      { barbershop_id: barbershopId },
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload
        
        // Update main staff query cache
        queryClient.setQueryData(staffKeys.byShop(barbershopId), (oldData) => {
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
              queryClient.invalidateQueries({ queryKey: staffKeys.byShop(barbershopId) })
              
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
          queryClient.invalidateQueries({ queryKey: staffKeys.active(barbershopId) })
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
  }, [barbershopId, queryClient])
}

/**
 * Combined hook for staff with real-time updates
 */
export function useStaffWithRealtime(barbershopId, options = {}) {
  // Set up real-time subscription
  useRealtimeStaff(barbershopId)
  
  // Return the staff query
  return useStaff(barbershopId, options)
}

/**
 * Get staff members as options for select components (all active staff)
 */
export function useStaffOptions(barbershopId) {
  const { data: staff, ...rest } = useActiveStaff(barbershopId)

  return {
    ...rest,
    data: staff?.map(member => ({
      value: member.user_id,
      label: member.profile?.full_name || member.profile?.email || 'Unknown',
      staff: member
    })) || []
  }
}

/**
 * Get staff members who can take appointments as options for booking select components
 */
export function useAppointmentProviderOptions(barbershopId) {
  const { data: staff, ...rest } = useAppointmentProviders(barbershopId)

  return {
    ...rest,
    data: staff?.map(member => ({
      value: member.user_id,
      label: member.profile?.full_name || member.profile?.email || 'Unknown',
      staff: member
    })) || []
  }
}

/**
 * Backward compatible alias for booking components
 */
export function useBarberOptions(barbershopId) {
  return useAppointmentProviderOptions(barbershopId)
}