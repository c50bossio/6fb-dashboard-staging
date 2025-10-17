/**
 * Ensure user has a shop assigned for calendar access
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Default shop for users without assignment (Demo Elite Barbershop)
const DEFAULT_SHOP_ID = '0b2d7524-49bc-47db-920d-db9c9822c416'

/**
 * Ensure user has a barbershop_id assigned
 * @param {Object} profile - User profile
 * @returns {Promise<string>} The shop ID
 */
export async function ensureUserShop(profile) {
  if (!profile) return DEFAULT_SHOP_ID
  
  // If user already has a shop, return it
  if (profile.barbershop_id) {
    return profile.barbershop_id
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
        barbershop_id: DEFAULT_SHOP_ID,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select('barbershop_id')
      .single()
    
    if (!error && data) {
      
      return data.barbershop_id
    }
  } catch (err) {
    console.error('Error assigning default shop:', err)
  }
  
  // Return default shop as fallback
  return DEFAULT_SHOP_ID
}

/**
 * Get shop ID with automatic assignment if needed - follows CLAUDE.md shop resolution pattern
 * @param {Object} user - User object
 * @param {Object} profile - Profile object
 * @returns {Promise<string>} The shop ID
 */
export async function getOrAssignShopId(user, profile) {
  const supabase = createClient()
  
  // Check profile first - direct shop association
  if (profile?.barbershop_id) {
    console.log('[Shop Resolution] Using profile.barbershop_id:', profile.barbershop_id)
    return profile.barbershop_id
  }
  
  if (profile?.barbershop_id) {
    console.log('[Shop Resolution] Using profile.barbershop_id:', profile.barbershop_id)
    return profile.barbershop_id
  }
  
  // Check user object
  if (user?.barbershop_id) {
    console.log('[Shop Resolution] Using user.barbershop_id:', user.barbershop_id)
    return user.barbershop_id
  }
  
  if (user?.barbershop_id) {
    console.log('[Shop Resolution] Using user.barbershop_id:', user.barbershop_id)
    return user.barbershop_id
  }
  
  // CRITICAL: Check barbershop_staff table FIRST before returning defaults
  // This ensures consistency with the backend API which also checks staff associations
  if (user?.id || profile?.id) {
    const userId = user?.id || profile?.id
    console.log('[Shop Resolution] Checking barbershop_staff table for user:', userId)
    
    try {
      // First check if user owns a barbershop
      const { data: ownedShops, error: ownerError } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
      
      if (!ownerError && ownedShops && ownedShops.length > 0) {
        console.log('[Shop Resolution] User owns barbershop:', ownedShops[0].id)
        // Update profile with this shop_id for future use
        await supabase
          .from('profiles')
          .update({ 
            barbershop_id: ownedShops[0].id,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        return ownedShops[0].id
      }
      
      // Check if user is staff at a barbershop
      const { data: staffRecord, error: staffError } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()
      
      if (!staffError && staffRecord && staffRecord.barbershop_id) {
        console.log('[Shop Resolution] Found shop ID via staff association:', staffRecord.barbershop_id)
        // Update profile with this barbershop_id for future use to avoid repeated lookups
        await supabase
          .from('profiles')
          .update({ 
            barbershop_id: staffRecord.barbershop_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
        return staffRecord.barbershop_id
      }
      
      console.log('[Shop Resolution] No staff association found')
    } catch (err) {
      console.error('[Shop Resolution] Error checking associations:', err)
    }
  }
  
  // Only create a new shop if absolutely no association exists
  if (user?.id) {
    try {
      console.log('[Shop Resolution] No existing shop found, calling API to create one')
      
      const response = await fetch('/api/user/ensure-shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.barbershop_id) {
          console.log('[Shop Resolution] Shop created via API:', data.barbershop_id)
          return data.barbershop_id
        }
      } else {
        console.error('[Shop Resolution] Failed to create shop via API:', response.status)
      }
    } catch (err) {
      console.error('[Shop Resolution] Error calling ensure-shop API:', err)
    }
  }
  
  // Return default as absolute last resort
  console.log('[Shop Resolution] Using DEFAULT_SHOP_ID as last resort:', DEFAULT_SHOP_ID)
  return DEFAULT_SHOP_ID
}