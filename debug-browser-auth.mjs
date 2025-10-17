import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Debugging Browser Authentication Issue\n')

// Get all auth users
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

if (listError) {
  console.error('❌ Failed to list users:', listError.message)
  process.exit(1)
}

console.log(`📊 Found ${users.length} auth users:\n`)

for (const user of users) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`👤 Auth User: ${user.email}`)
  console.log(`   ID: ${user.id}`)
  console.log(`   Created: ${user.created_at}`)
  console.log(`   Provider: ${user.app_metadata?.provider || 'email'}`)

  // Check if profile exists for this user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.log(`   ❌ Profile: NOT FOUND (${profileError.code})`)
    console.log(`   ⚠️  This user can authenticate but has no profile!`)
  } else {
    console.log(`   ✅ Profile: EXISTS`)
    console.log(`      - Email: ${profile.email}`)
    console.log(`      - Name: ${profile.full_name}`)
    console.log(`      - Role: ${profile.role}`)
    console.log(`      - Organization ID: ${profile.organization_id || 'MISSING'}`)
    console.log(`      - Barbershop ID: ${profile.barbershop_id || 'MISSING'}`)
    console.log(`      - Last Selected Shop: ${profile.last_selected_shop_id || 'MISSING'}`)

    // Check if organization and shop exist
    if (profile.organization_id) {
      const { data: shops } = await supabase
        .from('barbershops')
        .select('id, name, city, state')
        .eq('organization_id', profile.organization_id)

      console.log(`      - Accessible Shops: ${shops?.length || 0}`)
      shops?.forEach(shop => {
        console.log(`         • ${shop.name} (${shop.city}, ${shop.state})`)
      })
    }
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

// Check for orphaned profiles (profiles without auth users)
const { data: allProfiles } = await supabase
  .from('profiles')
  .select('id, email, full_name')

const authUserIds = new Set(users.map(u => u.id))
const orphanedProfiles = allProfiles?.filter(p => !authUserIds.has(p.id)) || []

if (orphanedProfiles.length > 0) {
  console.log(`⚠️  Found ${orphanedProfiles.length} orphaned profiles (no auth user):`)
  orphanedProfiles.forEach(p => {
    console.log(`   - ${p.email} (${p.full_name}) - ID: ${p.id}`)
  })
  console.log()
}

// Instructions
console.log('📋 Next Steps:')
console.log('1. Check browser localStorage for: sb-dfhqjdoydihajmjxniee-auth-token')
console.log('2. Decode JWT to get user.id')
console.log('3. Compare with auth user IDs above')
console.log('4. If mismatch, user is logged in with wrong account')
console.log()
console.log('💡 To decode JWT in browser console:')
console.log('   const token = JSON.parse(localStorage.getItem("sb-dfhqjdoydihajmjxniee-auth-token"))')
console.log('   const payload = JSON.parse(atob(token.access_token.split(".")[1]))')
console.log('   console.log("User ID:", payload.sub)')
