#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

try {
  // Get an existing auth user
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const existingAuthUser = authUsers.users[0]
  
  `)
  
  // Try to create a profile with this existing auth user ID
  const testProfile = {
    id: existingAuthUser.id,
    email: existingAuthUser.email,
    full_name: 'Test Profile with Auth User',
    role: 'enterprise_owner',
    subscription_tier: 'enterprise',
    onboarding_completed: true
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert([testProfile], { onConflict: 'id' })
    .select()
    .single()
  
  if (profileError) {
    
    )
  } else {
    
    )

    await supabase.from('profiles').delete().eq('id', profile.id)
    
  }
  
} catch (error) {
  console.error('💥 Error:', error.message)
}