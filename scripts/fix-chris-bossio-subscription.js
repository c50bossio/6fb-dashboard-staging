#!/usr/bin/env node

/**
 * Fix Chris Bossio's Subscription Tier Sync Issue
 * 
 * This script specifically fixes the subscription tier synchronization 
 * for Chris Bossio's account and validates the fix.
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixChrisBossioAccount() {

  try {
    // Find Chris Bossio's profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'c50bossio@gmail.com')
      .single()

    if (fetchError || !profile) {
      console.error('❌ Could not find Chris Bossio\'s profile:', fetchError?.message)
      return
    }

    // Check if fix is needed
    const needsFix = (
      profile.role === 'SHOP_OWNER' && 
      profile.subscription_tier !== 'PROFESSIONAL'
    )

    if (!needsFix) {
      
      return
    }

    // Apply the fix
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'PROFESSIONAL',
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', 'c50bossio@gmail.com')
      .select()
      .single()

    if (updateError) {
      console.error('❌ Failed to update profile:', updateError.message)
      return
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message)
  }
}

async function validateAllProfiles() {

  try {
    const { data: inconsistentProfiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, subscription_tier, subscription_status')
      .or(
        'role.eq.SHOP_OWNER.and.subscription_tier.neq.PROFESSIONAL,' +
        'role.eq.BARBER.and.subscription_tier.neq.INDIVIDUAL,' +
        'role.eq.ENTERPRISE_OWNER.and.subscription_tier.neq.ENTERPRISE'
      )

    if (error) {
      console.error('❌ Failed to check profiles:', error.message)
      return
    }

    if (inconsistentProfiles.length === 0) {
      
      return
    }

    :`)
    
    inconsistentProfiles.forEach((profile, index) => {
      const expectedTier = 
        profile.role === 'SHOP_OWNER' ? 'PROFESSIONAL' :
        profile.role === 'BARBER' ? 'INDIVIDUAL' :
        profile.role === 'ENTERPRISE_OWNER' ? 'ENTERPRISE' :
        'FREE'

    })

    .`)
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message)
  }
}

async function testSubscriptionAPI() {

  try {
    // This would normally require authentication, but we can check if Chris's data looks correct
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, role')
      .eq('email', 'c50bossio@gmail.com')
      .single()

    if (profile) {
      const shouldShow = profile.role === 'SHOP_OWNER' && profile.subscription_tier === 'PROFESSIONAL'
        ? 'Shop Owner Plan'
        : `${profile.subscription_tier || 'Free'} Plan`

    }
    
  } catch (error) {
    ')
  }
}

async function main() {

  await fixChrisBossioAccount()
  await validateAllProfiles()
  await testSubscriptionAPI()

}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { fixChrisBossioAccount, validateAllProfiles }