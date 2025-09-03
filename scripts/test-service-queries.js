#!/usr/bin/env node
/**
 * Test the exact queries used by the user-locations service
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testServiceQueries() {
  console.log('🧪 Testing User-Locations Service Queries')
  console.log('=========================================\n')

  const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'
  const userRole = 'ENTERPRISE_OWNER'

  try {
    // 1. Get profile (same as service)
    console.log('1. Getting user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, shop_id, barbershop_id, organization_id, full_name, email')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.log('❌ Profile error:', profileError.message)
      return
    }

    console.log('✅ Profile found:', {
      id: profile.id,
      role: profile.role,
      hasShopId: !!(profile.shop_id || profile.barbershop_id),
      hasOrgId: !!profile.organization_id
    })

    // 2. Test ENTERPRISE_OWNER direct ownership query
    console.log('\n2. Testing ENTERPRISE_OWNER direct ownership query...')
    const { data: ownedShops, error: ownedError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')
      .eq('owner_id', userId)

    if (ownedError) {
      console.log('❌ Owned shops query error:', ownedError.message)
    } else {
      console.log(`✅ Direct ownership query returned ${ownedShops.length} locations`)
      ownedShops.forEach(shop => {
        console.log(`   - ${shop.name} (${shop.id})`)
      })
    }

    // 3. Test organization-level query
    console.log('\n3. Testing organization-level query...')
    if (profile?.organization_id) {
      const { data: orgShops, error: orgError } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')
        .eq('organization_id', profile.organization_id)

      if (orgError) {
        console.log('❌ Organization query error:', orgError.message)
      } else {
        console.log(`✅ Organization query returned ${orgShops.length} locations`)
        orgShops.forEach(shop => {
          console.log(`   - ${shop.name} (${shop.id})`)
        })
      }
    } else {
      console.log('⏭️  No organization_id, skipping organization query')
    }

    // 4. Test fallback barbershop_id query
    console.log('\n4. Testing fallback barbershop_id query...')
    if (profile?.barbershop_id) {
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name, address, city, state, phone, email, business_hours, is_active, owner_id')
        .eq('id', profile.barbershop_id)
        .single()

      if (shopError) {
        console.log('❌ Fallback barbershop_id query error:', shopError.message)
      } else {
        console.log('✅ Fallback barbershop_id query found:', shopData.name)
      }
    } else {
      console.log('⏭️  No barbershop_id, skipping fallback query')
    }

    // 5. Test fallback shop_id query
    console.log('\n5. Testing fallback shop_id query...')
    if (profile?.shop_id) {
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name, address, city, state, phone, email, business_hours, is_active, owner_id')
        .eq('id', profile.shop_id)
        .single()

      if (shopError) {
        console.log('❌ Fallback shop_id query error:', shopError.message)
      } else {
        console.log('✅ Fallback shop_id query found:', shopData.name)
      }
    } else {
      console.log('⏭️  No shop_id, skipping fallback query')
    }

    // 6. Simulate the service logic
    console.log('\n6. Simulating complete service logic...')
    const locations = []
    
    // ENTERPRISE_OWNER logic
    if (userRole === 'ENTERPRISE_OWNER') {
      console.log('   Running ENTERPRISE_OWNER logic...')
      
      // Direct ownership
      if (ownedShops?.length > 0) {
        console.log(`   Adding ${ownedShops.length} directly owned shops`)
        locations.push(...ownedShops.map(location => ({
          id: location.id,
          name: location.name,
          location_status: location.is_active ? 'active' : 'inactive'
        })))
      }

      // Organization access
      if (profile?.organization_id) {
        const { data: orgShops } = await supabase
          .from('barbershops')
          .select('id, name, owner_id, address, city, state, phone, email, business_hours, is_active, organization_id')
          .eq('organization_id', profile.organization_id)

        if (orgShops?.length > 0) {
          console.log(`   Checking ${orgShops.length} organization shops for duplicates`)
          orgShops.forEach(location => {
            if (!locations.some(loc => loc.id === location.id)) {
              console.log(`   Adding organization shop: ${location.name}`)
              locations.push({
                id: location.id,
                name: location.name,
                location_status: location.is_active ? 'active' : 'inactive'
              })
            } else {
              console.log(`   Skipping duplicate: ${location.name}`)
            }
          })
        }
      }
    }

    console.log(`\n🎯 FINAL RESULT: Service should return ${locations.length} locations`)
    locations.forEach(loc => {
      console.log(`   - ${loc.name} (${loc.location_status})`)
    })

    if (locations.length === 0) {
      console.log('\n❌ BUG CONFIRMED: Service logic should find locations but returns empty array')
      console.log('This means there is a logic error in the user-locations service')
    } else {
      console.log('\n✅ Service logic works correctly in isolation')
      console.log('The issue might be in how the service is called or imported')
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
    console.error(error.stack)
  }
}

testServiceQueries().catch(console.error)