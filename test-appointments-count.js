import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const barbershopId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

console.log('Testing appointments for barbershop:', barbershopId)
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + '...')

// Count appointments for this barbershop (using correct column names: total_amount, status, created_at)
const { data, error, count } = await supabase
  .from('appointments')
  .select('id, barbershop_id, total_amount, status, created_at', { count: 'exact', head: false })
  .eq('barbershop_id', barbershopId)
  .limit(5)

console.log('\nResults:')
console.log('Appointment count:', count)
console.log('Error:', error?.message || 'None')
console.log('Sample data:', data?.length > 0 ? `Found ${data.length} rows` : 'No rows found')

if (data && data.length > 0) {
  console.log('\nFirst appointment:', JSON.stringify(data[0], null, 2))
}
