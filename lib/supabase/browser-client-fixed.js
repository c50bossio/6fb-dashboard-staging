import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

const clientInstance = null

export function createClient() {
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
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
  
  console.log('🔐 Supabase client created with PKCE flow enabled')
  
  return client
}