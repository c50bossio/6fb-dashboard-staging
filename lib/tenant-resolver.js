/**
 * Unified Tenant Resolution System
 * 
 * This module replaces all complex shop ID lookup patterns throughout the codebase
 * with a single, standardized approach that uses barbershop_id consistently.
 * 
 * Part of Phase 1 of the approved 12-week system overhaul.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Cache for tenant resolutions to reduce database queries
 * TTL: 5 minutes to balance performance with data freshness
 */
const tenantCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get the barbershop ID for a given user
 * 
 * This function replaces all the complex patterns like:
 * - profile.barbershop_id || profile.barbershop_id || (await getStaffShopId(profile.id))
 * - Multiple database queries with different field names
 * - Inconsistent tenant resolution logic
 * 
 * @param {string} userId - The user ID to resolve barbershop for
 * @param {Object} options - Configuration options
 * @param {boolean} options.useCache - Whether to use caching (default: true)
 * @param {Object} options.supabase - Custom Supabase client instance
 * @returns {Promise<{barbershopId: string|null, source: string, metadata: Object}>}
 */
export async function getTenant(userId, options = {}) {
  const { useCache = true, supabase: customSupabase } = options

  if (!userId) {
    return {
      barbershopId: null,
      source: 'invalid_input',
      metadata: { error: 'User ID is required' }
    }
  }

  // Check cache first
  const cacheKey = `tenant:${userId}`
  if (useCache && tenantCache.has(cacheKey)) {
    const cached = tenantCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        ...cached.data,
        metadata: { ...cached.data.metadata, fromCache: true }
      }
    }
    // Remove expired cache entry
    tenantCache.delete(cacheKey)
  }

  const supabase = customSupabase || createClient()
  
  try {
    // Check profiles table for shop_id (selected shop) and barbershop_id (home shop)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[TenantResolver] Profile query error:', profileError)
    }

    // Prioritize shop_id (selected shop) over barbershop_id (home shop)
    // This allows multi-location owners to switch between their locations
    if (profile?.shop_id) {
      const result = {
        barbershopId: profile.shop_id,
        source: 'profile_selected_shop',
        metadata: {
          resolvedAt: new Date().toISOString(),
          userId,
          shopId: profile.shop_id,
          homeBarbershopId: profile.barbershop_id
        }
      }

      // Cache the result
      if (useCache) {
        tenantCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })
      }

      return result
    }

    // Fallback to barbershop_id (home shop) if no shop_id is set
    if (profile?.barbershop_id) {
      const result = {
        barbershopId: profile.barbershop_id,
        source: 'profile_home_shop',
        metadata: {
          resolvedAt: new Date().toISOString(),
          userId,
          homeBarbershopId: profile.barbershop_id
        }
      }

      if (useCache) {
        tenantCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })
      }

      return result
    }

    // Skip barbershop_staff table to avoid 406 errors
    // Staff associations should be managed through profiles table
    // Return null if no barbershop found in profile

    // No association found
    const result = {
      barbershopId: null,
      source: 'no_association',
      metadata: {
        resolvedAt: new Date().toISOString(),
        userId
      }
    }

    // Cache the result
    if (useCache) {
      tenantCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
    }

    return result

  } catch (error) {
    console.error('[TenantResolver] Unexpected error:', error)
    return {
      barbershopId: null,
      source: 'system_error',
      metadata: { error: error.message }
    }
  }
}

/**
 * Legacy compatibility function - gradually replace these calls with getTenant()
 * 
 * @deprecated Use getTenant() instead for better error handling and caching
 */
export async function getUserBarbershop(userId, supabase) {
  const result = await getTenant(userId, { supabase })
  return result.barbershopId
}

/**
 * Get barbershop information along with access level
 * 
 * @param {string} userId - User ID to check access for
 * @param {string} barbershopId - Barbershop ID to check access to
 * @returns {Promise<{hasAccess: boolean, accessType: string, metadata: Object}>}
 */
export async function checkBarbershopAccess(userId, barbershopId, options = {}) {
  const { supabase: customSupabase } = options
  const supabase = customSupabase || createClient()

  if (!userId || !barbershopId) {
    return {
      hasAccess: false,
      accessType: 'invalid_input',
      metadata: { error: 'Both userId and barbershopId are required' }
    }
  }

  try {
    // Get user's tenant
    const tenantResult = await getTenant(userId, { supabase, useCache: false })
    
    if (tenantResult.barbershopId === barbershopId) {
      return {
        hasAccess: true,
        accessType: 'direct_access',
        metadata: {
          source: tenantResult.source,
          resolvedbarbershopId: tenantResult.barbershopId
        }
      }
    }

    // Check if user is owner of the barbershop
    const { data: ownership, error: ownershipError } = await supabase
      .from('barbershops')
      .select('owner_id')
      .eq('id', barbershopId)
      .single()

    if (ownershipError) {
      return {
        hasAccess: false,
        accessType: 'database_error',
        metadata: { error: ownershipError.message }
      }
    }

    if (ownership?.owner_id === userId) {
      return {
        hasAccess: true,
        accessType: 'owner_access',
        metadata: { barbershopId }
      }
    }

    return {
      hasAccess: false,
      accessType: 'no_access',
      metadata: { 
        userbarbershopId: tenantResult.barbershopId,
        requestedbarbershopId: barbershopId
      }
    }

  } catch (error) {
    console.error('[TenantResolver] Access check error:', error)
    return {
      hasAccess: false,
      accessType: 'system_error', 
      metadata: { error: error.message }
    }
  }
}

/**
 * Batch resolve multiple users' tenants - useful for dashboard queries
 * 
 * @param {string[]} userIds - Array of user IDs to resolve
 * @returns {Promise<Map<string, Object>>} Map of userId -> tenant result
 */
export async function batchGetTenants(userIds, options = {}) {
  const { supabase: customSupabase } = options
  const supabase = customSupabase || createClient()
  
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return new Map()
  }

  const results = new Map()
  
  // Process in batches of 50 to avoid too many concurrent queries
  const batchSize = 50
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize)
    
    const promises = batch.map(userId => 
      getTenant(userId, { supabase, useCache: true })
        .then(result => [userId, result])
    )
    
    const batchResults = await Promise.allSettled(promises)
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        const [userId, tenantResult] = result.value
        results.set(userId, tenantResult)
      }
    })
  }
  
  return results
}

/**
 * Clear tenant cache - useful after user role changes or barbershop assignments
 * 
 * @param {string} userId - Specific user to clear, or null for all
 */
export function clearTenantCache(userId = null) {
  if (userId) {
    tenantCache.delete(`tenant:${userId}`)
  } else {
    tenantCache.clear()
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getTenantCacheStats() {
  const now = Date.now()
  let activeEntries = 0
  let expiredEntries = 0
  
  for (const [key, entry] of tenantCache.entries()) {
    if (now - entry.timestamp < CACHE_TTL) {
      activeEntries++
    } else {
      expiredEntries++
    }
  }
  
  return {
    totalEntries: tenantCache.size,
    activeEntries,
    expiredEntries,
    cacheHitRatio: activeEntries / Math.max(tenantCache.size, 1)
  }
}

export default {
  getTenant,
  getUserBarbershop, // Legacy compatibility
  checkBarbershopAccess,
  batchGetTenants,
  clearTenantCache,
  getTenantCacheStats
}