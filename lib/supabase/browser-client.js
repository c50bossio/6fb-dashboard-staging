import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern to prevent multiple client instances
let clientInstance = null

export function createClient() {
  // Return existing instance if available
  if (clientInstance) {
    console.log('🔄 Returning existing Supabase client instance')
    return clientInstance
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('🔧 Creating new Supabase client with URL:', supabaseUrl?.substring(0, 30) + '...')
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  // Create client with Supabase's default settings - let Supabase handle PKCE automatically
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  
  console.log('✅ Supabase client created successfully')
  
  // Store instance for reuse
  clientInstance = client
  
  return client
}

// Helper to reset the client (useful for testing)
export function resetClient() {
  clientInstance = null
}