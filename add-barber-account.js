#!/usr/bin/env node

/**
 * Creates an individual barber test account with onboarding enabled
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

async function createBarberAccount() {
  console.log('💈 Creating individual barber test account...\n')

  const account = {
    email: 'barber@test.com',
    password: 'BarberPass123!',
    fullName: 'Mike The Barber',
    shopName: 'Independent Barber',  // Individual barbers may work independently
    role: 'BARBER'  // This is the key - BARBER role gets different onboarding
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
        console.log(`      - Role: ${account.role} (Individual Barber)`)
        console.log(`      - Name: ${account.fullName}`)
        console.log(`      - Onboarding: NOT completed (will show barber-specific flow)`)
      }
    }

    console.log(`\n   ✅ Account ready for testing!\n`)
  } catch (error) {
    console.error(`   ❌ Unexpected error:`, error.message)
  }

  console.log('\n' + '═'.repeat(60))
  console.log('💈 INDIVIDUAL BARBER ACCOUNT')
  console.log('═'.repeat(60))
  console.log(`📧 Email:     ${account.email}`)
  console.log(`🔑 Password:  ${account.password}`)
  console.log(`👤 Role:      ${account.role} (Individual Barber)`)
  console.log(`✂️  Name:      ${account.fullName}`)
  console.log(`📝 Onboarding: Barber-specific flow (6 steps)`)
  console.log('═'.repeat(60))
  
  console.log('\n📋 Barber Onboarding Steps:')
  console.log('   1. Personal Profile - Set up professional profile')
  console.log('   2. Services & Pricing - Your individual services')
  console.log('   3. Availability - Your working hours')
  console.log('   4. Payment Setup - How you get paid')
  console.log('   5. Booking Rules - Your policies')
  console.log('   6. Booking Page - Your personal booking page')
  
  console.log('\n🎯 How to test:')
  console.log('1. Go to http://localhost:9999/login')
  console.log(`2. Login with: ${account.email} / ${account.password}`)
  console.log('3. You\'ll see the BARBER-specific onboarding (different from shop/enterprise)!')
  
  console.log('\n💡 Key Differences for Barber Onboarding:')
  console.log('   • No staff management (you\'re individual)')
  console.log('   • Personal services instead of shop catalog')
  console.log('   • Individual availability vs shop hours')
  console.log('   • Personal branding vs shop branding')
}

// Run the script
createBarberAccount()
  .then(() => {
    console.log('\n✅ Individual barber account setup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })