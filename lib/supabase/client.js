import { createBrowserClient } from '@supabase/ssr'

let client = null
let clientError = null

/**
 * Creates or returns existing Supabase browser client with error handling
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function createClient() {
  if (client) return client
  if (clientError) return null // Return null if we know there's a config error
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    const error = 'Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    console.warn('Supabase client unavailable:', error)
    clientError = error
    return null
  }
  
  try {
    client = createBrowserClient(
      supabaseUrl,
      supabaseAnonKey
    )
    console.log('Supabase client created successfully')
    return client
  } catch (error) {
    console.warn('Failed to create Supabase client:', error.message)
    clientError = error.message
    return null
  }
}

/**
 * Check if Supabase client is available
 * @returns {boolean}
 */
export function isSupabaseAvailable() {
  return createClient() !== null
}

/**
 * Get Supabase connection error if any
 * @returns {string | null}
 */
export function getSupabaseError() {
  return clientError
}