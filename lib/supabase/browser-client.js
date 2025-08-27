import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates Supabase browser client with proper cookie handling for multi-tab authentication
 * Following current Supabase SSR best practices
 */
export function createClient() {
  // Get environment variables with base64 fallback support
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64 
    ? atob(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_B64).trim()
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
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
            secure: window.location.protocol === 'https:',
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
}