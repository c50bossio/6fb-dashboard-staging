#!/usr/bin/env node

/**
 * Redistribute Barbers Across Multiple Locations
 *
 * This script redistributes the 5 seeded barbers across 3 different barbershop locations
 * for a realistic multi-location enterprise setup.
 *
 * Target Distribution:
 * - Location 1 (Tomb45 Channelside): Marcus, Tony, Demo User
 * - Location 2 (Tomb45 GasWorx): DeAndre, Carlos
 * - Location 3 (Elite Cuts LA): Jordan
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Location IDs
const LOCATIONS = {
  CHANNELSIDE: 'c5a58548-8f23-426c-bedc-49a83d238724',
  GASWORX: '9306d931-7ab0-45b7-88d5-599678085526',
  ELITE_CUTS: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
};

// Barber distribution
const DISTRIBUTION = {
  [LOCATIONS.CHANNELSIDE]: [
    'marcus.rodriguez@tomb45.com',
    'tony.johnson@tomb45.com',
    'demo@barbershop.com'
  ],
  [LOCATIONS.GASWORX]: [
    'deandre.williams@tomb45.com',
    'carlos.martinez@tomb45.com'
  ],
  [LOCATIONS.ELITE_CUTS]: [
    'jordan.smith@tomb45.com'
  ]
};

async function verifyLocationsExist() {
  console.log('\n🔍 Verifying barbershop locations exist...\n');

  const { data: locations, error } = await supabase
    .from('barbershops')
    .select('id, name, city')
    .in('id', Object.values(LOCATIONS));

  if (error) {
    console.error('❌ Error querying barbershops:', error.message);
    return false;
  }

  if (!locations || locations.length !== 3) {
    console.error(`❌ Expected 3 locations, found ${locations?.length || 0}`);
    if (locations) {
      console.log('Found locations:', locations);
    }
    return false;
  }

  console.log('✅ All 3 barbershop locations verified:');
  locations.forEach(loc => {
    console.log(`   - ${loc.name} (${loc.city}) - ID: ${loc.id}`);
  });

  return true;
}

async function getCurrentDistribution() {
  console.log('\n📊 Current barber distribution:\n');

  const { data: barbers, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, barbershop_id')
    .in('email', [
      'marcus.rodriguez@tomb45.com',
      'tony.johnson@tomb45.com',
      'demo@barbershop.com',
      'deandre.williams@tomb45.com',
      'carlos.martinez@tomb45.com',
      'jordan.smith@tomb45.com'
    ])
    .order('email');

  if (error) {
    console.error('❌ Error querying profiles:', error.message);
    return null;
  }

  if (!barbers || barbers.length === 0) {
    console.error('❌ No barbers found in profiles table');
    return null;
  }

  console.log(`Found ${barbers.length} barbers:`);
  barbers.forEach(barber => {
    console.log(`   - ${barber.full_name} (${barber.email})`);
    console.log(`     Current barbershop_id: ${barber.barbershop_id}`);
  });

  return barbers;
}

async function redistributeBarbers() {
  console.log('\n🔄 Redistributing barbers across locations...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const [locationId, emails] of Object.entries(DISTRIBUTION)) {
    console.log(`\n📍 Updating barbers for location ${locationId}:`);

    for (const email of emails) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ barbershop_id: locationId })
        .eq('email', email)
        .select('email, full_name, barbershop_id');

      if (error) {
        console.error(`   ❌ Failed to update ${email}:`, error.message);
        errorCount++;
      } else if (data && data.length > 0) {
        console.log(`   ✅ ${data[0].full_name} (${email})`);
        successCount++;
      } else {
        console.error(`   ⚠️  No profile found for ${email}`);
        errorCount++;
      }
    }
  }

  console.log(`\n📈 Update Summary:`);
  console.log(`   ✅ Successful updates: ${successCount}`);
  console.log(`   ❌ Failed updates: ${errorCount}`);

  return errorCount === 0;
}

async function verifyNewDistribution() {
  console.log('\n✅ Verifying new distribution:\n');

  // Get location names
  const { data: locations, error: locError } = await supabase
    .from('barbershops')
    .select('id, name, city')
    .in('id', Object.values(LOCATIONS));

  if (locError) {
    console.error('❌ Error querying locations:', locError.message);
    return;
  }

  const locationMap = {};
  locations.forEach(loc => {
    locationMap[loc.id] = `${loc.name} (${loc.city})`;
  });

  // Get barbers grouped by location
  for (const [locationId, expectedEmails] of Object.entries(DISTRIBUTION)) {
    const locationName = locationMap[locationId] || locationId;

    const { data: barbers, error } = await supabase
      .from('profiles')
      .select('email, full_name, barbershop_id')
      .eq('barbershop_id', locationId)
      .in('email', expectedEmails)
      .order('full_name');

    if (error) {
      console.error(`❌ Error querying ${locationName}:`, error.message);
      continue;
    }

    console.log(`📍 ${locationName}:`);
    console.log(`   Expected: ${expectedEmails.length} barbers`);
    console.log(`   Found: ${barbers?.length || 0} barbers`);

    if (barbers && barbers.length > 0) {
      barbers.forEach(barber => {
        console.log(`   - ${barber.full_name} (${barber.email})`);
      });
    }

    if (barbers?.length === expectedEmails.length) {
      console.log(`   ✅ Distribution correct\n`);
    } else {
      console.log(`   ⚠️  Distribution mismatch\n`);
    }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Redistribute Barbers Across Multiple Locations           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Verify locations exist
    const locationsExist = await verifyLocationsExist();
    if (!locationsExist) {
      console.error('\n❌ Cannot proceed: Required barbershop locations not found');
      process.exit(1);
    }

    // Step 2: Show current distribution
    const currentBarbers = await getCurrentDistribution();
    if (!currentBarbers) {
      console.error('\n❌ Cannot proceed: Failed to query current barber distribution');
      process.exit(1);
    }

    // Step 3: Redistribute barbers
    const redistributionSuccess = await redistributeBarbers();
    if (!redistributionSuccess) {
      console.error('\n⚠️  Redistribution completed with errors');
    }

    // Step 4: Verify new distribution
    await verifyNewDistribution();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  Barber Redistribution Complete                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
