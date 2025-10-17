#!/usr/bin/env node
/**
 * Test the updated user-locations service
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

// Simplified version of the updated service logic for testing
async function testUserLocationsService() {
  console.log('🧪 Testing Updated User-Locations Service')
  console.log('========================================\n')

  try {
    // Get Chris Bossio's profile (the owner)
    console.log('1. Getting Chris Bossio profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, shop_id, barbershop_id')
      .eq('email', 'c50bossio@gmail.com')
      .single()

    if (profileError) {
      console.log('❌ Error getting profile:', profileError.message)
      return
    }

    console.log('✅ Found profile:')
    console.log(`   - Name: ${profile.full_name}`)
    console.log(`   - Role: ${profile.role}`)
    console.log(`   - Organization ID: ${profile.organization_id}`)
    console.log(`   - Shop ID: ${profile.shop_id}`)
    console.log(`   - Barbershop ID: ${profile.barbershop_id}`)

    // Test the updated service logic
    console.log('\n2. Testing updated service logic...')
    let locations = []

    if (profile.role === 'ENTERPRISE_OWNER') {
      // Direct ownership check
      console.log('   Checking direct ownership...')
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')
        .eq('owner_id', profile.id)

      if (ownedShops?.length > 0) {
        console.log(`   ✅ Found ${ownedShops.length} directly owned shops`)
        ownedShops.forEach(shop => {
          console.log(`      - ${shop.name} (${shop.id})`)
        })
        locations.push(...ownedShops)
      }

      // Organization access check
      if (profile.organization_id) {
        console.log(`   Checking organization access: ${profile.organization_id}`)
        const { data: orgShops } = await supabase
          .from('barbershops')
          .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')
          .eq('organization_id', profile.organization_id)

        if (orgShops?.length > 0) {
          console.log(`   ✅ Found ${orgShops.length} organization shops`)
          orgShops.forEach(shop => {
            console.log(`      - ${shop.name} (${shop.id})`)
            if (!locations.some(loc => loc.id === shop.id)) {
              locations.push(shop)
              console.log(`        Added via organization access`)
            } else {
              console.log(`        Already included via direct ownership`)
            }
          })
        }
      }
    }

    console.log(`\n3. Total accessible locations: ${locations.length}`)
    const tomb45Location = locations.find(loc => loc.name === 'Tomb45 Channelside')
    
    if (tomb45Location) {
      console.log('🎉 SUCCESS: Tomb45 Channelside found!')
      console.log(`   - ID: ${tomb45Location.id}`)
      console.log(`   - Name: ${tomb45Location.name}`)
      console.log(`   - Organization: ${tomb45Location.organization_id}`)
      console.log(`   - Access method: ${locations.find(loc => loc.id === tomb45Location.id) === locations[0] ? 'Direct ownership' : 'Organization access'}`)
    } else {
      console.log('❌ FAILED: Tomb45 Channelside not found')
      console.log('   Available locations:')
      locations.forEach(loc => {
        console.log(`   - ${loc.name} (${loc.id})`)
      })
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

testUserLocationsService().catch(console.error)