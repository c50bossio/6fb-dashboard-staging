#!/usr/bin/env node

/**
 * Comprehensive Production Database Cleanup
 * 
 * Handles foreign key dependencies properly by cleaning up in correct order:
 * 1. Staff records
 * 2. Profiles 
 * 3. Auth users
 * 4. Barbershops (last, after all dependencies removed)
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

// Test data identifiers
const testBarbershops = [
  'My Barbershop',
  'Tomb45 Barbershop', 
  'Enterprise Management HQ',
  'Elite Cuts GMB Test'
]

const testUsers = [
  'dev-enterprise@test.com',
  'test@test.com'
]

const testBarbershopIds = [
  'c61b33d5-4a96-472b-8f97-d1a3ae5532f9' // Elite Cuts GMB Test hardcoded ID
]

async function comprehensiveCleanup() {
  try {
    let totalDeleted = 0

    // Get all test barbershop IDs (by name and hardcoded)
    const { data: testShops, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .or(`name.in.(${testBarbershops.map(n => `"${n}"`).join(',')}),id.in.(${testBarbershopIds.map(id => `"${id}"`).join(',')})`)

    if (shopError) {
      console.error('   ❌ Error fetching test barbershops:', shopError.message)
      return false
    }

    const allTestShopIds = testShops.map(s => s.id)
    
    testShops.forEach(shop => {
      `)
    })

    if (allTestShopIds.length > 0) {
      const { data: deletedStaff, error: staffError } = await supabase
        .from('barbershop_staff')
        .delete()
        .in('barbershop_id', allTestShopIds)
        .select()

      if (staffError) {
        console.error('   ❌ Error deleting staff records:', staffError.message)
      } else {
        const staffCount = deletedStaff?.length || 0
        totalDeleted += staffCount
        `)
      }
    }

    if (allTestShopIds.length > 0) {
      const { data: deletedProfiles, error: profileError } = await supabase
        .from('profiles')
        .delete()
        .in('shop_id', allTestShopIds)
        .select()

      if (profileError) {
        console.error('   ❌ Error deleting profiles by shop_id:', profileError.message)
      } else {
        const profileCount = deletedProfiles?.length || 0
        totalDeleted += profileCount
         linked to test shops`)
      }
    }

    for (const email of testUsers) {
      const { data: deletedByEmail, error: emailError } = await supabase
        .from('profiles')
        .delete()
        .eq('email', email)
        .select()

      if (emailError) {
        console.error(`   ❌ Error deleting profile "${email}":`, emailError.message)
      } else {
        const emailCount = deletedByEmail?.length || 0
        totalDeleted += emailCount
        if (emailCount > 0) {
          
        } else {
          
        }
      }
    }

    // Get all auth users first
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('   ❌ Error fetching auth users:', usersError.message)
    } else {
      for (const email of testUsers) {
        const user = allUsers.users.find(u => u.email === email)
        if (user) {
          const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id)
          if (deleteUserError) {
            console.error(`   ❌ Error deleting auth user "${email}":`, deleteUserError.message)
          } else {
            totalDeleted += 1
            
          }
        } else {
          
        }
      }
    }

    if (allTestShopIds.length > 0) {
      const { data: deletedShops, error: deleteShopsError } = await supabase
        .from('barbershops')
        .delete()
        .in('id', allTestShopIds)
        .select()

      if (deleteShopsError) {
        console.error('   ❌ Error deleting barbershops:', deleteShopsError.message)
      } else {
        const shopsCount = deletedShops?.length || 0
        totalDeleted += shopsCount
        `)
        deletedShops.forEach(shop => {
          
        })
      }
    }

    )
    
    )

    return true

  } catch (error) {
    console.error('❌ Comprehensive cleanup failed:', error.message)
    return false
  }
}

async function verifyCleanState() {

  try {
    // Check remaining barbershops
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id, name, city, state, owner_id')
      .order('created_at', { ascending: false })

    if (shops.length === 0) {
      
    } else {
      shops.forEach((shop, i) => {
        const isTestData = testBarbershops.includes(shop.name) || testBarbershopIds.includes(shop.id)
        const status = isTestData ? '🧪 STILL TEST DATA' : '✅ LEGITIMATE'
         - ${status}`)

      })
    }

    // Check for remaining test users
    const { data: allUsers } = await supabase.auth.admin.listUsers()
    const remainingTestUsers = allUsers.users.filter(u => testUsers.includes(u.email))

    if (remainingTestUsers.length > 0) {
      remainingTestUsers.forEach(user => {
        `)
      })
    } else {
      
    }

    // Final verdict
    const isCompletelyClean = shops.length === 0 && remainingTestUsers.length === 0
    
    if (isCompletelyClean) {

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

  const success = await comprehensiveCleanup()
  
  if (success) {
    const isClean = await verifyCleanState()
    
    if (isClean) {

    } else {
      
    }
  } else {
    
  }
}

main().catch(console.error)