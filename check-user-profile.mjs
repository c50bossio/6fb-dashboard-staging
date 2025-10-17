import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUserProfile() {
  const userEmail = 'c50bossio@gmail.com'

  console.log(`Checking profile for: ${userEmail}\n`)

  // 1. Check if user exists in auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Failed to list users:', listError.message)
    return
  }

  const authUser = users.find(u => u.email === userEmail)

  if (!authUser) {
    console.error('❌ User not found in auth.users')
    return
  }

  console.log('✅ Auth user found:', {
    id: authUser.id,
    email: authUser.email,
    created_at: authUser.created_at
  })

  // 2. Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, first_name, last_name, avatar_url, role, shop_id, barbershop_id, organization_id, last_selected_shop_id, phone, is_active, subscription_tier, subscription_status, onboarding_completed, created_at, updated_at')
    .eq('id', authUser.id)
    .single()

  if (profileError) {
    console.error('❌ Profile not found:', profileError.message)
    console.log('\n🔧 This user needs a profile created!')
    return
  }

  console.log('\n✅ Profile found:', profile)

  // 3. Check for missing critical fields
  const criticalFields = ['organization_id', 'barbershop_id', 'last_selected_shop_id']
  const missingFields = criticalFields.filter(field => !profile[field])

  if (missingFields.length > 0) {
    console.warn('\n⚠️ Missing critical fields:', missingFields)
    console.log('ShopSelector will not work without these fields!')
  } else {
    console.log('\n✅ All critical fields present:')
    console.log('  - organization_id:', profile.organization_id)
    console.log('  - barbershop_id:', profile.barbershop_id)
    console.log('  - last_selected_shop_id:', profile.last_selected_shop_id)
  }

  // 4. Verify shops exist for organization
  if (profile.organization_id) {
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id, name, city, state')
      .eq('organization_id', profile.organization_id)

    console.log('\n✅ Accessible shops:')
    shops?.forEach(shop => {
      console.log(`  - ${shop.name} (${shop.city}, ${shop.state})`)
      if (shop.id === profile.barbershop_id) {
        console.log('    ⭐ Current shop')
      }
    })
  }
}

checkUserProfile().catch(console.error)
