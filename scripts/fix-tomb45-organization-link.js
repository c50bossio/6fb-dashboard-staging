#!/usr/bin/env node
/**
 * Fix the organization link for Tomb45 Channelside
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

async function fixTomb45OrganizationLink() {
  console.log('🔧 Fixing Tomb45 Channelside Organization Link')
  console.log('============================================\n')

  try {
    // Step 1: Get the current barbershop and organization info
    console.log('1. Getting current barbershop info...')
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, organization_id')
      .eq('name', 'Tomb45 Channelside')
      .single()

    if (barbershopError) {
      console.log('❌ Error finding barbershop:', barbershopError.message)
      return
    }

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, owner_id')
      .eq('name', '6FB Enterprise')
      .single()

    if (orgError) {
      console.log('❌ Error finding organization:', orgError.message)
      return
    }

    console.log('✅ Current state:')
    console.log(`   - Barbershop: ${barbershop.name} (${barbershop.id})`)
    console.log(`   - Owner: ${barbershop.owner_id}`)
    console.log(`   - Current organization: ${barbershop.organization_id || 'None'}`)
    console.log(`   - Target organization: ${organization.name} (${organization.id})`)

    // Step 2: Update the barbershop to link it to the organization
    console.log('\n2. Linking barbershop to organization...')
    const { error: updateError } = await supabase
      .from('barbershops')
      .update({
        organization_id: organization.id
      })
      .eq('id', barbershop.id)

    if (updateError) {
      console.log('❌ Error updating barbershop:', updateError.message)
      return
    }

    console.log('✅ Successfully linked Tomb45 Channelside to 6FB Enterprise')

    // Step 3: Verify the update
    console.log('\n3. Verifying the update...')
    const { data: updatedBarbershop, error: verifyError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, organization_id')
      .eq('id', barbershop.id)
      .single()

    if (verifyError) {
      console.log('❌ Error verifying update:', verifyError.message)
      return
    }

    if (updatedBarbershop.organization_id === organization.id) {
      console.log('✅ Verification successful:')
      console.log(`   - Barbershop: ${updatedBarbershop.name}`)
      console.log(`   - Organization: ${organization.name}`)
      console.log(`   - Link established: ${updatedBarbershop.organization_id}`)
    } else {
      console.log('❌ Verification failed - organization_id not updated')
      return
    }

    // Step 4: Test the user-locations service logic
    console.log('\n4. Testing user-locations service logic...')
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id')
      .eq('id', barbershop.owner_id)
      .single()

    if (ownerError) {
      console.log('⚠️  Could not get owner info for testing')
    } else {
      console.log(`   Testing with owner: ${owner.full_name} (${owner.role})`)
      
      // Simulate the user-locations service query
      let foundLocations = []
      
      // Direct ownership
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('id, name, organization_id')
        .eq('owner_id', owner.id)
      
      if (ownedShops?.length > 0) {
        foundLocations.push(...ownedShops)
        console.log(`   ✅ Found ${ownedShops.length} directly owned locations`)
      }
      
      // Organization access
      if (owner.organization_id) {
        const { data: orgShops } = await supabase
          .from('barbershops')
          .select('id, name, organization_id')
          .eq('organization_id', owner.organization_id)
        
        if (orgShops?.length > 0) {
          console.log(`   ✅ Found ${orgShops.length} organization locations`)
          orgShops.forEach(shop => {
            if (!foundLocations.some(loc => loc.id === shop.id)) {
              foundLocations.push(shop)
            }
          })
        }
      }
      
      console.log(`   Total accessible locations: ${foundLocations.length}`)
      foundLocations.forEach(loc => {
        console.log(`   - ${loc.name} (${loc.id})`)
        if (loc.id === barbershop.id) {
          console.log('     🎉 This is Tomb45 Channelside!')
        }
      })
      
      if (foundLocations.some(loc => loc.id === barbershop.id)) {
        console.log('\n✅ SUCCESS: Tomb45 Channelside is now accessible!')
      } else {
        console.log('\n❌ Still not accessible - may need service logic update')
      }
    }

    console.log('\n🎉 Fix Complete!')
    console.log('================')
    console.log('Summary of changes:')
    console.log(`- Linked Tomb45 Channelside (${barbershop.id})`)
    console.log(`- To 6FB Enterprise (${organization.id})`)
    console.log('- Owner already has ENTERPRISE_OWNER role')
    console.log('- Location should now appear in both context selector and location management')

  } catch (error) {
    console.error('💥 Fix failed:', error.message)
  }
}

fixTomb45OrganizationLink().catch(console.error)