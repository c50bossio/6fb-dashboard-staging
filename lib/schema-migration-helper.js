/**
 * Schema Migration Helper
 * Utilities to help transition from fragmented schema to unified schema
 * CRITICAL: This ensures single source of truth for foreign key relationships
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Get barbershop ID using unified schema approach
 * CONSOLIDATED: Single source of truth for barbershop associations
 * 
 * @param {Object} profile - User profile from database
 * @param {string} userId - User ID for staff lookup fallback
 * @returns {Promise<string|null>} Unified barbershop ID
 */
export async function getUnifiedBarbershopId(profile, userId = null) {
  try {
    if (!profile) {
      console.warn('getUnifiedBarbershopId: No profile provided')
      return null
    }

    // PRIMARY: Check barbershop_id field (unified schema)
    if (profile.barbershop_id) {
      return profile.barbershop_id
    }

    // FALLBACK: Legacy shop_id during migration period
    if (profile.shop_id) {
      console.warn('⚠️ Found legacy shop_id, should be migrated to barbershop_id:', profile.shop_id)
      
      // Optional: Auto-migrate legacy field
      if (userId) {
        await migrateLegacyShopIdToUnified(userId, profile.shop_id)
      }
      
      return profile.shop_id
    }

    // FALLBACK: Check if user is staff member at a barbershop
    if (userId) {
      // // Debug log removed for production
return await getStaffBarbershopId(userId)
    }

    console.warn('getUnifiedBarbershopId: No barbershop association found for profile')
    return null

  } catch (error) {
    console.error('getUnifiedBarbershopId: Error determining barbershop ID:', error)
    return null
  }
}

/**
 * Get barbershop ID from staff relationship table
 * @param {string} userId - User ID to lookup
 * @returns {Promise<string|null>} Barbershop ID from staff table
 */
async function getStaffBarbershopId(userId) {
  try {
    const supabase = createClient()
    
    const { data: staffRecord, error } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('getStaffBarbershopId: Database error:', error)
      return null
    }

    const barbershopId = staffRecord?.barbershop_id || null
    if (barbershopId) {
      // // Debug log removed for production
} else {
      // // Debug log removed for production
}

    return barbershopId

  } catch (error) {
    console.error('getStaffBarbershopId: Unexpected error:', error)
    return null
  }
}

/**
 * Migrate legacy shop_id to unified barbershop_id field
 * @param {string} userId - User ID to update
 * @param {string} shopId - Legacy shop_id value
 * @returns {Promise<boolean>} Success status
 */
async function migrateLegacyShopIdToUnified(userId, shopId) {
  try {
    const supabase = createClient()
    
    // Update profile with unified field
    const { error } = await supabase
      .from('profiles')
      .update({ 
        barbershop_id: shopId,
        // Keep legacy field during migration period for safety
        // shop_id: shopId  // Uncomment if you want to keep legacy field
      })
      .eq('id', userId)

    if (error) {
      console.error('migrateLegacyShopIdToUnified: Update failed:', error)
      return false
    }

    // // Debug log removed for production
return true

  } catch (error) {
    console.error('migrateLegacyShopIdToUnified: Unexpected error:', error)
    return false
  }
}

/**
 * Validate foreign key relationships for a user
 * @param {string} userId - User ID to validate
 * @returns {Promise<Object>} Validation results
 */
export async function validateUserForeignKeys(userId) {
  const results = {
    userId,
    isValid: true,
    issues: [],
    recommendations: []
  }

  try {
    const supabase = createServiceClient() // Use service client for full access
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, barbershop_id, shop_id, role')
      .eq('id', userId)
      .single()

    if (profileError) {
      results.isValid = false
      results.issues.push(`Profile lookup failed: ${profileError.message}`)
      return results
    }

    // Check barbershop_id consistency
    if (profile.barbershop_id) {
      // Verify barbershop exists
      const { data: barbershop, error: barbershopError } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('id', profile.barbershop_id)
        .single()

      if (barbershopError) {
        results.isValid = false
        results.issues.push(`Invalid barbershop_id reference: ${profile.barbershop_id}`)
      } else {
        results.recommendations.push(`✅ Valid barbershop reference: ${barbershop.name}`)
      }
    }

    // Check for legacy field conflicts
    if (profile.shop_id && profile.barbershop_id && profile.shop_id !== profile.barbershop_id) {
      results.isValid = false
      results.issues.push(`Conflicting shop references: shop_id=${profile.shop_id} vs barbershop_id=${profile.barbershop_id}`)
      results.recommendations.push(`Migrate to single barbershop_id field`)
    }

    // Check staff relationships if no direct barbershop association
    if (!profile.barbershop_id && !profile.shop_id) {
      const { data: staffRecords } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, is_active')
        .eq('user_id', userId)

      if (staffRecords && staffRecords.length > 0) {
        const activeStaffRecords = staffRecords.filter(r => r.is_active)
        if (activeStaffRecords.length === 1) {
          results.recommendations.push(`Consider setting barbershop_id to ${activeStaffRecords[0].barbershop_id} (from staff relationship)`)
        } else if (activeStaffRecords.length > 1) {
          results.isValid = false
          results.issues.push(`Multiple active staff relationships found - data inconsistency`)
        }
      } else {
        results.recommendations.push(`No barbershop association found - may need to create one`)
      }
    }

    return results

  } catch (error) {
    results.isValid = false
    results.issues.push(`Validation error: ${error.message}`)
    return results
  }
}

/**
 * Normalize barbershop staff query results
 * Ensures consistent field naming across different query patterns
 * @param {Array} staffRecords - Raw staff records from database
 * @returns {Array} Normalized staff records
 */
