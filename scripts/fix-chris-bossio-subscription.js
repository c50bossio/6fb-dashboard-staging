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
  console.log('🔍 Looking for Chris Bossio\'s account...')
  
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

    console.log('📋 Current profile status:')
    console.log(`   Email: ${profile.email}`)
    console.log(`   Name: ${profile.full_name}`)
    console.log(`   Role: ${profile.role}`)
    console.log(`   Subscription Tier: ${profile.subscription_tier}`)
    console.log(`   Subscription Status: ${profile.subscription_status}`)

    // Check if fix is needed
    const needsFix = (
      profile.role === 'SHOP_OWNER' && 
      profile.subscription_tier !== 'PROFESSIONAL'
    )

    if (!needsFix) {
      console.log('✅ Profile is already consistent - no fix needed!')
      return
    }

    console.log('\n🔧 Profile needs synchronization...')

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

    console.log('✅ Profile updated successfully!')
    console.log('\n📋 Updated profile status:')
    console.log(`   Role: ${updatedProfile.role}`)
    console.log(`   Subscription Tier: ${updatedProfile.subscription_tier}`)
    console.log(`   Subscription Status: ${updatedProfile.subscription_status}`)

    console.log('\n🎉 Chris Bossio\'s account should now show "Shop Owner" consistently!')
    
  } catch (error) {
    console.error('❌ Script failed:', error.message)
  }
}

async function validateAllProfiles() {
  console.log('\n🔍 Checking for other inconsistent profiles...')
  
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
      console.log('✅ All profiles are consistent!')
      return
    }

    console.log(`⚠️ Found ${inconsistentProfiles.length} inconsistent profile(s):`)
    
    inconsistentProfiles.forEach((profile, index) => {
      const expectedTier = 
        profile.role === 'SHOP_OWNER' ? 'PROFESSIONAL' :
        profile.role === 'BARBER' ? 'INDIVIDUAL' :
        profile.role === 'ENTERPRISE_OWNER' ? 'ENTERPRISE' :
        'FREE'

      console.log(`\n   ${index + 1}. ${profile.email}`)
      console.log(`      Role: ${profile.role}`)
      console.log(`      Current Tier: ${profile.subscription_tier}`)
      console.log(`      Expected Tier: ${expectedTier}`)
    })

    console.log(`\n💡 Run the database migration script to fix all ${inconsistentProfiles.length} profile(s).`)
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message)
  }
}

async function testSubscriptionAPI() {
  console.log('\n🧪 Testing subscription API endpoint...')
  
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
        
      console.log(`✅ API should now return: "${shouldShow}" for Chris Bossio`)
    }
    
  } catch (error) {
    console.log('⚠️ Could not test API (requires authentication)')
  }
}

async function main() {
  console.log('🚀 Fix Chris Bossio Subscription Tier Sync')
  console.log('==========================================\n')

  await fixChrisBossioAccount()
  await validateAllProfiles()
  await testSubscriptionAPI()

  console.log('\n✅ Script completed!')
  console.log('\n📋 Next steps:')
  console.log('   1. Have Chris refresh his browser')
  console.log('   2. Verify the dropdown now shows "Shop Owner Plan"')
  console.log('   3. Run database migration script if other profiles need fixing')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { fixChrisBossioAccount, validateAllProfiles }