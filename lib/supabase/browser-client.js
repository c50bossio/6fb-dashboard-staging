import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates Supabase browser client with proper cookie handling for multi-tab authentication
 * Following current Supabase SSR best practices with enhanced error handling
 */
export function createClient() {
  try {
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

    // Create the actual client
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        // Standard cookie getter - no custom manipulation
        get(name) {
          if (typeof document === 'undefined') return null
          
          const value = document.cookie
            .split(';')
            .find(row => row.trim().startsWith(`${name}=`))
            ?.split('=')[1]
          
          return value ? decodeURIComponent(value) : null
        },
        
        // Standard cookie getter for all cookies
        getAll() {
          if (typeof document === 'undefined') return []
          
          return document.cookie
            .split(';')
            .map(cookie => {
              const [name, ...rest] = cookie.trim().split('=')
              return {
                name,
                value: rest.length > 0 ? decodeURIComponent(rest.join('=')) : ''
              }
            })
            .filter(cookie => cookie.name)
        },
        
        // Standard cookie setter with proper multi-tab sharing
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return
          
          cookiesToSet.forEach(({ name, value, options = {} }) => {
            const cookieOptions = {
              path: '/',
              // Use SameSite=Lax for better cross-tab compatibility
              // Note: SameSite=None requires secure context (HTTPS)
              sameSite: 'Lax',
              // Set secure flag appropriately
              secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : false,
              // Allow reasonable expiration
              maxAge: options.maxAge || 60 * 60 * 24 * 7, // 1 week default
              ...options
            }
            
            const cookieString = [
              `${name}=${encodeURIComponent(value)}`,
              `Path=${cookieOptions.path}`,
              `SameSite=${cookieOptions.sameSite}`,
              cookieOptions.secure ? 'Secure' : '',
              cookieOptions.maxAge ? `Max-Age=${cookieOptions.maxAge}` : ''
            ].filter(Boolean).join('; ')
            
            document.cookie = cookieString
          })
        }
      }
    })

    // Validate that the client was created successfully
    if (!client || typeof client.from !== 'function') {
      throw new Error('Supabase client creation failed - client is invalid')
    }

    console.log('[Supabase Client] ✅ Client created successfully with methods:', {
      hasFrom: typeof client.from === 'function',
      hasAuth: typeof client.auth === 'object',
      hasRealtime: typeof client.realtime === 'object'
    })

    return client
    
  } catch (error) {
    console.error('[Supabase Client] Failed to create client:', error)
    throw new Error(`Supabase client creation failed: ${error.message}`)
  }
}