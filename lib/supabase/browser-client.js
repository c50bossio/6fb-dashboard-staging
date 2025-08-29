import { createBrowserClient } from '@supabase/ssr'

// Simple singleton pattern - no overcomplications
let clientInstance = null

/**
 * Creates a singleton Supabase browser client
 * Simple, clean, production-ready
 */
export function createClient() {
  if (!clientInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const isDevMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'

    // In development mode with auth bypass, create a mock client
    if (isDevMode && (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project.supabase.co')) {
      console.log('🔐 Supabase: Using mock client for development')
      // Return a mock client that won't cause errors
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: (callback) => {
            // Return a mock subscription object
            return { data: { subscription: { unsubscribe: () => {} } } }
          }
        },
        from: (table) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { code: 'PGRST116' } })
            }),
            in: () => ({ data: [], error: null }),
            data: [],
            error: null
          }),
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: null, error: null })
            })
          }),
          insert: () => ({ data: null, error: null }),
          update: () => ({ data: null, error: null }),
          delete: () => ({ data: null, error: null })
        })
      }
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Create client with standard settings - let Supabase handle everything
    clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return clientInstance
}

// For debugging in production if needed
export function resetClient() {
  clientInstance = null
}