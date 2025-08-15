import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern to prevent multiple client instances
let clientInstance = null

export function createClient() {
  // Return existing instance if available
  if (clientInstance && typeof window !== 'undefined') {
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
    console.log('🔧 Initializing Supabase client with PKCE support')
  }
  
  // Create client with enhanced PKCE configuration for OAuth compatibility
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      // Enhanced detection for OAuth redirects
      storageKey: 'sb-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Reduce debug noise - set to false to suppress GoTrueClient logs
      debug: false
    },
    // Suppress verbose logging
    global: {
      headers: {
        'x-application-name': 'bookedbarber'
      }
    }
  })
  
  // Add minimal auth state logging for important events only
  if (process.env.NODE_ENV === 'development' && !clientInstance) {
    client.auth.onAuthStateChange((event, session) => {
      // Only log significant auth events, not initial checks
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        console.log(`🔐 Auth event: ${event}`, {
          hasSession: !!session,
          userId: session?.user?.id
        })
      }
    })
  }
  
  // Store instance for reuse
  if (typeof window !== 'undefined') {
    clientInstance = client
  }
  
  return client
}

// Helper to reset the client (useful for testing)
export function resetClient() {
  clientInstance = null
}