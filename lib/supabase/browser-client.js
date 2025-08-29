import { createBrowserClient } from '@supabase/ssr'
import { autoSyncSession } from './session-sync.js'

/**
 * Cookie debugging utilities for tracking session persistence issues
 */
function debugCookieState(context = 'unknown') {
  if (typeof window === 'undefined') return
  
  const allCookies = document.cookie.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.split('=').map(c => c.trim())
    if (name) cookies[name] = value
    return cookies
  }, {})
  
  const supabaseCookies = Object.keys(allCookies)
    .filter(name => name.includes('sb-') || name.includes('supabase'))
    .reduce((obj, name) => {
      obj[name] = allCookies[name] ? 'present' : 'missing'
      return obj
    }, {})
  
  console.log(`🍪 [Browser Client] Cookie Debug [${context}]:`, {
    totalCookies: Object.keys(allCookies).length,
    supabaseCookies,
    allCookieNames: Object.keys(allCookies),
    timestamp: new Date().toISOString()
  })
  
  return { allCookies, supabaseCookies }
}

/**
 * Enhanced session state monitoring
 */
function logSessionState(client, context = 'unknown') {
  if (typeof window === 'undefined') return
  
  console.log(`🔍 [Browser Client] Session State Check [${context}]:`)
  
  // Check client auth state
  client.auth.getSession().then(({ data: { session }, error }) => {
    const cookieData = debugCookieState(context)
    
    console.log(`📊 [Browser Client] Session Analysis [${context}]:`, {
      hasSession: !!session,
      sessionError: error?.message || 'none',
      userId: session?.user?.id || 'none',
      accessToken: session?.access_token ? 'present' : 'missing',
      refreshToken: session?.refresh_token ? 'present' : 'missing',
      expiresAt: session?.expires_at || 'none',
      cookieCount: Object.keys(cookieData.supabaseCookies).length,
      cookieNames: Object.keys(cookieData.supabaseCookies)
    })
    
    if (error) {
      console.error(`❌ [Browser Client] Session Error [${context}]:`, error)
    }
    
    if (!session) {
      console.warn(`⚠️ [Browser Client] No Session Found [${context}] - Possible cookie persistence issue`)
    }
  }).catch(err => {
    console.error(`💥 [Browser Client] Failed to check session [${context}]:`, err)
  })
}

/**
 * Creates Supabase browser client with proper cookie handling for multi-tab authentication
 * Following current Supabase SSR best practices with enhanced error handling and cookie debugging
 */
export function createClient() {
  try {
    console.log('🏗️ [Browser Client] Starting client creation...')
    
    // Debug initial cookie state
    debugCookieState('client-creation')
    
    // Get environment variables - Next.js will inject these at build time
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let supabaseAnonKey
    
    // Handle base64 encoded key if present, otherwise use plain key
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64) {
      try {
        supabaseAnonKey = atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
        console.log('[Supabase Client] Using base64 decoded key')
      } catch (error) {
        console.warn('[Supabase Client] Failed to decode base64 key, falling back to plain key')
        supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    } else {
      supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }

    // Enhanced error reporting for debugging
    if (!supabaseUrl || !supabaseAnonKey) {
      const context = typeof window !== 'undefined' ? 'browser' : 'server'
      const availableEnvVars = typeof process !== 'undefined' && process.env ? 
        Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_SUPABASE')) : 
        'process.env not available'
        
      const errorDetails = {
        context,
        url: supabaseUrl ? 'SET' : 'MISSING',
        key: supabaseAnonKey ? 'SET' : 'MISSING',
        availableEnvVars,
        processAvailable: typeof process !== 'undefined',
        processEnvAvailable: typeof process !== 'undefined' && !!process.env,
        // Safe to log first few characters for debugging
        urlPreview: supabaseUrl?.substring(0, 20) + '...' || 'undefined',
        keyLength: supabaseAnonKey?.length || 0
      }
      
      console.error('[Supabase Client] Missing environment variables:', errorDetails)
      
      const errorMsg = `Missing required Supabase environment variables: ${
        !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''
      }${!supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY ' : ''
      }. Available env vars: ${availableEnvVars}`
      
      throw new Error(errorMsg)
    }
    
    // Success logging in development
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('[Supabase Client] ✅ Environment variables loaded successfully:', {
        url: supabaseUrl?.substring(0, 30) + '...',
        keyLength: supabaseAnonKey?.length,
        context: typeof window !== 'undefined' ? 'browser' : 'server'
      })
    }

    // Create the actual client with standard PKCE support and enhanced debugging
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        debug: process.env.NODE_ENV === 'development'
      }
    })

    // Validate that the client was created successfully
    if (!client || typeof client.from !== 'function') {
      throw new Error('Supabase client creation failed - client is invalid')
    }

    console.log('[Browser Client] ✅ Client created successfully with methods:', {
      hasFrom: typeof client.from === 'function',
      hasAuth: typeof client.auth === 'object',
      hasRealtime: typeof client.realtime === 'object'
    })

    // Enhanced auth event monitoring for cookie debugging
    if (typeof window !== 'undefined') {
      client.auth.onAuthStateChange((event, session) => {
        console.log(`🔄 [Browser Client] Auth State Change:`, {
          event,
          hasSession: !!session,
          userId: session?.user?.id || 'none',
          timestamp: new Date().toISOString()
        })
        
        // Debug cookies after auth state changes
        debugCookieState(`auth-${event}`)
        
        if (event === 'SIGNED_IN') {
          console.log('✅ [Browser Client] User signed in - checking session persistence...')
          setTimeout(() => logSessionState(client, 'post-signin-check'), 1000)
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 [Browser Client] User signed out')
          debugCookieState('post-signout')
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 [Browser Client] Token refreshed - verifying persistence...')
          debugCookieState('post-refresh')
        }
      })
      
      // Initial session state check and auto-sync
      setTimeout(async () => {
        logSessionState(client, 'initial-load')
        
        // Try to sync session from server if no valid session in localStorage
        try {
          console.log('🔄 [Browser Client] Attempting automatic session sync...')
          const syncResult = await autoSyncSession()
          
          if (syncResult.success && !syncResult.skipped) {
            console.log('✅ [Browser Client] Session synced from server - refreshing client state...')
            
            // Trigger a session refresh to update the client with synced data
            setTimeout(async () => {
              try {
                await client.auth.refreshSession()
                console.log('✅ [Browser Client] Client refreshed after session sync')
              } catch (refreshError) {
                console.warn('⚠️ [Browser Client] Client refresh failed after sync:', refreshError.message)
              }
            }, 100)
          } else if (syncResult.skipped) {
            console.log('✅ [Browser Client] Session sync skipped - valid session already exists')
          } else {
            console.log('📝 [Browser Client] No session available to sync')
          }
        } catch (syncError) {
          console.warn('⚠️ [Browser Client] Session sync failed:', syncError.message)
        }
      }, 500)
    }

    return client
    
  } catch (error) {
    console.error('[Supabase Client] Failed to create client:', error)
    throw new Error(`Supabase client creation failed: ${error.message}`)
  }
}