#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

console.log('🔍 DEBUG PROFILES TABLE')
console.log('=======================')

try {
  // Check current test auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const testAuthUser = authUsers.users.find(user => user.email?.includes('@6fb-demo.com'))
  
  if (testAuthUser) {
    console.log(`\n👤 Found test auth user: ${testAuthUser.email} (${testAuthUser.id})`)
    
    // Check if profile exists with this ID
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testAuthUser.id)
      .single()
    
    if (profileError) {
      console.log(`❌ No existing profile found: ${profileError.message}`)
    } else {
      console.log(`✅ Found existing profile:`)
      console.log(JSON.stringify(existingProfile, null, 2))
    }
    
    // Try upserting instead
    console.log('\n📝 Trying upsert instead of insert...')
    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert([{
        id: testAuthUser.id,
        email: testAuthUser.email,
        full_name: 'Debug Test Owner',
        role: 'enterprise_owner',
        subscription_tier: 'enterprise',
        onboarding_completed: true
      }])
      .select()
      .single()
    
    if (upsertError) {
      console.log(`❌ Upsert failed: ${upsertError.message}`)
    } else {
      console.log(`✅ Upsert successful!`)
      console.log(JSON.stringify(profile, null, 2))
    }
  } else {
    console.log('❌ No test auth users found')
  }
  
} catch (error) {
  console.error('💥 Error:', error.message)
}