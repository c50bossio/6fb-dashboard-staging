/**
 * User Locations Service - Single Source of Truth
 * 
 * Centralized service for finding all locations accessible by a user.
 * Used by both the context selector and location management components.
 * 
 * Follows industry best practices from GitHub, Shopify, Stripe:
 * - One service, multiple consumers
 * - Simple rule: if you can see it, you can manage it
 */

import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Permission matrix for location access
const LOCATION_PERMISSIONS = {
  ENTERPRISE_OWNER: ['ORGANIZATION', 'LOCATION', 'RESOURCE'],
  SUPER_ADMIN: ['ORGANIZATION', 'LOCATION', 'RESOURCE'], 
  SHOP_OWNER: ['LOCATION', 'RESOURCE'],
  BARBER: ['RESOURCE'],
  CLIENT: [],
  CUSTOMER: []
}

/**
 * Get all locations accessible by a user
 * @param {string} userId - User ID
 * @param {string} userRole - User role (ENTERPRISE_OWNER, SHOP_OWNER, etc.)
 * @param {object} profile - User profile object
 * @returns {Promise<Array>} Array of accessible locations
 */
export async function getUserAccessibleLocations(userId, userRole = 'CLIENT', profile = null) {
  if (!userId || !userRole) {
    console.log('[User Locations] Missing userId or userRole')
    return []
  }

  const supabase = await createServerSupabaseClient()
  const permittedLevels = LOCATION_PERMISSIONS[userRole] || []
  
  console.log(`[User Locations] Finding locations for user ${userId}, role: ${userRole}`)

  try {
    const locations = []

    // Location level access
    if (permittedLevels.includes('LOCATION')) {
      if (userRole === 'SHOP_OWNER') {
        // Shop owners see their own barbershops
        const { data } = await supabase
          .from('barbershops')
          .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')
          .eq('owner_id', userId)
        
        if (data?.length > 0) {
          locations.push(...data.map(location => ({
            id: location.id,
            name: location.name,
            owner_id: location.owner_id,
            address: location.address,
            city: location.city,
            state: location.state,
            phone: location.phone,
            email: location.email,
            business_hours: location.business_hours,
            location_status: location.is_active ? 'active' : 'inactive',
            organization_id: location.organization_id,
            // Context selector compatibility
            level: 'LOCATION',
            locationId: location.id,
            displayName: location.name,
            metadata: {
              locationName: location.name,
              organizationName: null,
              accessMethod: 'direct_ownership'
            }
          })))
        }
      } else if (userRole === 'ENTERPRISE_OWNER') {
        // Enterprise owners see barbershops they own directly
        const { data: ownedShops } = await supabase
          .from('barbershops')
          .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')
          .eq('owner_id', userId)

        if (ownedShops?.length > 0) {
          locations.push(...ownedShops.map(location => ({
            id: location.id,
            name: location.name,
            owner_id: location.owner_id,
            address: location.address,
            city: location.city,
            state: location.state,
            phone: location.phone,
            email: location.email,
            business_hours: location.business_hours,
            location_status: location.is_active ? 'active' : 'inactive',
            organization_id: location.organization_id,
            // Context selector compatibility
            level: 'LOCATION',
            locationId: location.id,
            displayName: location.name,
            metadata: {
              locationName: location.name,
              organizationName: null,
              accessMethod: 'direct_ownership'
            }
          })))
        }

        // Enterprise owners also see barbershops in their organization
        if (profile?.organization_id) {
          console.log(`[User Locations] ENTERPRISE_OWNER checking organization: ${profile.organization_id}`)
          const { data: orgShops } = await supabase
            .from('barbershops')
            .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')
            .eq('organization_id', profile.organization_id)

          if (orgShops?.length > 0) {
            // Add organization shops that aren't already included from direct ownership
            orgShops.forEach(location => {
              if (!locations.some(loc => loc.id === location.id)) {
                locations.push({
                  id: location.id,
                  name: location.name,
                  owner_id: location.owner_id,
                  address: location.address,
                  city: location.city,
                  state: location.state,
                  phone: location.phone,
                  email: location.email,
                  business_hours: location.business_hours,
                  location_status: location.is_active ? 'active' : 'inactive',
                  organization_id: location.organization_id,
                  // Context selector compatibility
                  level: 'LOCATION',
                  locationId: location.id,
                  displayName: location.name,
                  metadata: {
                    locationName: location.name,
                    organizationName: null,
                    accessMethod: 'organization_access'
                  }
                })
              }
            })
          }
        }
      } else if (userRole === 'SUPER_ADMIN') {
        // Super admin sees all locations
        const { data } = await supabase
          .from('barbershops')
          .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')

        if (data?.length > 0) {
          locations.push(...data.map(location => ({
            id: location.id,
            name: location.name,
            owner_id: location.owner_id,
            address: location.address,
            city: location.city,
            state: location.state,
            phone: location.phone,
            email: location.email,
            business_hours: location.business_hours,
            location_status: location.is_active ? 'active' : 'inactive',
            organization_id: location.organization_id,
            // Context selector compatibility
            level: 'LOCATION',
            locationId: location.id,
            displayName: location.name,
            metadata: {
              locationName: location.name,
              organizationName: null,
              accessMethod: 'super_admin'
            }
          })))
        }
      }
    }

    // FALLBACK: If no locations found but user has a barbershop_id in profile
    if (locations.length === 0 && profile?.barbershop_id) {
      console.log(`[User Locations] Fallback: checking profile.barbershop_id: ${profile.barbershop_id}`)
      
      const { data: shopData } = await supabase
        .from('barbershops')
        .select('id, name, address, city, state, phone, email, business_hours, is_active, owner_id')
        .eq('id', profile.barbershop_id)
        .single()

      if (shopData) {
        locations.push({
          id: shopData.id,
          name: shopData.name,
          owner_id: shopData.owner_id,
          address: shopData.address,
          city: shopData.city,
          state: shopData.state,
          phone: shopData.phone,
          email: shopData.email,
          business_hours: shopData.business_hours,
          location_status: shopData.is_active ? 'active' : 'inactive',
          // Context selector compatibility
          level: 'LOCATION',
          locationId: shopData.id,
          displayName: shopData.name,
          metadata: {
            locationName: shopData.name,
            organizationName: null,
            fallback: true
          }
        })
      }
    }

    console.log(`[User Locations] Found ${locations.length} locations for user ${userId}`)
    return locations

  } catch (error) {
    console.error('[User Locations] Error fetching locations:', error)
    return []
  }
}

/**
 * Check if user can access a specific location
 * @param {string} userId - User ID
 * @param {string} locationId - Location ID
 * @param {string} userRole - User role
 * @param {object} profile - User profile
 * @returns {Promise<boolean>} True if user can access location
 */
export async function canUserAccessLocation(userId, locationId, userRole = 'CLIENT', profile = null) {
  const locations = await getUserAccessibleLocations(userId, userRole, profile)
  return locations.some(location => location.id === locationId)
}

export default {
  getUserAccessibleLocations,
  canUserAccessLocation
}