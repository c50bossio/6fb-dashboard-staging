#!/usr/bin/env node

/**
 * Generate realistic appointment records for 3 barbershop locations
 *
 * Target: ~150-200 total appointments distributed across 3 locations
 * - Tomb45 Channelside: 60 appointments (3 barbers)
 * - Tomb45 GasWorx: 50 appointments (2 barbers)
 * - Elite Cuts LA: 65 appointments (1 barber, very busy)
 *
 * CRITICAL: Uses customer_id (nullable) - respects walk-in appointments
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Location configurations
const LOCATIONS = [
  {
    id: 'c5a58548-8f23-426c-bedc-49a83d238724',
    name: 'Tomb45 Channelside',
    targetAppointments: 60,
    expectedBarbers: 3
  },
  {
    id: '9306d931-7ab0-45b7-88d5-599678085526',
    name: 'Tomb45 GasWorx',
    targetAppointments: 50,
    expectedBarbers: 2
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Elite Cuts LA',
    targetAppointments: 65,
    expectedBarbers: 1
  }
];

// Appointment statuses with time-based logic
const STATUSES = {
  COMPLETED: 'COMPLETED',
  CONFIRMED: 'CONFIRMED',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED'
};

// Appointment notes for variety
const APPOINTMENT_NOTES = [
  'Regular customer - preferred style',
  'First time visit',
  'Referred by friend',
  'Wants to try new style',
  'Special occasion - wedding',
  'Walk-in appointment',
  'Loyalty program member',
  'Birthday celebration',
  'Prefers specific barber',
  'Needs consultation first',
  'Customer requested early appointment',
  'Running late - texted',
  null, null, null, null // 40% will have no notes
];

/**
 * Get status based on appointment date
 */
function getStatusForDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);

  if (appointmentDate < today) {
    // Past appointments - 95% COMPLETED, 5% CANCELLED
    return Math.random() < 0.95 ? STATUSES.COMPLETED : STATUSES.CANCELLED;
  } else if (appointmentDate.getTime() === today.getTime()) {
    // Today - 85% CONFIRMED, 15% PENDING
    return Math.random() < 0.85 ? STATUSES.CONFIRMED : STATUSES.PENDING;
  } else {
    // Future - 90% CONFIRMED, 8% PENDING, 2% CANCELLED
    const rand = Math.random();
    if (rand < 0.90) return STATUSES.CONFIRMED;
    if (rand < 0.98) return STATUSES.PENDING;
    return STATUSES.CANCELLED;
  }
}

/**
 * Generate business hours time slot
 * Distribution: Morning 30%, Afternoon 40%, Evening 30%
 */
function getRandomTimeSlot(date) {
  const rand = Math.random();
  let hour, minute;

  if (rand < 0.30) {
    // Morning (9 AM - 12 PM) - 30%
    hour = 9 + Math.floor(Math.random() * 3);
    minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  } else if (rand < 0.70) {
    // Afternoon (12 PM - 3 PM) - 40%
    hour = 12 + Math.floor(Math.random() * 3);
    minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  } else {
    // Evening (3 PM - 6 PM) - 30%
    hour = 15 + Math.floor(Math.random() * 3);
    minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
  }

  const appointmentDate = new Date(date);
  appointmentDate.setHours(hour, minute, 0, 0);
  return appointmentDate;
}

/**
 * Get date range (past 30 days, today, next 30 days)
 */
function getDateRange() {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Past 30 days + today + next 30 days = 61 days
  for (let i = -30; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Skip Sundays (most barbershops closed)
    if (date.getDay() !== 0) {
      dates.push(date);
    }
  }

  return dates;
}

/**
 * Get random element from array
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Distribute services by category
 * Classic Haircut: 40%, Fade Haircut: 30%, Beard Trim: 20%, Other: 10%
 */
