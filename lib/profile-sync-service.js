/**
 * Profile Synchronization Service
 * 
 * Ensures consistency between user roles and subscription tiers across the platform.
 * This service prevents and fixes mismatches between role and subscription_tier fields.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Create a wrapper function that matches the expected interface  
const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    return null
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey)
}
import { 
  SUBSCRIPTION_TIERS, 
  TIER_TO_ROLE, 
  normalizeTierName, 
  validateProfileTierConsistency 
} from './subscription-tiers.js'

/**
 * Role to subscription tier mapping
 */
const ROLE_TO_TIER_MAPPING = {
  'SHOP_OWNER': SUBSCRIPTION_TIERS.PROFESSIONAL,
  'BARBER': SUBSCRIPTION_TIERS.INDIVIDUAL,
  'ENTERPRISE_OWNER': SUBSCRIPTION_TIERS.ENTERPRISE,
  'CLIENT': SUBSCRIPTION_TIERS.FREE,
  'SUPER_ADMIN': SUBSCRIPTION_TIERS.ENTERPRISE // Admin gets enterprise features
}

/**
 * Get the correct subscription tier for a given role
 * @param {string} role - User role
 * @returns {string} Corresponding subscription tier
 */
export function getTierForRole(role) {
  return ROLE_TO_TIER_MAPPING[role] || SUBSCRIPTION_TIERS.FREE
}

/**
 * Get the correct role for a given subscription tier
 * @param {string} tier - Subscription tier
 * @returns {string} Corresponding role
 */
export function getRoleForTier(tier) {
  const normalizedTier = normalizeTierName(tier)
  return TIER_TO_ROLE[normalizedTier] || 'CLIENT'
}

/**
 * Sync a user's profile to ensure role and subscription_tier consistency
 * @param {string} userId - User ID to sync
 * @param {object} options - Sync options
 * @returns {Promise<object>} Sync result
 */
export async function syncUserProfile(userId, options = {}) {
  const supabase = createClient()
  const { prioritizeRole = true, updateDatabase = true } = options
  
  try {
    // Fetch current profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError) {
      return { 
        success: false, 
        error: `Failed to fetch profile: ${fetchError.message}`,
        userId 
      }
    }

    if (!profile) {
      return { 
        success: false, 
        error: 'Profile not found',
        userId 
      }
    }

    // Validate current consistency
    const validation = validateProfileTierConsistency(profile)
    
    if (validation.valid) {
      return {
        success: true,
        message: 'Profile already consistent',
        profile,
        changes: []
      }
    }

    // Determine correct values
    const updates = {}
    
    if (prioritizeRole) {
      // Use role as source of truth, update subscription_tier
      const correctTier = getTierForRole(profile.role)
      if (profile.subscription_tier !== correctTier) {
        updates.subscription_tier = correctTier
      }
    } else {
      // Use subscription_tier as source of truth, update role
      const correctRole = getRoleForTier(profile.subscription_tier)
      if (profile.role !== correctRole) {
        updates.role = correctRole
      }
    }

    // Ensure subscription_status is set
    if (!profile.subscription_status && updates.subscription_tier !== SUBSCRIPTION_TIERS.FREE) {
      updates.subscription_status = 'active'
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        message: 'No updates needed',
        profile,
        changes: []
      }
    }

    // Apply updates if requested
    if (updateDatabase) {
      updates.updated_at = new Date().toISOString()
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        return {
          success: false,
          error: `Failed to update profile: ${updateError.message}`,
          userId,
          plannedUpdates: updates
        }
      }

      return {
        success: true,
        message: 'Profile synchronized successfully',
        profile: updatedProfile,
        changes: Object.keys(updates),
        updates
      }
    } else {
      return {
        success: true,
        message: 'Sync plan generated (not applied)',
        profile,
        plannedUpdates: updates,
        changes: Object.keys(updates)
      }
    }

  } catch (error) {
    return {
      success: false,
      error: `Sync failed: ${error.message}`,
      userId
    }
  }
}

/**
 * Sync all profiles in the database
 * @param {object} options - Sync options
 * @returns {Promise<object>} Batch sync result
 */
