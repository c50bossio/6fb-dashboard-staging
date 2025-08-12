import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create a Supabase client for server-side operations with proper cookie handling
export function createClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Supabase credentials not configured')
    throw new Error('Missing Supabase environment variables')
  }
  
  // Create server client with cookie handling for OAuth
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method is only available in Server Components
          // This error can be ignored in Route Handlers
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // The `remove` method is only available in Server Components
        }
      },
    },
  })
}

// Create a Supabase client that uses the user's session from cookies
export async function createAuthenticatedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Supabase credentials not configured')
    throw new Error('Missing Supabase environment variables')
  }
  
  const cookieStore = cookies()
  
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
    },
  })
}