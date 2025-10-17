#!/usr/bin/env node

/**
 * Resets onboarding for the enterprise account to ensure it shows
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetOnboarding() {

  const email = 'dev-enterprise@test.com'
  
  try {
    // Get user ID
    const { data: userData } = await supabase.auth.admin.listUsers()
    const user = userData?.users?.find(u => u.email === email)
    
    if (!user) {
      console.error(`❌ User ${email} not found`)
      return
    }

    // Force update profile to show onboarding
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()
    
    if (profileError) {
      console.error('❌ Failed to update profile:', profileError.message)
    } else {

    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }

  )
  
  )

  )
}

// Run the script
resetOnboarding()
  .then(() => {
    
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })