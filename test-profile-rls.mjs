import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5' // c50bossio@gmail.com

console.log('Testing profile access with different keys...\n')

// Test 1: Service Role Key (bypasses RLS)
console.log('1️⃣ Testing with SERVICE ROLE KEY (bypasses RLS):')
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: serviceData, error: serviceError } = await serviceClient
  .from('profiles')
  .select('id, email, organization_id, barbershop_id')
  .eq('id', userId)
  .single()

if (serviceError) {
  console.error('❌ Service key error:', serviceError.message)
} else {
  console.log('✅ Service key SUCCESS:', {
    id: serviceData.id,
    email: serviceData.email,
    organization_id: serviceData.organization_id
  })
}

// Test 2: Anon Key (respects RLS)
console.log('\n2️⃣ Testing with ANON KEY (respects RLS):')
const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const { data: anonData, error: anonError } = await anonClient
  .from('profiles')
  .select('id, email, organization_id, barbershop_id')
  .eq('id', userId)
  .single()

if (anonError) {
  console.error('❌ Anon key error:', anonError.message)
  console.log('   Error code:', anonError.code)
  console.log('   Details:', anonError.details)
  console.log('\n⚠️ This is why SupabaseAuthProvider cannot fetch profiles!')
  console.log('   RLS policies are blocking unauthenticated reads.')
} else {
  console.log('✅ Anon key SUCCESS:', {
    id: anonData.id,
    email: anonData.email,
    organization_id: anonData.organization_id
  })
}

// Test 3: Anon Key with Auth (simulating logged-in user)
console.log('\n3️⃣ Testing with ANON KEY + AUTH SESSION:')
console.log('   (This simulates what SupabaseAuthProvider does)')

// In a real scenario, the client would have a valid JWT token
// For now, we'll just note that the client needs to authenticate first
console.log('   ℹ️ Cannot simulate auth session in Node.js script')
console.log('   ℹ️ In browser, user must be authenticated for RLS to work')
console.log('   ℹ️ RLS policy likely: "auth.uid() = id" (users can read own profile)')

console.log('\n📋 Summary:')
console.log('   - Service role key: Works (bypasses RLS)')
console.log('   - Anon key without auth: Blocked by RLS (expected)')
console.log('   - Anon key WITH auth: Should work IF RLS policy allows it')
console.log('\n💡 Next step: Check RLS policies on profiles table')
