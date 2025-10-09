/**
 * Synchronous Supabase Server Client
 *
 * This client is designed for server-side API routes that need synchronous
 * database access without cookie-based session management.
 *
 * Key Features:
 * - Synchronous initialization (no await required)
 * - Uses service role key (bypasses RLS)
 * - No cookie dependency
 * - Perfect for API routes and server actions
 *
 * Usage:
 * ```javascript
 * import { createServerClient } from '@/lib/supabase/server-sync'
 *
 * export async function GET(request) {
 *   const supabase = createServerClient()  // No await needed!
 *   const { data } = await supabase.from('profiles').select('*')
 *   return NextResponse.json(data)
 * }
 * ```
 *
 * For routes that need user session context, use lib/supabase/server.js instead.
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Creates a synchronous Supabase client with service role privileges
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase client instance
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }

  // Create client with service role key (bypasses RLS)
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'bookedbarber-api'
      }
    }
  })

  return client
}

/**
 * Alias for backward compatibility
 */
export const getServiceClient = createServerClient

/**
 * Creates a client with specific configuration options
 * @param {Object} options - Configuration options
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createServerClientWithOptions(options = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = options.useServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: options.autoRefreshToken ?? false,
      persistSession: options.persistSession ?? false,
      detectSessionInUrl: options.detectSessionInUrl ?? false
    },
    ...options.clientOptions
  })
}
