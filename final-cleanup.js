#!/usr/bin/env node

/**
 * Final cleanup to remove the last remaining test auth user
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

async function finalCleanup() {
  console.log('🔧 FINAL CLEANUP: Removing remaining test user')
  console.log('=' * 50)

  try {
    // List all users to find the test user
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.error('❌ Error listing users:', userError.message)
      return false
    }

    const targetEmail = 'dev-enterprise@test.com'
    const targetUser = userData.users.find(u => u.email === targetEmail)
    
    if (targetUser) {
      console.log(`🎯 Found test user: ${targetUser.email} (ID: ${targetUser.id})`)
      
      // Delete the user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUser.id)
      
      if (deleteError) {
        console.error('❌ Error deleting user:', deleteError.message)
        return false
      }
      
      console.log('✅ Successfully deleted test user from auth')
      console.log('✅ Database is now completely clean!')
      
    } else {
      console.log(`ℹ️  Test user ${targetEmail} not found - may already be deleted`)
    }
    
    // Final verification
    console.log('\n🔍 Final verification...')
    
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('*')
    
    const { data: remainingUsers } = await supabase.auth.admin.listUsers()
    
    console.log(`📍 Barbershops remaining: ${barbershops.length}`)
    console.log(`👤 Auth users remaining: ${remainingUsers.users.length}`)
    
    // Check if any remaining users are test users
    const testEmails = ['dev-enterprise@test.com', 'test@test.com']
    const remainingTest = remainingUsers.users.filter(u => testEmails.includes(u.email))
    
    console.log(`🧪 Test users remaining: ${remainingTest.length}`)
    
    if (barbershops.length === 0 && remainingTest.length === 0) {
      console.log('\n🎉 PERFECT! Database is completely clean!')
      console.log('🚀 Ready for first legitimate barbershop user!')
      
      console.log('\n💡 Next Steps for Production:')
      console.log('   1. Test new user signup at /signup')
      console.log('   2. Verify onboarding modal appears automatically')
      console.log('   3. Test barbershop creation flow')
      console.log('   4. Confirm dashboard loads properly')
      console.log('   5. Test booking system end-to-end')
      
      return true
    } else {
      console.log('\n⚠️  Some data may remain - manual review needed')
      if (remainingTest.length > 0) {
        remainingTest.forEach(u => console.log(`      🧪 ${u.email}`))
      }
      return false
    }
    
  } catch (error) {
    console.error('❌ Final cleanup error:', error.message)
    return false
  }
}

finalCleanup().then(success => {
  if (success) {
    console.log('\n✅ PRODUCTION DATABASE: READY!')
    process.exit(0)
  } else {
    console.log('\n❌ Manual intervention needed')
    process.exit(1)
  }
})