export async function syncAllProfiles(options = {}) {
  const supabase = createClient()
  const { dryRun = false, batchSize = 100 } = options
  
  try {
    // Get all profiles with potential inconsistencies
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, role, subscription_tier, subscription_status')
      .or(
        'subscription_tier.is.null,' +
        'role.eq.SHOP_OWNER.and.subscription_tier.neq.PROFESSIONAL,' +
        'role.eq.BARBER.and.subscription_tier.neq.INDIVIDUAL,' +
        'role.eq.ENTERPRISE_OWNER.and.subscription_tier.neq.ENTERPRISE,' +
        'role.eq.CLIENT.and.subscription_tier.neq.FREE'
      )

    if (fetchError) {
      return {
        success: false,
        error: `Failed to fetch profiles: ${fetchError.message}`
      }
    }

    const results = {
      total: profiles.length,
      synced: 0,
      errors: 0,
      details: [],
      dryRun
    }

    // Process in batches
    for (let i = 0; i < profiles.length; i += batchSize) {
      const batch = profiles.slice(i, i + batchSize)
      
      const batchPromises = batch.map(profile => 
        syncUserProfile(profile.id, { 
          prioritizeRole: true, 
          updateDatabase: !dryRun 
        })
      )

      const batchResults = await Promise.all(batchPromises)
      
      batchResults.forEach((result, index) => {
        const profile = batch[index]
        
        if (result.success) {
          results.synced++
          results.details.push({
            userId: profile.id,
            email: profile.email,
            status: 'success',
            changes: result.changes || [],
            updates: result.updates || {}
          })
        } else {
          results.errors++
          results.details.push({
            userId: profile.id,
            email: profile.email,
            status: 'error',
            error: result.error
          })
        }
      })
    }

    return {
      success: true,
      message: `Batch sync completed. ${results.synced} synced, ${results.errors} errors.`,
      results
    }

  } catch (error) {
    return {
      success: false,
      error: `Batch sync failed: ${error.message}`
    }
  }
}

/**
 * Fix a specific user account (like Chris Bossio)
 * @param {string} email - User email to fix
 * @returns {Promise<object>} Fix result
 */
export async function fixUserByEmail(email) {
  const supabase = createClient()
  
  try {
    // Find user by email
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (fetchError || !profile) {
      return {
        success: false,
        error: `User not found: ${email}`,
        email
      }
    }

    // Sync the profile
    const syncResult = await syncUserProfile(profile.id, {
      prioritizeRole: true,
      updateDatabase: true
    })

    return {
      ...syncResult,
      email,
      originalProfile: profile
    }

  } catch (error) {
    return {
      success: false,
      error: `Failed to fix user ${email}: ${error.message}`,
      email
    }
  }
}

/**
 * Validate and fix profile during authentication
 * @param {object} profile - User profile from auth
 * @returns {Promise<object>} Validated/fixed profile
 */
export async function validateAndFixAuthProfile(profile) {
  if (!profile?.id) {
    return profile
  }

  const validation = validateProfileTierConsistency(profile)
  
  if (validation.valid) {
    return profile
  }

  // Auto-fix minor inconsistencies
  const syncResult = await syncUserProfile(profile.id, {
    prioritizeRole: true,
    updateDatabase: true
  })

  if (syncResult.success && syncResult.profile) {
    console.log(`Auto-fixed profile inconsistencies for user ${profile.id}`, {
      changes: syncResult.changes,
      updates: syncResult.updates
    })
    return syncResult.profile
  }

  // Return original if fix failed
  console.warn(`Failed to auto-fix profile for user ${profile.id}:`, syncResult.error)
  return profile
}

/**
 * Get profile sync status for admin dashboard
 * @returns {Promise<object>} Sync status overview
 */
export async function getProfileSyncStatus() {
  const supabase = createClient()
  
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, role, subscription_tier, subscription_status')

    if (error) {
      return { success: false, error: error.message }
    }

    const status = {
      total: profiles.length,
      consistent: 0,
      inconsistent: 0,
      byRole: {}
    }

    profiles.forEach(profile => {
      const validation = validateProfileTierConsistency(profile)
      
      if (validation.valid) {
        status.consistent++
      } else {
        status.inconsistent++
      }

      const role = profile.role || 'UNKNOWN'
      if (!status.byRole[role]) {
        status.byRole[role] = { total: 0, consistent: 0, inconsistent: 0 }
      }
      
      status.byRole[role].total++
      if (validation.valid) {
        status.byRole[role].consistent++
      } else {
        status.byRole[role].inconsistent++
      }
    })

    return {
      success: true,
      status,
      healthScore: Math.round((status.consistent / status.total) * 100)
    }

  } catch (error) {
    return {
      success: false,
      error: `Failed to get sync status: ${error.message}`
    }
  }
}

// Re-export functions that are commonly needed
export {
  validateProfileTierConsistency,
  SUBSCRIPTION_TIERS,
  normalizeTierName,
  TIER_TO_ROLE
} from './subscription-tiers.js'