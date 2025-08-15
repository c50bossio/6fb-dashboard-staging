// Enhanced browser client with better cookie handling for session persistence
import { createBrowserClient } from '@supabase/ssr'

// Don't use singleton for OAuth callback to work properly
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  // Enhanced configuration with better cookie handling
  const client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        debug: true, // Enable debug to see OAuth flow
        storage: {
          // Use custom storage that can persist across domain redirects
          getItem: (key) => {
            if (typeof window === 'undefined') return null
            
            // First try localStorage
            const localValue = localStorage.getItem(key)
            if (localValue) return localValue
            
            // Then try cookies for cross-domain persistence
            const cookieValue = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${key}=`))
              ?.split('=')[1]
            
            return cookieValue ? decodeURIComponent(cookieValue) : null
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return
            
            // Store in both localStorage and cookies
            localStorage.setItem(key, value)
            
            // Also set as cookie for cross-domain persistence
            const maxAge = 60 * 60 * 24 * 7 // 7 days
            document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return
            
            // Remove from both localStorage and cookies
            localStorage.removeItem(key)
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`
          }
        }
      }
    }
  )
  
  return client
}