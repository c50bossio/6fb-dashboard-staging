#!/usr/bin/env node

/**
 * Direct Production Database Cleanup
 * 
 * Removes identified test data for production readiness
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Specific test data to remove (based on audit)
const testBarbershops = [
  'My Barbershop',
  'Tomb45 Barbershop', 
  'Enterprise Management HQ'
]

const testUsers = [
  'dev-enterprise@test.com'
]

async function cleanupDatabase() {
  try {
    let totalDeleted = 0

    // Step 1: Delete test barbershops

    for (const shopName of testBarbershops) {
      const { data, error } = await supabase
        .from('barbershops')
        .delete()
        .eq('name', shopName)
        .select()

      if (error) {
        console.error(`   ❌ Error deleting "${shopName}":`, error.message)
      } else {
        const deleted = data?.length || 0
        totalDeleted += deleted
        if (deleted > 0) {
          `)
        } else {
          
        }
      }
    }

    // Step 2: Delete test profiles

    for (const email of testUsers) {
      const { data, error } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email)
        .select()

      if (error) {
        console.error(`   ❌ Error deleting profile "${email}":`, error.message)
      } else {
        const deleted = data?.length || 0
        totalDeleted += deleted
        if (deleted > 0) {
          
        } else {
          
        }
      }
    }

    // Step 3: Delete test auth users

    const { data: allUsers } = await supabase.auth.admin.listUsers()
    
    for (const email of testUsers) {
      const user = allUsers.users.find(u => u.email === email)
      if (user) {
        const { error } = await supabase.auth.admin.deleteUser(user.id)
        if (error) {
          console.error(`   ❌ Error deleting auth user "${email}":`, error.message)
        } else {
          totalDeleted += 1
          
        }
      } else {
        
      }
    }

    // Step 4: Clean orphaned staff records

    const { data: orphanedStaff, error: staffError } = await supabase
      .rpc('delete_orphaned_staff')  // We'll need to create this RPC
      
    if (staffError && !staffError.message.includes('does not exist')) {
      console.error('   ❌ Error cleaning staff records:', staffError.message)
    } else {
      
    }

    // Manual orphaned staff cleanup
    const { data: staffData } = await supabase
      .from('barbershop_staff')
      .select('id, barbershop_id')

    let orphanedCount = 0
    if (staffData) {
      for (const staff of staffData) {
        const { data: barbershopExists } = await supabase
          .from('barbershops')
          .select('id')
          .eq('id', staff.barbershop_id)
          .single()

        if (!barbershopExists) {
          const { error } = await supabase
            .from('barbershop_staff')
            .delete()
            .eq('id', staff.id)

          if (!error) {
            orphanedCount++
          }
        }
      }
    }

    if (orphanedCount > 0) {
      `)
      totalDeleted += orphanedCount
    }

    )
    
    )

    return true

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    return false
  }
}

async function verifyCleanState() {

  try {
    // Check remaining barbershops
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')

    shops.forEach((shop, i) => {
      `)
    })

    // Check for test data
    const hasTestShops = shops.some(s => testBarbershops.includes(s.name))

    if (!hasTestShops) {

      return true
    } else {
      
      return false
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

// Run cleanup
async function main() {

  const success = await cleanupDatabase()
  
  if (success) {
    await verifyCleanState()

  } else {
    
  }
}

main().catch(console.error)