/**
 * Ensure user has a shop assigned for calendar access
 */

import { createClient } from '@/lib/supabase/client'

// Default shop for users without assignment (Demo Elite Barbershop)
const DEFAULT_SHOP_ID = '0b2d7524-49bc-47db-920d-db9c9822c416'

/**
 * Ensure user has a shop_id assigned
 * @param {Object} profile - User profile
 * @returns {Promise<string>} The shop ID
 */
export async function ensureUserShop(profile) {
  if (!profile) return DEFAULT_SHOP_ID
  
  // If user already has a shop, return it
  if (profile.shop_id) {
    return profile.shop_id
  }
  
  // Check barbershop_id as fallback
  if (profile.barbershop_id) {
    return profile.barbershop_id
  }
  
  // Try to update the profile with default shop
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        shop_id: DEFAULT_SHOP_ID,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select('shop_id')
      .single()
    
    if (!error && data) {
      console.log('Assigned default shop to user:', profile.id)
      return data.shop_id
    }
  } catch (err) {
    console.error('Error assigning default shop:', err)
  }
  
  // Return default shop as fallback
  return DEFAULT_SHOP_ID
}

/**
 * Get shop ID with automatic assignment if needed
 * @param {Object} user - User object
 * @param {Object} profile - Profile object
 * @returns {Promise<string>} The shop ID
 */
export async function getOrAssignShopId(user, profile) {
  // Check profile first
  if (profile?.shop_id) {
    return profile.shop_id
  }
  
  if (profile?.barbershop_id) {
    return profile.barbershop_id
  }
  
  // Check user object
  if (user?.shop_id) {
    return user.shop_id
  }
  
  if (user?.barbershop_id) {
    return user.barbershop_id
  }
  
  // Ensure user has a shop
  if (profile) {
    return ensureUserShop(profile)
  }
  
  // Return default as last resort
  return DEFAULT_SHOP_ID
}