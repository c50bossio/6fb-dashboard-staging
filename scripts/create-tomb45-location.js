#!/usr/bin/env node
/**
 * Create Tomb45 Channelside location and link to 6FB Enterprise
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

async function createTomb45Location() {
  console.log('🏗️  Creating Tomb45 Channelside Location Setup')
  console.log('=============================================\n')

  try {
    // Step 1: Check/Create 6FB Enterprise organization
    console.log('1. Checking for 6FB Enterprise organization...')
    let { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, tier')
      .ilike('name', '%6FB Enterprise%')
      .maybeSingle()

    if (orgError && orgError.code !== 'PGRST116') {
      console.log('❌ Error checking organizations:', orgError.message)
      return
    }

    if (!organization) {
      console.log('   Creating 6FB Enterprise organization...')
      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert({
          name: '6FB Enterprise',
          tier: 'enterprise',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createOrgError) {
        console.log('❌ Error creating organization:', createOrgError.message)
        return
      }

      organization = newOrg
      console.log(`✅ Created organization: ${organization.name} (${organization.id})`)
    } else {
      console.log(`✅ Found organization: ${organization.name} (${organization.id})`)
    }

    // Step 2: Find or create an enterprise owner user
    console.log('\n2. Checking for enterprise owner user...')
    let { data: enterpriseOwner } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'ENTERPRISE_OWNER')
      .limit(1)
      .maybeSingle()

    if (!enterpriseOwner) {
      console.log('   No ENTERPRISE_OWNER found. Looking for SUPER_ADMIN...')
      const { data: superAdmin } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('role', 'SUPER_ADMIN')
        .limit(1)
        .maybeSingle()

      if (superAdmin) {
        console.log(`   Using SUPER_ADMIN as owner: ${superAdmin.full_name} (${superAdmin.email})`)
        enterpriseOwner = superAdmin
      } else {
        console.log('⚠️  No suitable owner found. Creating barbershop without owner.')
      }
    } else {
      console.log(`✅ Found owner: ${enterpriseOwner.full_name} (${enterpriseOwner.email})`)
    }

    // Step 3: Create Tomb45 Channelside barbershop
    console.log('\n3. Creating Tomb45 Channelside barbershop...')
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .insert({
        id: TOMB45_ID,
        name: 'Tomb45 Channelside',
        address: '2223 N Westshore Blvd',
        city: 'Tampa',
        state: 'FL',
        zip_code: '33607',
        phone: '+1 (813) 555-0123',
        email: 'tomb45channelside@6fbmentorship.com',
        owner_id: enterpriseOwner?.id || null,
        organization_id: organization.id,
        location_status: 'active',
        business_hours: JSON.stringify({
          monday: { open: '9:00 AM', close: '7:00 PM' },
          tuesday: { open: '9:00 AM', close: '7:00 PM' },
          wednesday: { open: '9:00 AM', close: '7:00 PM' },
          thursday: { open: '9:00 AM', close: '7:00 PM' },
          friday: { open: '9:00 AM', close: '8:00 PM' },
          saturday: { open: '8:00 AM', close: '6:00 PM' },
          sunday: { open: '10:00 AM', close: '5:00 PM' }
        }),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (barbershopError) {
      console.log('❌ Error creating barbershop:', barbershopError.message)
      return
    }

    console.log('✅ Created Tomb45 Channelside:')
    console.log(`   - Name: ${barbershop.name}`)
    console.log(`   - ID: ${barbershop.id}`)
    console.log(`   - Address: ${barbershop.address}, ${barbershop.city}, ${barbershop.state}`)
    console.log(`   - Phone: ${barbershop.phone}`)
    console.log(`   - Owner: ${enterpriseOwner?.full_name || 'None'}`)
    console.log(`   - Organization: ${organization.name}`)
    console.log(`   - Status: ${barbershop.location_status}`)

    // Step 4: Update owner profile if needed
    if (enterpriseOwner) {
      console.log('\n4. Updating owner profile...')
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          organization_id: organization.id,
          barbershop_id: barbershop.id,
          shop_id: barbershop.id
        })
        .eq('id', enterpriseOwner.id)

      if (updateError) {
        console.log('⚠️  Warning: Could not update owner profile:', updateError.message)
      } else {
        console.log('✅ Updated owner profile with barbershop and organization links')
      }
    }

    console.log('\n✅ Tomb45 Channelside setup complete!')
    console.log('\n📝 Summary:')
    console.log(`   - Organization: ${organization.name} (${organization.id})`)
    console.log(`   - Barbershop: ${barbershop.name} (${barbershop.id})`)
    console.log(`   - Owner: ${enterpriseOwner?.full_name || 'None'}`)
    console.log(`   - Status: ${barbershop.location_status}`)
    console.log('\n🎉 The location should now appear in both the context selector and location management!')

  } catch (error) {
    console.error('💥 Setup failed:', error.message)
  }
}

createTomb45Location().catch(console.error)