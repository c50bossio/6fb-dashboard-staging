#!/usr/bin/env node
/**
 * Direct database investigation for Tomb45 Channelside location issue
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TOMB45_ID = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function investigateTomb45() {
  console.log('🔍 Investigating Tomb45 Channelside Location')
  console.log('===========================================\n')

  try {
    // Step 1: Check if Tomb45 Channelside exists
    console.log('1. Checking for Tomb45 Channelside in barbershops table...')
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', TOMB45_ID)
      .maybeSingle()

    if (barbershopError) {
      console.log('❌ Error querying barbershops:', barbershopError.message)
      return
    }

    if (!barbershop) {
      console.log('❌ Tomb45 Channelside not found with expected ID:', TOMB45_ID)
      
      // Search for any Tomb45 locations
      const { data: tomb45Locations } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, organization_id, location_status')
        .ilike('name', '%tomb45%')
      
      if (tomb45Locations?.length > 0) {
        console.log('\n   Found other Tomb45 locations:')
        tomb45Locations.forEach(loc => {
          console.log(`   - ${loc.name} (${loc.id})`)
          console.log(`     Owner: ${loc.owner_id || 'None'}`)
          console.log(`     Organization: ${loc.organization_id || 'None'}`)
          console.log(`     Status: ${loc.location_status || 'None'}\n`)
        })
      } else {
        console.log('   No Tomb45 locations found in database')
      }
      return
    }

    console.log('✅ Found Tomb45 Channelside:')
    console.log(`   - Name: ${barbershop.name}`)
    console.log(`   - ID: ${barbershop.id}`)
    console.log(`   - Owner: ${barbershop.owner_id || 'None'}`)
    console.log(`   - Organization: ${barbershop.organization_id || 'None'}`)
    console.log(`   - Status: ${barbershop.location_status || 'active'}`)
    console.log(`   - Created: ${barbershop.created_at}`)

    // Step 2: Check organization relationship
    console.log('\n2. Checking organization relationship...')
    if (barbershop.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, tier')
        .eq('id', barbershop.organization_id)
        .single()

      if (org) {
        console.log(`✅ Linked to: ${org.name} (${org.tier})`)
      } else {
        console.log('❌ Organization ID exists but organization not found')
      }
    } else {
      console.log('⚠️  Not linked to any organization')
      
      // Check for 6FB Enterprise
      const { data: enterprises } = await supabase
        .from('organizations')
        .select('id, name, tier')
        .ilike('name', '%6FB%')
      
      console.log('\n   Available organizations:')
      if (enterprises?.length > 0) {
        enterprises.forEach(org => {
          console.log(`   - ${org.name} (${org.id}) - ${org.tier}`)
        })
      } else {
        console.log('   No organizations found matching "6FB"')
      }
    }

    // Step 3: Check owner profile if exists
    console.log('\n3. Checking owner profile...')
    if (barbershop.owner_id) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, organization_id, shop_id, barbershop_id')
        .eq('id', barbershop.owner_id)
        .single()

      if (owner) {
        console.log('✅ Owner found:')
        console.log(`   - Name: ${owner.full_name}`)
        console.log(`   - Email: ${owner.email}`)
        console.log(`   - Role: ${owner.role}`)
        console.log(`   - Shop ID: ${owner.shop_id || 'None'}`)
        console.log(`   - Barbershop ID: ${owner.barbershop_id || 'None'}`)
        console.log(`   - Organization ID: ${owner.organization_id || 'None'}`)
      } else {
        console.log('❌ Owner profile not found')
      }
    } else {
      console.log('⚠️  No owner assigned to this barbershop')
    }

    // Step 4: Check for any current user profiles that might have access
    console.log('\n4. Checking for users who should have access...')
    const { data: enterpriseOwners } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, shop_id, barbershop_id')
      .eq('role', 'ENTERPRISE_OWNER')

    if (enterpriseOwners?.length > 0) {
      console.log(`   Found ${enterpriseOwners.length} ENTERPRISE_OWNER users:`)
      enterpriseOwners.forEach(user => {
        console.log(`   - ${user.full_name} (${user.email})`)
        console.log(`     Organization: ${user.organization_id || 'None'}`)
        console.log(`     Shop: ${user.shop_id || user.barbershop_id || 'None'}\n`)
      })
    }

    // Step 5: Recommendations
    console.log('5. Recommendations:')
    const issues = []
    
    if (!barbershop.organization_id) {
      issues.push('❌ Tomb45 Channelside is not linked to an organization')
    }
    
    if (!barbershop.owner_id) {
      issues.push('❌ Tomb45 Channelside has no owner assigned')
    }

    if (issues.length > 0) {
      console.log('\n   Issues found:')
      issues.forEach(issue => console.log(`   ${issue}`))
      
      console.log('\n   Suggested fixes:')
      if (!barbershop.organization_id) {
        console.log('   1. Link Tomb45 Channelside to 6FB Enterprise organization')
      }
      if (!barbershop.owner_id) {
        console.log('   2. Assign an ENTERPRISE_OWNER as the owner')
      }
    } else {
      console.log('   ✅ All relationships appear correct')
      console.log('   The issue may be in the user-locations service logic')
    }

    console.log('\n✅ Investigation complete!')

  } catch (error) {
    console.error('💥 Investigation failed:', error.message)
  }
}

investigateTomb45().catch(console.error)