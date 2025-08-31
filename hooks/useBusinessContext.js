/**
 * Business Context Hook
 * Replaces BusinessContext, TenantContext, and shop-related contexts
 * Provides current user's business information and permissions
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useContext } from 'react'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Try to import auth context - will work in dev mode
let AuthContext
try {
  AuthContext = require('react').createContext({})
  // In development, look for DevAuthProvider context
  if (typeof window !== 'undefined') {
    const authProviders = ['SupabaseAuthProvider', 'DevAuthProvider']
    // This will be resolved by the auth provider context
  }
} catch (e) {
  // Fallback if no auth context available
}

// Adapter functions
const getCurrentUser = async (authUser = null) => {
  // If we have an authUser from context (dev mode), use it
  if (authUser) {
    return authUser
  }
  
  const client = createClient()
  const { data: { user } } = await client.auth.getUser()
  
  // If no user from Supabase and we're in development, return mock dev user
  if (!user && process.env.NODE_ENV === 'development') {
    return {
      id: 'dev-user-123',
      email: 'dev@6fb.local',
      user_metadata: { full_name: 'Development User' }
    }
  }
  
  return user
}
const getSupabaseClient = createClient

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
  const businessContextStart = performance.now()
  
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
      
      if (error) {
        // In development, if the profile doesn't exist, return mock profile
        if (process.env.NODE_ENV === 'development' && userId === 'dev-user-123') {
          return {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            full_name: 'Development User',
            subscription_tier: 'pro',
            subscription_status: 'active',
            role: 'SHOP_OWNER',
            barbershop_id: 'dev-shop-123'
          }
        }
        throw error
      }
      return data
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  })

  // Get user's shop ID and role
  const shopContextQuery = useQuery({
    queryKey: businessContextKeys.userShop(userId),
    queryFn: async () => {
      if (!userId) {
        return null
      }
      
      // Get shop ID using service
      const client = createClient()
      const barbershopId = await client.getUserShopId(userId)
      
      if (!barbershopId) {
        return null
      }
      
      // Get the barbershop details
      const shop = await client.getBarbershop(barbershopId)
      
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
          // Check if user is staff based on their profile role
          // Skip barbershop_staff table query to avoid 406 errors
          if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true' && userId === 'dev-user-123') {
            role = 'SHOP_OWNER'
            permissions = ['manage_shop', 'manage_staff', 'view_analytics', 'manage_appointments']
          } else {
            // Use profile role to determine permissions
            // If user has access to a shop but isn't the owner, they're staff
            role = profile?.role || 'BARBER'
            
            // Set permissions based on role
            if (role === 'BARBER' || role === 'STAFF') {
              permissions = ['manage_appointments', 'view_customers']
            } else if (role === 'MANAGER') {
              permissions = ['manage_appointments', 'view_customers', 'view_analytics']
            } else {
              permissions = ['manage_appointments']
            }
          }
        }
      }
      
      const result = {
        barbershopId,
        shop,
        role,
        permissions,
        isOwner: shop.owner_id === userId,
        isStaff: role !== 'CLIENT'
      }
      
      return result
    },
    enabled: !!userId && !!profileQuery.data,
    staleTime: 10 * 60 * 1000,
  })

  // Update service context when user changes
  useEffect(() => {
    const updateServiceContext = async () => {
      if (userQuery.data && shopContextQuery.data) {
        const client = createClient()
        await client.refreshCurrentUser()
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

    const context = {
      // User information
      user,
      profile,
      
      // Business context
      barbershopId: shopContext?.barbershopId || null,
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

    return context
  }, [userQuery.data, profileQuery.data, shopContextQuery.data])

  // Refresh function
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: businessContextKeys.currentUser })
    queryClient.invalidateQueries({ queryKey: businessContextKeys.userProfile(userId) })
    queryClient.invalidateQueries({ queryKey: businessContextKeys.userShop(userId) })
  }

  const result = {
    // Main data
    businessContext,
    isLoading,
    error,
    
    // Individual pieces
    user: userQuery.data,
    profile: profileQuery.data,
    shopContext: shopContextQuery.data,
    
    // Convenience accessors
    barbershopId: businessContext?.barbershopId,
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

  return result
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
  const { barbershopId } = useBusinessContext()
  return barbershopId
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