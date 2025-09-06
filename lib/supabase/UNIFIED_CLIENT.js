/**
 * UNIFIED SUPABASE CLIENT
 * Consolidates 8+ Supabase client implementations into a single, reliable system
 * 
 * Replaces:
 * - lib/supabase-client.js
 * - lib/supabase-simple.js  
 * - lib/supabase-service.js
 * - lib/supabase/browser-client.js
 * - lib/supabase/server-client.js
 * - lib/archived-supabase/supabase.js
 * - And 2+ others
 */

import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'

// Simple console-based logging - no dependencies to prevent circular references
const createSimpleLogger = (prefix) => ({
  info: (...args) => {
    try {
      console.info(`[${prefix}]`, ...args)
    } catch (e) {
      // Silent fallback
    }
  },
  warn: (...args) => {
    try {
      console.warn(`[${prefix}]`, ...args)
    } catch (e) {
      // Silent fallback
    }
  },
  error: (...args) => {
    try {
      console.error(`[${prefix}]`, ...args)
    } catch (e) {
      // Silent fallback
    }
  }
})

const getLoggers = () => ({
  dbLogger: createSimpleLogger('DB'),
  authLogger: createSimpleLogger('AUTH')
})

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '🚨 Missing Supabase environment variables. Please check your .env.local file:\n' +
    '   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url\n' +
    '   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key\n' +
    '   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (for server-side operations)'
  )
}

/**
 * CLIENT-SIDE SUPABASE CLIENT
 * Use this in React components, client-side hooks, and browser environments
 */
