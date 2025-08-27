/**
 * Simple Supabase Client - Fallback for complex client issues
 * Provides basic functionality without complex pooling or logging
 */

import { createClient } from '@supabase/supabase-js'

// Ensure environment variables are loaded  
if (typeof window === 'undefined') {
  try {
    const { config } = await import('dotenv')
    config({ path: '.env' })
    config({ path: '.env.local' })
  } catch (error) {
    // dotenv not available, environment variables should be set externally
  }
}

// Simple configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * Create basic Supabase client
 */
export function createSimpleClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables:', {
      url: !!supabaseUrl,
      anonKey: !!supabaseAnonKey
    })
    return null
  }

  try {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })

    return client
  } catch (error) {
    console.error('❌ Failed to create simple Supabase client:', error)
    return null
  }
}

/**
 * Create service role client (for server-side operations)
 */
export function createServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase service environment variables:', {
      url: !!supabaseUrl,
      serviceKey: !!supabaseServiceKey,
      keyLength: supabaseServiceKey ? supabaseServiceKey.length : 0,
      urlValue: supabaseUrl || 'NOT SET'
    })
    return null
  }

  try {
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    return client
  } catch (error) {
    console.error('❌ Failed to create service client:', error)
    return null
  }
}

// Export ready-to-use instances
export const supabase = createSimpleClient()
export const supabaseService = createServiceClient()

export default supabase