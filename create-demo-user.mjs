import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Use the same organization and shop as the real user
const ORGANIZATION_ID = '0849549e-1d4b-40d1-b0fa-cc6fe12360a2'
const BARBERSHOP_ID = 'c5a58548-8f23-426c-bedc-49a83d238724' // Tomb45 Channelside
const DEMO_EMAIL = 'demo@barbershop.com'
const DEMO_PASSWORD = 'demo123'

async function createDemoUser() {
  console.log('Setting up demo user with organization access...\n')

  // 1. Get existing auth user
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Failed to list users:', listError.message)
    return
  }

  const existingUser = users.find(u => u.email === DEMO_EMAIL)

  if (!existingUser) {
    console.error('❌ Demo user not found in auth')
    return
  }

  console.log('✅ Found existing auth user:', existingUser.id)

  // 2. Create or update profile with organization_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: existingUser.id,
      email: DEMO_EMAIL,
      full_name: 'Demo User',
      first_name: 'Demo',
      last_name: 'User',
      role: 'ENTERPRISE_OWNER',
      organization_id: ORGANIZATION_ID,
      barbershop_id: BARBERSHOP_ID,
      last_selected_shop_id: BARBERSHOP_ID,
      is_active: true,
      subscription_tier: 'enterprise',
      subscription_status: 'active',
      onboarding_completed: false
    })
    .select()
    .single()

  if (profileError) {
    console.error('❌ Profile creation failed:', profileError.message)
    return
  }

  console.log('✅ Profile created with organization access\n')
  console.log('Demo User Details:')
  console.log({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    organization_id: profile.organization_id,
    barbershop_id: profile.barbershop_id,
    last_selected_shop_id: profile.last_selected_shop_id,
    role: profile.role
  })

  // 3. Verify shops are accessible
  const { data: shops } = await supabase
    .from('barbershops')
    .select('id, name, city, state')
    .eq('organization_id', ORGANIZATION_ID)

  console.log('\n✅ Accessible shops:')
  shops.forEach(shop => {
    console.log(`  - ${shop.name} (${shop.city}, ${shop.state})`)
  })

  console.log('\n🎉 Demo user ready! Login with:')
  console.log(`   Email: ${DEMO_EMAIL}`)
  console.log(`   Password: ${DEMO_PASSWORD}`)
}

createDemoUser().catch(console.error)
