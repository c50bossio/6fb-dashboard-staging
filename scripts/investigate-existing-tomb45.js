#!/usr/bin/env node
/**
 * Investigate the existing Tomb45 Channelside barbershop
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function investigateExistingTomb45() {
  console.log('🔍 Investigating Existing Tomb45 Channelside')
  console.log('==========================================\n')

  try {
    // Find the Tomb45 Channelside barbershop
    console.log('1. Finding Tomb45 Channelside barbershop...')
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('name', 'Tomb45 Channelside')
      .single()

    if (barbershopError) {
      console.log('❌ Error finding barbershop:', barbershopError.message)
      return
    }

    console.log('✅ Found Tomb45 Channelside:')
    console.log(`   - ID: ${barbershop.id}`)
    console.log(`   - Name: ${barbershop.name}`)
    console.log(`   - Owner: ${barbershop.owner_id || 'None'}`)
    console.log(`   - Organization: ${barbershop.organization_id || 'None'}`)
    console.log(`   - Address: ${barbershop.address || 'None'}`)
    console.log(`   - City: ${barbershop.city || 'None'}`)
    console.log(`   - Status: ${barbershop.is_active ? 'Active' : 'Inactive'}`)

    // Check if it's linked to 6FB Enterprise
    console.log('\n2. Checking organization link...')
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', '6FB Enterprise')
      .single()

    if (organization) {
      console.log('✅ Found 6FB Enterprise:')
      console.log(`   - ID: ${organization.id}`)
      console.log(`   - Name: ${organization.name}`)
      console.log(`   - Owner: ${organization.owner_id}`)
      
      if (barbershop.organization_id === organization.id) {
        console.log('✅ Tomb45 Channelside is correctly linked to 6FB Enterprise')
      } else {
        console.log('⚠️  Tomb45 Channelside is NOT linked to 6FB Enterprise')
        console.log(`   Current organization: ${barbershop.organization_id || 'None'}`)
        console.log(`   Should be: ${organization.id}`)
      }
    }

    // Check owner profile
    console.log('\n3. Checking owner profile...')
    if (barbershop.owner_id) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', barbershop.owner_id)
        .single()

      if (owner) {
        console.log('✅ Owner found:')
        console.log(`   - Name: ${owner.full_name || 'No name'}`)
        console.log(`   - Email: ${owner.email}`)
        console.log(`   - Role: ${owner.role}`)
        console.log(`   - Organization: ${owner.organization_id || 'None'}`)
        console.log(`   - Shop ID: ${owner.shop_id || 'None'}`)
        console.log(`   - Barbershop ID: ${owner.barbershop_id || 'None'}`)
      } else {
        console.log('❌ Owner profile not found')
      }
    }

    // Test the user-locations service with current user
    console.log('\n4. Testing user-locations service...')
    
    // Find an appropriate test user
    const { data: testUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, shop_id, barbershop_id')
      .in('role', ['ENTERPRISE_OWNER', 'SHOP_OWNER', 'SUPER_ADMIN'])
      .limit(3)

    if (testUsers?.length > 0) {
      console.log('   Found test users:')
      testUsers.forEach(user => {
        console.log(`   - ${user.full_name || 'No name'} (${user.email}) - ${user.role}`)
      })

      // Test with the first user
      const testUser = testUsers[0]
      console.log(`\n   Testing with: ${testUser.full_name || testUser.email}`)

      // Simulate what the user-locations service does
      let userLocations = []

      if (['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(testUser.role)) {
        // Check if user owns barbershops directly
        const { data: ownedShops } = await supabase
          .from('barbershops')
          .select('id, name, owner_id, organization_id')
          .eq('owner_id', testUser.id)

        if (ownedShops?.length > 0) {
          userLocations.push(...ownedShops)
          console.log(`   Found ${ownedShops.length} owned barbershops`)
        }

        // Check organization access
        if (testUser.organization_id) {
          const { data: orgShops } = await supabase
            .from('barbershops')
            .select('id, name, owner_id, organization_id')
            .eq('organization_id', testUser.organization_id)

          if (orgShops?.length > 0) {
            console.log(`   Found ${orgShops.length} organization barbershops`)
            // Add only those not already included
            orgShops.forEach(shop => {
              if (!userLocations.some(loc => loc.id === shop.id)) {
                userLocations.push(shop)
              }
            })
          }
        }

        // Check fallback - shop_id or barbershop_id in profile
        if (userLocations.length === 0 && (testUser.shop_id || testUser.barbershop_id)) {
          const shopId = testUser.shop_id || testUser.barbershop_id
          const { data: fallbackShop } = await supabase
            .from('barbershops')
            .select('id, name, owner_id, organization_id')
            .eq('id', shopId)
            .single()

          if (fallbackShop) {
            userLocations.push(fallbackShop)
            console.log(`   Found fallback barbershop: ${fallbackShop.name}`)
          }
        }
      }

      console.log(`\n   Total locations accessible: ${userLocations.length}`)
      userLocations.forEach(loc => {
        console.log(`   - ${loc.name} (${loc.id})`)
        if (loc.id === barbershop.id) {
          console.log('     ✅ This is Tomb45 Channelside!')
        }
      })

      if (!userLocations.some(loc => loc.id === barbershop.id)) {
        console.log('\n   ❌ Tomb45 Channelside is NOT accessible by this user')
        console.log('   This explains why it doesn\'t appear in location management!')
      }
    }

    console.log('\n5. Diagnosis and recommendations:')
    
    const issues = []
    
    if (!barbershop.organization_id) {
      issues.push('Tomb45 Channelside is not linked to 6FB Enterprise')
    }
    
    if (!barbershop.owner_id) {
      issues.push('Tomb45 Channelside has no owner')
    } else {
      // Check if owner has the right role
      const { data: owner } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', barbershop.owner_id)
        .single()
        
      if (owner && !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(owner.role)) {
        issues.push(`Owner role is ${owner.role}, needs ENTERPRISE_OWNER or SUPER_ADMIN`)
      }
      
      if (owner && owner.organization_id !== barbershop.organization_id) {
        issues.push('Owner organization_id does not match barbershop organization_id')
      }
    }

    if (issues.length > 0) {
      console.log('\n   Issues found:')
      issues.forEach(issue => console.log(`   ❌ ${issue}`))
    } else {
      console.log('\n   ✅ Configuration looks correct')
      console.log('   The issue might be in the user-locations service logic')
    }

  } catch (error) {
    console.error('💥 Investigation failed:', error.message)
  }
}

investigateExistingTomb45().catch(console.error)