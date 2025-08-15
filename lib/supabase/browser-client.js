import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
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
          getItem: (key) => {
            if (typeof window === 'undefined') return null
            
            const localValue = localStorage.getItem(key)
            if (localValue) return localValue
            
            const cookieValue = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${key}=`))
              ?.split('=')[1]
            
            return cookieValue ? decodeURIComponent(cookieValue) : null
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return
            
            localStorage.setItem(key, value)
            
            const maxAge = 60 * 60 * 24 * 7 // 7 days
            document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return
            
            localStorage.removeItem(key)
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC`
          }
        }
      }
    }
  )
  
  return client
}