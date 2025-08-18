import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️ Supabase credentials not configured')
    throw new Error('Missing Supabase environment variables')
  }
  
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        const value = cookieStore.get(name)?.value
        // Debug OAuth session cookies in production
        if (name.includes('auth-token') && process.env.NODE_ENV === 'production') {
          console.log(`🔍 Getting auth cookie ${name}:`, value ? 'present' : 'missing')
        }
        return value
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options })
          // Debug OAuth session cookies in production
          if (name.includes('auth-token') && process.env.NODE_ENV === 'production') {
            console.log(`✅ Set auth cookie ${name}`)
          }
        } catch (error) {
          // Log the error for OAuth debugging
          console.error('❌ Failed to set cookie:', name, error.message)
          // For OAuth callbacks, this is critical - rethrow
          if (name.includes('auth-token') || name.includes('refresh-token')) {
            throw error
          }
        }
      },
      remove(name, options) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          console.error('❌ Failed to remove cookie:', name, error.message)
        }
      },
    },
  })
}

export function createAuthenticatedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Supabase credentials not configured')
    throw new Error('Missing Supabase environment variables')
  }
  
  const cookieStore = cookies()
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
    },
  })
}