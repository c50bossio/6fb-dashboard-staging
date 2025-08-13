// Simplified browser client following Supabase best practices
import { createBrowserClient } from '@supabase/ssr'

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null

/**
 * Creates or returns existing Supabase browser client
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createClient() {
  // Singleton pattern to avoid multiple client instances
  if (client) return client
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  // Simple client creation - let Supabase handle all the complexity
  client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
  
  return client
}