import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Checking public.users table...\n')

// Check if users table exists and what it contains
const { data: users, error } = await supabase
  .from('users')
  .select('*')
  .limit(5)

if (error) {
  console.error('❌ Error accessing users table:', error.message)
  console.log('\nThe users table might not exist or might be inaccessible.')
} else {
  console.log(`✅ Found ${users.length} records in public.users table:`)
  users.forEach(user => {
    console.log(`   ID: ${user.id}`)
    console.log(`   Email: ${user.email || 'N/A'}`)
    console.log(`   Full name: ${user.full_name || user.name || 'N/A'}`)
    console.log(`   Role: ${user.role || 'N/A'}\n`)
  })

  const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))]
  console.log(`📋 Allowed roles in public.users: ${uniqueRoles.join(', ')}`)
}

// Check if demo user exists in users table
console.log('🔍 Checking if demo user exists in public.users...')
const { data: demoUser, error: demoError } = await supabase
  .from('users')
  .select('*')
  .eq('email', 'demo@barbershop.com')
  .maybeSingle()

if (demoError) {
  console.error('❌ Error:', demoError.message)
} else if (!demoUser) {
  console.log('❌ Demo user NOT found in public.users table')
  console.log('\nThis is why the foreign key constraint fails!')
  console.log('We need to either:')
  console.log('  1. Insert demo user into public.users table')
  console.log('  2. Sync profiles → users')
  console.log('  3. Update the foreign key constraint to reference profiles instead')
} else {
  console.log('✅ Demo user found in public.users:')
  console.log(demoUser)
}
