import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service role privileges
 * TEMPORARY WORKAROUND: Hardcoded key for development testing
 * TODO: Move to proper environment variable handling in production
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
  
  // TEMPORARY: Hardcoded for development testing only
  // This should be loaded from environment variables in production
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role environment variables')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}