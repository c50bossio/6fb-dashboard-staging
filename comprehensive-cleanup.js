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

console.log('🧹 COMPREHENSIVE PRODUCTION DATABASE CLEANUP')
console.log('=' * 50)

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

    console.log('\n🔍 Step 1: Identifying test barbershops and their IDs...')
    
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
    console.log(`   ✅ Found ${testShops.length} test barbershops to remove`)
    testShops.forEach(shop => {
      console.log(`      - ${shop.name} (ID: ${shop.id}, Owner: ${shop.owner_id})`)
    })

    console.log('\n🗑️  Step 2: Removing barbershop staff records...')
    
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
        console.log(`   ✅ Deleted ${staffCount} staff record(s)`)
      }
    }

    console.log('\n👤 Step 3: Removing profiles linked to test barbershops...')
    
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
        console.log(`   ✅ Deleted ${profileCount} profile(s) linked to test shops`)
      }
    }

    console.log('\n📧 Step 4: Removing profiles by test email addresses...')
    
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
          console.log(`   ✅ Deleted profile for "${email}"`)
        } else {
          console.log(`   ℹ️  No profile found for "${email}"`)
        }
      }
    }

    console.log('\n🔐 Step 5: Removing auth users...')
    
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
            console.log(`   ✅ Deleted auth user "${email}"`)
          }
        } else {
          console.log(`   ℹ️  Auth user "${email}" not found`)
        }
      }
    }

    console.log('\n🏪 Step 6: Finally removing test barbershops...')
    
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
        console.log(`   ✅ Deleted ${shopsCount} test barbershop(s)`)
        deletedShops.forEach(shop => {
          console.log(`      - Removed: ${shop.name}`)
        })
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 COMPREHENSIVE CLEANUP COMPLETE!')
    console.log('='.repeat(50))
    console.log(`📊 Total records deleted: ${totalDeleted}`)

    return true

  } catch (error) {
    console.error('❌ Comprehensive cleanup failed:', error.message)
    return false
  }
}

async function verifyCleanState() {
  console.log('\n🔍 Verifying completely clean state...')

  try {
    // Check remaining barbershops
    const { data: shops } = await supabase
      .from('barbershops')
      .select('id, name, city, state, owner_id')
      .order('created_at', { ascending: false })

    console.log(`📍 Remaining barbershops: ${shops.length}`)
    
    if (shops.length === 0) {
      console.log('   🎉 PERFECT! No barbershops remain - completely clean slate!')
    } else {
      shops.forEach((shop, i) => {
        const isTestData = testBarbershops.includes(shop.name) || testBarbershopIds.includes(shop.id)
        const status = isTestData ? '🧪 STILL TEST DATA' : '✅ LEGITIMATE'
        console.log(`   ${i + 1}. ${shop.name} (${shop.city}, ${shop.state}) - ${status}`)
        console.log(`      ID: ${shop.id}`)
        console.log(`      Owner: ${shop.owner_id}`)
        console.log('')
      })
    }

    // Check for remaining test users
    const { data: allUsers } = await supabase.auth.admin.listUsers()
    const remainingTestUsers = allUsers.users.filter(u => testUsers.includes(u.email))

    console.log(`👤 Remaining test users: ${remainingTestUsers.length}`)
    if (remainingTestUsers.length > 0) {
      remainingTestUsers.forEach(user => {
        console.log(`   🧪 ${user.email} (ID: ${user.id})`)
      })
    } else {
      console.log('   ✅ No test users remain')
    }

    // Final verdict
    const isCompletelyClean = shops.length === 0 && remainingTestUsers.length === 0
    
    if (isCompletelyClean) {
      console.log('\n🚀 SUCCESS! Database is completely clean!')
      console.log('🎯 Ready for first legitimate barbershop registration!')
      console.log('\n💡 Next steps:')
      console.log('   1. Test user registration at /signup')
      console.log('   2. Verify onboarding appears automatically')
      console.log('   3. Test barbershop creation flow')
      console.log('   4. Confirm dashboard loads for new user')
      return true
    } else {
      console.log('\n⚠️  Database may not be completely clean.')
      console.log('   Manual review recommended before production launch.')
      return false
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

async function main() {
  console.log('Starting comprehensive production database cleanup...\n')

  const success = await comprehensiveCleanup()
  
  if (success) {
    const isClean = await verifyCleanState()
    
    if (isClean) {
      console.log('\n🎉 PRODUCTION READY!')
      console.log('Database is clean and ready for first legitimate user.')
    } else {
      console.log('\n⚠️  Manual review needed before production launch.')
    }
  } else {
    console.log('\n❌ Cleanup failed. Manual intervention required.')
  }
}

main().catch(console.error)