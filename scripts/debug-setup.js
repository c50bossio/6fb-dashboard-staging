#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

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

)

try {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([testOwner])
    .select()
    .single()
  
  if (profileError) {
    
    )
  } else {
    
    )
    
    // Quick cleanup
    
    await supabase.from('profiles').delete().eq('id', profile.id)
    
  }
  
} catch (error) {
  console.error('💥 Unexpected error:', error.message)
  console.error('Stack:', error.stack)
}