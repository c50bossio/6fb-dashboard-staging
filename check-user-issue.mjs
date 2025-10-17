import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Checking user profile issue...\n')

// Query the specific user from the logs
const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
const userEmail = 'c50bossio@gmail.com'

try {
  // Query profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('❌ Error querying profile:', error.message)
    if (error.code === 'PGRST116') {
      console.log('\n⚠️  Profile does not exist for this user ID')
      console.log('This explains why fetchProfile is failing!')
    }
  } else if (profile) {
    console.log('✅ Found profile:')
    console.log(JSON.stringify(profile, null, 2))
    console.log('\n🔍 Analysis:')
    console.log(`- Has organization_id: ${!!profile.organization_id} (${profile.organization_id || 'NULL'})`)
    console.log(`- Has barbershop_id: ${!!profile.barbershop_id} (${profile.barbershop_id || 'NULL'})`)
    console.log(`- Has shop_id: ${!!profile.shop_id} (${profile.shop_id || 'NULL'})`)
    console.log(`- Has last_selected_shop_id: ${!!profile.last_selected_shop_id} (${profile.last_selected_shop_id || 'NULL'})`)
    console.log(`- Role: ${profile.role}`)

    if (!profile.organization_id && !profile.barbershop_id && !profile.shop_id) {
      console.log('\n⚠️  THIS IS THE PROBLEM: User has no barbershop/organization assigned!')
      console.log('The app requires at least one of these fields to be set.')
    }
  }

  // Query available organizations
  console.log('\n\n📊 Available organizations:')
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, type')
    .limit(5)

  if (orgsError) {
    console.error('Error querying organizations:', orgsError.message)
  } else if (orgs && orgs.length > 0) {
    console.log(`Found ${orgs.length} organizations:`)
    orgs.forEach(org => {
      console.log(`  - ${org.name} (${org.type}) - ID: ${org.id}`)
    })
  } else {
    console.log('No organizations found in database')
  }

  // Query available barbershops
  console.log('\n\n💈 Available barbershops:')
  const { data: shops, error: shopsError } = await supabase
    .from('barbershops')
    .select('id, name, city, state')
    .limit(5)

  if (shopsError) {
    console.error('Error querying barbershops:', shopsError.message)
  } else if (shops && shops.length > 0) {
    console.log(`Found ${shops.length} barbershops:`)
    shops.forEach(shop => {
      console.log(`  - ${shop.name} (${shop.city}, ${shop.state}) - ID: ${shop.id}`)
    })
  } else {
    console.log('No barbershops found in database')
  }

} catch (error) {
  console.error('Unexpected error:', error)
}
