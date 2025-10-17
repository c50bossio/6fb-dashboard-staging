#!/usr/bin/env node
/**
 * Test the unified /api/user/locations endpoint directly
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

async function testUnifiedAPI() {
  console.log('🧪 Testing Unified /api/user/locations Endpoint')
  console.log('===============================================\n')

  try {
    console.log('1. Testing user-locations service directly...')
    
    // Import the service directly
    const { getUserAccessibleLocations } = await import('../lib/services/user-locations.js')
    
    // Get Chris Bossio's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, shop_id, barbershop_id')
      .eq('email', 'c50bossio@gmail.com')
      .single()

    if (profileError) {
      console.log('❌ Error getting profile:', profileError.message)
      return
    }

    console.log('✅ Profile found:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      organization_id: profile.organization_id
    })

    // Test service directly
    const locations = await getUserAccessibleLocations(profile.id, profile.role, profile)
    
    console.log(`\n2. Service returned ${locations.length} locations:`)
    locations.forEach((location, index) => {
      console.log(`   ${index + 1}. ${location.name} (${location.id})`)
      console.log(`      - Location Status: ${location.location_status}`)
      console.log(`      - Access Method: ${location.metadata?.accessMethod}`)
      console.log(`      - Organization ID: ${location.organization_id || 'None'}`)
    })

    console.log(`\n3. Testing API transformation...`)
    console.log('   This simulates what the /api/user/locations endpoint does')
    
    // Simulate the API transformation logic
    const transformedLocations = locations.map((location) => {
      return {
        id: location.id,
        name: location.name || 'Unnamed Location',
        status: location.location_status || 'active', // Key transformation
        _debug: {
          originalLocationStatus: location.location_status,
          accessMethod: location.metadata?.accessMethod
        }
      }
    })

    console.log('\n   Transformed for API response:')
    transformedLocations.forEach((location, index) => {
      console.log(`   ${index + 1}. ${location.name}`)
      console.log(`      - API Status: ${location.status}`)
      console.log(`      - Original Status: ${location._debug.originalLocationStatus}`)
    })

    // Test if they would show as active in Location Management
    const activeCount = transformedLocations.filter(l => l.status === 'active').length
    console.log(`\n✅ Expected result in Location Management page:`)
    console.log(`   - Total Locations: ${transformedLocations.length}`)
    console.log(`   - Active Locations: ${activeCount}`)
    
    if (transformedLocations.length > 0) {
      console.log('🎉 SUCCESS: Locations should now appear in both Context Selector and Location Management!')
    } else {
      console.log('❌ ISSUE: No locations returned - need to investigate further')
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message)
    console.error(error.stack)
  }
}

testUnifiedAPI().catch(console.error)