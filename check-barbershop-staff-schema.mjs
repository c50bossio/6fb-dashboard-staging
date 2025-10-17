import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Checking barbershop_staff table schema...\n')

// Query any existing records to see what columns we get back
const { data, error } = await supabase
  .from('barbershop_staff')
  .select('*')
  .limit(1)

if (error) {
  console.error('Error:', error.message)
} else if (data && data.length > 0) {
  console.log('✅ Available columns in barbershop_staff table:')
  console.log(Object.keys(data[0]))
  console.log('\n📊 Sample record:')
  console.log(data[0])
} else {
  console.log('⚠️  No records found in barbershop_staff table')
  console.log('Trying to insert a test record to see schema...')

  const { error: insertError } = await supabase
    .from('barbershop_staff')
    .insert({})
    .select()

  if (insertError) {
    console.log('Insert error reveals required columns:', insertError.message)
  }
}
