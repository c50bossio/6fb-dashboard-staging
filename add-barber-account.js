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

  const account = {
    email: 'barber@test.com',
    password: 'BarberPass123!',
    fullName: 'Mike The Barber',
    shopName: 'Independent Barber',  // Individual barbers may work independently
    role: 'BARBER'  // This is the key - BARBER role gets different onboarding
  }

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

        // Get existing user's ID
        const { data: userData } = await supabase.auth.admin.listUsers()
        const existingUser = userData?.users?.find(u => u.email === account.email)
        
        if (existingUser) {
          userId = existingUser.id

          // Update password
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            { password: account.password }
          )
          
          if (updateError) {
            console.error(`   ⚠️  Could not update password:`, updateError.message)
          } else {
            
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
        
        `)
        
        `)
      }
    }

  } catch (error) {
    console.error(`   ❌ Unexpected error:`, error.message)
  }

  )
  
  )

  `)
  
  `)
  )

  !')

  ')

}

// Run the script
createBarberAccount()
  .then(() => {
    
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })