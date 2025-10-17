const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Location configurations
const LOCATIONS = {
  'c5a58548-8f23-426c-bedc-49a83d238724': {
    name: 'Tomb45 Channelside',
    targetAppointments: 85
  },
  '9306d931-7ab0-45b7-88d5-599678085526': {
    name: 'Tomb45 GasWorx',
    targetAppointments: 35
  },
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890': {
    name: 'Elite Cuts LA',
    targetAppointments: 80
  }
};

// Appointment notes for variety
const APPOINTMENT_NOTES = [
  'Regular customer',
  'First time visit',
  'Referred by friend',
  'Wants to try new style',
  'Special occasion - wedding',
  'Walk-in appointment',
  'Loyalty program member',
  'Birthday celebration',
  'Prefers specific barber',
  'Needs consultation',
  null, null, null // 30% will have no notes
];

// Status distribution
const STATUS_DISTRIBUTION = {
  COMPLETED: 40,
  CONFIRMED: 45,
  PENDING: 10,
  CANCELLED: 5
};

// Time slot helpers
function getRandomTimeSlot(date) {
  const slots = [];

  // Morning slots (9 AM - 12 PM) - 30%
  for (let hour = 9; hour < 12; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push({ hour, minute, period: 'morning' });
    }
  }

  // Afternoon slots (12 PM - 3 PM) - 40%
  for (let hour = 12; hour < 15; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push({ hour, minute, period: 'afternoon' });
      slots.push({ hour, minute, period: 'afternoon' }); // Double for 40% weight
    }
  }

  // Evening slots (3 PM - 6 PM) - 30%
  for (let hour = 15; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push({ hour, minute, period: 'evening' });
    }
  }

  const slot = slots[Math.floor(Math.random() * slots.length)];
  const appointmentDate = new Date(date);
  appointmentDate.setHours(slot.hour, slot.minute, 0, 0);

  return appointmentDate;
}

function getDateRange(daysAgo, daysFromNow) {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = -daysAgo; i <= daysFromNow; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Skip Sundays
    if (date.getDay() !== 0) {
      dates.push(date);
    }
  }

  return dates;
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNote() {
  return getRandomElement(APPOINTMENT_NOTES);
}

function getStatusForDate(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);

  if (appointmentDate < today) {
    // Past appointments - mostly COMPLETED with some CANCELLED
    return Math.random() < 0.92 ? 'COMPLETED' : 'CANCELLED';
  } else if (appointmentDate.getTime() === today.getTime()) {
    // Today - mostly CONFIRMED with some PENDING
    return Math.random() < 0.85 ? 'CONFIRMED' : 'PENDING';
  } else {
    // Future - mostly CONFIRMED with few PENDING or CANCELLED
    const rand = Math.random();
    if (rand < 0.80) return 'CONFIRMED';
    if (rand < 0.95) return 'PENDING';
    return 'CANCELLED';
  }
}

function distributeServicesByName(services) {
  // Get service IDs by name pattern
  const classicHaircut = services.filter(s =>
    s.name.toLowerCase().includes('classic') ||
    (s.name.toLowerCase() === 'haircut' && !s.name.toLowerCase().includes('fade'))
  );
  const fadeHaircut = services.filter(s =>
    s.name.toLowerCase().includes('fade') || s.name.toLowerCase().includes('taper')
  );
  const beardTrim = services.filter(s =>
    (s.name.toLowerCase().includes('beard') && s.name.toLowerCase().includes('trim')) &&
    !s.name.toLowerCase().includes('combo') &&
    !s.name.toLowerCase().includes('+')
  );
  const otherServices = services.filter(s =>
    !classicHaircut.includes(s) && !fadeHaircut.includes(s) && !beardTrim.includes(s)
  );

  console.log('Service categories:');
  console.log('  Classic haircut:', classicHaircut.map(s => s.name).join(', ') || 'none');
  console.log('  Fade haircut:', fadeHaircut.map(s => s.name).join(', ') || 'none');
  console.log('  Beard trim:', beardTrim.map(s => s.name).join(', ') || 'none');
  console.log('  Other services:', otherServices.map(s => s.name).join(', ') || 'none');

  // Create weighted distribution (40% classic, 30% fade, 20% beard, 10% other)
  // But if any category is empty, redistribute to available services
  const servicePool = [];

  if (classicHaircut.length > 0) {
    for (let i = 0; i < 40; i++) servicePool.push(classicHaircut);
  }
  if (fadeHaircut.length > 0) {
    for (let i = 0; i < 30; i++) servicePool.push(fadeHaircut);
  }
  if (beardTrim.length > 0) {
    for (let i = 0; i < 20; i++) servicePool.push(beardTrim);
  }
  if (otherServices.length > 0) {
    for (let i = 0; i < 10; i++) servicePool.push(otherServices);
  }

  // If no categorization worked, just use all services equally
  if (servicePool.length === 0) {
    console.log('  Using all services with equal weight');
    for (let i = 0; i < 100; i++) {
      servicePool.push(services);
    }
  }

  return servicePool.flat();
}

