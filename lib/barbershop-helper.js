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
    
    return cached.barbershopId
  }

  try {
    let barbershopId = null

    // FIXED: Single source of truth - unified schema uses only barbershop_id
    if (profile.barbershop_id) {
      barbershopId = profile.barbershop_id
    } else if (profile.shop_id) {
      // Legacy support during migration period
      barbershopId = profile.shop_id
      console.warn('⚠️ Found legacy shop_id, should migrate to barbershop_id:', profile.shop_id)
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
 * Check if user has an active subscription
 * @param {string} userId - The user ID
 * @returns {Promise<Object|null>} Subscription data or null
 */
async function getUserSubscription(userId) {
  try {
    const response = await fetch('/api/subscription/status')
    if (!response.ok) return null
    
    const data = await response.json()
    return data.subscription?.isActive ? data.subscription : null
  } catch (error) {
    console.error('Error checking subscription:', error)
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
    // For barbers, check if they're an employee first
    if (profile.role === 'BARBER') {
      
      const { data: staffData, error } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        console.error('Error fetching barbershop_staff data:', error)
      } else if (staffData?.barbershop_id) {
        return staffData.barbershop_id
      }

      // If no staff record found, check if they have an active individual subscription
      
      const subscription = await getUserSubscription(user.id)
      
      if (subscription && (subscription.tier === 'barber' || subscription.tier === 'shop' || subscription.tier === 'enterprise')) {

        // Check if they already have a personal barbershop
        const { data: ownedShops, error: shopError } = await supabase
          .from('barbershops')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle()

        if (shopError && shopError.code !== '406') {
          console.error('Error checking for owned barbershops:', shopError)
        }

        if (ownedShops?.id) {

          // FIXED: Update barbershop_id field in unified schema
          await supabase
            .from('profiles')
            .update({ barbershop_id: ownedShops.id })
            .eq('id', user.id)
          
          return ownedShops.id
        } else {
          // Create a personal barbershop for the individual barber
          
          const personalShop = await createBarbershopForOwner(user, {
            name: `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Personal'} Barbershop`,
            email: user.email
          })
          
          if (personalShop?.id) {
            
            return personalShop.id
          }
        }
      } else {
        
      }
      
      return null
    }
    
    // For shop owners and enterprise owners, check if they have a barbershop created
    if (profile.role === 'SHOP_OWNER' || profile.role === 'ENTERPRISE_OWNER') {
      
      const { data: ownedShops, error } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle()

      if (error) {
        // 406 errors are expected when no barbershop exists yet during onboarding
        if (error.code === '406' || error.message?.includes('Not Acceptable')) {
          return null
        }
        console.error('Error fetching owned barbershops:', error)
        return null
      }

      if (ownedShops?.id) {
        
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
  
}

/**
 * Clear all barbershop cache entries
 */
export function clearAllBarbershopCache() {
  barbershopCache.clear()
  
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

        // FIXED: Update barbershop_id field in unified schema
      await supabase
        .from('profiles')
        .update({ barbershop_id: existingShop.id })
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

    const { data: barbershop, error } = await supabase
      .from('barbershops')
      .insert(defaultShopData)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating barbershop:', error)
      throw new Error(`Failed to create barbershop: ${error.message}`)
    }

    // FIXED: Update profile with barbershop_id (unified schema)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ barbershop_id: barbershop.id })
      .eq('id', user.id)

    if (profileError) {
      console.error('Error updating profile with barbershop_id:', profileError)
      // Don't throw error here as barbershop was created successfully
    } else {
      
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