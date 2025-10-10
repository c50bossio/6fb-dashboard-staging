#!/usr/bin/env node

/**
 * Create Test Account for Local Development
 * 
 * This script creates a test account that can be used for local development
 * when Supabase Site URL is set to production.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestAccount() {

  const testAccounts = [
    {
      email: 'dev@bookedbarber.com',
      password: 'DevTest123!@#',
      name: 'Dev User',
      role: 'SHOP_OWNER'
    },
    {
      email: 'test@bookedbarber.com',
      password: 'TestUser456$%^',
      name: 'Test User',
      role: 'SHOP_OWNER'
    },
    {
      email: 'admin@bookedbarber.com',
      password: 'AdminDev789&*(',
      name: 'Admin User',
      role: 'ADMIN'
    }
  ]

  for (const account of testAccounts) {
    try {

      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.name
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          
          continue
        }
        throw authError
      }

      // Create profile
      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: account.email,
            full_name: account.name,
            role: account.role,
            onboarding_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (profileError && !profileError.message.includes('duplicate')) {
          console.error(`⚠️  Profile creation error for ${account.email}:`, profileError.message)
        }
      }

    } catch (error) {
      console.error(`❌ Error creating ${account.email}:`, error.message)
    }
  }

  ')
  
}

// Run the script
createTestAccount().catch(console.error)