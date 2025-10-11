// Test the exact Supabase query used by the API
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...')

const organizationId = '0849549e-1d4b-40d1-b0fa-cc6fe12360a2'

console.log('Testing Supabase query for organization:', organizationId)

const { data: shops, error } = await supabase
  .from('barbershops')
  .select('id, name, city, state, address, phone, organization_id')
  .eq('organization_id', organizationId)
  .order('name', { ascending: true })

console.log('Results:', shops?.length, 'shops')
console.log('Error:', error)
console.log('Shops:', JSON.stringify(shops, null, 2))
