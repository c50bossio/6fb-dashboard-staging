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
  console.log('🔍 PRODUCTION DATABASE AUDIT')
  console.log('=' * 50)
  
  try {
    // Audit barbershops
    console.log('\n📍 BARBERSHOPS:')
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
        console.log(`  ${index + 1}. ${shop.name} (${shop.city}, ${shop.state}) - ${status}`)
        console.log(`     ID: ${shop.id}`)
        console.log(`     Owner: ${shop.owner_id}`)
        console.log(`     Created: ${shop.created_at}`)
        console.log('')
      })
    }
    
    // Audit users
    console.log('\n👤 AUTH USERS:')
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else {
      users.users.forEach((user, index) => {
        const isTestData = TEST_DATA_IDENTIFIERS.users.includes(user.email)
        const status = isTestData ? '🧪 TEST DATA' : '✅ LEGITIMATE'
        console.log(`  ${index + 1}. ${user.email} - ${status}`)
        console.log(`     ID: ${user.id}`)
        console.log(`     Created: ${user.created_at}`)
        console.log(`     Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
        console.log('')
      })
    }
    
    // Audit profiles
    console.log('\n📝 PROFILES:')
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
        console.log(`  ${index + 1}. ${profile.email} (${profile.full_name}) - ${status}`)
        console.log(`     Role: ${profile.role}`)
        console.log(`     Shop ID: ${profile.shop_id}`)
        console.log(`     Onboarding: ${profile.onboarding_completed ? 'Complete' : 'Incomplete'}`)
        console.log('')
      })
    }
    
    // Audit barbershop staff
    console.log('\n👥 BARBERSHOP STAFF:')
    const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select('id, user_id, barbershop_id, role, is_active')
      .order('created_at', { ascending: false })
    
    if (staffError) {
      console.error('Error fetching staff:', staffError)
    } else {
      console.log(`   Total staff records: ${staff.length}`)
      staff.forEach((member, index) => {
        console.log(`  ${index + 1}. User: ${member.user_id}, Shop: ${member.barbershop_id}`)
        console.log(`     Role: ${member.role}, Active: ${member.is_active}`)
        console.log('')
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
  console.log('\n🧹 Starting database cleanup...')
  
  try {
    let deletedRecords = {
      barbershops: 0,
      users: 0,
      profiles: 0,
      staff: 0
    }
    
    // Step 1: Delete test barbershops
    console.log('\n1️⃣  Removing test barbershops...')
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
          console.log(`   ✅ Deleted ${deleted} record(s) for "${shopName}"`)
        } else {
          console.log(`   ℹ️  No records found for "${shopName}"`)
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
      console.log(`   ✅ Deleted ${idDeleted.length} barbershop(s) by hardcoded ID`)
    }
    
    // Step 2: Delete test profiles
    console.log('\n2️⃣  Removing test profiles...')
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
          console.log(`   ✅ Deleted profile for "${email}"`)
        } else {
          console.log(`   ℹ️  No profile found for "${email}"`)
        }
      }
    }
    
    // Step 3: Delete test auth users
    console.log('\n3️⃣  Removing test auth users...')
    const { data: allUsers } = await supabase.auth.admin.listUsers()
    
    for (const email of TEST_DATA_IDENTIFIERS.users) {
      const user = allUsers.users.find(u => u.email === email)
      if (user) {
        const { error } = await supabase.auth.admin.deleteUser(user.id)
        if (error) {
          console.error(`   ❌ Error deleting auth user ${email}:`, error)
        } else {
          deletedRecords.users++
          console.log(`   ✅ Deleted auth user "${email}"`)
        }
      } else {
        console.log(`   ℹ️  No auth user found for "${email}"`)
      }
    }
    
    // Step 4: Clean up orphaned staff records
    console.log('\n4️⃣  Cleaning up orphaned staff records...')
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
        console.log(`   ✅ Deleted ${deletedRecords.staff} orphaned staff record(s)`)
      } else {
        console.log(`   ℹ️  No orphaned staff records found`)
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('🎉 CLEANUP COMPLETE!')
    console.log('='.repeat(50))
    console.log(`📊 Records deleted:`)
    console.log(`   🏪 Barbershops: ${deletedRecords.barbershops}`)
    console.log(`   👤 Users: ${deletedRecords.users}`)
    console.log(`   📝 Profiles: ${deletedRecords.profiles}`)
    console.log(`   👥 Staff: ${deletedRecords.staff}`)
    console.log(`   🎯 Total: ${Object.values(deletedRecords).reduce((a, b) => a + b, 0)}`)
    
    return deletedRecords
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    throw error
  }
}

async function verifyCleanState() {
  console.log('\n🔍 Verifying clean state...')
  
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
      console.log('✅ Database is clean! No test data found.')
      console.log('🚀 Ready for first legitimate barbershop user!')
      return true
    } else {
      console.log('⚠️  Some test data may remain:')
      if (remainingShops.length > 0) {
        console.log(`   - ${remainingShops.length} test barbershop(s)`)
      }
      if (remainingTestUsers.length > 0) {
        console.log(`   - ${remainingTestUsers.length} test user(s)`)
      }
      return false
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    return false
  }
}

async function main() {
  console.log('🚀 PRODUCTION DATABASE CLEANUP')
  console.log('=' * 50)
  console.log('This script will remove ALL test/development data')
  console.log('to create a clean production environment.')
  console.log('')
  
  try {
    // Step 1: Audit current state
    console.log('Phase 1: Auditing current database state...')
    const auditResult = await auditDatabase()
    
    if (!auditResult) {
      console.error('❌ Audit failed. Aborting cleanup.')
      process.exit(1)
    }
    
    // Step 2: Confirm cleanup
    const confirmed = await confirmCleanup()
    
    if (!confirmed) {
      console.log('❌ Cleanup cancelled by user.')
      process.exit(0)
    }
    
    // Step 3: Perform cleanup
    console.log('\nPhase 2: Performing cleanup...')
    await cleanupDatabase()
    
    // Step 4: Verify clean state
    console.log('\nPhase 3: Verifying clean state...')
    const isClean = await verifyCleanState()
    
    if (isClean) {
      console.log('\n🎉 SUCCESS! Database is ready for production.')
      console.log('💡 Next steps:')
      console.log('   1. Test user registration flow')
      console.log('   2. Verify onboarding appears for fresh users')
      console.log('   3. Confirm first barbershop creation works')
    } else {
      console.log('\n⚠️  Cleanup may be incomplete. Manual review recommended.')
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