function createServicePool(services) {
  const pool = [];

  // Categorize services
  const classic = services.filter(s =>
    s.name.toLowerCase().includes('classic') ||
    (s.name.toLowerCase().includes('haircut') && !s.name.toLowerCase().includes('fade'))
  );
  const fade = services.filter(s =>
    s.name.toLowerCase().includes('fade') || s.name.toLowerCase().includes('taper')
  );
  const beard = services.filter(s =>
    s.name.toLowerCase().includes('beard') &&
    s.name.toLowerCase().includes('trim') &&
    !s.name.toLowerCase().includes('combo')
  );
  const other = services.filter(s =>
    !classic.includes(s) && !fade.includes(s) && !beard.includes(s)
  );

  // Build weighted pool
  if (classic.length > 0) {
    for (let i = 0; i < 40; i++) pool.push(...classic);
  }
  if (fade.length > 0) {
    for (let i = 0; i < 30; i++) pool.push(...fade);
  }
  if (beard.length > 0) {
    for (let i = 0; i < 20; i++) pool.push(...beard);
  }
  if (other.length > 0) {
    for (let i = 0; i < 10; i++) pool.push(...other);
  }

  // Fallback: if pool is empty, use all services equally
  if (pool.length === 0) {
    pool.push(...services);
  }

  return pool;
}

/**
 * Check if time slot conflicts with existing appointments
 */
