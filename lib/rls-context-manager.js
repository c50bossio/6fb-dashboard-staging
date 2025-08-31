/**
 * RLS Context Manager - Multi-tenant data isolation for Supabase
 * 
 * This module ensures Row Level Security (RLS) policies are properly enforced
 * across all database operations, providing secure multi-tenant data access.
 */

// Import browser client directly to avoid server-side imports during build
import { createClient as createBrowserClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Simple logger implementation
const logger = {
  child: (name) => ({
    debug: (msg, data) => console.log(`[${name}]`, msg, data),
    info: (msg, data) => console.log(`[${name}]`, msg, data),  
    warn: (msg, data) => console.warn(`[${name}]`, msg, data),
    error: (msg, err, data) => console.error(`[${name}]`, msg, err, data)
  })
}

const rlsLogger = logger.child('rls')

// Use the wrapped browser client function that handles env vars internally
const createClientFunction = createBrowserClient

/**
 * RLS Context Manager Class
 * Manages secure database access with multi-tenant isolation
 */
export class RLSContextManager {
  constructor() {
    this.activeContext = null
    this.contextStack = []
  }

  /**
   * Set RLS context for current user and shop
   * @param {Object} context - Context information
   * @param {string} context.userId - Current user ID
   * @param {string} context.barbershopId - Shop/barbershop ID
   * @param {string} context.role - User role (barber, shop_owner, etc.)
   * @param {Array} context.permissions - User permissions
   */
  async setContext(context) {
    try {
      const { userId, barbershopId, role, permissions = [] } = context
      
      if (!userId || !barbershopId) {
        throw new Error('userId and barbershopId are required for RLS context')
      }

      this.activeContext = {
        userId,
        barbershopId,
        role,
        permissions,
        timestamp: Date.now()
      }

      // Push to context stack for nested operations
      this.contextStack.push(this.activeContext)

      rlsLogger.debug('RLS context set', {
        userId,
        barbershopId,
        role,
        permissionCount: permissions.length
      })

      return this.activeContext

    } catch (error) {
      rlsLogger.error('Failed to set RLS context', error)
      throw error
    }
  }

  /**
   * Get current RLS context
   * @returns {Object|null} Current context or null
   */
  getContext() {
    return this.activeContext
  }

  /**
   * Clear RLS context
   */
  clearContext() {
    this.contextStack.pop()
    this.activeContext = this.contextStack[this.contextStack.length - 1] || null
    
    rlsLogger.debug('RLS context cleared', {
      remainingContexts: this.contextStack.length
    })
  }

  /**
   * Execute query with RLS context enforcement
   * @param {Function} queryFn - Query function to execute
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Query result
   */
  async executeWithContext(queryFn, options = {}) {
    const context = this.getContext()
    if (!context) {
      throw new Error('No RLS context set. Call setContext() first.')
    }

    try {
      // Add RLS enforcement to query options
      const rlsOptions = {
        ...options,
        rls: {
          userId: context.userId,
          barbershopId: context.barbershopId,
          role: context.role,
          permissions: context.permissions
        }
      }

      rlsLogger.debug('Executing query with RLS context', {
        barbershopId: context.barbershopId,
        userId: context.userId,
        role: context.role
      })

      const result = await queryFn(rlsOptions)
      return result

    } catch (error) {
      rlsLogger.error('Query execution failed with RLS context', error, {
        context
      })
      throw error
    }
  }

  /**
   * Validate that user has access to shop
   * @param {string} userId - User ID to validate
   * @param {string} barbershopId - Shop ID to validate access to
   * @returns {Promise<boolean>} True if user has access
   */
  async validateShopAccess(userId, barbershopId) {
    try {
      const supabase = createClientFunction()

      // Check direct shop ownership
      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id, barbershop_id')
        .eq('id', userId)
        .single()

      if (profile?.shop_id === barbershopId || profile?.barbershop_id === barbershopId) {
        rlsLogger.debug('Shop access validated - direct ownership', {
          userId,
          barbershopId
        })
        return true
      }

      // Check staff relationship
      const { data: staffAccess } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, role, is_active')
        .eq('user_id', userId)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (staffAccess) {
        rlsLogger.debug('Shop access validated - staff relationship', {
          userId,
          barbershopId,
          role: staffAccess.role
        })
        return true
      }

      rlsLogger.warn('Shop access denied', { userId, barbershopId })
      return false

    } catch (error) {
      rlsLogger.error('Failed to validate shop access', error, {
        userId,
        barbershopId
      })
      return false
    }
  }

  /**
   * Get user's accessible shops
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of accessible shop IDs
   */
  async getUserAccessibleShops(userId) {
    try {
      const supabase = createClientFunction()
      const accessibleShops = []

      // Get direct shop ownership
      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id, barbershop_id, role')
        .eq('id', userId)
        .single()

      if (profile?.shop_id) {
        accessibleShops.push({
          barbershopId: profile.shop_id,
          role: profile.role || 'owner',
          accessType: 'owner'
        })
      }

      if (profile?.barbershop_id && profile.barbershop_id !== profile.shop_id) {
        accessibleShops.push({
          barbershopId: profile.barbershop_id,
          role: profile.role || 'owner',
          accessType: 'owner'
        })
      }

      // Get staff relationships
      const { data: staffShops } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, role')
        .eq('user_id', userId)
        .eq('is_active', true)

      staffShops?.forEach(staff => {
        // Avoid duplicates
        if (!accessibleShops.find(shop => shop.barbershopId === staff.barbershop_id)) {
          accessibleShops.push({
            barbershopId: staff.barbershop_id,
            role: staff.role,
            accessType: 'staff'
          })
        }
      })

      rlsLogger.debug('Retrieved accessible shops', {
        userId,
        shopCount: accessibleShops.length
      })

      return accessibleShops

    } catch (error) {
      rlsLogger.error('Failed to get accessible shops', error, { userId })
      return []
    }
  }

  /**
   * Create shop-scoped query builder
   * @param {string} tableName - Table name to query
   * @param {Object} context - RLS context (optional, uses active if not provided)
   * @returns {Object} Query builder with RLS enforcement
   */
  createShopScopedQuery(tableName, context = null) {
    const activeContext = context || this.getContext()
    if (!activeContext) {
      throw new Error('No RLS context available for shop-scoped query')
    }

    try {
      // Create Supabase client with enhanced error handling
      let supabase
      try {
        supabase = createClientFunction()
      } catch (clientError) {
        throw new Error(`Failed to create Supabase client: ${clientError.message}`)
      }
      
      // Validate that supabase client was created successfully
      if (!supabase) {
        throw new Error('Supabase client is null - createClient returned null')
      }
      
      if (typeof supabase.from !== 'function') {
        throw new Error(`Supabase client is invalid - missing 'from' method. Got: ${Object.keys(supabase).join(', ')}`)
      }

      // Create query builder with enhanced validation
      let query
      try {
        query = supabase.from(tableName)
      } catch (queryError) {
        throw new Error(`Failed to call supabase.from('${tableName}'): ${queryError.message}`)
      }
      
      // Validate that query builder was created successfully
      if (!query) {
        throw new Error(`Query builder is null - supabase.from('${tableName}') returned null`)
      }
      
      // Skip validation - Supabase query builders are Proxy objects and method checking is unreliable
      
      // Debug logging to understand what query object we're getting
      rlsLogger.debug('Query builder created', {
        tableName,
        queryType: typeof query,
        queryKeys: Object.keys(query || {}),
        hasEq: 'eq' in (query || {}),
        queryConstructor: query?.constructor?.name,
        queryToString: query?.toString?.()
      })

      // Apply shop filtering based on table structure
      switch (tableName) {
        case 'appointments':
        case 'customers':
          query = query.eq('barbershop_id', activeContext.barbershopId)
          break
        
        case 'services':
        case 'staff_schedules':
          query = query.eq('barbershop_id', activeContext.barbershopId)
          break
        
        case 'barbershop_staff':
          query = query.eq('barbershop_id', activeContext.barbershopId)
          break
        
        case 'barbershops':
          query = query.eq('id', activeContext.barbershopId)
          break
        
        default:
          rlsLogger.warn('Unknown table for RLS scoping, using barbershop_id', { 
            tableName, 
            barbershopId: activeContext.barbershopId 
          })
          // Apply generic barbershop_id filter as fallback
          query = query.eq('barbershop_id', activeContext.barbershopId)
      }

      // Basic final validation that query is still usable
      if (!query) {
        throw new Error(`Query builder became null after applying shop scope for table '${tableName}'`)
      }

      rlsLogger.debug('Shop-scoped query created successfully', {
        tableName,
        barbershopId: activeContext.barbershopId,
        userId: activeContext.userId
      })

      return query

    } catch (error) {
      rlsLogger.error('Failed to create shop-scoped query', error, {
        tableName,
        barbershopId: activeContext?.barbershopId,
        userId: activeContext?.userId
      })
      throw new Error(`Failed to create shop-scoped query for table '${tableName}': ${error.message}`)
    }
  }

  /**
   * Wrap query function with RLS context validation
   * @param {Function} queryFn - Query function to wrap
   * @returns {Function} Wrapped query function
   */
  withRLS(queryFn) {
    return async (...args) => {
      const context = this.getContext()
      if (!context) {
        throw new Error('RLS context required. Call setContext() before executing queries.')
      }

      try {
        return await queryFn(...args)
      } catch (error) {
        // Enhanced error logging with RLS context
        rlsLogger.error('RLS-wrapped query failed', error, {
          context,
          args: args.length
        })
        
        // Check if it's an RLS policy violation
        if (error.message?.includes('row-level security') || 
            error.message?.includes('policy violation')) {
          throw new Error(`Access denied: You don't have permission to access this data (Shop: ${context.barbershopId})`)
        }
        
        throw error
      }
    }
  }
}

// Singleton instance
const rlsManager = new RLSContextManager()

/**
 * Initialize RLS context for current user session
 * @param {Object} session - User session from Supabase Auth
 * @returns {Promise<Object>} RLS context
 */
export async function initializeRLSContext(session) {
  if (!session?.user) {
    throw new Error('Valid session required to initialize RLS context')
  }

  try {
    const supabase = createClientFunction()
    const userId = session.user.id

    // Get user profile for shop association
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barbershop_id, barbershop_id, role')
      .eq('id', userId)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
      throw profileError
    }

    // Determine primary shop ID
    let barbershopId = profile?.shop_id || profile?.barbershop_id

    if (!barbershopId) {
      // Try to get shop via staff relationship
      const { data: staffData } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (staffData) {
        barbershopId = staffData.barbershop_id
      }
    }

    if (!barbershopId) {
      throw new Error('No shop association found for user')
    }

    // Set RLS context
    const context = await rlsManager.setContext({
      userId,
      barbershopId,
      role: profile?.role || 'user',
      permissions: [] // TODO: Implement permissions system
    })

    rlsLogger.info('RLS context initialized', {
      userId,
      barbershopId,
      role: context.role
    })

    return context

  } catch (error) {
    rlsLogger.error('Failed to initialize RLS context', error)
    throw error
  }
}

