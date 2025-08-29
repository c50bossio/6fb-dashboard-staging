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