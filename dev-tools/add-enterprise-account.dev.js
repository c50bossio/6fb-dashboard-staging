#!/usr/bin/env node

/**
 * Creates the dev-enterprise@test.com account with onboarding enabled
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

async function createEnterpriseAccount() {
  console.log('🚀 Creating enterprise test account...\n')

  const account = {
    email: 'dev-enterprise@test.com',
    password: 'TestPass123!',
    fullName: 'Enterprise Dev User',
    shopName: 'Enterprise Management HQ',
    role: 'ENTERPRISE_OWNER'
  }

  console.log(`📧 Setting up account: ${account.email}`)
  
  try {
    // Step 1: Try to create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName
      }
    })

    let userId = authData?.user?.id

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        console.log(`   ⚠️  User already exists, updating...`)
        
        // Get existing user's ID
        const { data: userData } = await supabase.auth.admin.listUsers()
        const existingUser = userData?.users?.find(u => u.email === account.email)
        
        if (existingUser) {
          userId = existingUser.id
          console.log(`   ✓ Found existing user: ${userId}`)
          
          // Update password
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            { password: account.password }
          )
          
          if (updateError) {
            console.error(`   ⚠️  Could not update password:`, updateError.message)
          } else {
            console.log(`   ✓ Password updated to: ${account.password}`)
          }
        } else {
          console.error(`   ❌ Could not find user in database`)
          return
        }
      } else {
        console.error(`   ❌ Failed to create auth user:`, authError.message)
        return
      }
    } else {
      console.log(`   ✓ Auth user created successfully`)
    }

    // Step 2: Create or update profile with onboarding NOT completed
    if (userId) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: account.email,
          full_name: account.fullName,
          shop_name: account.shopName,
          role: account.role,
          onboarding_completed: false,  // IMPORTANT: This makes onboarding show!
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single()

      if (profileError) {
        console.error(`   ❌ Failed to create/update profile:`, profileError.message)
      } else {
        console.log(`   ✓ Profile configured with:`)
        console.log(`      - Role: ${account.role}`)
        console.log(`      - Shop: ${account.shopName}`)
        console.log(`      - Onboarding: NOT completed (will show on login)`)
      }
    }

    console.log(`\n   ✅ Account ready for testing!\n`)
  } catch (error) {
    console.error(`   ❌ Unexpected error:`, error.message)
  }

  console.log('\n' + '═'.repeat(60))
  console.log('📋 ACCOUNT DETAILS')
  console.log('═'.repeat(60))
  console.log(`📧 Email:     ${account.email}`)
  console.log(`🔑 Password:  ${account.password}`)
  console.log(`👤 Role:      ${account.role}`)
  console.log(`🏢 Shop:      ${account.shopName}`)
  console.log(`📝 Onboarding: Will show automatically on login`)
  console.log('═'.repeat(60))
  
  console.log('\n🎯 How to test:')
  console.log('1. Go to http://localhost:9999/login')
  console.log(`2. Login with: ${account.email} / ${account.password}`)
  console.log('3. The onboarding will appear automatically!')
  
  console.log('\n💡 Pro tip for demos:')
  console.log('   After login, you can also use this URL to force onboarding:')
  console.log('   http://localhost:9999/dashboard?onboarding=true')
}

// Run the script
createEnterpriseAccount()
  .then(() => {
    console.log('\n✅ Enterprise account setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })