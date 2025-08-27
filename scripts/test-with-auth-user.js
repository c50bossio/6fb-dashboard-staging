#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log('🧪 TESTING WITH EXISTING AUTH USER')
console.log('===================================')

try {
  // Get an existing auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const existingAuthUser = authUsers.users[0]
  
  console.log(`\n👤 Using auth user: ${existingAuthUser.email} (${existingAuthUser.id})`)
  
  // Try to create a profile with this existing auth user ID
  const testProfile = {
    id: existingAuthUser.id,
    email: existingAuthUser.email,
    full_name: 'Test Profile with Auth User',
    role: 'enterprise_owner',
    subscription_tier: 'enterprise',
    onboarding_completed: true
  }
  
  console.log('\n📝 Creating profile with auth user ID...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert([testProfile], { onConflict: 'id' })
    .select()
    .single()
  
  if (profileError) {
    console.log(`❌ Profile creation failed: ${profileError.message}`)
    console.log('Error details:', JSON.stringify(profileError, null, 2))
  } else {
    console.log(`✅ Profile created successfully!`)
    console.log('Profile data:', JSON.stringify(profile, null, 2))
    
    console.log('\n🧹 Cleaning up test profile...')
    await supabase.from('profiles').delete().eq('id', profile.id)
    console.log('✅ Cleanup completed')
  }
  
} catch (error) {
  console.error('💥 Error:', error.message)
}