export function normalizeStaffRecords(staffRecords) {
  if (!Array.isArray(staffRecords)) return []

  return staffRecords.map(record => ({
    // Standardized ID fields
    id: record.id || record.staff_id,
    user_id: record.user_id,
    staff_id: record.id,
    
    // UNIFIED: Always use barbershop_id
    barbershop_id: record.barbershop_id,
    
    // Role and status
    role: record.role || 'BARBER',
    is_active: record.is_active !== false,
    
    // Timestamps
    created_at: record.created_at,
    updated_at: record.updated_at,
    
    // Employment details
    commission_rate: record.commission_rate || 0.30,
    hourly_rate: record.hourly_rate,
    
    // Profile data (if joined)
    email: record.email || '',
    first_name: record.first_name || '',
    last_name: record.last_name || '',
    full_name: record.full_name || `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Staff Member',
    phone: record.phone || '',
    avatar_url: null // Avatar URLs not implemented yet
  }))
}

/**
 * Build unified barbershop staff query
 * Provides consistent query pattern for staff data across the app
 * @param {Object} supabase - Supabase client
 * @param {string} barbershopId - Barbershop ID to query
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Normalized staff records
 */
export async function queryUnifiedStaffData(supabase, barbershopId, options = {}) {
  const { 
    includeInactive = false,
    includeProfiles = true,
    orderBy = 'created_at',
    ascending = true 
  } = options

  try {
    // Build base query
    let query = supabase
      .from('barbershop_staff')
      .select('*')
      .eq('barbershop_id', barbershopId)

    // Add filters
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // Add ordering
    query = query.order(orderBy, { ascending })

    const { data: staffRecords, error: staffError } = await query

    if (staffError) {
      console.error('queryUnifiedStaffData: Staff query failed:', staffError)
      throw new Error(`Staff query failed: ${staffError.message}`)
    }

    if (!staffRecords || staffRecords.length === 0) {
      // // Debug log removed for production
return []
    }

    // Get profiles if requested
    let profileData = []
    if (includeProfiles) {
      const userIds = staffRecords.map(s => s.user_id).filter(Boolean)
      
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, full_name, phone')
          .in('id', userIds)

        if (profileError) {
          console.warn('queryUnifiedStaffData: Profile query failed:', profileError)
        } else {
          profileData = profiles || []
        }
      }
    }

    // Merge staff and profile data
    const mergedRecords = staffRecords.map(staffRecord => {
      const profile = profileData.find(p => p.id === staffRecord.user_id) || {}
      return { ...staffRecord, ...profile }
    })

    // Normalize and return
    return normalizeStaffRecords(mergedRecords)

  } catch (error) {
    console.error('queryUnifiedStaffData: Unexpected error:', error)
    throw error
  }
}

/**
 * Clean up foreign key references during migration
 * CAREFUL: This performs database updates
 * @param {string} dryRun - If true, only logs what would be changed
 * @returns {Promise<Object>} Cleanup results
 */
export async function cleanupForeignKeyReferences(dryRun = true) {
  const results = {
    profilesUpdated: 0,
    conflictsResolved: 0,
    orphanedRecords: 0,
    errors: []
  }

  try {
    const supabase = createServiceClient()

    // Find profiles with conflicting shop references
    const { data: conflictingProfiles, error: conflictError } = await supabase
      .from('profiles')
      .select('id, shop_id, barbershop_id')
      .neq('shop_id', 'barbershop_id')
      .not('shop_id', 'is', null)
      .not('barbershop_id', 'is', null)

    if (conflictError) {
      results.errors.push(`Conflict query failed: ${conflictError.message}`)
      return results
    }

    if (conflictingProfiles && conflictingProfiles.length > 0) {
      // // Debug log removed for production
for (const profile of conflictingProfiles) {
        if (dryRun) {
          // // Debug log removed for production
} else {
          // In real mode, prefer barbershop_id over shop_id
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ shop_id: null }) // Clear legacy field
            .eq('id', profile.id)

          if (updateError) {
            results.errors.push(`Failed to update profile ${profile.id}: ${updateError.message}`)
          } else {
            results.conflictsResolved++
          }
        }
      }
    }

    // Find profiles with only shop_id (need migration to barbershop_id)
    const { data: legacyProfiles, error: legacyError } = await supabase
      .from('profiles')
      .select('id, shop_id')
      .not('shop_id', 'is', null)
      .is('barbershop_id', null)

    if (legacyError) {
      results.errors.push(`Legacy query failed: ${legacyError.message}`)
      return results
    }

    if (legacyProfiles && legacyProfiles.length > 0) {
      // // Debug log removed for production
for (const profile of legacyProfiles) {
        if (dryRun) {
          // // Debug log removed for production
} else {
          const { error: migrateError } = await supabase
            .from('profiles')
            .update({ 
              barbershop_id: profile.shop_id,
              shop_id: null // Remove legacy field
            })
            .eq('id', profile.id)

          if (migrateError) {
            results.errors.push(`Failed to migrate profile ${profile.id}: ${migrateError.message}`)
          } else {
            results.profilesUpdated++
          }
        }
      }
    }

    if (dryRun) {
      // // Debug log removed for production
// // Debug log removed for production
}

    return results

  } catch (error) {
    results.errors.push(`Cleanup error: ${error.message}`)
    return results
  }
}

export default {
  getUnifiedBarbershopId,
  validateUserForeignKeys,
  normalizeStaffRecords,
  queryUnifiedStaffData,
  cleanupForeignKeyReferences
}