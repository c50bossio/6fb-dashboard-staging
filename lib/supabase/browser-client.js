import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern to prevent multiple client instances
let clientInstance = null

export function createClient() {
  // Return existing instance if available (more robust check)
  if (clientInstance) {
    return clientInstance
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  // Only log in development and only once
  if (process.env.NODE_ENV === 'development' && !clientInstance) {
  }
  
  // Create client with PKCE flow for secure OAuth
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce', // Use PKCE for secure OAuth flow
      detectSessionInUrl: false, // Let the callback route handle OAuth
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'sb-auth-token',
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') return null
          return globalThis.localStorage.getItem(key)
        },
        setItem: (key, value) => {
          if (typeof window === 'undefined') return
          globalThis.localStorage.setItem(key, value)
        },
        removeItem: (key) => {
          if (typeof window === 'undefined') return
          globalThis.localStorage.removeItem(key)
        }
      },
      debug: process.env.NODE_ENV === 'development'
    },
    // Suppress verbose logging
    global: {
      headers: {
        'x-application-name': 'bookedbarber'
      }
    },
    // Add cookie options for better session handling
    cookies: {
      domain: typeof window !== 'undefined' ? window.location.hostname : undefined,
      path: '/',
      sameSite: 'lax',
      secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : true
    }
  })
  
  // Add minimal auth state logging for important events only
  if (process.env.NODE_ENV === 'development' && !clientInstance) {
    client.auth.onAuthStateChange((event, session) => {
      // Only log significant auth events, not initial checks
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Auth state changed
      }
    })
  }
  
  // Store instance for reuse (always store, not just in browser)
  clientInstance = client
  
  return client
}

// Helper to reset the client (useful for testing)
export function resetClient() {
  clientInstance = null
}