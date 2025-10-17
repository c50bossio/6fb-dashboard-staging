#!/usr/bin/env node

/**
 * Upgrade c50bossio@gmail.com to Enterprise Level
 * This script upgrades the user from SHOP_OWNER/free to ENTERPRISE_OWNER/ENTERPRISE
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TARGET_EMAIL = 'c50bossio@gmail.com'

async function upgradeToEnterprise() {
  console.log('🚀 Starting Enterprise Upgrade Process...')
  console.log(`📧 Target User: ${TARGET_EMAIL}`)
  
  try {
    // Step 1: Get current user data
    console.log('\n📊 Step 1: Fetching current user data...')
    
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', TARGET_EMAIL)
      .single()
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message)
      return
    }
    
    if (!currentProfile) {
      console.error('❌ User profile not found!')
      return
    }

    console.log('✅ Current profile found:')
    console.log(`   - ID: ${currentProfile.id}`)
    console.log(`   - Role: ${currentProfile.role}`)
    console.log(`   - Subscription Tier: ${currentProfile.subscription_tier}`)
    console.log(`   - Status: ${currentProfile.subscription_status}`)

    // Step 2: Update profile to ENTERPRISE_OWNER
    console.log('\n🔄 Step 2: Updating profile to ENTERPRISE_OWNER...')
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'ENTERPRISE_OWNER',
        subscription_tier: 'ENTERPRISE',
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', currentProfile.id)
    
    if (updateError) {
      console.error('❌ Error updating profile:', updateError.message)
      return
    }
    
    console.log('✅ Profile updated successfully')

    // Step 3: Check for existing organization
    console.log('\n🏢 Step 3: Checking for existing organization...')
    
    const { data: existingOrg, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', currentProfile.id)
      .maybeSingle()
    
    if (orgError && orgError.code !== 'PGRST116') {
      console.error('❌ Error checking organization:', orgError.message)
      return
    }

    let organizationId = existingOrg?.id

    // Step 4: Create organization if needed
    if (!existingOrg) {
      console.log('🆕 Step 4: Creating new organization...')
      
      const orgName = currentProfile.business_name || currentProfile.full_name 
        ? `${currentProfile.full_name || 'Bossio'} Enterprise`
        : 'Bossio Enterprise'

      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          owner_id: currentProfile.id,
          name: orgName,
          description: 'Enterprise Organization',
          settings: JSON.stringify({ 
            subscription_tier: 'ENTERPRISE',
            subscription_status: 'active'
          })
        })
        .select()
        .single()
      
      if (createOrgError) {
        console.error('❌ Error creating organization:', createOrgError.message)
        return
      }
      
      organizationId = newOrg.id
      console.log(`✅ Organization created: ${orgName} (ID: ${organizationId})`)
    } else {
      console.log(`✅ Existing organization found: ${existingOrg.name} (ID: ${organizationId})`)
      
      // Update existing organization to enterprise
      const { error: updateOrgError } = await supabase
        .from('organizations')
        .update({
          description: 'Enterprise Organization',
          settings: JSON.stringify({ 
            subscription_tier: 'ENTERPRISE',
            subscription_status: 'active'
          })
        })
        .eq('id', organizationId)
      
      if (updateOrgError) {
        console.error('❌ Error updating organization:', updateOrgError.message)
        return
      }
      
      console.log('✅ Organization updated to ENTERPRISE tier')
    }

    // Step 5: Check and update barbershop
    console.log('\n💈 Step 5: Checking barbershop setup...')
    
    const { data: existingShop, error: shopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('owner_id', currentProfile.id)
      .maybeSingle()
    
    if (shopError && shopError.code !== 'PGRST116') {
      console.error('❌ Error checking barbershop:', shopError.message)
      return
    }

    let barbershopId = existingShop?.id

    if (!existingShop) {
      // Create barbershop
      const shopName = currentProfile.business_name || currentProfile.full_name 
        ? `${currentProfile.full_name || 'Bossio'}'s Barbershop`
        : 'Bossio Enterprise Barbershop'

      const { data: newShop, error: createShopError } = await supabase
        .from('barbershops')
        .insert({
          owner_id: currentProfile.id,
          organization_id: organizationId,
          name: shopName,
          email: currentProfile.email,
          phone: currentProfile.phone || '',
          booking_enabled: true,
          online_booking_enabled: true,
          website_enabled: true
        })
        .select()
        .single()
      
      if (createShopError) {
        console.error('❌ Error creating barbershop:', createShopError.message)
        return
      }
      
      barbershopId = newShop.id
      console.log(`✅ Barbershop created: ${shopName} (ID: ${barbershopId})`)
    } else {
      // Update existing barbershop
      const { error: updateShopError } = await supabase
        .from('barbershops')
        .update({
          organization_id: organizationId
        })
        .eq('id', existingShop.id)
      
      if (updateShopError) {
        console.error('❌ Error updating barbershop:', updateShopError.message)
        return
      }
      
      console.log(`✅ Barbershop updated: ${existingShop.name} (ID: ${barbershopId})`)
    }

    // Step 6: Update profile with barbershop_id if needed
    if (!currentProfile.barbershop_id && barbershopId) {
      console.log('\n🔗 Step 6: Linking barbershop to profile...')
      
      const { error: linkError } = await supabase
        .from('profiles')
        .update({ 
          barbershop_id: barbershopId,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProfile.id)
      
      if (linkError) {
        console.error('❌ Error linking barbershop:', linkError.message)
        return
      }
      
      console.log('✅ Barbershop linked to profile')
    }

    // Step 7: Final verification
    console.log('\n✅ Step 7: Final verification...')
    
    const { data: finalProfile, error: finalError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', TARGET_EMAIL)
      .single()
    
    if (finalError) {
      console.error('❌ Error verifying final profile:', finalError.message)
      return
    }

    const { data: finalOrg, error: finalOrgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', finalProfile.id)
      .single()
    
    if (finalOrgError) {
      console.error('❌ Error verifying organization:', finalOrgError.message)
      return
    }

    console.log('\n🎉 ENTERPRISE UPGRADE COMPLETE!')
    console.log('='.repeat(50))
    console.log('📊 Updated Profile:')
    console.log(`   - Email: ${finalProfile.email}`)
    console.log(`   - Role: ${finalProfile.role}`)
    console.log(`   - Subscription Tier: ${finalProfile.subscription_tier}`)
    console.log(`   - Status: ${finalProfile.subscription_status}`)
    console.log(`   - Barbershop ID: ${finalProfile.barbershop_id}`)
    
    console.log('\n🏢 Organization:')
    console.log(`   - ID: ${finalOrg.id}`)
    console.log(`   - Name: ${finalOrg.name}`)
    console.log(`   - Description: ${finalOrg.description}`)
    console.log(`   - Settings: ${finalOrg.settings}`)

    console.log('\n🚀 Enterprise Features Enabled:')
    console.log('   ✅ Unlimited locations')
    console.log('   ✅ Unlimited reviews per month')
    console.log('   ✅ Unlimited export frequency')
    console.log('   ✅ 365-day analytics history')
    console.log('   ✅ Enterprise dashboard access')
    console.log('   ✅ Multi-location management')
    console.log('   ✅ Advanced analytics')
    console.log('   ✅ AI insights')
    console.log('   ✅ Custom branding')
    console.log('   ✅ Full API access')
    
    console.log('\n💡 Next Steps:')
    console.log('   1. Have user refresh browser/logout-login')
    console.log('   2. Verify UI shows "Enterprise" in dropdown')
    console.log('   3. Test enterprise features are accessible')
    console.log('   4. Check dashboard shows enterprise options')

  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
    console.error('Stack trace:', error.stack)
  }
}

// Run the upgrade
console.log('🔧 Bossio Enterprise Upgrade Tool')
console.log('================================')

upgradeToEnterprise()
  .then(() => {
    console.log('\n✅ Upgrade process completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })