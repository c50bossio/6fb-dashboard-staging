#!/usr/bin/env node

/**
 * Production Database Cleanup Script
 * 
 * Removes all development/test data from the production database
 * to create a clean slate for the first legitimate barbershop.
 * 
 * WARNING: This script will permanently delete test data. 
 * Only run this when you're ready to go to production!
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import readline from 'readline'

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

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Test data identifiers
const TEST_DATA_IDENTIFIERS = {
  barbershops: [
    'Enterprise Management HQ',
    'My Barbershop', 
    'Tomb45 Barbershop',
    'Elite Cuts GMB Test'
  ],
  users: [
    'dev-enterprise@test.com',
    'test@test.com'
  ],
  hardcodedIds: [
    'c61b33d5-4a96-472b-8f97-d1a3ae5532f9' // Elite Cuts GMB Test ID from scripts
  ]
}

async function auditDatabase() {

  try {
    // Audit barbershops
    
    const { data: barbershops, error: barbershopsError } = await supabase
      .from('barbershops')
      .select('id, name, city, state, owner_id, created_at')
      .order('created_at', { ascending: false })
    
    if (barbershopsError) {
      console.error('Error fetching barbershops:', barbershopsError)
    } else {
      barbershops.forEach((shop, index) => {
        const isTestData = TEST_DATA_IDENTIFIERS.barbershops.includes(shop.name) || 
                          TEST_DATA_IDENTIFIERS.hardcodedIds.includes(shop.id)
        const status = isTestData ? '🧪 TEST DATA' : '✅ LEGITIMATE'
         - ${status}`)

      })
    }
    
    // Audit users
    
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else {
      users.users.forEach((user, index) => {
        const isTestData = TEST_DATA_IDENTIFIERS.users.includes(user.email)
        const status = isTestData ? '🧪 TEST DATA' : '✅ LEGITIMATE'

      })
    }
    
    // Audit profiles
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, shop_id, onboarding_completed')
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
    } else {
      profiles.forEach((profile, index) => {
        const isTestData = TEST_DATA_IDENTIFIERS.users.includes(profile.email)
        const status = isTestData ? '🧪 TEST DATA' : '✅ LEGITIMATE'
         - ${status}`)

      })
    }
    
    // Audit barbershop staff
    
    const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('id, user_id, barbershop_id, role, is_active')
      .order('created_at', { ascending: false })
    
    if (staffError) {
      console.error('Error fetching staff:', staffError)
    } else {
      
      staff.forEach((member, index) => {

      })
    }
    
    return { barbershops, users: users.users, profiles, staff }
    
  } catch (error) {
    console.error('❌ Audit failed:', error)
    return null
  }
}

async function confirmCleanup() {
  return new Promise((resolve) => {
    rl.question('\n⚠️  Are you ready to PERMANENTLY DELETE all test data? (yes/no): ', (answer) => {
      resolve(answer.toLowerCase() === 'yes')
    })
  })
}

async function cleanupDatabase() {

  try {
    let deletedRecords = {
      barbershops: 0,
      users: 0,
      profiles: 0,
      staff: 0
    }
    
    // Step 1: Delete test barbershops
    
    for (const shopName of TEST_DATA_IDENTIFIERS.barbershops) {
      const { data, error } = await supabase
        .from('barbershops')
        .delete()
        .eq('name', shopName)
        .select()
      
      if (error) {
        console.error(`   ❌ Error deleting ${shopName}:`, error)
      } else {
        const deleted = data?.length || 0
        deletedRecords.barbershops += deleted
        if (deleted > 0) {
           for "${shopName}"`)
        } else {
          
        }
      }
    }
    
    // Also delete by hardcoded ID
    const { data: idDeleted, error: idError } = await supabase
      .from('barbershops')
      .delete()
      .in('id', TEST_DATA_IDENTIFIERS.hardcodedIds)
      .select()
    
    if (!idError && idDeleted?.length > 0) {
      deletedRecords.barbershops += idDeleted.length
       by hardcoded ID`)
    }
    
    // Step 2: Delete test profiles
    
    for (const email of TEST_DATA_IDENTIFIERS.users) {
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email)
        .select()
      
      if (error) {
        console.error(`   ❌ Error deleting profile ${email}:`, error)
      } else {
        const deleted = data?.length || 0
        deletedRecords.profiles += deleted
        if (deleted > 0) {
          
        } else {
          
        }
      }
    }
    
    // Step 3: Delete test auth users
    
    const { data: allUsers } = await supabase.auth.admin.listUsers()
    
    for (const email of TEST_DATA_IDENTIFIERS.users) {
      const user = allUsers.users.find(u => u.email === email)
      if (user) {
        const { error } = await supabase.auth.admin.deleteUser(user.id)
        if (error) {
          console.error(`   ❌ Error deleting auth user ${email}:`, error)
        } else {
          deletedRecords.users++
          
        }
      } else {
        
      }
    }
    
    // Step 4: Clean up orphaned staff records
    
    const { data: orphanedStaff, error: staffError } = await supabase
      .from('barbershop_staff')
      .delete()
      .not('barbershop_id', 'in', `(SELECT id FROM barbershops)`)
      .select()
    
    if (staffError) {
      console.error('   ❌ Error cleaning staff records:', staffError)
    } else {
      deletedRecords.staff = orphanedStaff?.length || 0
      if (deletedRecords.staff > 0) {
        `)
      } else {
        
      }
    }
    
    // Summary
    )
    
    )

    .reduce((a, b) => a + b, 0)}`)
    
    return deletedRecords
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    throw error
  }
}

async function verifyCleanState() {

  try {
    // Check for any remaining test barbershops
    const { data: remainingShops } = await supabase
      .from('barbershops')
      .select('id, name')
      .in('name', TEST_DATA_IDENTIFIERS.barbershops)
    
    // Check for any remaining test users  
    const { data: allUsers } = await supabase.auth.admin.listUsers()
    const remainingTestUsers = allUsers.users.filter(u => 
      TEST_DATA_IDENTIFIERS.users.includes(u.email)
    )
    
    if (remainingShops.length === 0 && remainingTestUsers.length === 0) {

      return true
    } else {
      
      if (remainingShops.length > 0) {
        `)
      }
      if (remainingTestUsers.length > 0) {
        `)
      }
      return false
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

async function main() {

  try {
    // Step 1: Audit current state
    
    const auditResult = await auditDatabase()
    
    if (!auditResult) {
      console.error('❌ Audit failed. Aborting cleanup.')
      process.exit(1)
    }
    
    // Step 2: Confirm cleanup
    const confirmed = await confirmCleanup()
    
    if (!confirmed) {
      
      process.exit(0)
    }
    
    // Step 3: Perform cleanup
    
    await cleanupDatabase()
    
    // Step 4: Verify clean state
    
    const isClean = await verifyCleanState()
    
    if (isClean) {

    } else {
      
    }
    
  } catch (error) {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  } finally {
    rl.close()
  }
}

// Run the script
main()