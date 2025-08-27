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
      `)
      
      // Delete the user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUser.id)
      
      if (deleteError) {
        console.error('❌ Error deleting user:', deleteError.message)
        return false
      }

    } else {
      
    }
    
    // Final verification

    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('*')
    
    const { data: remainingUsers } = await supabase.auth.admin.listUsers()

    // Check if any remaining users are test users
    const testEmails = ['dev-enterprise@test.com', 'test@test.com']
    const remainingTest = remainingUsers.users.filter(u => testEmails.includes(u.email))

    if (barbershops.length === 0 && remainingTest.length === 0) {

      return true
    } else {
      
      if (remainingTest.length > 0) {
        remainingTest.forEach(u => )
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
    
    process.exit(0)
  } else {
    
    process.exit(1)
  }
})