'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
// Removed: import { getUserAccessibleLocations } from '@/lib/services/user-locations'
// Now using /api/user/locations directly to match Location Management page

/**
 * Unified Context Provider - Single source of truth for context management
 * 
 * Replaces the dual ViewSwitcher + GlobalContextSelector system with a 
 * unified three-layer architecture: Organization → Location → Resource
 * 
 * Based on enterprise patterns from Stripe, Salesforce, and Shopify
 */

// Context levels
export const CONTEXT_LEVELS = {
  ORGANIZATION: 'ORGANIZATION',
  LOCATION: 'LOCATION', 
  RESOURCE: 'RESOURCE'
}

// Permission matrix for context access
const CONTEXT_PERMISSIONS = {
  ENTERPRISE_OWNER: [CONTEXT_LEVELS.ORGANIZATION, CONTEXT_LEVELS.LOCATION, CONTEXT_LEVELS.RESOURCE],
  SUPER_ADMIN: [CONTEXT_LEVELS.ORGANIZATION, CONTEXT_LEVELS.LOCATION, CONTEXT_LEVELS.RESOURCE],
  SHOP_OWNER: [CONTEXT_LEVELS.LOCATION, CONTEXT_LEVELS.RESOURCE],
  BARBER: [CONTEXT_LEVELS.RESOURCE], // Own resource only
  CLIENT: [], // No context switching
  CUSTOMER: [] // No context switching
}

// Create context
const UnifiedContextContext = createContext(null)