export function createClient() {
  const client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Disable multi-tab synchronization to prevent auth events on tab switches
    // This prevents TOKEN_REFRESHED and INITIAL_SESSION events when switching tabs
    multiTab: false
  })
  
  // Add getUserShopId helper method
  client.getUserShopId = async function(userId) {
    try {
      // First check profiles table for direct shop association
      const { data: profile, error: profileError } = await this
        .from('profiles')
        .select('barbershop_id, barbershop_id')
        .eq('id', userId)
        .maybeSingle()
      
      if (profileError) {
        console.warn('Profile query warning in getUserShopId:', profileError.message)
      }
      
      // Return shop_id or barbershop_id if found
      if (profile?.barbershop_id || profile?.barbershop_id) {
        return profile.barbershop_id || profile.barbershop_id
      }
      
      // Skip barbershop_staff query to avoid 406 errors
      // Staff associations should be handled through profiles table only
      
      return null
    } catch (error) {
      console.error('Error in getUserShopId:', error)
      return null
    }
  }
  
  // Add getBarbershop helper method
  client.getBarbershop = async function(barbershopId) {
    try {
      const { data, error } = await this
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .maybeSingle()
      
      if (error) {
        console.warn('Barbershop query warning:', error.message)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error in getBarbershop:', error)
      return null
    }
  }
  
  // Add refreshCurrentUser helper (no-op for now)
  client.refreshCurrentUser = async function() {
    // This is a no-op for now, can be implemented if needed
    return true
  }
  
  // Add appointments helper methods
  client.getAppointments = async function(barbershopId, options = {}) {
    try {
      const { startDate, endDate, barberId, status } = options
      
      let query = this
        .from('appointments')
        .select('id, barbershop_id, customer_id, service_id, barber_id, start_time, end_time, duration_minutes, price, status, notes, created_at, updated_at')
        .eq('barbershop_id', barbershopId)
        .order('start_time', { ascending: true })
      
      // Apply date filters
      if (startDate) {
        query = query.gte('start_time', `${startDate}T00:00:00`)
      }
      if (endDate) {
        query = query.lte('start_time', `${endDate}T23:59:59`)
      }
      
      // Apply additional filters
      if (barberId) {
        query = query.eq('barber_id', barberId)
      }
      if (status) {
        query = query.eq('status', status)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.warn('getAppointments query error:', error.message)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('getAppointments error:', error)
      return []
    }
  }
  
  client.getBookings = async function(barbershopId, options = {}) {
    try {
      const { startDate, endDate, limit = 50 } = options
      
      let query = this
        .from('bookings')
        .select('price, status, service_name, start_time, created_at')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      // Apply date filters if provided
      if (startDate) {
        query = query.gte('start_time', `${startDate}T00:00:00`)
      }
      if (endDate) {
        query = query.lte('start_time', `${endDate}T23:59:59`)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.warn('getBookings query error:', error.message)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('getBookings error:', error)
      return []
    }
  }
  
  client.createAppointment = async function(appointmentData) {
    try {
      const { data, error } = await this
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('createAppointment error:', error)
      throw error
    }
  }
  
  client.updateAppointment = async function(appointmentId, updates) {
    try {
      const { data, error } = await this
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('updateAppointment error:', error)
      throw error
    }
  }
  
  client.deleteAppointment = async function(appointmentId) {
    try {
      const { data, error } = await this
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('deleteAppointment error:', error)
      throw error
    }
  }

  // Add real-time subscription helper method
  client.subscribeToChanges = function(table, filter = {}, callback) {
    // Create a unique channel name
    const channelName = `${table}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Build filter string for Supabase real-time
    const filterParts = Object.entries(filter)
      .map(([key, value]) => `${key}=eq.${value}`)
    const filterString = filterParts.length > 0 ? filterParts.join(',') : undefined
    
    // Create the subscription
    const channel = this.channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filterString
        },
        (payload) => {
          // Call the callback with the payload
          if (callback) {
            callback(payload)
          }
        }
      )
      .subscribe()
    
    // Return unsubscribe function directly for useEffect compatibility
    return () => {
      this.removeChannel(channel)
    }
  }
  
  return client
}

/**
 * SERVER-SIDE SUPABASE CLIENT
 * Use this in API routes, server components, and middleware
 * Handles cookies properly for authentication state
 */
export async function createServerSupabaseClient() {
  // Dynamic import to avoid Next.js build issues
  const { cookies } = await import('next/headers')
  const cookieStore = cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          // Handle cases where cookies can't be set (e.g., middleware)
          const { dbLogger: logger } = getLoggers()
          logger.warn('Failed to set cookie in server client', error, {
            cookie_name: name,
            context: 'server_client_setup'
          })
        }
      },
    },
  })
}

/**
 * SERVICE ROLE CLIENT
 * Use this for admin operations that bypass RLS
 * ⚠️  DANGER: Only use when absolutely necessary, bypasses all security
 */
export async function createServiceRoleClient() {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    const { dbLogger: logger } = getLoggers()
    logger.warn('Attempted to use service role client on client-side, using regular client instead', null, {
      context: 'service_role_client_security',
      client_side_attempt: true
    })
    return createClient()
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    const { dbLogger: logger } = getLoggers()
    logger.warn('Service role key not available, falling back to regular client', null, {
      context: 'service_role_client_fallback',
      env_check: 'SUPABASE_SERVICE_ROLE_KEY missing'
    })
    return createClient()
  }

  // Dynamic import to avoid Next.js build issues
  const { cookies } = await import('next/headers')
  const cookieStore = cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (error) {
          const { dbLogger: logger } = getLoggers()
          logger.warn('Failed to set service role cookie', error, {
            cookie_name: name,
            context: 'service_role_cookie_error'
          })
        }
      },
    },
  })
}

/**
 * MIDDLEWARE SUPABASE CLIENT
 * Special client for Next.js middleware that can't use the cookies() function
 */
export function createMiddlewareClient(request, response) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}

/**
 * TYPED CLIENT WRAPPER
 * Provides additional type safety and common operations
 */
export class SupabaseClientWrapper {
  constructor(client, context = 'unknown') {
    this.client = client
    this.context = context
  }

  // User authentication helpers
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser()
      
      if (error) {
        const { authLogger: logger } = getLoggers()
        logger.error('Authentication error in getCurrentUser', error, {
          context: this.context,
          supabase_error: error.message
        })
        return { user: null, error }
      }

      return { user, error: null }
    } catch (error) {
      const { authLogger: logger } = getLoggers()
      logger.error('Unexpected error in getCurrentUser', error, {
        context: this.context,
        operation: 'getCurrentUser'
      })
      return { user: null, error }
    }
  }

  // Get user profile with shop associations
  async getUserProfile(userId = null) {
    try {
      let targetUserId = userId

      if (!targetUserId) {
        const { user, error } = await this.getCurrentUser()
        if (error || !user) return { profile: null, error: error || 'No authenticated user' }
        targetUserId = user.id
      }

      // Get profile first
      const { data: profile, error: profileError } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (profileError) {
        return { profile: null, error: profileError }
      }

      // Get barbershop info if user has shop_id or barbershop_id
      let barbershop = null
      const shopId = profile?.barbershop_id || profile?.barbershop_id
      if (shopId) {
        const { data: shopData } = await this.client
          .from('barbershops')
          .select('id, name, owner_id')
          .eq('id', shopId)
          .maybeSingle()
        
        barbershop = shopData
      }

      // Skip barbershop_staff query to avoid 406 errors
      // Staff associations should be determined from profiles.role and barbershop ownership
      let staff_associations = []

      // Combine data
      const enrichedProfile = {
        ...profile,
        barbershop,
        staff_associations
      }

      return { profile: enrichedProfile, error: null }

    } catch (error) {
      const { dbLogger: logger } = getLoggers()
      logger.error('Error getting user profile', error, {
        context: this.context,
        operation: 'getUserProfile',
        user_id: userId
      })
      return { profile: null, error }
    }
  }

  // Get user's barbershop context (primary shop they work with)
  async getUserBarbershopContext(userId = null) {
    try {
      const { profile, error } = await this.getUserProfile(userId)
      
      if (error) return { barbershop_id: null, error }
      
      // Priority order: direct ownership -> staff association -> null
      let barbershop_id = profile?.barbershop_id || profile?.barbershop_id

      // Check staff associations if no direct shop
      if (!barbershop_id && profile?.staff_associations?.length > 0) {
        const activeAssociation = profile.staff_associations.find(assoc => assoc.is_active)
        barbershop_id = activeAssociation?.barbershop_id
      }

      return { 
        barbershop_id, 
        profile, 
        error: null,
        role: profile?.role,
        permissions: this.getUserPermissions(profile)
      }

    } catch (error) {
      const { dbLogger: logger } = getLoggers()
      logger.error('Error getting user barbershop context', error, {
        context: this.context,
        operation: 'getUserBarbershopContext',
        user_id: userId
      })
      return { barbershop_id: null, error }
    }
  }

  // Determine user permissions based on role and context
  getUserPermissions(profile) {
    if (!profile) return []

    const basePermissions = {
      CLIENT: ['view_own_appointments', 'book_appointments'],
      BARBER: ['view_shop_data', 'manage_own_appointments', 'view_customers'],
      SHOP_OWNER: ['manage_shop', 'manage_staff', 'view_analytics', 'manage_customers'],
      ENTERPRISE_OWNER: ['manage_organization', 'view_all_shops', 'manage_enterprise'],
      SUPER_ADMIN: ['manage_system', 'view_all_data', 'manage_all_users']
    }

    return basePermissions[profile.role] || []
  }

  // Safe query with automatic error handling
  async safeQuery(tableName, query, options = {}) {
    try {
      const { logErrors = true, throwOnError = false } = options

      let queryBuilder = this.client.from(tableName)

      // Apply query operations
      if (query.select) queryBuilder = queryBuilder.select(query.select)
      if (query.eq) {
        Object.entries(query.eq).forEach(([column, value]) => {
          queryBuilder = queryBuilder.eq(column, value)
        })
      }
      if (query.in) {
        Object.entries(query.in).forEach(([column, values]) => {
          queryBuilder = queryBuilder.in(column, values)
        })
      }
      if (query.order) queryBuilder = queryBuilder.order(query.order.column, query.order.options)
      if (query.limit) queryBuilder = queryBuilder.limit(query.limit)
      if (query.range) queryBuilder = queryBuilder.range(query.range.from, query.range.to)

      const result = await queryBuilder

      if (result.error) {
        if (logErrors) {
          const { dbLogger: logger } = getLoggers()
          logger.error('Database query error', result.error, {
            context: this.context,
            table: tableName,
            query_type: Object.keys(query).join(','),
            operation: 'safeQuery'
          })
        }
        if (throwOnError) {
          throw result.error
        }
      }

      return result

    } catch (error) {
      const { dbLogger: logger } = getLoggers()
      logger.error('Unexpected error in safeQuery', error, {
        context: this.context,
        table: tableName,
        operation: 'safeQuery'
      })
      return { data: null, error }
    }
  }

  // Connection health check
  async healthCheck() {
    try {
      const startTime = Date.now()
      
      // Test basic connectivity
      const { error } = await this.client
        .from('profiles')
        .select('id')
        .limit(1)

      const responseTime = Date.now() - startTime

      return {
        healthy: !error,
        responseTime,
        context: this.context,
        error: error?.message || null,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      return {
        healthy: false,
        context: this.context,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * CONVENIENCE FUNCTIONS
 * Pre-configured clients for common use cases
 */

// Get client-side wrapper
export function getClientWrapper() {
  return new SupabaseClientWrapper(createClient(), 'client-side')
}

// Get server-side wrapper  
export function getServerWrapper() {
  return new SupabaseClientWrapper(createServerSupabaseClient(), 'server-side')
}

// Get service role wrapper (use sparingly!)
export function getServiceWrapper() {
  return new SupabaseClientWrapper(createServiceRoleClient(), 'service-role')
}

/**
 * MIGRATION HELPERS
 * To help transition from old client implementations
 */

// Legacy compatibility - maps to old function names
export const supabase = createClient() // For immediate compatibility
export const createSupabaseClient = createClient // Legacy name mapping
export const createSupabaseServerClient = createServerSupabaseClient // Legacy name mapping

/**
 * USAGE EXAMPLES:
 * 
 * // Client-side (React components)
 * import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
 * const supabase = createClient()
 * 
 * // Server-side (API routes)
 * import { createServerSupabaseClient } from '@/lib/supabase/UNIFIED_CLIENT'
 * const supabase = createServerSupabaseClient()
 * 
 * // With wrapper (recommended for complex operations)
 * import { getServerWrapper } from '@/lib/supabase/UNIFIED_CLIENT'
 * const wrapper = getServerWrapper()
 * const { profile, error } = await wrapper.getUserProfile()
 * 
 * // Service role (admin operations)
 * import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'
 * const adminClient = createServiceRoleClient()
 */

export default {
  createClient,
  createServerSupabaseClient,
  createServiceRoleClient,
  createMiddlewareClient,
  SupabaseClientWrapper,
  getClientWrapper,
  getServerWrapper,
  getServiceWrapper
}