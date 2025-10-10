#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration check
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required Supabase configuration')
  process.exit(1)
}

try {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  
  // Test basic connection with a simple query
  const { data: testQuery, error: testError } = await supabase
    .from('profiles')
    .select('count')
    .limit(1)
  
  if (testError) {
    
    process.exit(1)
  }

  // Quick test data creation

  const testOwner = {
    id: crypto.randomUUID(),
    email: `test-owner-${Date.now()}@6fb-demo.com`,
    name: 'Test Owner',
    phone: '555-TEST-01',
    role: 'SHOP_OWNER',
    onboarding_completed: true,
    subscription_tier: 'PRO'
  }
  
  const { data: owner, error: ownerError } = await supabase
    .from('profiles')
    .insert([testOwner])
    .select()
    .single()
  
  if (ownerError) {
    
    )
  } else {
    `)

    // Quick cleanup
    await supabase.from('profiles').delete().eq('id', owner.id)
    
  }

} catch (error) {
  console.error('💥 Script error:', error.message)
  console.error('Stack trace:', error.stack)
  process.exit(1)
}