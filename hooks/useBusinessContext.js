/**
 * Business Context Hook
 * Replaces BusinessContext, TenantContext, and shop-related contexts
 * Provides current user's business information and permissions
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useContext } from 'react'
import supabaseService from '@/lib/supabase-service'
import { createClient } from '@/lib/supabase/browser-client'

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
    console.log('🏪 BusinessContext: Using development fallback user')
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
  console.log('🏪 BusinessContext: Hook called')
  const businessContextStart = performance.now()
  
  const queryClient = useQueryClient()

  // Get current authenticated user
  console.log('🏪 BusinessContext: Fetching current user...')
  const userQuery = useQuery({
    queryKey: businessContextKeys.currentUser,
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const userId = userQuery.data?.id
  console.log('🏪 BusinessContext: User query state:', {
    isLoading: userQuery.isLoading,
    hasUser: !!userQuery.data,
    userId,
    userEmail: userQuery.data?.email,
    error: userQuery.error?.message
  })

  // Get user profile and business association
  console.log('🏪 BusinessContext: Setting up profile query for userId:', userId)
  const profileQuery = useQuery({
    queryKey: businessContextKeys.userProfile(userId),
    queryFn: async () => {
      if (!userId) return null
      
      console.log('🏪 BusinessContext: Executing profile query for:', userId)
      const profileStart = performance.now()
      
      const client = getSupabaseClient()
      if (!client) throw new Error('Supabase client not available')
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const profileTime = performance.now() - profileStart
      console.log('🏪 BusinessContext: Profile query result:', {
        hasData: !!data,
        role: data?.role,
        shopId: data?.shop_id,
        barbershopId: data?.barbershop_id,
        subscriptionTier: data?.subscription_tier,
        hasError: !!error,
        errorCode: error?.code,
        errorMessage: error?.message,
        queryTime: profileTime.toFixed(2) + 'ms'
      })
      
      if (error) {
        // In development, if the profile doesn't exist, return mock profile
        if (process.env.NODE_ENV === 'development' && userId === 'dev-user-123') {
          console.log('🏪 BusinessContext: Using development fallback profile')
          return {
            id: 'dev-user-123',
            email: 'dev@6fb.local',
            full_name: 'Development User',
            subscription_tier: 'pro',
            subscription_status: 'active',
            role: 'SHOP_OWNER',
            shop_id: 'dev-shop-123',
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

  console.log('🏪 BusinessContext: Profile query state:', {
    isLoading: profileQuery.isLoading,
    hasProfile: !!profileQuery.data,
    profileRole: profileQuery.data?.role,
    error: profileQuery.error?.message
  })

  // Get user's shop ID and role
  console.log('🏪 BusinessContext: Setting up shop context query, enabled:', !!userId && !!profileQuery.data)
  const shopContextQuery = useQuery({
    queryKey: businessContextKeys.userShop(userId),
    queryFn: async () => {
      if (!userId) {
        console.log('🏪 BusinessContext: No userId for shop query')
        return null
      }
      
      console.log('🏪 BusinessContext: Executing shop context query for:', userId)
      const shopStart = performance.now()
      
      // Get shop ID using service
      console.log('🏪 BusinessContext: Getting user shop ID...')
      const shopIdStart = performance.now()
      const shopId = await supabaseService.getUserShopId(userId)
      console.log('🏪 BusinessContext: getUserShopId result:', {
        shopId,
        timeToGetShopId: (performance.now() - shopIdStart).toFixed(2) + 'ms'
      })
      
      if (!shopId) {
        console.warn('🏪 BusinessContext: No shop ID found for user')
        console.warn('🏪 BookedBarber: User may not be associated with any barbershop')
        return null
      }
      
      // Get the barbershop details
      console.log('🏪 BusinessContext: Getting barbershop details for shopId:', shopId)
      const barbershopStart = performance.now()
      const shop = await supabaseService.getBarbershop(shopId)
      console.log('🏪 BusinessContext: getBarbershop result:', {
        hasShop: !!shop,
        shopName: shop?.name,
        ownerId: shop?.owner_id,
        timeToGetBarbershop: (performance.now() - barbershopStart).toFixed(2) + 'ms'
      })
      
      // Determine user role
      let role = 'CLIENT'
      let permissions = []
      
      const profile = profileQuery.data
      console.log('🏪 BusinessContext: Determining user role with profile:', {
        hasProfile: !!profile,
        profileRole: profile?.role,
        shopOwnerId: shop?.owner_id,
        isOwner: shop?.owner_id === userId
      })
      
      if (profile) {
        // Check if user is shop owner
        if (shop.owner_id === userId) {
          role = 'SHOP_OWNER'
          permissions = ['manage_shop', 'manage_staff', 'view_analytics', 'manage_appointments']
          console.log('🏪 BusinessContext: User identified as shop owner')
        } else {
          // Check if user is staff
          console.log('🏪 BusinessContext: Checking staff association...')
          const staffStart = performance.now()
          const client = supabaseService.client || getSupabaseClient()
          if (!client) throw new Error('Supabase client not available')
          
          const { data: staffRecord } = await client
            .from('barbershop_staff')
            .select('role, permissions')
            .eq('user_id', userId)
            .eq('barbershop_id', shopId)
            .eq('is_active', true)
            .single()
          
          console.log('🏪 BusinessContext: Staff query result:', {
            hasStaffRecord: !!staffRecord,
            staffRole: staffRecord?.role,
            staffPermissions: staffRecord?.permissions,
            staffQueryTime: (performance.now() - staffStart).toFixed(2) + 'ms'
          })
          
          if (staffRecord) {
            role = staffRecord.role || 'BARBER'
            permissions = staffRecord.permissions || ['manage_appointments']
            console.log('🏪 BusinessContext: User identified as staff member:', role)
          } else {
            console.log('🏪 BusinessContext: User has no staff association, keeping CLIENT role')
          }
        }
      }
      
      const result = {
        shopId,
        shop,
        role,
        permissions,
        isOwner: shop.owner_id === userId,
        isStaff: role !== 'CLIENT'
      }
      
      console.log('🏪 BusinessContext: Shop context query complete:', {
        shopId: result.shopId,
        role: result.role,
        isOwner: result.isOwner,
        isStaff: result.isStaff,
        permissionsCount: result.permissions?.length || 0,
        totalTime: (performance.now() - shopStart).toFixed(2) + 'ms'
      })
      
      return result
    },
    enabled: !!userId && !!profileQuery.data,
    staleTime: 10 * 60 * 1000,
  })

  console.log('🏪 BusinessContext: Shop context query state:', {
    isLoading: shopContextQuery.isLoading,
    hasShopContext: !!shopContextQuery.data,
    shopId: shopContextQuery.data?.shopId,
    role: shopContextQuery.data?.role,
    error: shopContextQuery.error?.message
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

  console.log('🏪 BusinessContext: Overall loading state:', {
    userLoading: userQuery.isLoading,
    profileLoading: profileQuery.isLoading,
    shopContextLoading: shopContextQuery.isLoading,
    isLoading,
    hasError: !!error,
    errorMessage: error?.message
  })

  const businessContext = useMemo(() => {
    console.log('🏪 BusinessContext: Computing business context...')
    const computeStart = performance.now()
    
    const user = userQuery.data
    const profile = profileQuery.data
    const shopContext = shopContextQuery.data

    console.log('🏪 BusinessContext: Memo inputs:', {
      hasUser: !!user,
      hasProfile: !!profile,
      hasShopContext: !!shopContext,
      userEmail: user?.email,
      profileRole: profile?.role,
      shopId: shopContext?.shopId
    })

    if (!user || !profile) {
      console.log('🏪 BusinessContext: Missing user or profile, returning null')
      console.log('🏪 BookedBarber: BusinessContext not ready yet')
      return null
    }

    const context = {
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

    console.log('🏪 BusinessContext: Computed context:', {
      shopId: context.shopId,
      role: context.role,
      isOwner: context.isOwner,
      isStaff: context.isStaff,
      isClient: context.isClient,
      permissionsCount: context.permissions.length,
      computeTime: (performance.now() - computeStart).toFixed(2) + 'ms'
    })
    
    console.log('🏪 BookedBarber: BusinessContext ready for dashboard')
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

  console.log('🏪 BusinessContext: Hook returning:', {
    hasBusinessContext: !!result.businessContext,
    isLoading: result.isLoading,
    hasError: !!result.error,
    shopId: result.shopId,
    role: result.role,
    isOwner: result.isOwner,
    isStaff: result.isStaff,
    totalHookTime: (performance.now() - businessContextStart).toFixed(2) + 'ms'
  })

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