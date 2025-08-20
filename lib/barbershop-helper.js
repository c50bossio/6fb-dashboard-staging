/**
 * Helper functions for barbershop associations
 */

import { createClient } from '@/lib/supabase/client'

// Cache for barbershop lookups to reduce database calls
const barbershopCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get the primary barbershop ID for a user based on their role
 * @param {Object} user - The authenticated user
 * @param {Object} profile - The user profile from database
 * @returns {Promise<string|null>} The barbershop ID or null
 */
export async function getUserBarbershopId(user, profile) {
  if (!user || !profile) {
    console.warn('getUserBarbershopId: Missing user or profile data')
    return null
  }

  const cacheKey = `${user.id}-${profile.role}`
  const cached = barbershopCache.get(cacheKey)
  
  // Return cached result if still valid
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('Returning cached barbershop ID:', cached.barbershopId)
    return cached.barbershopId
  }

  try {
    let barbershopId = null

    // Check both shop_id and barbershop_id fields (naming inconsistency in database)
    // The profiles table uses 'shop_id' while other tables use 'barbershop_id'
    if (profile.shop_id) {
      barbershopId = profile.shop_id
      console.log('Found barbershop ID in profile.shop_id:', barbershopId)
    } else if (profile.barbershop_id) {
      // Fallback to barbershop_id if it exists
      barbershopId = profile.barbershop_id
      console.log('Found barbershop ID in profile.barbershop_id:', barbershopId)
    } else {
      // Role-specific barbershop lookup
      barbershopId = await getBarbershopIdByRole(user, profile)
    }

    // Cache the result (including null results to prevent repeated failed lookups)
    barbershopCache.set(cacheKey, {
      barbershopId,
      timestamp: Date.now()
    })

    return barbershopId
  } catch (error) {
    console.error('Error in getUserBarbershopId:', error)
    return null
  }
}

/**
 * Get barbershop ID based on user role
 * @param {Object} user - The authenticated user
 * @param {Object} profile - The user profile
 * @returns {Promise<string|null>} The barbershop ID or null
 */
async function getBarbershopIdByRole(user, profile) {
  const supabase = createClient()

  try {
    // For employee barbers, fetch from barbershop_staff
    if (profile.role === 'BARBER') {
      console.log('Looking up barbershop for BARBER role in barbershop_staff table')
      const { data: staffData, error } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('Error fetching barbershop_staff data:', error)
        return null
      }

      if (staffData?.barbershop_id) {
        console.log('Found barbershop ID in barbershop_staff:', staffData.barbershop_id)
        return staffData.barbershop_id
      } else {
        console.warn('No active barbershop_staff record found for barber:', user.id)
        return null
      }
    }
    
    // For enterprise owners, they may have multiple shops
    // Return the first one or let them select
    if (profile.role === 'ENTERPRISE_OWNER' && profile.organization_id) {
      console.log('Looking up barbershop for ENTERPRISE_OWNER role')
      const { data: shops, error } = await supabase
        .from('barbershops')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching organization barbershops:', error)
        return null
      }

      if (shops?.id) {
        console.log('Found barbershop ID for enterprise owner:', shops.id)
        return shops.id
      } else {
        console.warn('No barbershops found for organization:', profile.organization_id)
        return null
      }
    }

    // For shop owners, check if they have a barbershop created
    if (profile.role === 'SHOP_OWNER') {
      console.log('Looking up barbershop for SHOP_OWNER role')
      const { data: ownedShops, error } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching owned barbershops:', error)
        return null
      }

      if (ownedShops?.id) {
        console.log('Found owned barbershop:', ownedShops.id)
        return ownedShops.id
      } else {
        console.warn('No barbershops found for shop owner - may need to create one')
        return null
      }
    }

    console.warn('No barbershop association logic for role:', profile.role)
    return null
  } catch (error) {
    console.error('Error in getBarbershopIdByRole:', error)
    return null
  }
}

/**
 * Clear barbershop cache for a user
 * @param {string} userId - The user ID
 * @param {string} role - The user role
 */
export function clearBarbershopCache(userId, role) {
  const cacheKey = `${userId}-${role}`
  barbershopCache.delete(cacheKey)
  console.log('Cleared barbershop cache for:', cacheKey)
}

/**
 * Clear all barbershop cache entries
 */
export function clearAllBarbershopCache() {
  barbershopCache.clear()
  console.log('Cleared all barbershop cache')
}

/**
 * Create a barbershop for a new shop owner
 * @param {Object} user - The authenticated user
 * @param {Object} shopData - Data for the new barbershop
 * @returns {Promise<Object>} The created barbershop
 */
export async function createBarbershopForOwner(user, shopData = {}) {
  if (!user) {
    throw new Error('User is required to create a barbershop')
  }

  const supabase = createClient()
  
  try {
    // Check if barbershop already exists for this user
    const { data: existingShop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existingShop) {
      console.log('Barbershop already exists for user:', existingShop.id)
      
      // Update profile with existing shop_id if missing
      await supabase
        .from('profiles')
        .update({ shop_id: existingShop.id })
        .eq('id', user.id)
      
      // Clear cache to force refresh
      clearBarbershopCache(user.id, 'SHOP_OWNER')
      
      return existingShop
    }

    const defaultShopData = {
      owner_id: user.id,
      name: shopData.name || `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'My'} Barbershop`,
      email: shopData.email || user.email,
      phone: shopData.phone || user.user_metadata?.phone || '',
      address: shopData.address || '',
      city: shopData.city || '',
      state: shopData.state || '',
      zip_code: shopData.zip_code || '',
      country: shopData.country || 'US',
      booking_enabled: true,
      online_booking_enabled: true,
      website_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('Creating new barbershop for shop owner:', user.id)
    
    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .insert(defaultShopData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating barbershop:', error)
      throw new Error(`Failed to create barbershop: ${error.message}`)
    }
    
    console.log('Successfully created barbershop:', barbershop.id)
    
    // Update profile with shop_id (profiles table uses shop_id not barbershop_id)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ shop_id: barbershop.id })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile with shop_id:', profileError)
      // Don't throw error here as barbershop was created successfully
    } else {
      console.log('Updated profile with shop_id:', barbershop.id)
    }
    
    // Clear cache to force refresh with new barbershop
    clearBarbershopCache(user.id, 'SHOP_OWNER')
    
    return barbershop
  } catch (error) {
    console.error('Error in createBarbershopForOwner:', error)
    throw error
  }
}

/**
 * Associate an employee barber with a barbershop
 * @param {string} userId - The user ID
 * @param {string} barbershopId - The barbershop ID
 * @param {string} role - The role in the barbershop
 * @returns {Promise<Object>} The staff association
 */
export async function associateBarberWithShop(userId, barbershopId, role = 'BARBER') {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('barbershop_staff')
    .upsert({
      user_id: userId,
      barbershop_id: barbershopId,
      role: role,
      is_active: true,
      hire_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,barbershop_id'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error associating barber with shop:', error)
    throw error
  }
  
  return data
}

/**
 * Get all barbershops for an enterprise owner
 * @param {string} organizationId - The organization ID
 * @returns {Promise<Array>} List of barbershops
 */
export async function getOrganizationBarbershops(organizationId) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('barbershops')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching organization barbershops:', error)
    throw error
  }
  
  return data || []
}