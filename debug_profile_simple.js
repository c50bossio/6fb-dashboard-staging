/**
 * Simple Profile Debug Script
 * Identifies user ID mismatches between Supabase Auth and profiles table
 */

import { createBrowserClient } from '@supabase/ssr'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local')
  process.exit(1)
}

// Create Supabase client
const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function debugProfileIssue() {
  console.log('🔍 Starting profile debug analysis...\n')
  
  try {
    // Get current authenticated user
    console.log('1️⃣ Getting authenticated user...')
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError.message)
      console.error('⚠️  This means you\'re not logged in. Please log in through the web app first.')
      return
    }
    
    if (!authUser) {
      console.error('❌ No authenticated user found')
      console.error('⚠️  This means you\'re not logged in. Please log in through the web app first.')
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
      console.log('\n🎯 RESULT: Profile exists with correct user ID!')
      console.log('💡 The issue might be React Query caching. Try refreshing the page or clearing cache.')
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
        console.log('\n🔧 DIAGNOSIS: User ID Mismatch Found!')
        console.log('The profile exists but with the wrong user ID.')
        console.log('\n📋 FIX SQL COMMAND:')
        console.log('Copy and run this SQL in the Supabase SQL editor:')
        console.log('\n```sql')
        console.log(`UPDATE profiles SET id = '${authUser.id}' WHERE id = '${mismatchedProfile.id}';`)
        console.log('```')
        console.log('\n🔄 Alternative (delete and recreate):')
        console.log('```sql')
        console.log(`DELETE FROM profiles WHERE id = '${mismatchedProfile.id}';`)
        console.log('```')
        console.log('(Then refresh the web app to let the system create a new profile)')
      }
    } else {
      console.log('❌ No profiles found with matching email')
      console.log('\n🔧 SOLUTION: Refresh the web app page to let the system create a profile automatically')
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
}).catch(error => {
  console.error('Script error:', error)
})