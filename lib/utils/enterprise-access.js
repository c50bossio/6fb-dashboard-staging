/**
 * Enterprise Access Logic Utility - DEPRECATED
 * 
 * ⚠️ DEPRECATED: This complex access control system has been replaced with
 * the unified user-locations service following industry best practices.
 * 
 * New approach: /lib/services/user-locations.js
 * - Single source of truth for location access
 * - Simpler logic following GitHub/Shopify/Stripe patterns
 * - Rule: "If you can see it, you can manage it"
 * 
 * This file is kept for backward compatibility but should not be used
 * for new features. Use getUserAccessibleLocations() from user-locations.js instead.
 * 
 * Legacy functionality (DO NOT EXTEND):
 * - Individual barber subscriptions (shop_id/barbershop_id)
 * - Enterprise multi-location management (organization_id)
 * - Staff access through barbershop_staff relationships
 * - SUPER_ADMIN full access
 * - Backward compatibility when organization_id doesn't exist
 */

import { createClient } from '@/lib/supabase/server'
import { checkEnterpriseSchema, clearSchemaCache } from '@/lib/database/schema-detector'

// Clear schema cache to ensure fresh checks after fixes
clearSchemaCache()

/**
 * Get all locations accessible by the current user
 * Adapts query based on database schema and user role
 */
export async function getUserAccessibleLocations(userId, userRole, userProfile = null) {
  console.log(`[Enterprise Access] Getting locations for user ${userId}, role: ${userRole}`)
  
  try {
    const supabase = await createClient()
    
    // Get user profile if not provided
    let profile = userProfile
    if (!profile) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, shop_id, barbershop_id, organization_id')
        .eq('id', userId)
        .single()
      
      if (profileError || !profileData) {
        console.error('[Enterprise Access] Failed to get user profile:', profileError)
        return { locations: [], error: 'User profile not found' }
      }
      
      profile = profileData
    }
    
    // Check database schema capabilities
    const schemaState = await checkEnterpriseSchema()
    console.log(`[Enterprise Access] Schema state:`, schemaState)
    
    let locations = []
    let accessMethod = 'none'
    
    // SUPER_ADMIN gets all locations regardless of schema
    if (profile.role === 'SUPER_ADMIN') {
      accessMethod = 'super_admin'
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .order('name')
      
      if (!error && data) {
        locations = data
      }
    }
    // Enterprise owners with organization support
    else if (profile.role === 'ENTERPRISE_OWNER' && schemaState.supportsFullEnterprise && profile.organization_id) {
      accessMethod = 'enterprise_organization'
      console.log(`[Enterprise Access] Using enterprise organization access for org: ${profile.organization_id}`)
      
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name')
      
      if (!error && data) {
        locations = data
      } else if (error) {
        console.error('[Enterprise Access] Organization query failed:', error)
      }
    }
    // Fallback: Enterprise owners without organization_id support
    else if (profile.role === 'ENTERPRISE_OWNER' && !schemaState.supportsFullEnterprise) {
      accessMethod = 'enterprise_fallback'
      console.log(`[Enterprise Access] Using enterprise fallback access (owner_id based)`)
      
      // Get locations owned by this user
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', userId)
        .order('name')
      
      if (!error && data) {
        locations = data
      }
    }
    // Shop owners and individual barbers
    else if (['SHOP_OWNER', 'BARBER'].includes(profile.role)) {
      accessMethod = 'individual_owner'
      
      // Try multiple access patterns
      let shopId = profile.shop_id || profile.barbershop_id
      
      if (shopId) {
        // Direct shop ownership
        const { data, error } = await supabase
          .from('barbershops')
          .select('*')
          .eq('id', shopId)
        
        if (!error && data) {
          locations = data
        }
      } else if (schemaState.supportsStaffAccess) {
        // Staff access through barbershop_staff
        accessMethod = 'staff_access'
        console.log(`[Enterprise Access] Using staff access for user ${userId}`)
        
        const { data: staffData, error: staffError } = await supabase
          .from('barbershop_staff')
          .select('barbershop_id')
          .eq('user_id', userId)
          .eq('is_active', true)
        
        if (!staffError && staffData && staffData.length > 0) {
          const shopIds = staffData.map(s => s.barbershop_id)
          
          const { data, error } = await supabase
            .from('barbershops')
            .select('*')
            .in('id', shopIds)
            .order('name')
          
          if (!error && data) {
            locations = data
          }
        }
      }
    }
    
    console.log(`[Enterprise Access] Found ${locations.length} locations using method: ${accessMethod}`)
    
    return {
      locations,
      accessMethod,
      schemaState,
      profile: {
        id: profile.id,
        role: profile.role,
        hasOrganizationId: !!profile.organization_id,
        hasShopId: !!(profile.shop_id || profile.barbershop_id)
      }
    }
    
  } catch (error) {
    console.error('[Enterprise Access] Error getting accessible locations:', error)
    return {
      locations: [],
      error: error.message,
      accessMethod: 'error'
    }
  }
}

