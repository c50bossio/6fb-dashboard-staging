/**
 * Centralized Supabase Client
 * Single source of truth for all Supabase operations
 * Implements connection pooling, retry logic, and proper error handling
 */

import { createBrowserClient } from '@supabase/ssr'
import { config } from '@/config'
import { logger } from '@/lib/logger'

const supabaseLogger = logger.child('supabase')

// Singleton instance
let browserClient = null
let serverClient = null

/**
 * Connection pool manager
 */
class SupabaseConnectionPool {
  constructor() {
    this.connections = new Map()
    this.maxConnections = config.supabase.pooling.max
    this.minConnections = config.supabase.pooling.min
    this.activeConnections = 0
  }

  async getConnection() {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++
      return this.createConnection()
    }
    
    // Wait for available connection
    await new Promise(resolve => setTimeout(resolve, 100))
    return this.getConnection()
  }

  createConnection() {
    const client = createBrowserClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        },
        global: {
          headers: {
            'x-application-name': config.app.name
          }
        },
        db: {
          schema: 'public'
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    )
    
    return client
  }

  releaseConnection() {
    this.activeConnections--
  }
}

const connectionPool = new SupabaseConnectionPool()

/**
 * Get or create browser Supabase client
 * For client-side operations
 */
export function getSupabaseClient() {
  if (!config.supabase.url || !config.supabase.anonKey) {
    supabaseLogger.error('Missing Supabase configuration')
    return null
  }

  if (!browserClient) {
    try {
      browserClient = createBrowserClient(
        config.supabase.url,
        config.supabase.anonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            storageKey: 'supabase.auth.token',
            debug: config.env.isDevelopment
          },
          global: {
            headers: {
              'x-application-name': config.app.name,
              'x-client-info': 'supabase-js-web'
            }
          },
          db: {
            schema: 'public'
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        }
      )
      
      supabaseLogger.info('Supabase browser client created')
      
      // Set up auth state listener
      browserClient.auth.onAuthStateChange((event, session) => {
        supabaseLogger.debug('Auth state changed', { event, userId: session?.user?.id })
        
        // Handle auth events
        switch (event) {
          case 'SIGNED_IN':
            handleSignIn(session)
            break
          case 'SIGNED_OUT':
            handleSignOut()
            break
          case 'TOKEN_REFRESHED':
            supabaseLogger.debug('Token refreshed')
            break
          case 'USER_UPDATED':
            handleUserUpdate(session)
            break
        }
      })
      
    } catch (error) {
      supabaseLogger.error('Failed to create Supabase client', error)
      return null
    }
  }

  return browserClient
}

/**
 * Get server-side Supabase client
 * For API routes and server-side operations
 */
export function getSupabaseServerClient(req, res) {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    supabaseLogger.error('Missing Supabase server configuration')
    return null
  }

  try {
    // Create a new client for each request to ensure fresh auth state
    const client = createBrowserClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            'x-application-name': config.app.name,
            'x-client-info': 'supabase-js-server'
          }
        },
        db: {
          schema: 'public'
        }
      }
    )
    
    return client
  } catch (error) {
    supabaseLogger.error('Failed to create server Supabase client', error)
    return null
  }
}

/**
 * Execute database query with retry logic
 */
export async function executeQuery(queryFn, options = {}) {
  const {
    retries = config.api.retries,
    retryDelay = config.api.retryDelay,
    timeout = config.api.timeout
  } = options
  
  let lastError = null
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Add timeout to query
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
      
      const result = await Promise.race([
        queryFn(),
        timeoutPromise
      ])
      
      // Log successful query after retry
      if (attempt > 0) {
        supabaseLogger.info('Query succeeded after retry', { attempt })
      }
      
      return result
      
    } catch (error) {
      lastError = error
      supabaseLogger.warn('Query failed, retrying...', { 
        attempt: attempt + 1, 
        error: error.message 
      })
      
      // Don't retry on certain errors
      if (error.message?.includes('JWT expired') ||
          error.message?.includes('Invalid API key') ||
          error.message?.includes('Row level security')) {
        throw error
      }
      
      // Wait before retry with exponential backoff
      if (attempt < retries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, retryDelay * Math.pow(2, attempt))
        )
      }
    }
  }
  
  supabaseLogger.error('Query failed after all retries', lastError)
  throw lastError
}

