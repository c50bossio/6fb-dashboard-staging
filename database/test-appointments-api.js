#!/usr/bin/env node

/**
 * Test Appointments API
 * Verifies appointments are loading correctly after API fix
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Location IDs
const LOCATIONS = {
  channelside: { id: 'c5a58548-8f23-426c-bedc-49a83d238724', name: 'Tomb45 Channelside' },
  gasworx: { id: '9306d931-7ab0-45b7-88d5-599678085526', name: 'Tomb45 GasWorx' },
  elitecuts: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Elite Cuts LA' }
};

async function testAppointmentsAPI() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  TESTING APPOINTMENTS API');
  console.log('═══════════════════════════════════════════════════════\n');

  for (const [key, location] of Object.entries(LOCATIONS)) {
    console.log(`\n📍 Testing ${location.name}...\n`);

    // Test the API query with correct join
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:customers(id, full_name, email, phone),
        barber:profiles!appointments_barber_id_fkey(id, email, full_name),
        service:services(id, name, description, duration_minutes, price, category),
        barbershop:barbershops(id, name, address, phone)
      `)
      .eq('barbershop_id', location.id)
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (error) {
      console.error(`❌ Error loading appointments: ${error.message}`);
      continue;
    }

    console.log(`✅ Loaded ${appointments.length} appointments (showing first 5)`);

    if (appointments.length > 0) {
      console.log('\nSample Appointments:');
      appointments.forEach((appt, idx) => {
        const clientName = appt.client?.full_name || appt.client_name || 'Walk-in';
        const barberName = appt.barber?.full_name || 'Unknown Barber';
        const serviceName = appt.service?.name || 'Unknown Service';
        const time = new Date(appt.scheduled_at).toLocaleString();

        console.log(`\n  ${idx + 1}. ${clientName} → ${serviceName}`);
        console.log(`     Barber: ${barberName}`);
        console.log(`     Time: ${time}`);
        console.log(`     Status: ${appt.status}`);
      });
    } else {
      console.log('⚠️  No appointments found for this location');
    }
  }

  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('  TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
}

testAppointmentsAPI();