/**
 * Check if user can access a specific location
 */
export async function canAccessLocation(userId, locationId, userRole = null) {
  console.log(`[Enterprise Access] Checking access for user ${userId} to location ${locationId}`)
  
  try {
    const supabase = await createClient()
    
    // Get user profile with enhanced logging
    console.log(`[Enterprise Access] Fetching user profile for ${userId}`)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, shop_id, barbershop_id, organization_id')
      .eq('id', userId)
      .single()
    
    if (profileError || !profile) {
      console.error('[Enterprise Access] Failed to get user profile:', profileError)
      return { canAccess: false, reason: 'User profile not found', profileError }
    }
    
    console.log(`[Enterprise Access] User profile found:`, {
      id: profile.id,
      role: profile.role,
      shop_id: profile.shop_id,
      barbershop_id: profile.barbershop_id,
      organization_id: profile.organization_id
    })
    
    // SUPER_ADMIN has access to everything
    if (profile.role === 'SUPER_ADMIN') {
      console.log('[Enterprise Access] Granting SUPER_ADMIN access')
      return { canAccess: true, reason: 'SUPER_ADMIN access' }
    }
    
    // Check database schema first to determine what columns are available
    const schemaState = await checkEnterpriseSchema()
    
    // Build query based on available columns
    let selectFields = 'id, owner_id'
    if (schemaState.supportsFullEnterprise && schemaState.barbershops?.organization_id) {
      selectFields += ', organization_id'
    }
    
    // Get the location with schema-aware query
    console.log(`[Enterprise Access] Fetching location data for ${locationId} with fields: ${selectFields}`)
    const { data: location, error: locationError } = await supabase
      .from('barbershops')
      .select(selectFields)
      .eq('id', locationId)
      .single()
    
    console.log('[Enterprise Access] Location query result:', {
      locationFound: !!location,
      locationError: locationError,
      locationData: location ? {
        id: location.id,
        owner_id: location.owner_id,
        organization_id: location.organization_id
      } : null
    })
    
    if (locationError || !location) {
      console.error('[Enterprise Access] Location not found:', locationError)
      return { canAccess: false, reason: 'Location not found', locationError }
    }
    
    // Multiple access checks with detailed logging
    console.log('[Enterprise Access] Performing access checks...')
    
    const accessChecks = {
      directOwner: location.owner_id === userId,
      organizationMatch: schemaState.supportsFullEnterprise && 
                        profile.organization_id && 
                        location.organization_id &&
                        location.organization_id === profile.organization_id,
      individualShopMatch: (profile.shop_id || profile.barbershop_id) === locationId,
      // CRITICAL FIX: Allow ENTERPRISE_OWNER to edit their own barbershop location
      enterpriseOwnerBypass: profile.role === 'ENTERPRISE_OWNER' && 
                            (profile.barbershop_id === locationId || profile.shop_id === locationId),
      staffAccess: false // Will be checked below if needed
    }
    
    console.log('[Enterprise Access] Initial access checks:', {
      directOwner: {
        result: accessChecks.directOwner,
        details: `location.owner_id (${location.owner_id}) === userId (${userId})`
      },
      organizationMatch: {
        result: accessChecks.organizationMatch,
        details: {
          supportsFullEnterprise: schemaState.supportsFullEnterprise,
          profileOrgId: profile.organization_id,
          locationOrgId: location.organization_id,
          match: location.organization_id === profile.organization_id
        }
      },
      individualShopMatch: {
        result: accessChecks.individualShopMatch,
        details: {
          profileShopId: profile.shop_id,
          profileBarbershopId: profile.barbershop_id,
          locationId: locationId,
          match: (profile.shop_id || profile.barbershop_id) === locationId
        }
      },
      enterpriseOwnerBypass: {
        result: accessChecks.enterpriseOwnerBypass,
        details: {
          userRole: profile.role,
          isEnterpriseOwner: profile.role === 'ENTERPRISE_OWNER',
          profileBarbershopId: profile.barbershop_id,
          profileShopId: profile.shop_id,
          locationId: locationId,
          barbershopIdMatch: profile.barbershop_id === locationId,
          shopIdMatch: profile.shop_id === locationId
        }
      }
    })
    
    // Check staff access if other methods fail
    if (!accessChecks.directOwner && !accessChecks.organizationMatch && !accessChecks.individualShopMatch && !accessChecks.enterpriseOwnerBypass && schemaState.supportsStaffAccess) {
      console.log('[Enterprise Access] Checking staff access...')
      const { data: staffData, error: staffError } = await supabase
        .from('barbershop_staff')
        .select('id')
        .eq('user_id', userId)
        .eq('barbershop_id', locationId)
        .eq('is_active', true)
        .limit(1)
      
      console.log('[Enterprise Access] Staff access query result:', {
        staffError,
        staffDataFound: !!staffData,
        staffCount: staffData?.length || 0
      })
      
      if (!staffError && staffData && staffData.length > 0) {
        accessChecks.staffAccess = true
      }
    }
    
    const canAccess = Object.values(accessChecks).some(check => check)
    
    console.log(`[Enterprise Access] Final access check result:`, {
      canAccess,
      checks: accessChecks,
      userId,
      locationId,
      userRole: profile.role,
      schemaSupport: {
        supportsFullEnterprise: schemaState.supportsFullEnterprise,
        supportsStaffAccess: schemaState.supportsStaffAccess
      }
    })
    
    return {
      canAccess,
      reason: canAccess ? getAccessReason(accessChecks) : 'No access permissions found',
      checks: accessChecks
    }
    
  } catch (error) {
    console.error('[Enterprise Access] Error checking location access:', error)
    return { canAccess: false, reason: 'Access check failed', error: error.message }
  }
}

