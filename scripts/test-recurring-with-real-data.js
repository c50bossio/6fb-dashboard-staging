#!/usr/bin/env node

/**
 * Test recurring appointments with real database data
 */

const { createClient } = require('@supabase/supabase-js');
const { DateTime } = require('luxon');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TIMEZONE = 'America/New_York';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getTestData() {
  log('\n📊 Getting test data from database...', 'cyan');
  
  // Get a barber
  const { data: barbers } = await supabase
    .from('barbers')
    .select('*')
    .limit(1);
  
  // Get a service  
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .limit(1);
    
  // Get the first customer (we have many)
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .limit(1);
  
  if (!barbers?.length || !services?.length || !customers?.length) {
    log('❌ Missing required test data', 'red');
    log(`   Barbers: ${barbers?.length || 0}`, 'yellow');
    log(`   Services: ${services?.length || 0}`, 'yellow');
    log(`   Customers: ${customers?.length || 0}`, 'yellow');
    return null;
  }
  
  log(`✅ Found barber: ${barbers[0].name}`, 'green');
  log(`✅ Found service: ${services[0].name}`, 'green');
  log(`✅ Using customer: ${customers[0].name}`, 'green');
  
  return {
    barber: barbers[0],
    service: services[0],
    customer: customers[0]
  };
}

async function createRecurringAppointmentAt230PM(testData) {
  log('\n🕐 Creating recurring appointment at 2:30 PM...', 'cyan');
  
  // Create appointment for tomorrow at 2:30 PM
  const tomorrow = DateTime.now().setZone(TIMEZONE).plus({ days: 1 });
  const startTime = tomorrow.set({ hour: 14, minute: 30, second: 0, millisecond: 0 });
  const endTime = startTime.plus({ minutes: testData.service.duration_minutes || 60 });
  
  // Get day abbreviation
  const dayAbbr = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][startTime.weekday % 7];
  
  // Create RRule with DTSTART
  const dtstart = startTime.toUTC().toISO().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const rrule = `DTSTART:${dtstart}\nFREQ=WEEKLY;INTERVAL=1;BYDAY=${dayAbbr};COUNT=4`;
  
  const appointmentData = {
    shop_id: 'shop_001',
    barber_id: testData.barber.id,
    customer_id: testData.customer.id,
    service_id: testData.service.id,
    start_time: startTime.toUTC().toISO(),
    end_time: endTime.toUTC().toISO(),
    status: 'confirmed',
    notes: 'MIDNIGHT_BUG_TEST: Should display at 2:30 PM, not midnight',
    is_recurring: true,
    recurring_pattern: {
      frequency: 'WEEKLY',
      interval: 1,
      byweekday: [startTime.weekday % 7],
      count: 4,
      timezone: TIMEZONE,
      rrule: rrule,
      dtstart: startTime.toISO(),
      duration: `PT${testData.service.duration_minutes || 60}M`
    },
    is_test: true
  };

  log('\n📝 Appointment Details:', 'yellow');
  log(`   Time: ${startTime.toFormat('EEEE, MMMM d @ h:mm a')} ${TIMEZONE}`, 'blue');
  log(`   RRule: ${rrule}`, 'blue');
  
  const { data, error } = await supabase
    .from('bookings')
    .insert(appointmentData)
    .select()
    .single();

  if (error) {
    log(`❌ Failed to create: ${error.message}`, 'red');
    return null;
  }

  log(`✅ Created appointment ID: ${data.id}`, 'green');
  return data;
}

