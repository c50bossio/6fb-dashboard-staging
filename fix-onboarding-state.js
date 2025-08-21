#!/usr/bin/env node

/**
 * Fix Onboarding State Contradictions
 * 
 * This script resolves database inconsistencies where:
 * - onboarding_completed: true but onboarding_status: 'active' (impossible state)
 * - Users stuck in render loops due to contradictory conditions
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function fixOnboardingState() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing environment variables:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  console.log('🔍 SCANNING FOR ONBOARDING STATE CONFLICTS...')
  console.log('=' .repeat(50))

  try {
    // Find users with contradictory onboarding states
    const { data: conflictedUsers, error } = await supabase
      .from('profiles')
      .select('id, email, onboarding_completed, onboarding_status, role')
      .eq('onboarding_completed', true)
      .neq('onboarding_status', 'completed')
    
    if (error) {
      console.error('❌ Database query failed:', error)
      return
    }

    console.log(`Found ${conflictedUsers.length} users with contradictory states:`)
    
    if (conflictedUsers.length === 0) {
      console.log('✅ No state conflicts found!')
      return
    }

    console.log('\n📊 CONFLICTED USERS:')
    conflictedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role})`)
      console.log(`   Current: completed=${user.onboarding_completed}, status='${user.onboarding_status}'`)
      console.log(`   Problem: Onboarding marked complete but status not 'completed'`)
    })

    console.log('\n🔧 FIXING CONTRADICTORY STATES...')
    
    // Fix each user by setting status to 'completed' since onboarding_completed is true
    const updates = []
    for (const user of conflictedUsers) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (updateError) {
        console.error(`❌ Failed to update ${user.email}:`, updateError)
      } else {
        console.log(`✅ Fixed ${user.email}: status → 'completed'`)
        updates.push(user.email)
      }
    }

    console.log('\n📈 SUMMARY:')
    console.log(`✅ Successfully fixed: ${updates.length} users`)
    console.log(`❌ Failed to fix: ${conflictedUsers.length - updates.length} users`)
    
    if (updates.length > 0) {
      console.log('\n🎉 STATE CONFLICTS RESOLVED!')
      console.log('The onboarding modal should now behave correctly.')
      console.log('\nFixed users:')
      updates.forEach(email => console.log(`  - ${email}`))
    }

  } catch (error) {
    console.error('❌ Script execution failed:', error)
  }
}

// Run the fix
if (require.main === module) {
  fixOnboardingState()
}

module.exports = { fixOnboardingState }