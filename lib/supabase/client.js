import { createBrowserClient } from '@supabase/ssr'

let client = null

/**
 * Creates or returns existing Supabase browser client
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createClient() {
  if (client) return client
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
  
  return client
}