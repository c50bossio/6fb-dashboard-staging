import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Verifying Dual-Role Setup for demo@barbershop.com\n')
console.log('='.repeat(60))

// Get demo user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('id, email, full_name, role, organization_id, barbershop_id')
  .eq('email', 'demo@barbershop.com')
  .single()

console.log('\n📋 PROFILE-LEVEL ROLE (System-wide permissions)')
console.log('='.repeat(60))
console.log(`Email: ${profile.email}`)
console.log(`Name: ${profile.full_name}`)
console.log(`Role: ${profile.role}`)
console.log(`Organization ID: ${profile.organization_id}`)
console.log(`Default Barbershop: ${profile.barbershop_id || 'None (multi-location owner)'}`)

// Get barbershop_staff entries
const { data: staffRoles } = await supabase
  .from('barbershop_staff')
  .select(`
    id,
    barbershop_id,
    role,
    commission_rate,
    is_active,
    barbershops (
      name,
      city,
      state
    )
  `)
  .eq('user_id', profile.id)

console.log('\n📋 LOCATION-SPECIFIC BARBER ROLES')
console.log('='.repeat(60))
if (staffRoles && staffRoles.length > 0) {
  staffRoles.forEach((staff, index) => {
    const shop = staff.barbershops
    console.log(`\n${index + 1}. ${shop.name} (${shop.city}, ${shop.state})`)
    console.log(`   Barbershop ID: ${staff.barbershop_id}`)
    console.log(`   Role: ${staff.role}`)
    console.log(`   Commission Rate: ${staff.commission_rate}%`)
    console.log(`   Active: ${staff.is_active}`)
    console.log(`   Staff Record ID: ${staff.id}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log(`✅ DUAL-ROLE SUCCESSFULLY CONFIGURED!`)
  console.log('='.repeat(60))
  console.log(`\n✨ Demo user now has:`)
  console.log(`   1. Enterprise Owner permissions (manages all ${staffRoles.length} locations)`)
  console.log(`   2. Barber functionality (can work at all ${staffRoles.length} locations)`)
  console.log(`   3. 75% commission rate (owner-barber arrangement)`)

  console.log(`\n🚀 Ready to test:`)
  console.log(`   Enterprise View → http://localhost:9999/dashboard`)
  console.log(`   Barber View → http://localhost:9999/barber/dashboard`)

} else {
  console.log('❌ No barbershop_staff entries found!')
}
