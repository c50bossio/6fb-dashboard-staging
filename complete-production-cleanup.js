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
  null /* hardcoded ID removed for production */,           // Primary admin
  'justine.casiano@gmail.com'      // Secondary admin if needed
]

async function completeProductionCleanup() {

  try {
    let totalDeleted = 0

    // Step 1: Get all users to identify what to preserve vs delete

    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return false
    }

    const usersToDelete = allUsers.users.filter(u => !PRESERVE_ACCOUNTS.includes(u.email))
    const usersToPreserve = allUsers.users.filter(u => PRESERVE_ACCOUNTS.includes(u.email))

    usersToPreserve.forEach(u => )

    // Step 2: Delete all staff records (they'll be recreated as needed)
    
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
      `)
    }

    // Step 3: Delete test profiles (preserve admin profiles)
    
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
          
        }
      } else {
        
      }
    }
    totalDeleted += profilesDeleted

    // Step 4: Delete test auth users
    
    let authUsersDeleted = 0
    for (const user of usersToDelete) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error(`   ⚠️  Could not delete ${user.email}:`, deleteError.message)
      } else {
        authUsersDeleted++
        
      }
    }
    totalDeleted += authUsersDeleted

    // Step 5: Delete any remaining user records from users table
    
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
       from users table`)
    }

    // Summary
    )
    
    )

    return true

  } catch (error) {
    console.error('❌ Complete cleanup failed:', error.message)
    return false
  }
}

async function verifyFinalState() {

  try {
    // Check final counts
    const { data: finalBarbershops } = await supabase.from('barbershops').select('*')
    const { data: finalProfiles } = await supabase.from('profiles').select('email, role')
    const { data: finalUsers } = await supabase.auth.admin.listUsers()
    const { data: finalStaff } = await supabase.from('barbershop_staff').select('*')

    `)

    `)

    if (finalProfiles.length > 0) {
      
      finalProfiles.forEach(p => `))
    }

    const isProductionReady = finalBarbershops.length === 0 && 
                            finalStaff.length === 0 &&
                            finalUsers.users.length <= 2 // Only admin accounts

    if (isProductionReady) {

      ')

      return true
    } else {
      
      return false
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

async function main() {

  const success = await completeProductionCleanup()
  
  if (success) {
    const isReady = await verifyFinalState()
    
    if (isReady) {
      
    } else {
      
    }
  } else {
    
  }
}

main().catch(console.error)