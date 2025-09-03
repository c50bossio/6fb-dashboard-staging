#!/usr/bin/env node
/**
 * Diagnostic script to investigate Tomb45 Channelside location issue
 * This script will help us understand why it appears in context selector but not location management
 */

import { createServiceRoleClient } from '../lib/supabase/UNIFIED_CLIENT.js'

const TOMB45_ID = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'

async function investigateTomb45Location() {
  console.log('🔍 Investigating Tomb45 Channelside Location Issue')
  console.log('================================================')
  
  const supabase = await createServiceRoleClient()
  
  try {
    // Step 1: Check if Tomb45 Channelside exists in barbershops table
    console.log('\n1. Checking barbershops table for Tomb45 Channelside...')
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
      console.log('❌ Tomb45 Channelside not found in barbershops table with ID:', TOMB45_ID)
      
      // Check if it exists with a different name/ID
      console.log('\n   Searching for any "Tomb45" barbershops...')
      const { data: tomb45Shops } = await supabase
        .from('barbershops')
        .select('id, name, owner_id, organization_id, created_at')
        .ilike('name', '%tomb45%')
      
      if (tomb45Shops && tomb45Shops.length > 0) {
        console.log('   Found Tomb45 locations:')
        tomb45Shops.forEach(shop => {
          console.log(`   - ${shop.name} (${shop.id}) - Owner: ${shop.owner_id}`)
        })
      } else {
        console.log('   No Tomb45 locations found in database')
      }
      return
    }
    
    console.log('✅ Found Tomb45 Channelside:')
    console.log(`   - ID: ${barbershop.id}`)
    console.log(`   - Name: ${barbershop.name}`)
    console.log(`   - Owner: ${barbershop.owner_id}`)
    console.log(`   - Organization: ${barbershop.organization_id || 'Not linked'}`)
    console.log(`   - Status: ${barbershop.location_status || 'No status set'}`)
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
        console.log(`✅ Linked to organization: ${org.name} (${org.tier})`)
      } else {
        console.log('❌ Organization ID exists but organization not found')
      }
    } else {
      console.log('⚠️  Not linked to any organization')
      
      // Check if 6FB Enterprise exists
      const { data: enterprises } = await supabase
        .from('organizations')
        .select('id, name, tier')
        .ilike('name', '%6FB%')
      
      if (enterprises && enterprises.length > 0) {
        console.log('   Available organizations:')
        enterprises.forEach(org => {
          console.log(`   - ${org.name} (${org.id}) - ${org.tier}`)
        })
      }
    }
    
    // Step 3: Check owner profile
    console.log('\n3. Checking owner profile...')
    if (barbershop.owner_id) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, organization_id, shop_id, barbershop_id')
        .eq('id', barbershop.owner_id)
        .single()
      
      if (owner) {
        console.log('✅ Owner profile found:')
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
      console.log('⚠️  No owner_id set for this barbershop')
    }
    
    // Step 4: Test user-locations service
    console.log('\n4. Testing user-locations service...')
    
    if (barbershop.owner_id) {
      // Dynamically import the service
      const { getUserAccessibleLocations } = await import('../lib/services/user-locations.js')
      
      const locations = await getUserAccessibleLocations(
        barbershop.owner_id, 
        'ENTERPRISE_OWNER', 
        { 
          shop_id: barbershop.id, 
          barbershop_id: barbershop.id,
          organization_id: barbershop.organization_id 
        }
      )
      
      console.log(`   Service returned ${locations.length} locations for owner`)
      if (locations.length > 0) {
        locations.forEach(loc => {
          console.log(`   - ${loc.name} (${loc.id})`)
        })
      }
      
      // Test with SUPER_ADMIN role
      const adminLocations = await getUserAccessibleLocations(
        barbershop.owner_id,
        'SUPER_ADMIN',
        { 
          shop_id: barbershop.id, 
          barbershop_id: barbershop.id,
          organization_id: barbershop.organization_id 
        }
      )
      
      console.log(`   Service returned ${adminLocations.length} locations for SUPER_ADMIN`)
    }
    
    // Step 5: Check API endpoint directly
    console.log('\n5. Recommendations:')
    if (!barbershop.organization_id) {
      console.log('⚠️  ISSUE: Tomb45 Channelside is not linked to 6FB Enterprise organization')
      console.log('   Fix: Run the organization linking SQL script')
    }
    
    if (barbershop.owner_id) {
      const { data: owner } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', barbershop.owner_id)
        .single()
      
      if (owner && !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(owner.role)) {
        console.log(`⚠️  ISSUE: Owner role is ${owner.role}, but location management requires ENTERPRISE_OWNER or SUPER_ADMIN`)
        console.log('   Fix: Update owner role or adjust permission logic')
      }
    }
    
    console.log('\n✅ Investigation complete!')
    
  } catch (error) {
    console.error('💥 Investigation failed:', error)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  investigateTomb45Location()
}

export { investigateTomb45Location }