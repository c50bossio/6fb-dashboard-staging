import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
)

console.log('🧪 Testing direct insert into barbershop_staff...\n')

// Get demo user and first barbershop
const { data: profile } = await supabase
  .from('profiles')
  .select('id')
  .eq('email', 'demo@barbershop.com')
  .single()

const { data: shop } = await supabase
  .from('barbershops')
  .select('id, name')
  .eq('id', 'c5a58548-8f23-426c-bedc-49a83d238724')
  .single()

console.log(`Attempting to insert:`)
console.log(`   User ID: ${profile.id}`)
console.log(`   Barbershop ID: ${shop.id} (${shop.name})\n`)

// Try inserting with minimal fields
const testData = {
  barbershop_id: shop.id,
  user_id: profile.id,
  role: 'BARBER',
  commission_rate: 75,
  is_active: true
}

console.log('Test data:', JSON.stringify(testData, null, 2))

const { data: result, error } = await supabase
  .from('barbershop_staff')
  .insert(testData)
  .select()

if (error) {
  console.error('\n❌ Insert failed:')
  console.error(`   Message: ${error.message}`)
  console.error(`   Code: ${error.code}`)
  console.error(`   Details: ${error.details}`)
  console.error(`   Hint: ${error.hint}`)

  // Try to understand the constraint
  console.log('\n🔍 Checking foreign key constraints on barbershop_staff...')
  const { data: constraints, error: constraintError } = await supabase
    .rpc('get_table_constraints', { table_name: 'barbershop_staff' })
    .catch(() => ({ data: null, error: 'RPC function not available' }))

  if (!constraintError && constraints) {
    console.log('Constraints:', constraints)
  }
} else {
  console.log('\n✅ Insert successful!')
  console.log(result)
}
