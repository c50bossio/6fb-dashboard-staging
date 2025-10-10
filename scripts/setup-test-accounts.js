#!/usr/bin/env node

/**
 * Setup Test Accounts Script
 * Creates test accounts in Supabase for local development
 * Run with: node scripts/setup-test-accounts.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  console.error('   Make sure these are set in your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test account configurations
const testAccounts = [
  {
    email: 'dev-barber@test.com',
    password: 'TestPass123!',
    profile: {
      full_name: 'Dev Barber',
      role: 'BARBER',
      shop_name: 'Dev Barbershop',
      onboarding_completed: false,
      onboarding_step: 0,
      subscription_status: 'active'
    }
  },
  {
    email: 'dev-shop@test.com',
    password: 'TestPass123!',
    profile: {
      full_name: 'Dev Shop Owner',
      role: 'SHOP_OWNER',
      shop_name: 'Dev Premium Cuts',
      onboarding_completed: false,
      onboarding_step: 0,
      subscription_status: 'active'
    }
  },
  {
    email: 'dev-enterprise@test.com',
    password: 'TestPass123!',
    profile: {
      full_name: 'Dev Enterprise Manager',
      role: 'ENTERPRISE_OWNER',
      shop_name: 'Dev Enterprise Group',
      onboarding_completed: false,
      onboarding_step: 0,
      subscription_status: 'active'
    }
  },
  {
    email: 'dev-complete@test.com',
    password: 'TestPass123!',
    profile: {
      full_name: 'Dev Complete User',
      role: 'SHOP_OWNER',
      shop_name: 'Fully Onboarded Shop',
      onboarding_completed: true,
      onboarding_step: 10,
      subscription_status: 'active'
    }
  }
]

async function setupTestAccounts() {

  for (const account of testAccounts) {

    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', account.email)
        .single()
      
      if (existingProfile) {
        `)
        
        // Update the profile to ensure it has the latest settings
        const { error: updateError } = await supabase
          .from('profiles')
          .update(account.profile)
          .eq('id', existingProfile.id)
        
        if (updateError) {
          console.error(`   ⚠️  Failed to update profile: ${updateError.message}`)
        } else {
          
        }
        continue
      }
      
      // Create auth user using admin API
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.profile.full_name,
          role: account.profile.role
        }
      })
      
      if (authError) {
        // Check if user exists in auth but not in profiles
        if (authError.message?.includes('already been registered')) {

          // Get the user ID from auth
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const existingUser = users?.find(u => u.email === account.email)
          
          if (existingUser) {
            // Create profile for existing auth user
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: existingUser.id,
                email: account.email,
                ...account.profile
              })
            
            if (profileError) {
              console.error(`   ⚠️  Failed to create profile: ${profileError.message}`)
            } else {
              
            }
          }
        } else {
          console.error(`   ❌ Failed to create auth user: ${authError.message}`)
        }
        continue
      }
      
      // Create profile for new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: account.email,
          ...account.profile
        })
      
      if (profileError) {
        console.error(`   ❌ Failed to create profile: ${profileError.message}`)
      } else {
        
      }
      
    } catch (error) {
      console.error(`   ❌ Unexpected error: ${error.message}`)
    }
  }

  testAccounts.forEach(acc => {
    const role = acc.profile.role.padEnd(13)
    const onboarded = acc.profile.onboarding_completed ? '✓' : '✗'
    } | TestPass123!  | ${role} | ${onboarded}`)
  })

}

// Run the setup
setupTestAccounts().catch(console.error)