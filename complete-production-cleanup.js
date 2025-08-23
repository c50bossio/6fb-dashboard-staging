#!/usr/bin/env node

/**
 * Complete Production Database Cleanup
 * 
 * Removes ALL test data to create a truly clean production environment
 * Preserves only the core admin account (c50bossio@gmail.com)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Preserve these essential accounts for system administration
const PRESERVE_ACCOUNTS = [
  'c50bossio@gmail.com',           // Primary admin
  'justine.casiano@gmail.com'      // Secondary admin if needed
]

async function completeProductionCleanup() {
  console.log('🧹 COMPLETE PRODUCTION DATABASE CLEANUP')
  console.log('=' * 60)
  console.log('Removing ALL test data while preserving admin accounts')
  console.log('')

  try {
    let totalDeleted = 0

    // Step 1: Get all users to identify what to preserve vs delete
    console.log('🔍 Step 1: Analyzing user data...')
    
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return false
    }

    const usersToDelete = allUsers.users.filter(u => !PRESERVE_ACCOUNTS.includes(u.email))
    const usersToPreserve = allUsers.users.filter(u => PRESERVE_ACCOUNTS.includes(u.email))

    console.log(`   📊 Total users: ${allUsers.users.length}`)
    console.log(`   ✅ To preserve: ${usersToPreserve.length}`)
    console.log(`   🗑️  To delete: ${usersToDelete.length}`)

    usersToPreserve.forEach(u => console.log(`      ✅ Preserving: ${u.email}`))

    // Step 2: Delete all staff records (they'll be recreated as needed)
    console.log('\\n👥 Step 2: Cleaning all staff records...')
    const { data: deletedStaff, error: staffError } = await supabase
      .from('barbershop_staff')
      .delete()
      .neq('id', 'never-matches') // Delete all records
      .select()

    if (staffError) {
      console.error('   ❌ Error deleting staff:', staffError.message)
    } else {
      const staffCount = deletedStaff?.length || 0
      totalDeleted += staffCount
      console.log(`   ✅ Deleted ${staffCount} staff record(s)`)
    }

    // Step 3: Delete test profiles (preserve admin profiles)
    console.log('\\n📝 Step 3: Cleaning test profiles...')
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, email')

    let profilesDeleted = 0
    for (const profile of allProfiles || []) {
      if (!PRESERVE_ACCOUNTS.includes(profile.email)) {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', profile.id)

        if (profileError) {
          console.error(`   ❌ Error deleting profile ${profile.email}:`, profileError.message)
        } else {
          profilesDeleted++
          console.log(`   ✅ Deleted profile: ${profile.email}`)
        }
      } else {
        console.log(`   ✅ Preserved profile: ${profile.email}`)
      }
    }
    totalDeleted += profilesDeleted

    // Step 4: Delete test auth users
    console.log('\\n🔐 Step 4: Cleaning test auth users...')
    let authUsersDeleted = 0
    for (const user of usersToDelete) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error(`   ⚠️  Could not delete ${user.email}:`, deleteError.message)
      } else {
        authUsersDeleted++
        console.log(`   ✅ Deleted auth user: ${user.email}`)
      }
    }
    totalDeleted += authUsersDeleted

    // Step 5: Delete any remaining user records from users table
    console.log('\\n👤 Step 5: Cleaning users table...')
    const preserveUserIds = usersToPreserve.map(u => u.id)
    
    const { data: deletedUsers, error: usersTableError } = await supabase
      .from('users')
      .delete()
      .not('id', 'in', `(${preserveUserIds.map(id => `"${id}"`).join(',')})`)
      .select()

    if (usersTableError) {
      console.error('   ❌ Error cleaning users table:', usersTableError.message)
    } else {
      const usersTableCount = deletedUsers?.length || 0
      totalDeleted += usersTableCount
      console.log(`   ✅ Cleaned ${usersTableCount} user record(s) from users table`)
    }

    // Summary
    console.log('\\n' + '='.repeat(60))
    console.log('🎉 COMPLETE CLEANUP FINISHED!')
    console.log('='.repeat(60))
    console.log(`📊 Total records deleted: ${totalDeleted}`)
    console.log(`👤 Admin accounts preserved: ${usersToPreserve.length}`)

    return true

  } catch (error) {
    console.error('❌ Complete cleanup failed:', error.message)
    return false
  }
}

async function verifyFinalState() {
  console.log('\\n🔍 Final state verification...')

  try {
    // Check final counts
    const { data: finalBarbershops } = await supabase.from('barbershops').select('*')
    const { data: finalProfiles } = await supabase.from('profiles').select('email, role')
    const { data: finalUsers } = await supabase.auth.admin.listUsers()
    const { data: finalStaff } = await supabase.from('barbershop_staff').select('*')

    console.log(`📍 Barbershops: ${finalBarbershops.length} (should be 0)`)
    console.log(`📝 Profiles: ${finalProfiles.length}`)
    console.log(`🔐 Auth users: ${finalUsers.users.length}`)
    console.log(`👥 Staff records: ${finalStaff.length} (should be 0)`)

    if (finalProfiles.length > 0) {
      console.log('\\n📋 Remaining profiles:')
      finalProfiles.forEach(p => console.log(`   - ${p.email} (${p.role})`))
    }

    const isProductionReady = finalBarbershops.length === 0 && 
                            finalStaff.length === 0 &&
                            finalUsers.users.length <= 2 // Only admin accounts

    if (isProductionReady) {
      console.log('\\n🚀 PRODUCTION READY!')
      console.log('Database is clean and ready for first legitimate barbershop user.')
      console.log('\\n✅ First user signup will:')
      console.log('   • Be detected as first user (no barbershops exist)')
      console.log('   • Get SHOP_OWNER role automatically')
      console.log('   • Get professional subscription tier')
      console.log('   • Trigger onboarding flow')
      console.log('   • Create the first legitimate barbershop')
      return true
    } else {
      console.log('\\n⚠️  Database may need additional cleanup')
      return false
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

async function main() {
  console.log('Starting complete production database cleanup...\\n')

  const success = await completeProductionCleanup()
  
  if (success) {
    const isReady = await verifyFinalState()
    
    if (isReady) {
      console.log('\\n🎯 SUCCESS: Database is production-ready!')
    } else {
      console.log('\\n⚠️  Additional cleanup may be needed')
    }
  } else {
    console.log('\\n❌ Cleanup failed')
  }
}

main().catch(console.error)