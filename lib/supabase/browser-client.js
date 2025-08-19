import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern to prevent multiple client instances
let clientInstance = null

export function createClient() {
  // Return existing instance if available
  if (clientInstance) {
    return clientInstance
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  // Create client with Supabase's default settings - let Supabase handle PKCE automatically
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  
  // Store instance for reuse
  clientInstance = client
  
  return client
}

// Helper to reset the client (useful for testing)
export function resetClient() {
  clientInstance = null
}