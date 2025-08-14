// Simplified browser client following Supabase best practices
import { createBrowserClient } from '@supabase/ssr'

let client = null

export function createClient() {
  // Singleton pattern to avoid multiple client instances
  if (client) return client
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  // Enhanced client creation with PKCE and OAuth optimizations
  client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        // Enable PKCE for secure OAuth flow
        flowType: 'pkce',
        // Automatically detect redirect URL for OAuth
        detectSessionInUrl: true,
        // Persist session in localStorage for better UX
        persistSession: true,
        // Auto-refresh tokens
        autoRefreshToken: true,
        // Storage options for better security
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Debug mode for development
        debug: process.env.NODE_ENV === 'development'
      },
      // Global options
      global: {
        headers: {
          'X-Client-Info': '6fb-ai-agent-system'
        }
      }
    }
  )
  
  return client
}