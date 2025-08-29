'use client'

/**
 * Client-side version of tenant resolver
 * Uses the client Supabase instance for browser environments
 */

import { createClient } from './supabase/client.js'

// Cache for tenant resolutions
const tenantCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Client-side getTenant function
 * 
 * @param {string} userId - The user ID to resolve barbershop for
 * @param {Object} options - Configuration options
 * @returns {Promise<{barbershopId: string|null, source: string, metadata: Object}>}
 */
export async function getTenant(userId, options = {}) {
  const { forceRefresh = false, supabase: customSupabase } = options

  if (!userId) {
    return {
      barbershopId: null,
      source: 'invalid_input',
      metadata: { error: 'User ID is required' }
    }
  }

  // Check cache first
  const cacheKey = `tenant:${userId}`
  if (!forceRefresh && tenantCache.has(cacheKey)) {
    const cached = tenantCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return {
        ...cached.data,
        metadata: { ...cached.data.metadata, fromCache: true }
      }
    }
    tenantCache.delete(cacheKey)
  }

  const supabase = customSupabase || createClient()
  
  try {
    // First check profiles table for direct barbershop_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, shop_id')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[TenantResolver Client] Profile query error:', profileError)
    }

    if (profile?.barbershop_id) {
      const result = {
        barbershopId: profile.barbershop_id,
        source: 'profile',
        metadata: {
          resolvedAt: new Date().toISOString(),
          userId
        }
      }
      
      // Cache the result
      if (!forceRefresh) {
        tenantCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })
      }
      
      return result
    }

    // Legacy shop_id support
    if (profile?.shop_id) {
      const result = {
        barbershopId: profile.shop_id,
        source: 'profile_legacy',
        metadata: {
          resolvedAt: new Date().toISOString(),
          userId,
          legacy: true
        }
      }
      
      if (!forceRefresh) {
        tenantCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })
      }
      
      return result
    }

    // Check barbershop_staff table
    const { data: staffRecord, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('barbershop_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (staffError && staffError.code !== 'PGRST116') {
      console.error('[TenantResolver Client] Staff query error:', staffError)
    }

    if (staffRecord?.barbershop_id) {
      const result = {
        barbershopId: staffRecord.barbershop_id,
        source: 'staff',
        metadata: {
          resolvedAt: new Date().toISOString(),
          userId
        }
      }
      
      if (!forceRefresh) {
        tenantCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })
      }
      
      return result
    }

    // No association found
    const result = {
      barbershopId: null,
      source: 'no_association',
      metadata: {
        resolvedAt: new Date().toISOString(),
        userId
      }
    }

    if (!forceRefresh) {
      tenantCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
    }

    return result

  } catch (error) {
    console.error('[TenantResolver Client] Unexpected error:', error)
    return {
      barbershopId: null,
      source: 'system_error',
      metadata: { error: error.message }
    }
  }
}

/**
 * Clear tenant cache - useful after user role changes
 */
export function clearTenantCache(userId = null) {
  if (userId) {
    tenantCache.delete(`tenant:${userId}`)
  } else {
    tenantCache.clear()
  }
}

export default {
  getTenant,
  clearTenantCache
}