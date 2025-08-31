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

  // Handle development mode with mock UUID
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true' && 
      (userId === 'dev-user-123' || userId.startsWith('dev-'))) {
    return {
      barbershopId: 'b1234567-89ab-cdef-0123-456789abcdef', // Valid UUID format
      source: 'development_fallback',
      metadata: {
        resolvedAt: new Date().toISOString(),
        userId,
        isDevelopment: true
      }
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
      .select('barbershop_id, barbershop_id')
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

    // Legacy barbershop_id support
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