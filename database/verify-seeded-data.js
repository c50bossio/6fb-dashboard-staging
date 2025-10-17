#!/usr/bin/env node

/**
 * Database Verification Script
 * Confirms data integrity after multi-location seeding
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

async function verifyBarberDistribution() {
  console.log('\n📍 BARBER DISTRIBUTION VERIFICATION\n');

  let totalBarbers = 0;
  const distribution = {};

  for (const [key, location] of Object.entries(LOCATIONS)) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('barbershop_id', location.id)
      .in('role', ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER']);

    if (error) {
      console.error(`❌ Error querying ${location.name}:`, error.message);
      continue;
    }

    distribution[location.name] = data.length;
    totalBarbers += data.length;

    console.log(`✓ ${location.name}: ${data.length} staff`);
    data.forEach(barber => {
      console.log(`  - ${barber.full_name || barber.email} (${barber.role})`);
    });
  }

  console.log(`\n✅ Total Staff Across All Locations: ${totalBarbers}`);
  return { totalBarbers, distribution };
}

async function verifyCustomerDistribution() {
  console.log('\n👥 CUSTOMER DISTRIBUTION VERIFICATION\n');

  let totalCustomers = 0;
  const distribution = {};

  for (const [key, location] of Object.entries(LOCATIONS)) {
    const { count, error } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', location.id);

    if (error) {
      console.error(`❌ Error counting customers at ${location.name}:`, error.message);
      continue;
    }

    distribution[location.name] = count;
    totalCustomers += count;

    console.log(`✓ ${location.name}: ${count} customers`);
  }

  console.log(`\n✅ Total Customers Across All Locations: ${totalCustomers}`);
  return { totalCustomers, distribution };
}

async function verifyAppointmentDistribution() {
  console.log('\n📅 APPOINTMENT DISTRIBUTION VERIFICATION\n');

  let totalAppointments = 0;
  const distribution = {};
  const now = new Date().toISOString();

  for (const [key, location] of Object.entries(LOCATIONS)) {
    // Total count
    const { count: total, error: totalError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', location.id);

    if (totalError) {
      console.error(`❌ Error counting appointments at ${location.name}:`, totalError.message);
      continue;
    }

    // Past appointments
    const { count: past } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', location.id)
      .lt('appointment_time', now);

    // Future appointments
    const { count: future } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', location.id)
      .gte('appointment_time', now);

    // Status breakdown
    const { data: statusData } = await supabase
      .from('appointments')
      .select('status')
      .eq('barbershop_id', location.id);

    const statusCounts = statusData.reduce((acc, { status }) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    distribution[location.name] = { total, past, future, statusCounts };
    totalAppointments += total;

    console.log(`✓ ${location.name}: ${total} appointments`);
    console.log(`  - Past: ${past} (${((past/total)*100).toFixed(1)}%)`);
    console.log(`  - Future: ${future} (${((future/total)*100).toFixed(1)}%)`);
    console.log(`  - Status breakdown:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    • ${status}: ${count} (${((count/total)*100).toFixed(1)}%)`);
    });
  }

  console.log(`\n✅ Total Appointments Across All Locations: ${totalAppointments}`);
  return { totalAppointments, distribution };
}

async function verifyForeignKeyIntegrity() {
  console.log('\n🔗 FOREIGN KEY INTEGRITY VERIFICATION\n');

  const checks = [];

  // Check appointments → barbers
  const { data: orphanedBarberAppts, error: barberError } = await supabase
    .from('appointments')
    .select('id, barber_id')
    .not('barber_id', 'is', null);

  if (!barberError && orphanedBarberAppts) {
    const barberIds = [...new Set(orphanedBarberAppts.map(a => a.barber_id))];
    const { data: validBarbers } = await supabase
      .from('profiles')
      .select('id')
      .in('id', barberIds);

    const validBarberIds = new Set(validBarbers.map(b => b.id));
    const orphaned = orphanedBarberAppts.filter(a => !validBarberIds.has(a.barber_id));

    if (orphaned.length === 0) {
      console.log('✓ All appointments have valid barber_id references');
      checks.push({ check: 'Barber FK', status: 'PASS', orphaned: 0 });
    } else {
      console.log(`❌ Found ${orphaned.length} appointments with invalid barber_id`);
      checks.push({ check: 'Barber FK', status: 'FAIL', orphaned: orphaned.length });
    }
  }

  // Check appointments → customers (client_id can be null for walk-ins)
  const { data: customerAppts, error: customerError } = await supabase
    .from('appointments')
    .select('id, client_id')
    .not('client_id', 'is', null);

  if (!customerError && customerAppts) {
    const customerIds = [...new Set(customerAppts.map(a => a.client_id))];
    const { data: validCustomers } = await supabase
      .from('customers')
      .select('id')
      .in('id', customerIds);

    const validCustomerIds = new Set(validCustomers.map(c => c.id));
    const orphaned = customerAppts.filter(a => !validCustomerIds.has(a.client_id));

    if (orphaned.length === 0) {
      console.log('✓ All appointments have valid client_id references (when not null)');
      checks.push({ check: 'Customer FK', status: 'PASS', orphaned: 0 });
    } else {
      console.log(`❌ Found ${orphaned.length} appointments with invalid client_id`);
      checks.push({ check: 'Customer FK', status: 'FAIL', orphaned: orphaned.length });
    }
  }

  // Check appointments → services
  const { data: serviceAppts, error: serviceError } = await supabase
    .from('appointments')
    .select('id, service_id')
    .not('service_id', 'is', null);

  if (!serviceError && serviceAppts) {
    const serviceIds = [...new Set(serviceAppts.map(a => a.service_id))];
    const { data: validServices } = await supabase
      .from('services')
      .select('id')
      .in('id', serviceIds);

    const validServiceIds = new Set(validServices.map(s => s.id));
    const orphaned = serviceAppts.filter(a => !validServiceIds.has(a.service_id));

    if (orphaned.length === 0) {
      console.log('✓ All appointments have valid service_id references');
      checks.push({ check: 'Service FK', status: 'PASS', orphaned: 0 });
    } else {
      console.log(`❌ Found ${orphaned.length} appointments with invalid service_id`);
      checks.push({ check: 'Service FK', status: 'FAIL', orphaned: orphaned.length });
    }
  }

  const allPassed = checks.every(c => c.status === 'PASS');
  console.log(allPassed ? '\n✅ All Foreign Key Integrity Checks Passed' : '\n❌ Some Foreign Key Checks Failed');

  return { checks, allPassed };
}

async function verifyCalendarDensity() {
  console.log('\n📊 CALENDAR DENSITY METRICS\n');

  const metrics = {};

  for (const [key, location] of Object.entries(LOCATIONS)) {
    // Get barber count
    const { count: barberCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', location.id)
      .in('role', ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER']);

    // Get appointment count
    const { count: apptCount } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', location.id);

    const avgPerBarber = barberCount > 0 ? (apptCount / barberCount).toFixed(1) : 0;
    const dailyAvg = barberCount > 0 ? ((apptCount / 60) / barberCount).toFixed(1) : 0; // 60-day window

    metrics[location.name] = {
      barbers: barberCount,
      appointments: apptCount,
      avgPerBarber,
      dailyAvgPerBarber: dailyAvg
    };

    console.log(`✓ ${location.name}:`);
    console.log(`  - Barbers: ${barberCount}`);
    console.log(`  - Appointments: ${apptCount}`);
    console.log(`  - Avg per barber: ${avgPerBarber}`);
    console.log(`  - Daily avg per barber: ${dailyAvg} appointments/day`);
  }

  console.log('\n✅ Calendar Density Analysis Complete');
  return metrics;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  MULTI-LOCATION DATABASE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════');

  try {
    const barberResults = await verifyBarberDistribution();
    const customerResults = await verifyCustomerDistribution();
    const appointmentResults = await verifyAppointmentDistribution();
    const integrityResults = await verifyForeignKeyIntegrity();
    const densityResults = await verifyCalendarDensity();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`✅ Total Staff: ${barberResults.totalBarbers}`);
    console.log(`✅ Total Customers: ${customerResults.totalCustomers}`);
    console.log(`✅ Total Appointments: ${appointmentResults.totalAppointments}`);
    console.log(`${integrityResults.allPassed ? '✅' : '❌'} Foreign Key Integrity: ${integrityResults.allPassed ? 'PASS' : 'FAIL'}`);

    if (integrityResults.allPassed) {
      console.log('\n🎉 ALL VERIFICATION CHECKS PASSED! Database is ready for testing.\n');
    } else {
      console.log('\n⚠️  Some verification checks failed. Review output above for details.\n');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();
