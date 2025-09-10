/**
 * Profile Debug Script
 * Identifies user ID mismatches between Supabase Auth and profiles table
 */

import { createClient } from './lib/supabase/UNIFIED_CLIENT.js'

async function debugProfileIssue() {
  console.log('🔍 Starting profile debug analysis...\n')
  
  const supabase = createClient()
  
  try {
    // Get current authenticated user
    console.log('1️⃣ Getting authenticated user...')
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError.message)
      return
    }
    
    if (!authUser) {
      console.error('❌ No authenticated user found')
      return
    }
    
    console.log('✅ Authenticated user found:')
    console.log(`   Email: ${authUser.email}`)
    console.log(`   ID: ${authUser.id}`)
    console.log(`   Last sign in: ${authUser.last_sign_in_at}\n`)
    
    // Check for profile with this user ID
    console.log('2️⃣ Looking for profile with authenticated user ID...')
    const { data: correctProfile, error: correctProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle()
    
    if (correctProfileError) {
      console.error('❌ Error querying for correct profile:', correctProfileError.message)
    } else if (correctProfile) {
      console.log('✅ Profile found with correct ID:')
      console.log(`   Role: ${correctProfile.role}`)
      console.log(`   Full name: ${correctProfile.full_name}`)
      console.log(`   Barbershop ID: ${correctProfile.barbershop_id}`)
      console.log('✅ This should be working! Check React Query cache.')
      return
    } else {
      console.log('❌ No profile found with authenticated user ID')
    }
    
    // Check for profiles with this email
    console.log('\n3️⃣ Looking for profiles with matching email...')
    const { data: emailProfiles, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', authUser.email)
    
    if (emailError) {
      console.error('❌ Error querying profiles by email:', emailError.message)
    } else if (emailProfiles && emailProfiles.length > 0) {
      console.log(`✅ Found ${emailProfiles.length} profile(s) with matching email:`)
      emailProfiles.forEach((profile, index) => {
        console.log(`\n   Profile ${index + 1}:`)
        console.log(`   ID: ${profile.id}`)
        console.log(`   Email: ${profile.email}`)
        console.log(`   Role: ${profile.role}`)
        console.log(`   Full name: ${profile.full_name}`)
        console.log(`   Barbershop ID: ${profile.barbershop_id}`)
        
        if (profile.id !== authUser.id) {
          console.log('   ⚠️  ID MISMATCH! This profile has wrong user ID')
        }
      })
      
      // Generate fix SQL
      const mismatchedProfile = emailProfiles.find(p => p.id !== authUser.id)
      if (mismatchedProfile) {
        console.log('\n🔧 FIX SQL COMMAND:')
        console.log('Run this SQL to fix the user ID mismatch:')
        console.log(`\nUPDATE profiles SET id = '${authUser.id}' WHERE id = '${mismatchedProfile.id}';`)
        console.log('\nOr delete and recreate:')
        console.log(`DELETE FROM profiles WHERE id = '${mismatchedProfile.id}';`)
        console.log('(Then refresh the page to let the system create a new profile)')
      }
    } else {
      console.log('❌ No profiles found with matching email')
      console.log('\n🔧 SOLUTION: Refresh the page to let the system create a profile automatically')
    }
    
    // Check for any ENTERPRISE_OWNER profiles
    console.log('\n4️⃣ Looking for ENTERPRISE_OWNER profiles...')
    const { data: enterpriseProfiles, error: enterpriseError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'ENTERPRISE_OWNER')
    
    if (enterpriseError) {
      console.error('❌ Error querying ENTERPRISE_OWNER profiles:', enterpriseError.message)
    } else if (enterpriseProfiles && enterpriseProfiles.length > 0) {
      console.log(`✅ Found ${enterpriseProfiles.length} ENTERPRISE_OWNER profile(s):`)
      enterpriseProfiles.forEach((profile, index) => {
        console.log(`\n   ENTERPRISE_OWNER ${index + 1}:`)
        console.log(`   ID: ${profile.id}`)
        console.log(`   Email: ${profile.email}`)
        console.log(`   Full name: ${profile.full_name}`)
        
        if (profile.email === authUser.email && profile.id !== authUser.id) {
          console.log('   ⚠️  This is your profile but with wrong user ID!')
        }
      })
    } else {
      console.log('❌ No ENTERPRISE_OWNER profiles found')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the debug script
debugProfileIssue().then(() => {
  console.log('\n🎯 Debug analysis complete!')
  process.exit(0)
}).catch(error => {
  console.error('Script error:', error)
  process.exit(1)
})