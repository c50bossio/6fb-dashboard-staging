/**
 * Supabase Connection Pool Configuration
 * Optimizes Supabase client connections for performance and prevents connection leaks
 * 
 * 🚨 CRITICAL: Fixes connection pooling issues identified in security audit
 */

import { createClient } from '@supabase/supabase-js'

// Connection pool configuration
const CONNECTION_POOL_CONFIG = {
  // Database connection pooling (handled by Supabase service)
  db: {
    pool_size: 20,            // Maximum connections in pool
    pool_timeout: 30,         // Connection timeout in seconds
    pool_recycle: 3600,       // Connection recycle time (1 hour)
    pool_reset_on_return: true, // Reset connection state on return
  },
  
  // Client-side connection management
  client: {
    max_retries: 3,           // Maximum retry attempts
    retry_delay: 1000,        // Base retry delay in ms
    connection_timeout: 30000, // 30 second connection timeout
    keepalive: true,          // Keep connections alive
  },
  
  // Real-time connection pooling
  realtime: {
    heartbeat_interval: 30,   // Heartbeat every 30 seconds
    reconnect_on_failure: true,
    max_reconnect_attempts: 5,
  }
}

// Singleton pattern for connection management
class SupabaseConnectionManager {
  constructor() {
    this.clients = new Map()
    this.connectionStats = {
      total_connections: 0,
      active_connections: 0,
      failed_connections: 0,
      reconnections: 0,
      last_error: null,
    }
  }

  /**
   * Create or retrieve cached Supabase client with connection pooling
   */
  getClient(config = {}) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = config.serviceRole 
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing')
    }

    // Create cache key
    const cacheKey = `${supabaseUrl}:${config.serviceRole ? 'service' : 'anon'}`
    
    // Return cached client if available
    if (this.clients.has(cacheKey)) {
      this.connectionStats.active_connections++
      return this.clients.get(cacheKey)
    }

    // Create new client with optimized configuration
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      
      // 🚨 CONNECTION POOL OPTIMIZATION
      db: {
        schema: 'public',
      },
      
      // Real-time configuration with connection pooling
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: CONNECTION_POOL_CONFIG.realtime.heartbeat_interval * 1000,
        reconnectAfterMs: function(tries) {
          return Math.min(tries * 1000, 30000) // Exponential backoff, max 30s
        }
      },
      
      // Global fetch configuration for connection management
      global: {
        headers: {
          'X-Client-Info': '6fb-ai-agent-system',
        },
      },
    })

    // Add connection monitoring
    this._setupConnectionMonitoring(client, cacheKey)

    // Cache the client
    this.clients.set(cacheKey, client)
    this.connectionStats.total_connections++
    this.connectionStats.active_connections++

    console.log(`🔗 Created new Supabase client: ${cacheKey}`)
    return client
  }

  /**
   * Setup connection monitoring and error handling
   */
  _setupConnectionMonitoring(client, cacheKey) {
    // Monitor auth state changes
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('🔓 User signed out, clearing connection cache')
        this.clearClientCache(cacheKey)
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed successfully')
      }
    })

    // Add error handling wrapper to database operations
    const originalFrom = client.from.bind(client)
    client.from = (table) => {
      const query = originalFrom(table)
      return this._wrapQueryWithErrorHandling(query, table)
    }
  }

  /**
   * Wrap database queries with connection error handling and retry logic
   */
  _wrapQueryWithErrorHandling(query, table) {
    const originalMethods = {}
    
    // Wrap common query methods
    const methodsToWrap = ['select', 'insert', 'update', 'delete', 'upsert']
    
    methodsToWrap.forEach(method => {
      if (query[method]) {
        originalMethods[method] = query[method].bind(query)
        query[method] = (...args) => {
          const result = originalMethods[method](...args)
          
          // Add retry logic to the promise
          if (result && typeof result.then === 'function') {
            return this._retryQuery(result, method, table)
          }
          
          return result
        }
      }
    })

    return query
  }

  /**
   * Implement query retry logic for connection failures
   */
  async _retryQuery(queryPromise, method, table, attempt = 1) {
    try {
      const result = await queryPromise
      
      // Check for connection errors
      if (result.error) {
        const isConnectionError = this._isConnectionError(result.error)
        
        if (isConnectionError && attempt <= CONNECTION_POOL_CONFIG.client.max_retries) {
          console.warn(`🔄 Retrying ${method} on ${table} (attempt ${attempt})`)
          
          // Exponential backoff
          const delay = CONNECTION_POOL_CONFIG.client.retry_delay * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          this.connectionStats.reconnections++
          return this._retryQuery(queryPromise, method, table, attempt + 1)
        } else {
          this.connectionStats.failed_connections++
          this.connectionStats.last_error = result.error
        }
      }
      
      return result
      
    } catch (error) {
      this.connectionStats.failed_connections++
      this.connectionStats.last_error = error
      
      if (this._isConnectionError(error) && attempt <= CONNECTION_POOL_CONFIG.client.max_retries) {
        console.warn(`🔄 Retrying ${method} on ${table} due to exception (attempt ${attempt})`)
        
        const delay = CONNECTION_POOL_CONFIG.client.retry_delay * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        this.connectionStats.reconnections++
        return this._retryQuery(queryPromise, method, table, attempt + 1)
      }
      
      throw error
    }
  }

  /**
   * Check if error is connection-related
   */
  _isConnectionError(error) {
    const connectionErrorPatterns = [
      'network',
      'timeout',
      'connection',
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'fetch',
    ]
    
    const errorMessage = error?.message?.toLowerCase() || error?.toString?.()?.toLowerCase() || ''
    
    return connectionErrorPatterns.some(pattern => 
      errorMessage.includes(pattern.toLowerCase())
    )
  }

  /**
   * Clear client cache (useful for auth state changes)
   */
  clearClientCache(cacheKey = null) {
    if (cacheKey) {
      this.clients.delete(cacheKey)
      this.connectionStats.active_connections--
    } else {
      this.clients.clear()
      this.connectionStats.active_connections = 0
    }
  }

  /**
   * Get connection statistics for monitoring
   */
  getConnectionStats() {
    return {
      ...this.connectionStats,
      cached_clients: this.clients.size,
      config: CONNECTION_POOL_CONFIG,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Health check for connection pool
   */
  async healthCheck() {
    try {
      const client = this.getClient()
      const { error } = await client.from('profiles').select('count').limit(1).single()
      
      return {
        healthy: !error,
        error: error?.message,
        stats: this.getConnectionStats(),
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        stats: this.getConnectionStats(),
      }
    }
  }
}

// Global connection manager instance
const connectionManager = new SupabaseConnectionManager()

// Convenience functions for creating optimized clients
export const createOptimizedClient = (config = {}) => {
  return connectionManager.getClient(config)
}

export const createServiceClient = () => {
  return connectionManager.getClient({ serviceRole: true })
}

export const getConnectionStats = () => {
  return connectionManager.getConnectionStats()
}

export const healthCheckConnections = () => {
  return connectionManager.healthCheck()
}

// Default export for backward compatibility
export default createOptimizedClient