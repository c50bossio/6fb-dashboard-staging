import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // For development testing - use placeholder values if not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  
  if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
    console.warn('⚠️ Using placeholder Supabase configuration for development testing')
    // Return a comprehensive mock client for testing
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithOAuth: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        resetPasswordForEmail: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        updateUser: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        onAuthStateChange: (callback) => {
          // Call the callback immediately with no session to simulate logged-out state
          setTimeout(() => callback('SIGNED_OUT', null), 0)
          // Return mock subscription object
          return {
            data: {
              subscription: {
                unsubscribe: () => console.log('Mock auth listener unsubscribed')
              }
            }
          }
        }
      },
      from: (table) => ({
        select: (columns = '*') => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            then: (callback) => callback({ data: [], error: null })
          }),
          limit: (count) => Promise.resolve({ data: [], error: null }),
          then: (callback) => callback({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
            })
          })
        }),
        delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      })
    }
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}