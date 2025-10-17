#!/usr/bin/env node
/**
 * Debug the service field selection issue
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

async function debugServiceFields() {
  console.log('🔍 Debugging Service Field Selection')
  console.log('==================================\n')

  try {
    // Get Chris Bossio's profile details
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id')
      .eq('email', 'c50bossio@gmail.com')
      .single()

    console.log(`Profile ID: ${profile.id}`)
    console.log(`Organization ID: ${profile.organization_id}`)

    // Test the exact query from the updated service
    console.log('\n1. Testing exact service query (direct ownership)...')
    const { data: serviceQuery1, error: error1 } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, address, city, state, phone, email, business_hours, location_status, organization_id')
      .eq('owner_id', profile.id)

    console.log('   Query fields: id, name, owner_id, address, city, state, phone, email, business_hours, location_status, organization_id')
    if (error1) {
      console.log(`   ❌ Error: ${error1.message}`)
    } else {
      console.log(`   ✅ Results: ${serviceQuery1?.length || 0} shops`)
      if (serviceQuery1?.length > 0) {
        serviceQuery1.forEach(shop => {
          console.log(`      - ${shop.name}`)
          console.log(`        location_status: ${shop.location_status || 'null'}`)
          console.log(`        organization_id: ${shop.organization_id || 'null'}`)
        })
      }
    }

    // Check what the location_status field actually contains
    console.log('\n2. Checking location_status field...')
    const { data: statusCheck, error: statusError } = await supabase
      .from('barbershops')
      .select('id, name, location_status')
      .eq('name', 'Tomb45 Channelside')
      .single()

    if (statusError) {
      console.log(`   ❌ Error: ${statusError.message}`)
      console.log('   This field might not exist! Let me check available columns...')
      
      // Try to get all columns to see what's available
      const { data: allColumns, error: allError } = await supabase
        .from('barbershops')
        .select('*')
        .eq('name', 'Tomb45 Channelside')
        .single()
      
      if (allError) {
        console.log(`   ❌ Error getting all columns: ${allError.message}`)
      } else {
        console.log('   Available columns:')
        Object.keys(allColumns).forEach(key => {
          console.log(`      - ${key}: ${allColumns[key]}`)
        })
      }
    } else {
      console.log(`   ✅ location_status: ${statusCheck.location_status || 'null'}`)
    }

    // Test if we can run the query without the problematic field
    console.log('\n3. Testing query without location_status...')
    const { data: simpleQuery, error: simpleError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, address, city, state, phone, email, business_hours, organization_id')
      .eq('owner_id', profile.id)

    if (simpleError) {
      console.log(`   ❌ Error: ${simpleError.message}`)
    } else {
      console.log(`   ✅ Results: ${simpleQuery?.length || 0} shops`)
      if (simpleQuery?.length > 0) {
        simpleQuery.forEach(shop => {
          console.log(`      - ${shop.name}`)
          console.log(`        organization_id: ${shop.organization_id || 'null'}`)
        })
      }
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message)
  }
}

debugServiceFields().catch(console.error)