async function generateAppointmentsForLocation(locationId, locationConfig) {
  console.log(`\n=== Generating appointments for ${locationConfig.name} ===`);

  // Fetch location data
  const { data: barbers } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('barbershop_id', locationId)
    .eq('role', 'BARBER');

  const { data: customers } = await supabase
    .from('customers')
    .select('id, full_name, email, phone')
    .eq('barbershop_id', locationId);

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price')
    .eq('barbershop_id', locationId);

  if (!barbers?.length || !customers?.length || !services?.length) {
    console.error(`Missing data for ${locationConfig.name}`);
    console.log(`Barbers: ${barbers?.length || 0}, Customers: ${customers?.length || 0}, Services: ${services?.length || 0}`);
    return { created: 0, errors: [] };
  }

  console.log(`Found ${barbers.length} barbers, ${customers.length} customers, ${services.length} services`);

  // Create weighted service pool
  const servicePool = distributeServicesByName(services);

  // Get date range (30 days ago to 30 days from now)
  const dates = getDateRange(30, 30);
  console.log(`Generated ${dates.length} potential dates (excluding Sundays)`);

  // Generate appointments
  const appointments = [];
  const targetCount = locationConfig.targetAppointments;
  const appointmentsPerDay = Math.ceil(targetCount / dates.length);

  // Track barber schedules to avoid overlaps
  const barberSchedules = new Map();
  barbers.forEach(barber => {
    barberSchedules.set(barber.id, new Map());
  });

  let attemptCount = 0;
  const maxAttempts = targetCount * 3; // Allow multiple attempts to avoid overlaps

  while (appointments.length < targetCount && attemptCount < maxAttempts) {
    attemptCount++;

    // Pick random date, barber, customer, service
    const date = getRandomElement(dates);
    const barber = getRandomElement(barbers);
    const customer = getRandomElement(customers);
    const service = getRandomElement(servicePool);

    if (!service) {
      console.log('No service found, skipping...');
      continue;
    }

    // Generate time slot
    const scheduledAt = getRandomTimeSlot(date);
    const scheduledTime = scheduledAt.getTime();

    // Check for barber schedule conflicts
    const dayKey = scheduledAt.toDateString();
    const barberDaySchedule = barberSchedules.get(barber.id).get(dayKey) || [];

    // Check if this time slot conflicts with existing appointments
    const hasConflict = barberDaySchedule.some(existingTime => {
      const timeDiff = Math.abs(scheduledTime - existingTime);
      const minGap = 5 * 60 * 1000; // 5 minutes minimum gap
      return timeDiff < (service.duration_minutes * 60 * 1000 + minGap);
    });

    if (hasConflict) {
      continue; // Try another time slot
    }

    // Add to schedule
    barberDaySchedule.push(scheduledTime);
    barberSchedules.get(barber.id).set(dayKey, barberDaySchedule);

    // Create appointment
    const status = getStatusForDate(date);
    const note = getRandomNote();

    const appointment = {
      id: uuidv4(),
      barbershop_id: locationId,
      barber_id: barber.id,
      client_id: null,  // NULL - customer info stored in client_name/email/phone fields
      service_id: service.id,
      scheduled_at: scheduledAt.toISOString(),
      status: status,
      duration_minutes: service.duration_minutes,
      price: service.price,
      service_price: service.price,
      total_amount: service.price,
      tip_amount: 0,
      client_name: customer.full_name,
      client_email: customer.email,
      client_phone: customer.phone,
      notes: note,
      is_test: false,
      is_recurring: false,
      created_at: new Date(scheduledAt.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Created 1 week before
      updated_at: new Date().toISOString()
    };

    appointments.push(appointment);
  }

  console.log(`Generated ${appointments.length} appointments (target: ${targetCount})`);

  // Count by status
  const statusCounts = {};
  appointments.forEach(apt => {
    statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
  });
  console.log('Status distribution:', statusCounts);

  // Insert appointments in batches
  const batchSize = 50;
  const errors = [];
  let created = 0;

  for (let i = 0; i < appointments.length; i += batchSize) {
    const batch = appointments.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('appointments')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error.message);
      errors.push({ batch: i / batchSize + 1, error: error.message });
    } else {
      created += data.length;
      console.log(`Batch ${i / batchSize + 1}: Inserted ${data.length} appointments`);
    }
  }

  return { created, errors, statusCounts };
}

async function main() {
  console.log('=== APPOINTMENT GENERATION STARTED ===');
  console.log(`Target: 150-200 total appointments across 3 locations\n`);

  const results = {};
  let totalCreated = 0;
  let totalErrors = [];

  // Generate for each location
  for (const [locationId, locationConfig] of Object.entries(LOCATIONS)) {
    const result = await generateAppointmentsForLocation(locationId, locationConfig);
    results[locationConfig.name] = result;
    totalCreated += result.created;
    totalErrors = totalErrors.concat(result.errors);
  }

  // Print summary
  console.log('\n\n=== GENERATION COMPLETE ===');
  console.log(`Total appointments created: ${totalCreated}`);
  console.log('\nBreakdown by location:');

  for (const [locationName, result] of Object.entries(results)) {
    console.log(`\n${locationName}:`);
    console.log(`  Created: ${result.created}`);
    console.log(`  Status breakdown:`, result.statusCounts);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.length}`);
    }
  }

  if (totalErrors.length > 0) {
    console.log('\n=== ERRORS ===');
    totalErrors.forEach(err => {
      console.log(`Batch ${err.batch}: ${err.error}`);
    });
  }

  // Fetch sample appointments for verification
  console.log('\n=== SAMPLE APPOINTMENTS (5 per location) ===');

  for (const locationId of Object.keys(LOCATIONS)) {
    const { data: samples } = await supabase
      .from('appointments')
      .select(`
        scheduled_at,
        status,
        price,
        client_name,
        service_id,
        barber_id,
        services!inner(name),
        profiles!inner(full_name)
      `)
      .eq('barbershop_id', locationId)
      .order('scheduled_at', { ascending: false })
      .limit(5);

    const locationName = LOCATIONS[locationId].name;
    console.log(`\n${locationName}:`);
    samples?.forEach(apt => {
      console.log(`  ${new Date(apt.scheduled_at).toLocaleString()} - ${apt.client_name || 'N/A'} - ${apt.services?.name || 'N/A'} - Barber: ${apt.profiles?.full_name || 'N/A'} - ${apt.status}`);
    });
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