// Context provider component
export function UnifiedContextProvider({ children }) {
  const { user, profile } = useAuth()
  const supabase = createClient()
  
  // Core state
  const [context, setContextState] = useState(null)
  const [availableContexts, setAvailableContexts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [initialized, setInitialized] = useState(false)

  const userRole = profile?.role || 'CLIENT'
  const userId = profile?.id

  // Get user's permitted context levels
  const getPermittedLevels = useCallback(() => {
    return CONTEXT_PERMISSIONS[userRole] || []
  }, [userRole])

  // Validate if user can access a specific context
  const canAccessContext = useCallback((contextToCheck) => {
    const permittedLevels = getPermittedLevels()
    
    if (!permittedLevels.includes(contextToCheck.level)) {
      return false
    }

    // Additional validation based on context level
    switch (contextToCheck.level) {
      case CONTEXT_LEVELS.ORGANIZATION:
        // Must be ENTERPRISE_OWNER or SUPER_ADMIN
        return ['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
        
      case CONTEXT_LEVELS.LOCATION:
        // SHOP_OWNER can access their own shops
        // ENTERPRISE_OWNER can access any shop in their org
        return ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
        
      case CONTEXT_LEVELS.RESOURCE:
        // BARBER can access their own resource only
        // SHOP_OWNER can access resources in their shop
        // ENTERPRISE_OWNER can access any resource in their org
        if (userRole === 'BARBER') {
          return contextToCheck.resourceId === userId
        }
        return ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)
        
      default:
        return false
    }
  }, [userRole, userId])

  // Build breadcrumbs for context navigation
  const buildBreadcrumbs = useCallback((contextObj) => {
    const breadcrumbs = []

    if (contextObj.organizationId && contextObj.metadata?.organizationName) {
      breadcrumbs.push({
        level: CONTEXT_LEVELS.ORGANIZATION,
        id: contextObj.organizationId,
        name: contextObj.metadata.organizationName,
        href: '/?context=organization'
      })
    }

    if (contextObj.locationId && contextObj.metadata?.locationName) {
      breadcrumbs.push({
        level: CONTEXT_LEVELS.LOCATION,
        id: contextObj.locationId,
        name: contextObj.metadata.locationName,
        href: `/?context=location&locationId=${contextObj.locationId}`
      })
    }

    if (contextObj.resourceId && contextObj.metadata?.resourceName) {
      breadcrumbs.push({
        level: CONTEXT_LEVELS.RESOURCE,
        id: contextObj.resourceId,
        name: contextObj.metadata.resourceName,
        href: `/?context=resource&resourceId=${contextObj.resourceId}`
      })
    }

    return breadcrumbs
  }, [])

  // Load available contexts based on user role and permissions
  const loadAvailableContexts = useCallback(async () => {
    if (!userId || !userRole) {
      if (process.env.NEXT_PUBLIC_DEBUG_UNIFIED_CONTEXT === 'true') {
        console.log('[UnifiedContextProvider] loadAvailableContexts: No userId or userRole', { userId, userRole })
      }
      return []
    }

    try {
      if (process.env.NEXT_PUBLIC_DEBUG_UNIFIED_CONTEXT === 'true') {
        console.log('[UnifiedContextProvider] loadAvailableContexts called with:', {
          userId,
          userRole,
          profileData: profile ? { id: profile.id, role: profile.role, organization_id: profile.organization_id } : null
        })
      }

      const contexts = []
      const permittedLevels = getPermittedLevels()
      
      if (process.env.NEXT_PUBLIC_DEBUG_UNIFIED_CONTEXT === 'true') {
        console.log('[UnifiedContextProvider] User permitted levels:', permittedLevels)
      }

      // Organization level contexts (ENTERPRISE_OWNER only)
      if (permittedLevels.includes(CONTEXT_LEVELS.ORGANIZATION)) {
        const { data: organizations } = await supabase
          .from('organizations')
          .select('id, name, description')
          .eq('owner_id', userId)

        if (organizations?.length > 0) {
          organizations.forEach(org => {
            contexts.push({
              level: CONTEXT_LEVELS.ORGANIZATION,
              organizationId: org.id,
              displayName: org.name,
              metadata: {
                organizationName: org.name,
                description: org.description
              },
              permissions: permittedLevels
            })
          })
        }
      }

      // Location level contexts - Use API endpoint (same as Location Management)
      if (permittedLevels.includes(CONTEXT_LEVELS.LOCATION)) {
        if (process.env.NEXT_PUBLIC_DEBUG_UNIFIED_CONTEXT === 'true') {
          console.log('[UnifiedContextProvider] Loading location contexts using /api/user/locations (same as Location Management)')
        }
        
        let locations = []
        try {
          const response = await fetch('/api/user/locations')
          const locationData = await response.json()
          locations = locationData.data || []
          
          console.log('[UnifiedContextProvider] /api/user/locations returned:', {
            locationsCount: locations?.length || 0,
            locations: locations?.map(loc => ({ 
              id: loc.id, 
              name: loc.name
            })) || 'No locations',
            rawResponse: locationData
          })
        } catch (error) {
          console.error('[UnifiedContextProvider] Error fetching locations:', error)
          locations = []
        }
        
        if (locations?.length > 0) {
          // Get the user's organization ID for enterprise owners
          const userOrgId = userRole === 'ENTERPRISE_OWNER' ? profile.organization_id : null
          
          console.log('[UnifiedContextProvider] Processing locations with userOrgId:', userOrgId)
          
          locations.forEach(location => {
            // Skip if already added (avoid duplicates)
            if (!contexts.find(c => c.locationId === location.id)) {
              contexts.push({
                level: CONTEXT_LEVELS.LOCATION,
                locationId: location.id,
                organizationId: userOrgId,
                displayName: location.displayName || location.name,
                metadata: {
                  locationName: location.metadata?.locationName || location.name,
                  organizationName: userRole === 'ENTERPRISE_OWNER' ? 
                    (contexts.find(c => c.level === CONTEXT_LEVELS.ORGANIZATION)?.displayName || null) : 
                    null,
                  fallback: location.metadata?.fallback || false
                },
                permissions: permittedLevels
              })
            }
          })
        }
      }

      // Resource level contexts (barbers, services, etc.)
      if (permittedLevels.includes(CONTEXT_LEVELS.RESOURCE)) {
        if (userRole === 'BARBER') {
          // Barber sees only their own resource
          contexts.push({
            level: CONTEXT_LEVELS.RESOURCE,
            resourceId: userId,
            displayName: profile.full_name || profile.email || 'My Profile',
            metadata: {
              resourceName: profile.full_name || profile.email,
              resourceType: 'BARBER'
            },
            permissions: permittedLevels
          })
        } else {
          // Shop owners and enterprise owners can see barber resources
          // Get staff for barbershops owned by the user
          const { data: staff } = await supabase
            .from('barbershop_staff')
            .select('user_id, barbershop_id, role, is_active')
          
          if (staff?.length > 0) {
            // Filter staff for barbershops owned by the current user
            const userOwnedStaff = staff.filter(s => {
              const location = locations.find(l => l.id === s.barbershop_id)
              return location && location.owner_id === userId
            })
            
            // Get profile data for staff members
            if (userOwnedStaff.length > 0) {
              const staffUserIds = userOwnedStaff.map(s => s.user_id)
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', staffUserIds)
              
              // Get barbershop names
              const barbershopIds = [...new Set(userOwnedStaff.map(s => s.barbershop_id))]
              const { data: barbershops } = await supabase
                .from('barbershops')
                .select('id, name')
                .in('id', barbershopIds)
              
              userOwnedStaff.forEach(staffMember => {
                const profile = profiles.find(p => p.id === staffMember.user_id)
                const barbershop = barbershops.find(b => b.id === staffMember.barbershop_id)
                
                if (profile && barbershop) {
                  contexts.push({
                    level: CONTEXT_LEVELS.RESOURCE,
                    resourceId: staffMember.user_id,
                    locationId: staffMember.barbershop_id,
                    organizationId: userRole === 'ENTERPRISE_OWNER' ? profile.organization_id : null,
                    displayName: profile.full_name || profile.email,
                    metadata: {
                      resourceName: profile.full_name || profile.email,
                      resourceType: 'BARBER',
                      locationName: barbershop.name
                    },
                    permissions: permittedLevels
                  })
                }
              })
            }
          }
        }
      }

      console.log('[UnifiedContextProvider] Final contexts generated:', {
        contextsCount: contexts.length,
        contexts: contexts.map(ctx => ({
          level: ctx.level,
          locationId: ctx.locationId,
          organizationId: ctx.organizationId,
          displayName: ctx.displayName,
          metadata: ctx.metadata
        }))
      })

      return contexts
    } catch (error) {
      console.error('[UnifiedContextProvider] Error loading available contexts:', error)
      return []
    }
  }, [userId, userRole, supabase, getPermittedLevels, profile])

  // Get user's default context based on role
  const getDefaultContext = useCallback(async () => {
    const availableContextsList = await loadAvailableContexts()
    
    if (availableContextsList.length === 0) {
      return null
    }

    // Try to restore from user preferences first (graceful fallback if table doesn't exist)
    try {
      const { data: preferences, error: preferencesError } = await supabase
        .from('user_context_preferences')
        .select('default_context, last_context')
        .eq('user_id', userId)
        .single()

      // Handle missing table gracefully (404 errors)
      if (preferencesError && (preferencesError.code === 'PGRST106' || preferencesError.code === '42P01')) {
        console.log('📋 [UnifiedContextProvider] user_context_preferences table not found, using default context selection')
        // Continue with fallback logic below
      } else if (preferences?.last_context) {
        const lastContext = preferences.last_context
        const isValid = availableContextsList.some(ctx => 
          ctx.level === lastContext.level &&
          ctx.organizationId === lastContext.organizationId &&
          ctx.locationId === lastContext.locationId &&
          ctx.resourceId === lastContext.resourceId
        )

        if (isValid && canAccessContext(lastContext)) {
          return {
            ...lastContext,
            breadcrumbs: buildBreadcrumbs(lastContext),
            permissions: getPermittedLevels()
          }
        }
      }
    } catch (error) {
      console.log('No saved context preferences, using default')
    }

    // Determine default based on role hierarchy
    switch (userRole) {
      case 'ENTERPRISE_OWNER':
        // Default to organization view if available
        const orgContext = availableContextsList.find(ctx => ctx.level === CONTEXT_LEVELS.ORGANIZATION)
        if (orgContext) return orgContext
        // Fall through to location if no org
        
      case 'SHOP_OWNER':
        // Default to location view
        const locationContext = availableContextsList.find(ctx => ctx.level === CONTEXT_LEVELS.LOCATION)
        if (locationContext) return locationContext
        // Fall through to resource if no location
        
      case 'BARBER':
        // Default to resource view (own profile)
        const resourceContext = availableContextsList.find(ctx => ctx.level === CONTEXT_LEVELS.RESOURCE)
        if (resourceContext) return resourceContext
        break
        
      default:
        break
    }

    // Fallback to first available context
    return availableContextsList[0] || null
  }, [userId, userRole, loadAvailableContexts, supabase, canAccessContext, buildBreadcrumbs, getPermittedLevels])

  // Save context preferences to database
  const saveContextPreferences = useCallback(async (newContext) => {
    if (!userId || !newContext) return

    try {
      const { error } = await supabase
        .from('user_context_preferences')
        .upsert({
          user_id: userId,
          last_context: newContext,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      // Handle missing table gracefully (don't spam console with 404 errors)
      if (error && (error.code === 'PGRST106' || error.code === '42P01')) {
        // Table doesn't exist - this is expected in development mode
        // Silently skip preference saving
        return
      } else if (error) {
        console.error('Error saving context preferences:', error)
      }
    } catch (error) {
      // Handle network errors and other issues
      console.error('Error saving context preferences:', error)
    }
  }, [userId, supabase])

  // Set context with validation and persistence
  const setContext = useCallback(async (newContext) => {
    if (!newContext) return

    setLoading(true)
    setError(null)

    try {
      // Validate context access
      if (!canAccessContext(newContext)) {
        throw new Error('You do not have permission to access this context')
      }

      // Build complete context object
      const completeContext = {
        ...newContext,
        breadcrumbs: buildBreadcrumbs(newContext),
        permissions: getPermittedLevels()
      }

      // Update state
      setContextState(completeContext)

      // Save to database
      await saveContextPreferences(completeContext)

      // Save to localStorage for quick restoration
      localStorage.setItem('unifiedContext', JSON.stringify(completeContext))

    } catch (error) {
      console.error('Error setting context:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [canAccessContext, buildBreadcrumbs, getPermittedLevels, saveContextPreferences])

  // Initialize context on app load
  const initializeContext = useCallback(async () => {
    if (!userId || initialized) return

    setLoading(true)
    
    try {
      // Load available contexts
      const contexts = await loadAvailableContexts()
      setAvailableContexts(contexts)

      // Set default context
      const defaultContext = await getDefaultContext()
      if (defaultContext) {
        setContextState(defaultContext)
      }

      setInitialized(true)
    } catch (error) {
      console.error('Error initializing context:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [userId, initialized, loadAvailableContexts, getDefaultContext])

  // Initialize when user is available
  useEffect(() => {
    if (userId && userRole && !initialized) {
      initializeContext()
    }
  }, [userId, userRole, initialized, initializeContext])

  // Clear context on user logout
  useEffect(() => {
    if (!userId) {
      setContextState(null)
      setAvailableContexts([])
      setInitialized(false)
      localStorage.removeItem('unifiedContext')
    }
  }, [userId])

  // Context value
  const contextValue = {
    // Current state
    context,
    availableContexts,
    loading,
    error,
    initialized,

    // Actions
    setContext,
    canAccessContext,
    refreshAvailableContexts: loadAvailableContexts,
    
    // Utilities
    getPermittedLevels,
    buildBreadcrumbs,
    
    // Role info
    userRole,
    userId
  }

  return (
    <UnifiedContextContext.Provider value={contextValue}>
      {children}
    </UnifiedContextContext.Provider>
  )
}

// Hook for consuming unified context
export function useUnifiedContext() {
  const context = useContext(UnifiedContextContext)
  
  if (!context) {
    throw new Error('useUnifiedContext must be used within a UnifiedContextProvider')
  }
  
  return context
}

// Export context levels for use in components
export { CONTEXT_LEVELS as UNIFIED_CONTEXT_LEVELS }

export default UnifiedContextProvider