function hasTimeConflict(scheduledTime, durationMinutes, existingTimes) {
  const endTime = scheduledTime + (durationMinutes * 60 * 1000);

  for (const existingTime of existingTimes) {
    const existingEnd = existingTime.end;

    // Check for any overlap
    if (
      (scheduledTime >= existingTime.start && scheduledTime < existingEnd) ||
      (endTime > existingTime.start && endTime <= existingEnd) ||
      (scheduledTime <= existingTime.start && endTime >= existingEnd)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Create customer pattern - some customers have multiple appointments
 */
function assignCustomersToAppointments(appointments, customers) {
  // Customer types: Regular (60%), Occasional (30%), New/Walk-in (10%)
  const regularCustomers = customers.slice(0, Math.floor(customers.length * 0.6));
  const occasionalCustomers = customers.slice(
    regularCustomers.length,
    regularCustomers.length + Math.floor(customers.length * 0.3)
  );

  // Assign customers to appointments with realistic patterns
  appointments.forEach(apt => {
    const rand = Math.random();

    if (rand < 0.60 && regularCustomers.length > 0) {
      // Regular customer - pick from regular pool
      const customer = getRandomElement(regularCustomers);
      apt.client_id = null; // Not registered users
      apt.client_name = customer.full_name;
      apt.client_email = customer.email;
      apt.client_phone = customer.phone;
    } else if (rand < 0.90 && occasionalCustomers.length > 0) {
      // Occasional customer
      const customer = getRandomElement(occasionalCustomers);
      apt.client_id = null;
      apt.client_name = customer.full_name;
      apt.client_email = customer.email;
      apt.client_phone = customer.phone;
    } else {
      // Walk-in (no customer record) - 10%
      apt.client_id = null;
      apt.client_name = `Walk-in Customer ${Math.floor(Math.random() * 1000)}`;
      apt.client_email = null;
      apt.client_phone = null;
      apt.notes = apt.notes || 'Walk-in customer';
    }
  });

  return appointments;
}

/**
 * Generate appointments for a single location
 */
async function generateAppointmentsForLocation(location) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📍 ${location.name}`);
  console.log(`${'='.repeat(60)}`);

  // Fetch location data
  console.log('🔍 Fetching barbers, customers, and services...');

  const [barbersResult, customersResult, servicesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('barbershop_id', location.id)
      .eq('role', 'BARBER'),

    supabase
      .from('customers')
      .select('id, full_name, email, phone')
      .eq('barbershop_id', location.id),

    supabase
      .from('services')
      .select('id, name, duration_minutes, price')
      .eq('barbershop_id', location.id)
  ]);

  const barbers = barbersResult.data || [];
  const customers = customersResult.data || [];
  const services = servicesResult.data || [];

  // Validation
  if (barbers.length === 0) {
    console.error(`❌ No barbers found for ${location.name}`);
    return { created: 0, errors: ['No barbers found'], statusCounts: {} };
  }

  if (customers.length === 0) {
    console.error(`❌ No customers found for ${location.name}`);
    return { created: 0, errors: ['No customers found'], statusCounts: {} };
  }

  if (services.length === 0) {
    console.error(`❌ No services found for ${location.name}`);
    return { created: 0, errors: ['No services found'], statusCounts: {} };
  }

  console.log(`✅ Found ${barbers.length} barbers, ${customers.length} customers, ${services.length} services`);
  console.log('   Barbers:', barbers.map(b => b.full_name).join(', '));

  // Create service pool with proper distribution
  const servicePool = createServicePool(services);

  // Get date range
  const dates = getDateRange();
  console.log(`📅 Date range: ${dates.length} days (excluding Sundays)`);

  // Generate appointments with conflict avoidance
  const appointments = [];
  const barberSchedules = new Map(); // Track barber schedules by day

  // Initialize barber schedules
  barbers.forEach(barber => {
    barberSchedules.set(barber.id, new Map());
  });

  const targetCount = location.targetAppointments;
  let attemptCount = 0;
  const maxAttempts = targetCount * 5; // Allow multiple attempts

  console.log(`🎯 Target: ${targetCount} appointments`);
  console.log('⏳ Generating appointments with conflict checking...');

  while (appointments.length < targetCount && attemptCount < maxAttempts) {
    attemptCount++;

    // Pick random date, barber, service
    const date = getRandomElement(dates);
    const barber = getRandomElement(barbers);
    const service = getRandomElement(servicePool);

    if (!service) continue;

    // Generate time slot
    const scheduledAt = getRandomTimeSlot(date);
    const scheduledTime = scheduledAt.getTime();
    const dayKey = scheduledAt.toDateString();

    // Get barber's schedule for this day
    const barberDaySchedule = barberSchedules.get(barber.id).get(dayKey) || [];

    // Check for conflicts
    if (hasTimeConflict(scheduledTime, service.duration_minutes, barberDaySchedule)) {
      continue; // Try again
    }

    // Add to schedule
    barberDaySchedule.push({
      start: scheduledTime,
      end: scheduledTime + (service.duration_minutes * 60 * 1000)
    });
    barberSchedules.get(barber.id).set(dayKey, barberDaySchedule);

    // Create appointment
    const status = getStatusForDate(date);
    const note = getRandomElement(APPOINTMENT_NOTES);

    appointments.push({
      id: uuidv4(),
      barbershop_id: location.id,
      barber_id: barber.id,
      client_id: null, // Will be assigned later (or remain null for walk-ins)
      service_id: service.id,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: service.duration_minutes,
      status: status,
      price: service.price,
      service_price: service.price,
      total_amount: service.price,
      tip_amount: 0,
      client_name: null, // Will be assigned later
      client_email: null,
      client_phone: null,
      notes: note,
      is_test: false,
      is_recurring: false,
      created_at: new Date(scheduledTime - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week before
      updated_at: new Date().toISOString()
    });

    // Progress indicator
    if (appointments.length % 10 === 0) {
      process.stdout.write(`\r   Progress: ${appointments.length}/${targetCount} appointments`);
    }
  }

  console.log(`\n✅ Generated ${appointments.length} appointments`);

  // Assign customers with realistic patterns
  console.log('👥 Assigning customers (60% regular, 30% occasional, 10% walk-in)...');
  assignCustomersToAppointments(appointments, customers);

  // Count walk-ins
  const walkIns = appointments.filter(a => !a.client_name || a.client_name.includes('Walk-in')).length;
  console.log(`   Walk-ins: ${walkIns} (${((walkIns / appointments.length) * 100).toFixed(1)}%)`);

  // Count by status
  const statusCounts = {};
  appointments.forEach(apt => {
    statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
  });

  console.log('📊 Status distribution:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    const percentage = ((count / appointments.length) * 100).toFixed(1);
    console.log(`   ${status}: ${count} (${percentage}%)`);
  });

  // Insert appointments in batches
  console.log('💾 Inserting appointments into database...');
  const batchSize = 20;
  const errors = [];
  let created = 0;

  for (let i = 0; i < appointments.length; i += batchSize) {
    const batch = appointments.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('appointments')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
      errors.push({ batch: Math.floor(i / batchSize) + 1, error: error.message });
    } else {
      created += data.length;
      console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1}: Inserted ${data.length} appointments`);
    }
  }

  return { created, errors, statusCounts, walkIns };
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 APPOINTMENT GENERATION SYSTEM');
  console.log('='.repeat(60));
  console.log('Target: 150-200 total appointments across 3 locations');
  console.log('Time Range: Past 30 days + Today + Next 30 days');
  console.log('Business Hours: 9 AM - 6 PM (excluding Sundays)');
  console.log('='.repeat(60));

  const results = {};
  let totalCreated = 0;
  let totalErrors = [];
  let totalWalkIns = 0;

  // Generate for each location
  for (const location of LOCATIONS) {
    const result = await generateAppointmentsForLocation(location);
    results[location.name] = result;
    totalCreated += result.created;
    totalErrors = totalErrors.concat(result.errors || []);
    totalWalkIns += result.walkIns || 0;
  }

  // Print comprehensive summary
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`\n📊 Total Appointments Created: ${totalCreated}`);
  console.log(`🚶 Total Walk-ins: ${totalWalkIns} (${((totalWalkIns / totalCreated) * 100).toFixed(1)}%)`);

  console.log('\n📍 Breakdown by Location:\n');
  for (const [locationName, result] of Object.entries(results)) {
    console.log(`${locationName}:`);
    console.log(`  • Created: ${result.created} appointments`);
    console.log(`  • Walk-ins: ${result.walkIns || 0}`);
    console.log(`  • Status breakdown:`);
    Object.entries(result.statusCounts || {}).forEach(([status, count]) => {
      console.log(`    - ${status}: ${count}`);
    });
    if (result.errors && result.errors.length > 0) {
      console.log(`  ⚠️  Errors: ${result.errors.length}`);
    }
    console.log('');
  }

  if (totalErrors.length > 0) {
    console.log('='.repeat(60));
    console.log('⚠️  ERRORS ENCOUNTERED');
    console.log('='.repeat(60));
    totalErrors.forEach(err => {
      console.log(`Batch ${err.batch}: ${err.error}`);
    });
  }

  // Verify in database
  console.log('='.repeat(60));
  console.log('🔍 VERIFICATION');
  console.log('='.repeat(60));

  for (const location of LOCATIONS) {
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', location.id);

    if (error) {
      console.log(`❌ ${location.name}: Error verifying - ${error.message}`);
    } else {
      console.log(`✅ ${location.name}: ${count} appointments in database`);
    }
  }

  // Calendar density metrics
  console.log('\n' + '='.repeat(60));
  console.log('📅 CALENDAR DENSITY METRICS');
  console.log('='.repeat(60));

  for (const location of LOCATIONS) {
    const { data: barbersCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', location.id)
      .eq('role', 'BARBER');

    const { count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', location.id);

    const avgPerBarber = barbersCount?.count
      ? (appointmentsCount / barbersCount.count).toFixed(1)
      : 'N/A';

    console.log(`${location.name}:`);
    console.log(`  • Barbers: ${barbersCount?.count || 0}`);
    console.log(`  • Total Appointments: ${appointmentsCount || 0}`);
    console.log(`  • Avg per Barber: ${avgPerBarber}`);
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('✨ DONE - Appointments ready for calendar!');
  console.log('='.repeat(60));
}

// Execute
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
