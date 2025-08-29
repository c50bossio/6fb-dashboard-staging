/**
 * Business Context Hook
 * Replaces BusinessContext, TenantContext, and shop-related contexts
 * Provides current user's business information and permissions
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import supabaseService from '@/lib/supabase-service'
import { getCurrentUser, getSupabaseClient } from '@/lib/supabase-client'

// Query keys
export const businessContextKeys = {
  currentUser: ['business-context', 'current-user'],
  userProfile: (userId) => ['business-context', 'profile', userId],
  userPermissions: (userId) => ['business-context', 'permissions', userId],
  userShop: (userId) => ['business-context', 'shop', userId],
}

/**
 * Get current user and their business context
 */
export function useBusinessContext() {
  const queryClient = useQueryClient()

  // Get current authenticated user
  const userQuery = useQuery({
    queryKey: businessContextKeys.currentUser,
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const userId = userQuery.data?.id

  // Get user profile and business association
  const profileQuery = useQuery({
    queryKey: businessContextKeys.userProfile(userId),
    queryFn: async () => {
      if (!userId) return null
      
      const client = getSupabaseClient()
      if (!client) throw new Error('Supabase client not available')
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  })

  // Get user's shop ID and role
  const shopContextQuery = useQuery({
    queryKey: businessContextKeys.userShop(userId),
    queryFn: async () => {
      if (!userId) return null
      
      const shopId = await supabaseService.getUserShopId(userId)
      if (!shopId) return null
      
      // Get the barbershop details
      const shop = await supabaseService.getBarbershop(shopId)
      
      // Determine user role
      let role = 'CLIENT'
      let permissions = []
      
      const profile = profileQuery.data
      if (profile) {
        // Check if user is shop owner
        if (shop.owner_id === userId) {
          role = 'SHOP_OWNER'
          permissions = ['manage_shop', 'manage_staff', 'view_analytics', 'manage_appointments']
        } else {
          // Check if user is staff
          const client = supabaseService.client || getSupabaseClient()
          if (!client) throw new Error('Supabase client not available')
          
          const { data: staffRecord } = await client
            .from('barbershop_staff')
            .select('role, permissions')
            .eq('user_id', userId)
            .eq('barbershop_id', shopId)
            .eq('is_active', true)
            .single()
          
          if (staffRecord) {
            role = staffRecord.role || 'BARBER'
            permissions = staffRecord.permissions || ['manage_appointments']
          }
        }
      }
      
      return {
        shopId,
        shop,
        role,
        permissions,
        isOwner: shop.owner_id === userId,
        isStaff: role !== 'CLIENT'
      }
    },
    enabled: !!userId && !!profileQuery.data,
    staleTime: 10 * 60 * 1000,
  })

  // Update service context when user changes
  useEffect(() => {
    const updateServiceContext = async () => {
      if (userQuery.data && shopContextQuery.data) {
        await supabaseService.refreshCurrentUser()
      }
    }
    
    updateServiceContext()
  }, [userQuery.data, shopContextQuery.data])

  // Computed values
  const isLoading = userQuery.isLoading || profileQuery.isLoading || shopContextQuery.isLoading
  const error = userQuery.error || profileQuery.error || shopContextQuery.error

  const businessContext = useMemo(() => {
    const user = userQuery.data
    const profile = profileQuery.data
    const shopContext = shopContextQuery.data

    if (!user || !profile) {
      return null
    }

    return {
      // User information
      user,
      profile,
      
      // Business context
      shopId: shopContext?.shopId || null,
      shop: shopContext?.shop || null,
      role: shopContext?.role || 'CLIENT',
      permissions: shopContext?.permissions || [],
      
      // Convenience flags
      isOwner: shopContext?.isOwner || false,
      isStaff: shopContext?.isStaff || false,
      isClient: (shopContext?.role || 'CLIENT') === 'CLIENT',
      
      // Permission checkers
      hasPermission: (permission) => 
        shopContext?.permissions?.includes(permission) || false,
      
      canManageShop: () => 
        shopContext?.permissions?.includes('manage_shop') || false,
      
      canManageStaff: () => 
        shopContext?.permissions?.includes('manage_staff') || false,
      
      canViewAnalytics: () => 
        shopContext?.permissions?.includes('view_analytics') || false,
      
      canManageAppointments: () => 
        shopContext?.permissions?.includes('manage_appointments') || false,
    }
  }, [userQuery.data, profileQuery.data, shopContextQuery.data])

  // Refresh function
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: businessContextKeys.currentUser })
    queryClient.invalidateQueries({ queryKey: businessContextKeys.userProfile(userId) })
    queryClient.invalidateQueries({ queryKey: businessContextKeys.userShop(userId) })
  }

  return {
    // Main data
    businessContext,
    isLoading,
    error,
    
    // Individual pieces
    user: userQuery.data,
    profile: profileQuery.data,
    shopContext: shopContextQuery.data,
    
    // Convenience accessors
    shopId: businessContext?.shopId,
    role: businessContext?.role,
    permissions: businessContext?.permissions || [],
    isOwner: businessContext?.isOwner || false,
    isStaff: businessContext?.isStaff || false,
    
    // Actions
    refresh,
    
    // Query objects for advanced usage
    queries: {
      user: userQuery,
      profile: profileQuery,
      shopContext: shopContextQuery
    }
  }
}

/**
 * Permission hook for conditional rendering
 */
export function usePermissions() {
  const { permissions, hasPermission, canManageShop, canManageStaff, canViewAnalytics, canManageAppointments } = useBusinessContext()
  
  return {
    permissions,
    hasPermission,
    canManageShop: canManageShop(),
    canManageStaff: canManageStaff(),
    canViewAnalytics: canViewAnalytics(),
    canManageAppointments: canManageAppointments(),
  }
}

/**
 * Current shop hook (shorthand)
 */
export function useCurrentShopId() {
  const { shopId } = useBusinessContext()
  return shopId
}

/**
 * User role hook (shorthand)
 */
export function useUserRole() {
  const { role, isOwner, isStaff, isClient } = useBusinessContext()
  
  return {
    role,
    isOwner,
    isStaff,
    isClient
  }
}