// Fixed Supabase browser client with proper PKCE support
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

let clientInstance = null

export function createClient() {
  // For OAuth flows, we need a fresh client to ensure PKCE works
  // Don't use singleton pattern as it can interfere with OAuth
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  // Create a new client with proper configuration
  const client = createSupabaseBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        debug: true // Enable debug logging to see what's happening
      }
    }
  )
  
  // Log client creation for debugging
  console.log('🔐 Supabase client created with PKCE flow enabled')
  
  return client
}