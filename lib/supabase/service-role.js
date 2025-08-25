import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service role privileges
 * This bypasses RLS and should only be used for admin operations
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('⚠️ Supabase service role credentials not configured')
    console.error('URL:', supabaseUrl ? 'Present' : 'Missing')
    console.error('Service Role Key:', serviceRoleKey ? `${serviceRoleKey.substring(0, 50)}...` : 'Missing')
    throw new Error('Missing Supabase service role environment variables')
  }
  
  // Log for debugging
  console.log('Creating service role client with key:', serviceRoleKey.substring(0, 50) + '...')
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}