async function testExpansion(appointmentId) {
  log('\n🔍 Testing server-side expansion...', 'cyan');
  
  const now = DateTime.now().setZone(TIMEZONE);
  const rangeStart = now.startOf('week');
  const rangeEnd = now.plus({ weeks: 4 }).endOf('week');
  
  const response = await fetch('http://localhost:9999/api/calendar/recurring/expand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start_date: rangeStart.toISO(),
      end_date: rangeEnd.toISO(),
      shop_id: 'shop_001',
      include_single: true,
      timezone: TIMEZONE
    })
  });

  const data = await response.json();
  
  // Find our test appointments
  const testEvents = data.events?.filter(e => 
    e.extendedProps?.notes?.includes('MIDNIGHT_BUG_TEST')
  ) || [];
  
  log(`\n📅 Found ${testEvents.length} occurrences:`, 'yellow');
  
  let hasMidnightBug = false;
  let allCorrect = true;
  
  testEvents.forEach((event, i) => {
    const start = DateTime.fromISO(event.start).setZone(TIMEZONE);
    const hour = start.hour;
    const minute = start.minute;
    const display = start.toFormat('EEE MMM d @ h:mm a');
    
    if (hour === 0 && minute === 0) {
      log(`   ❌ Event ${i+1}: ${display} - MIDNIGHT BUG!`, 'red');
      hasMidnightBug = true;
      allCorrect = false;
    } else if (hour === 14 && minute === 30) {
      log(`   ✅ Event ${i+1}: ${display} - Correct (2:30 PM)`, 'green');
    } else {
      log(`   ⚠️  Event ${i+1}: ${display} - Wrong time`, 'yellow');
      allCorrect = false;
    }
  });
  
  return { hasMidnightBug, allCorrect, eventCount: testEvents.length };
}

async function testCalendarEndpoint() {
  log('\n🔍 Testing calendar appointments endpoint...', 'cyan');
  
  const now = DateTime.now().setZone(TIMEZONE);
  const rangeStart = now.startOf('week');
  const rangeEnd = now.plus({ weeks: 4 }).endOf('week');
  
  const params = new URLSearchParams({
    start_date: rangeStart.toISO(),
    end_date: rangeEnd.toISO(),
    shop_id: 'shop_001'
  });
  
  const response = await fetch(`http://localhost:9999/api/calendar/appointments?${params}`);
  const data = await response.json();
  
  const testAppts = data.appointments?.filter(a => 
    a.notes?.includes('MIDNIGHT_BUG_TEST')
  ) || [];
  
  log(`   Found ${testAppts.length} test appointments`, 'blue');
  
  testAppts.forEach(appt => {
    const start = DateTime.fromISO(appt.start_time).setZone(TIMEZONE);
    log(`   - ${start.toFormat('EEE MMM d @ h:mm a')}`, 'blue');
  });
}

async function cleanup() {
  log('\n🧹 Cleaning up test data...', 'cyan');
  
  const { error } = await supabase
    .from('bookings')
    .delete()
    .like('notes', '%MIDNIGHT_BUG_TEST%');
    
  if (!error) {
    log('✅ Cleaned up test appointments', 'green');
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('MIDNIGHT BUG VERIFICATION TEST', 'bright');
  log('='.repeat(60), 'bright');
  
  try {
    // Clean up first
    await cleanup();
    
    // Get test data
    const testData = await getTestData();
    if (!testData) {
      process.exit(1);
    }
    
    // Create test appointment at 2:30 PM
    const appointment = await createRecurringAppointmentAt230PM(testData);
    if (!appointment) {
      process.exit(1);
    }
    
    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test expansion
    const result = await testExpansion(appointment.id);
    
    // Also test regular endpoint
    await testCalendarEndpoint();
    
    // Results
    log('\n' + '='.repeat(60), 'bright');
    log('TEST RESULTS', 'bright');
    log('='.repeat(60), 'bright');
    
    if (result.hasMidnightBug) {
      log('\n❌ MIDNIGHT BUG DETECTED!', 'red');
      log('   Appointments are showing at 12:00 AM instead of 2:30 PM', 'red');
    } else if (result.allCorrect) {
      log('\n✅ SUCCESS! No midnight bug detected', 'green');
      log('   All appointments display at correct time (2:30 PM)', 'green');
    } else {
      log('\n⚠️  PARTIAL SUCCESS', 'yellow');
      log('   No midnight bug, but times may be incorrect', 'yellow');
    }
    
    // Cleanup
    await cleanup();
    
    process.exit(result.hasMidnightBug ? 1 : 0);
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    await cleanup();
    process.exit(1);
  }
}

main();