/**
 * Execute query with automatic RLS context initialization
 * @param {Function} queryFn - Query function to execute
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Query result
 */
export async function executeWithRLS(queryFn, options = {}) {
  try {
    // Check if context already exists
    let context = rlsManager.getContext()
    
    if (!context) {
      // Try to initialize from current session
      const supabase = createClientFunction()
      
      if (!supabase) {
        throw new Error('Failed to create Supabase client')
      }
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error(`Failed to get session: ${sessionError.message}`)
      }
      
      if (session) {
        context = await initializeRLSContext(session)
      } else {
        throw new Error('No authenticated session found')
      }
    }

    return await rlsManager.executeWithContext(queryFn, options)

  } catch (error) {
    rlsLogger.error('Failed to execute query with RLS', error)
    throw error
  }
}

// Export singleton instance and key functions
export { rlsManager }
export default rlsManager

// Convenience exports
export const setRLSContext = (context) => rlsManager.setContext(context)
export const getRLSContext = () => rlsManager.getContext()
export const clearRLSContext = () => rlsManager.clearContext()
export const validateShopAccess = (userId, barbershopId) => rlsManager.validateShopAccess(userId, barbershopId)
export const createShopScopedQuery = (tableName, context) => {
  try {
    return rlsManager.createShopScopedQuery(tableName, context)
  } catch (error) {
    rlsLogger.error('Failed to create shop-scoped query via export function', error, {
      tableName,
      hasContext: !!context
    })
    throw error
  }
}
export const withRLS = (queryFn) => rlsManager.withRLS(queryFn)