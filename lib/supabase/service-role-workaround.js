/**
 * Service Role Workaround
 * Creates Supabase client with service role key for admin operations
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service role key
 * Use only for server-side operations that require admin privileges
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for service role client')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-application-name': '6fb-ai-agent-system',
        'x-client-info': 'supabase-js-service-role'
      }
    }
  })
}