/**
 * Subscribe to real-time updates with automatic reconnection
 */
export function subscribeToTable(table, filters = {}, callbacks = {}) {
  const client = getSupabaseClient()
  if (!client) return null
  
  try {
    let subscription = client
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: Object.entries(filters)
            .map(([key, value]) => `${key}=eq.${value}`)
            .join(',')
        },
        (payload) => {
          supabaseLogger.debug('Realtime event received', { 
            table, 
            event: payload.eventType,
            id: payload.new?.id || payload.old?.id
          })
          
          // Call appropriate callback
          switch (payload.eventType) {
            case 'INSERT':
              callbacks.onInsert?.(payload.new)
              break
            case 'UPDATE':
              callbacks.onUpdate?.(payload.new, payload.old)
              break
            case 'DELETE':
              callbacks.onDelete?.(payload.old)
              break
          }
          
          // Always call onAny if provided
          callbacks.onAny?.(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          supabaseLogger.info('Subscribed to realtime updates', { table })
        } else if (status === 'CLOSED') {
          supabaseLogger.warn('Realtime subscription closed', { table })
          // Attempt to reconnect after delay
          setTimeout(() => {
            subscribeToTable(table, filters, callbacks)
          }, 5000)
        } else if (status === 'CHANNEL_ERROR') {
          supabaseLogger.error('Realtime subscription error', { table })
        }
      })
    
    return () => {
      subscription.unsubscribe()
      supabaseLogger.debug('Unsubscribed from realtime updates', { table })
    }
    
  } catch (error) {
    supabaseLogger.error('Failed to subscribe to realtime', error, { table })
    return null
  }
}

/**
 * Handle sign in
 */
function handleSignIn(session) {
  supabaseLogger.info('User signed in', { 
    userId: session?.user?.id,
    email: session?.user?.email
  })
  
  // Clear any cached data from previous session
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:signin', { detail: session }))
  }
}

/**
 * Handle sign out
 */
function handleSignOut() {
  supabaseLogger.info('User signed out')
  
  // Clear all cached data
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:signout'))
  }
}

/**
 * Handle user update
 */
function handleUserUpdate(session) {
  supabaseLogger.info('User updated', { 
    userId: session?.user?.id 
  })
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:userupdate', { detail: session }))
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const client = getSupabaseClient()
  if (!client) return false
  
  try {
    const { data: { session }, error } = await client.auth.getSession()
    return !error && !!session
  } catch (error) {
    supabaseLogger.error('Failed to check authentication', error)
    return false
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const client = getSupabaseClient()
  if (!client) return null
  
  try {
    const { data: { user }, error } = await client.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    supabaseLogger.error('Failed to get current user', error)
    return null
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const client = getSupabaseClient()
  if (!client) return null
  
  try {
    const { data: { session }, error } = await client.auth.getSession()
    if (error) throw error
    return session
  } catch (error) {
    supabaseLogger.error('Failed to get session', error)
    return null
  }
}

/**
 * Sign out user
 */
export async function signOut() {
  const client = getSupabaseClient()
  if (!client) return { error: 'No client available' }
  
  try {
    const { error } = await client.auth.signOut()
    if (error) throw error
    
    supabaseLogger.info('User signed out successfully')
    return { error: null }
  } catch (error) {
    supabaseLogger.error('Failed to sign out', error)
    return { error }
  }
}

// Export the main client getter as default
export default getSupabaseClient

// Also export a ready-to-use client instance for simple imports
export const supabase = getSupabaseClient()