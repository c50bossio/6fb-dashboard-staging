#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

console.log('🔧 DEBUG TEST BARBERSHOP SETUP')
console.log('===============================')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Simple test owner data
const testOwner = {
  id: crypto.randomUUID(),
  email: `debug-owner-${Date.now()}@6fb-demo.com`,
  full_name: 'Debug Test Owner',
  role: 'SHOP_OWNER',
  onboarding_completed: true,
  subscription_tier: 'PRO'
}

console.log('\n👤 Creating debug test owner...')
console.log('Owner data:', JSON.stringify(testOwner, null, 2))

try {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([testOwner])
    .select()
    .single()
  
  if (profileError) {
    console.log(`❌ Failed to create owner: ${profileError.message}`)
    console.log('Error details:', JSON.stringify(profileError, null, 2))
  } else {
    console.log(`✅ Successfully created owner: ${profile.full_name}`)
    console.log('Profile data:', JSON.stringify(profile, null, 2))
    
    // Quick cleanup
    console.log('\n🧹 Cleaning up debug data...')
    await supabase.from('profiles').delete().eq('id', profile.id)
    console.log('✅ Cleanup completed')
  }
  
} catch (error) {
  console.error('💥 Unexpected error:', error.message)
  console.error('Stack:', error.stack)
}