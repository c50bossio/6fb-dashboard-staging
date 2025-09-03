#!/usr/bin/env node
/**
 * Debug the actual database queries
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

async function debugQueries() {
  console.log('🔍 Debugging Database Queries')
  console.log('============================\n')

  try {
    // Get Chris Bossio's profile details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, organization_id, shop_id, barbershop_id')
      .eq('email', 'c50bossio@gmail.com')
      .single()

    if (profileError) {
      console.log('❌ Profile error:', profileError.message)
      return
    }

    console.log('Profile details:')
    console.log(`   - ID: ${profile.id}`)
    console.log(`   - Name: ${profile.full_name}`)
    console.log(`   - Role: ${profile.role}`)
    console.log(`   - Organization ID: ${profile.organization_id}`)

    // Test direct ownership query
    console.log('\n1. Testing direct ownership query...')
    const { data: ownedShops, error: ownershipError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, organization_id')
      .eq('owner_id', profile.id)

    console.log(`   Query: owner_id = '${profile.id}'`)
    if (ownershipError) {
      console.log(`   ❌ Error: ${ownershipError.message}`)
    } else {
      console.log(`   ✅ Results: ${ownedShops?.length || 0} shops found`)
      if (ownedShops?.length > 0) {
        ownedShops.forEach(shop => {
          console.log(`      - ${shop.name} (${shop.id})`)
          console.log(`        Owner: ${shop.owner_id}`)
          console.log(`        Organization: ${shop.organization_id || 'None'}`)
        })
      }
    }

    // Test organization query
    console.log('\n2. Testing organization query...')
    const { data: orgShops, error: orgError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, organization_id')
      .eq('organization_id', profile.organization_id)

    console.log(`   Query: organization_id = '${profile.organization_id}'`)
    if (orgError) {
      console.log(`   ❌ Error: ${orgError.message}`)
    } else {
      console.log(`   ✅ Results: ${orgShops?.length || 0} shops found`)
      if (orgShops?.length > 0) {
        orgShops.forEach(shop => {
          console.log(`      - ${shop.name} (${shop.id})`)
          console.log(`        Owner: ${shop.owner_id}`)
          console.log(`        Organization: ${shop.organization_id}`)
        })
      }
    }

    // Check if Tomb45 Channelside exists at all
    console.log('\n3. Direct check for Tomb45 Channelside...')
    const { data: tomb45, error: tomb45Error } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, organization_id, is_active')
      .eq('name', 'Tomb45 Channelside')
      .single()

    if (tomb45Error) {
      console.log(`   ❌ Error: ${tomb45Error.message}`)
    } else {
      console.log(`   ✅ Found: ${tomb45.name} (${tomb45.id})`)
      console.log(`      Owner: ${tomb45.owner_id}`)
      console.log(`      Organization: ${tomb45.organization_id || 'None'}`)
      console.log(`      Is Active: ${tomb45.is_active}`)
      console.log(`      Owner matches profile: ${tomb45.owner_id === profile.id}`)
      console.log(`      Organization matches profile: ${tomb45.organization_id === profile.organization_id}`)
    }

    // Check the is_active column - this might be the issue
    console.log('\n4. Checking all barbershops with owner ID...')
    const { data: allOwned, error: allOwnedError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id, organization_id, is_active')
      .eq('owner_id', profile.id)

    if (allOwnedError) {
      console.log(`   ❌ Error: ${allOwnedError.message}`)
    } else {
      console.log(`   ✅ All shops owned by user: ${allOwned?.length || 0}`)
      if (allOwned?.length > 0) {
        allOwned.forEach(shop => {
          console.log(`      - ${shop.name} (${shop.id})`)
          console.log(`        Is Active: ${shop.is_active}`)
          console.log(`        Organization: ${shop.organization_id || 'None'}`)
        })
      }
    }

  } catch (error) {
    console.error('💥 Debug failed:', error.message)
  }
}

debugQueries().catch(console.error)