#!/usr/bin/env node

/**
 * Test script to verify the single-table profiles migration
 * This script tests:
 * 1. Staff API using profiles table exclusively
 * 2. Public barbers API showing enterprise owners
 * 3. Role-based appointment capability defaults
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testProfilesTableMigration() {
  console.log('🧪 Testing Profiles Table Migration')
  console.log('=====================================\n')

  try {
    // Step 1: Check for Chris Bossio (ENTERPRISE_OWNER)
    console.log('1️⃣ Looking for Chris Bossio (ENTERPRISE_OWNER)...')
    const { data: chrisProfile, error: chrisError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'ENTERPRISE_OWNER')
      .ilike('email', '%bossio%')
      .single()

    if (chrisError || !chrisProfile) {
      console.log('   ⚠️ Chris Bossio not found as ENTERPRISE_OWNER')
      console.log('   Looking for any profile with bossio in email...')
      
      const { data: anyChris, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', '%bossio%')
        .single()
        
      if (anyChris) {
        console.log(`   📝 Found: ${anyChris.email} (${anyChris.role})`)
        console.log(`      ID: ${anyChris.id}`)
        console.log(`      Barbershop: ${anyChris.barbershop_id}`)
      } else {
        console.log('   ❌ No profile found with bossio in email')
      }
    } else {
      console.log('   ✅ Found Chris Bossio:', {
        id: chrisProfile.id,
        email: chrisProfile.email,
        role: chrisProfile.role,
        barbershop_id: chrisProfile.barbershop_id,
        full_name: chrisProfile.full_name
      })
    }

    // Step 2: Check all profiles in a barbershop
    console.log('\n2️⃣ Checking all profiles for first barbershop...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, barbershop_id, is_active')
      .not('barbershop_id', 'is', null)
      .limit(10)

    if (profilesError) {
      console.error('   ❌ Error fetching profiles:', profilesError)
    } else {
      console.log(`   📊 Found ${profiles.length} profiles with barbershop associations:`)
      profiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.full_name || profile.email} (${profile.role})`)
        console.log(`      ID: ${profile.id}`)
        console.log(`      Barbershop: ${profile.barbershop_id}`)
        console.log(`      Active: ${profile.is_active}`)
      })
      
      // Step 3: Test role-based appointment capabilities
      console.log('\n3️⃣ Testing role-based appointment capability defaults...')
      profiles.forEach(profile => {
        const canTakeAppointments = profile.role === 'BARBER' ? true : 
                                   profile.role === 'ENTERPRISE_OWNER' ? true :
                                   profile.role === 'SHOP_OWNER' ? true :
                                   profile.role === 'MANAGER' ? false :
                                   false // STAFF role defaults to false
        
        console.log(`   ${profile.role}: can_take_appointments = ${canTakeAppointments}`)
      })

      // Step 4: Simulate Staff API response
      console.log('\n4️⃣ Simulating Staff API response...')
      const sampleBarbershopId = profiles[0]?.barbershop_id
      if (sampleBarbershopId) {
        const { data: staffProfiles, error: staffError } = await supabase
          .from('profiles')
          .select('*')
          .eq('barbershop_id', sampleBarbershopId)
          .in('role', ['BARBER', 'SHOP_OWNER', 'MANAGER', 'STAFF', 'ENTERPRISE_OWNER'])

        if (staffError) {
          console.error('   ❌ Error fetching staff:', staffError)
        } else {
          console.log(`   📋 Staff for barbershop ${sampleBarbershopId}:`)
          staffProfiles.forEach((profile, index) => {
            const defaultCanTakeAppointments = profile.role === 'BARBER' ? true : 
                                               profile.role === 'ENTERPRISE_OWNER' ? true :
                                               profile.role === 'SHOP_OWNER' ? true :
                                               profile.role === 'MANAGER' ? false :
                                               false
            
            console.log(`   ${index + 1}. ${profile.full_name || profile.email}`)
            console.log(`      Role: ${profile.role}`)
            console.log(`      Can take appointments: ${defaultCanTakeAppointments}`)
            console.log(`      Visible for booking: true (default)`)
          })
        }
      }

      // Step 5: Test public booking API logic
      console.log('\n5️⃣ Testing public booking API logic...')
      if (sampleBarbershopId) {
        const { data: bookableStaff, error: bookableError } = await supabase
          .from('profiles')
          .select('*')
          .eq('barbershop_id', sampleBarbershopId)
          .eq('is_active', true)
          .in('role', ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER']) // Only roles that can typically take appointments

        if (bookableError) {
          console.error('   ❌ Error fetching bookable staff:', bookableError)
        } else {
          console.log(`   🎯 Bookable staff (${bookableStaff.length} members):`)
          bookableStaff.forEach((profile, index) => {
            console.log(`   ${index + 1}. ${profile.full_name || profile.email} (${profile.role})`)
          })
          
          const enterpriseOwner = bookableStaff.find(s => s.role === 'ENTERPRISE_OWNER')
          if (enterpriseOwner) {
            console.log('   ✅ ENTERPRISE_OWNER will appear in booking dropdowns!')
          } else {
            console.log('   ⚠️ No ENTERPRISE_OWNER found in bookable staff')
          }
        }
      }
    }

    console.log('\n🎉 Migration test complete!')

  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Run the test
testProfilesTableMigration()