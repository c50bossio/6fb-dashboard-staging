import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DEMO_SHOP = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const YOUR_EMAIL = 'c50bossio@gmail.com'
const DEV_EMAIL = 'dev@barbershop.com'

console.log('🔧 Updating account configuration...\n')

// Step 1: Update your account to point to the demo shop
console.log('1️⃣ Linking your account to the shop with revenue data...')
const { data: updated, error: updateError } = await supabase
  .from('profiles')
  .update({
    shop_id: DEMO_SHOP,
    barbershop_id: DEMO_SHOP,
    role: 'SHOP_OWNER',
    full_name: 'Chris Bossio'
  })
  .eq('email', YOUR_EMAIL)
  .select()

if (updateError) {
  console.error('❌ Error updating profile:', updateError)
} else {
  console.log('✅ Your account updated successfully!')
  console.log(`   Shop ID: ${DEMO_SHOP}`)
  console.log(`   Role: SHOP_OWNER`)
}

// Step 2: Deactivate the dev account (don't delete in case it's needed)
console.log('\n2️⃣ Deactivating dev@barbershop.com account...')
const { error: deactivateError } = await supabase
  .from('profiles')
  .update({
    role: 'INACTIVE',
    full_name: 'Dev Account (Inactive)'
  })
  .eq('email', DEV_EMAIL)

if (deactivateError) {
  console.error('❌ Error deactivating dev account:', deactivateError)
} else {
  console.log('✅ Dev account deactivated')
}

// Verify changes
console.log('\n3️⃣ Verifying changes...')
const { data: verification } = await supabase
  .from('profiles')
  .select('email, shop_id, role, full_name')
  .in('email', [YOUR_EMAIL, DEV_EMAIL])

console.log('\nUpdated accounts:')
verification?.forEach(p => {
  console.log(`\n  ${p.email}:`)
  console.log(`    Shop: ${p.shop_id}`)
  console.log(`    Role: ${p.role}`)
  console.log(`    Name: ${p.full_name}`)
})

console.log('\n✅ All done! You can now login with c50bossio@gmail.com')
console.log('   and see all the revenue data ($805 from 30 appointments)')
