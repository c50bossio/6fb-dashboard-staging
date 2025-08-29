import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceClient } from '../supabase-simple.js'

// Ensure environment variables are loaded
if (typeof window === 'undefined') {
  require('dotenv').config({ path: '.env' })
  require('dotenv').config({ path: '.env.local' })
}

/**
 * Debug server-side cookie state for session persistence tracking
 */
function debugServerCookies(cookieStore, context = 'unknown') {
  try {
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(cookie => 
      cookie.name.includes('sb-') || cookie.name.includes('supabase')
    )
    
    const cookieStats = {
      total: allCookies.length,
      supabase: supabaseCookies.length,
      names: allCookies.map(c => c.name),
      supabaseNames: supabaseCookies.map(c => c.name),
      supabaseValues: supabaseCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
        isAuth: c.name.includes('auth') || c.name.includes('token'),
        isPKCE: c.name.includes('pkce') || c.name.includes('verifier')
      }))
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🍪 [Server Client] Cookie Debug [${context}]:`, cookieStats)
    }

    return cookieStats
  } catch (error) {
    console.error(`❌ [Server Client] Failed to debug cookies [${context}]:`, error.message)
    return { total: 0, supabase: 0, error: error.message }
  }
}

/**
 * Creates Supabase server client with proper cookie handling for SSR
 * Following current Supabase SSR best practices with enhanced cookie debugging
 */
export async function createClient() {
  try {
    const cookieStore = cookies()
    
    // Debug initial cookie state
    debugServerCookies(cookieStore, 'client-creation')
    
    // Get environment variables with base64 fallback support
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64 
      ? atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Missing Supabase environment variables, using service client fallback')
      return createServiceClient()
    }
    
    const client = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        // Enhanced server-side cookie getter with debugging (synchronous)
        get(name) {
          try {
            const cookie = cookieStore.get(name)
            const value = cookie?.value
            
            if (process.env.NODE_ENV === 'development') {
              const isSupabase = name.includes('sb-') || name.includes('supabase')
              if (isSupabase) {
                console.log(`🍪 [Server Client] Getting cookie: ${name} = ${value ? 'present' : 'missing'} (${value?.length || 0} chars)`)
              }
            }
            
            return value
          } catch (error) {
            console.warn(`❌ [Server Client] Failed to get cookie ${name}:`, error.message)
            return undefined
          }
        },
        
        // Enhanced server-side cookie setter with debugging and session persistence (synchronous)
        set(name, value, options) {
          try {
            // Enhanced cookie type detection
            const isPKCECookie = name.includes('pkce') || name.includes('code-verifier')
            const isSessionCookie = name.includes('auth-token') || name.includes('sb-')
            const isSupabase = name.includes('sb-') || name.includes('supabase')
            
            if (process.env.NODE_ENV === 'development' && isSupabase) {
              console.log(`🍪 [Server Client] Setting cookie: ${name}`, {
                valueLength: value?.length || 0,
                isPKCE: isPKCECookie,
                isSession: isSessionCookie,
                options: options
              })
            }
            
            // Enhanced cookie settings for better persistence
            const cookieOptions = {
              name,
              value,
              path: '/',
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false, // Required for client-side access
              // Ensure proper expiry times for different cookie types
              maxAge: isPKCECookie ? 60 * 60 : // 1 hour for PKCE
                      isSessionCookie ? 60 * 60 * 24 * 7 : // 7 days for session
                      (options?.maxAge || 60 * 60 * 24), // 24 hours default
              ...options
            }
            
            cookieStore.set(cookieOptions)
            
            // Verify cookie was set (development only)
            if (process.env.NODE_ENV === 'development' && isSupabase) {
              setTimeout(() => {
                const verifyValue = cookieStore.get(name)?.value
                if (!verifyValue) {
                  console.warn(`⚠️ [Server Client] Cookie ${name} may not have been set properly`)
                } else {
                  console.log(`✅ [Server Client] Cookie ${name} verified after setting`)
                }
              }, 10)
            }
            
          } catch (error) {
            console.warn(`❌ [Server Client] Failed to set cookie ${name}:`, error.message)
          }
        },
        
        // Standard server-side cookie remover (synchronous)
        remove(name, options) {
          try {
            cookieStore.set({
              name,
              value: '',
              path: '/',
              maxAge: 0,
              ...options
            })
          } catch (error) {
            console.warn(`Failed to remove cookie ${name}:`, error.message)
          }
        }
      }
    })

    // Add session debugging for server client
    if (process.env.NODE_ENV === 'development') {
      // Test session immediately after client creation
      try {
        const { data: { session }, error } = await client.auth.getSession()
        const cookieStats = debugServerCookies(cookieStore, 'post-client-creation')
        
        console.log('📊 [Server Client] Initial session check:', {
          hasSession: !!session,
          sessionError: error?.message || 'none',
          userId: session?.user?.id || 'none',
          cookieCount: cookieStats.supabase,
          cookieNames: cookieStats.supabaseNames
        })
        
        if (!session && cookieStats.supabase > 0) {
          console.warn('⚠️ [Server Client] Cookies present but no session - possible persistence issue')
        }
      } catch (sessionError) {
        console.error('❌ [Server Client] Failed to check initial session:', sessionError.message)
      }
    }

    return client
  } catch (error) {
    console.error('❌ Failed to create server client, using fallback:', error.message)
    return createServiceClient()
  }
}

/**
 * Creates a read-only Supabase server client for middleware and edge functions
 */
export function createClientForMiddleware() {
  const cookieStore = cookies()
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64 
    ? atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        const cookie = cookieStore.get(name)
        return cookie?.value
      },
      // No set/remove methods for read-only middleware client
      set() {},
      remove() {}
    }
  })
}