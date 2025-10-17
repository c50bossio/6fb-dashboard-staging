import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Checking demo user ID and barbershop_staff foreign key...\n')

// Check demo user in profiles table
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, email, full_name, role')
  .eq('email', 'demo@barbershop.com')
  .single()

if (profileError) {
  console.error('❌ Error fetching demo user from profiles:', profileError.message)
  process.exit(1)
}

console.log('✅ Demo user in profiles table:')
console.log(`   ID: ${profile.id}`)
console.log(`   Email: ${profile.email}`)
console.log(`   Role: ${profile.role}\n`)

// Check if this ID exists in auth.users
console.log('🔍 Checking if demo user ID exists in auth.users...')
const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id)

if (authError) {
  console.error(`❌ Demo user ID NOT found in auth.users: ${authError.message}`)
  console.log('\n⚠️  This explains the foreign key constraint failure!')
  console.log('The barbershop_staff.user_id likely references auth.users.id')
  console.log('But the demo user profile.id does not exist in auth.users')
} else {
  console.log('✅ Demo user found in auth.users:')
  console.log(`   ID: ${authUser.user.id}`)
  console.log(`   Email: ${authUser.user.email}`)
}

// Check sample barbershop_staff record to see what user_ids are being used
console.log('\n🔍 Checking sample barbershop_staff records...')
const { data: staffSample, error: staffError } = await supabase
  .from('barbershop_staff')
  .select('id, user_id, role')
  .limit(3)

if (!staffError && staffSample) {
  console.log(`✅ Found ${staffSample.length} staff records:`)
  for (const staff of staffSample) {
    // Check if each user_id exists in profiles
    const { data: staffProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', staff.user_id)
      .maybeSingle()

    console.log(`   Staff ID: ${staff.id}`)
    console.log(`   User ID: ${staff.user_id}`)
    console.log(`   Profile exists: ${staffProfile ? `Yes (${staffProfile.email})` : 'No'}\n`)
  }
}