/**
 * Get the reason for access based on checks
 */
function getAccessReason(checks) {
  if (checks.directOwner) return 'Direct owner access'
  if (checks.organizationMatch) return 'Organization member access'
  if (checks.individualShopMatch) return 'Individual shop access'
  if (checks.enterpriseOwnerBypass) return 'Enterprise owner bypass access'
  if (checks.staffAccess) return 'Staff member access'
  return 'Unknown access'
}

/**
 * Create a new location with proper ownership assignment
 */
export async function createLocationWithAccess(userId, locationData) {
  console.log(`[Enterprise Access] Creating location for user ${userId}`)
  
  try {
    const supabase = await createClient()
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, organization_id')
      .eq('id', userId)
      .single()
    
    if (profileError || !profile) {
      throw new Error('User profile not found')
    }
    
    // Check schema state
    const schemaState = await checkEnterpriseSchema()
    
    // Prepare location data with ownership
    const newLocationData = {
      ...locationData,
      owner_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Add organization_id if supported and user has one
    if (schemaState.supportsFullEnterprise && profile.organization_id) {
      newLocationData.organization_id = profile.organization_id
      console.log(`[Enterprise Access] Adding organization_id: ${profile.organization_id}`)
    }
    
    // Create the location
    const { data: newLocation, error: createError } = await supabase
      .from('barbershops')
      .insert(newLocationData)
      .select()
      .single()
    
    if (createError) {
      console.error('[Enterprise Access] Failed to create location:', createError)
      throw new Error(`Failed to create location: ${createError.message}`)
    }
    
    console.log(`[Enterprise Access] Successfully created location:`, newLocation.id)
    
    return {
      location: newLocation,
      accessMethod: schemaState.supportsFullEnterprise ? 'enterprise_organization' : 'individual_owner'
    }
    
  } catch (error) {
    console.error('[Enterprise Access] Error creating location:', error)
    throw error
  }
}

/**
 * Build appropriate query filters based on user access and schema state
 */
export async function buildLocationQuery(userId, userRole, baseQuery = null) {
  try {
    const supabase = baseQuery || (await createClient()).from('barbershops')
    
    // Get user profile
    const { data: profile } = await (await createClient())
      .from('profiles')
      .select('id, role, shop_id, barbershop_id, organization_id')
      .eq('id', userId)
      .single()
    
    if (!profile) {
      throw new Error('User profile not found')
    }
    
    const schemaState = await checkEnterpriseSchema()
    
    // Build query based on access level
    if (profile.role === 'SUPER_ADMIN') {
      // No additional filters needed for SUPER_ADMIN
      return supabase
    } else if (profile.role === 'ENTERPRISE_OWNER' && schemaState.supportsFullEnterprise && profile.organization_id) {
      // Filter by organization
      return supabase.eq('organization_id', profile.organization_id)
    } else if (['ENTERPRISE_OWNER', 'SHOP_OWNER'].includes(profile.role)) {
      // Filter by ownership
      return supabase.eq('owner_id', userId)
    } else if (profile.shop_id || profile.barbershop_id) {
      // Individual shop access
      const shopId = profile.shop_id || profile.barbershop_id
      return supabase.eq('id', shopId)
    } else {
      // No direct access - would need to check staff relationships
      // Return empty result set for now
      return supabase.eq('id', 'no-access')
    }
    
  } catch (error) {
    console.error('[Enterprise Access] Error building location query:', error)
    // Return restrictive query on error
    return (baseQuery || (await createClient()).from('barbershops')).eq('id', 'error')
  }
}

export default {
  getUserAccessibleLocations,
  canAccessLocation,
  createLocationWithAccess,
  buildLocationQuery
}