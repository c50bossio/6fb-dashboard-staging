#!/usr/bin/env node

/**
 * Test to verify recurring appointments display at correct times (not midnight)
 * This specifically tests the midnight bug where appointments show at 12:00 AM
 */

const { createClient } = require('@supabase/supabase-js');
const { DateTime } = require('luxon');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TIMEZONE = 'America/New_York';
const TEST_BARBER_ID = 'barber_001';
const TEST_CUSTOMER_ID = 'customer_test_001';
const TEST_SERVICE_ID = 'service_001';
const TEST_SHOP_ID = 'shop_001';

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

async function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestRecurringAppointment() {
  log('\n🧪 Creating test recurring appointment at 2:30 PM...', 'cyan');
  
  // Create appointment for tomorrow at 2:30 PM
  const tomorrow = DateTime.now().setZone(TIMEZONE).plus({ days: 1 });
  const startTime = tomorrow.set({ hour: 14, minute: 30, second: 0, millisecond: 0 });
  const endTime = startTime.plus({ hours: 1 });
  
  const appointmentData = {
    shop_id: TEST_SHOP_ID,
    barber_id: TEST_BARBER_ID,
    customer_id: TEST_CUSTOMER_ID,
    service_id: TEST_SERVICE_ID,
    start_time: startTime.toUTC().toISO(),
    end_time: endTime.toUTC().toISO(),
    status: 'confirmed',
    notes: 'TEST: Verifying time display - should be at 2:30 PM',
    is_recurring: true,
    recurring_pattern: {
      frequency: 'WEEKLY',
      interval: 1,
      byweekday: [startTime.weekday % 7], // 0=Sunday, 1=Monday, etc.
      count: 4,
      timezone: TIMEZONE,
      rrule: `FREQ=WEEKLY;INTERVAL=1;BYDAY=${getDayAbbr(startTime.weekday)};COUNT=4`,
      dtstart: startTime.toISO(),
      duration: 'PT1H'
    },
    is_test: true
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert(appointmentData)
    .select()
    .single();

  if (error) {
    log(`❌ Failed to create appointment: ${error.message}`, 'red');
    return null;
  }

  log(`✅ Created recurring appointment with ID: ${data.id}`, 'green');
  log(`   Scheduled for: ${startTime.toFormat('EEEE, MMMM d, yyyy @ h:mm a')} ${TIMEZONE}`, 'blue');
  log(`   Repeats: Weekly on ${startTime.toFormat('EEEE')}s for 4 weeks`, 'blue');
  
  return data;
}

async function verifyAppointmentDisplay(appointmentId) {
  log('\n🔍 Verifying appointment display times...', 'cyan');
  
  // Fetch the appointment directly
  const { data: appointment, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (error || !appointment) {
    log(`❌ Failed to fetch appointment: ${error?.message}`, 'red');
    return false;
  }

  // Check stored times
  const storedStart = DateTime.fromISO(appointment.start_time, { zone: 'UTC' });
  const localStart = storedStart.setZone(TIMEZONE);
  
  log('\n📊 Time Analysis:', 'yellow');
  log(`   Stored (UTC): ${storedStart.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`, 'blue');
  log(`   Local Time: ${localStart.toFormat('yyyy-MM-dd hh:mm a')} ${TIMEZONE}`, 'blue');
  
  // Check the RRule
  if (appointment.recurring_pattern?.rrule) {
    log('\n📅 RRule Analysis:', 'yellow');
    log(`   RRule: ${appointment.recurring_pattern.rrule}`, 'blue');
    
    // Check if DTSTART is present and correct
    if (appointment.recurring_pattern.rrule.includes('DTSTART')) {
      log('   ✅ DTSTART is present in RRule', 'green');
    } else {
      log('   ⚠️  DTSTART is missing from RRule', 'yellow');
    }
    
    // Check if duration is set
    if (appointment.recurring_pattern.duration) {
      log(`   Duration: ${appointment.recurring_pattern.duration}`, 'blue');
    }
  }

  // Test via the expand endpoint
  log('\n🔄 Testing server-side expansion...', 'cyan');
  
  const now = DateTime.now().setZone(TIMEZONE);
  const rangeStart = now.startOf('week');
  const rangeEnd = now.endOf('week').plus({ weeks: 3 });
  
  const response = await fetch('http://localhost:9999/api/calendar/recurring/expand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      start_date: rangeStart.toISO(),
      end_date: rangeEnd.toISO(),
      shop_id: TEST_SHOP_ID,
      include_single: true,
      timezone: TIMEZONE
    })
  });

  if (!response.ok) {
    log(`❌ Failed to expand recurring events: ${response.statusText}`, 'red');
    return false;
  }

  const expandData = await response.json();
  const testEvents = expandData.events.filter(e => 
    e.extendedProps?.appointmentId === appointmentId ||
    e.extendedProps?.notes?.includes('TEST: Verifying time display')
  );

  log(`\n📋 Expanded Events (Found ${testEvents.length}):`, 'yellow');
  
  let hasMidnightBug = false;
  
  testEvents.forEach((event, index) => {
    const eventStart = DateTime.fromISO(event.start);
    const displayTime = eventStart.toFormat('EEEE, MMM d @ h:mm a');
    const hour = eventStart.hour;
    const minute = eventStart.minute;
    
    // Check if this is showing at midnight (0:00)
    if (hour === 0 && minute === 0) {
      log(`   ❌ Event ${index + 1}: ${displayTime} - MIDNIGHT BUG DETECTED!`, 'red');
      hasMidnightBug = true;
    } else if (hour === 14 && minute === 30) {
      log(`   ✅ Event ${index + 1}: ${displayTime} - Correct time (2:30 PM)`, 'green');
    } else {
      log(`   ⚠️  Event ${index + 1}: ${displayTime} - Unexpected time`, 'yellow');
    }
  });

  return !hasMidnightBug;
}

async function cleanupTestData() {
  log('\n🧹 Cleaning up test data...', 'cyan');
  
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('is_test', true)
    .like('notes', '%TEST: Verifying time display%');

  if (error) {
    log(`⚠️  Cleanup warning: ${error.message}`, 'yellow');
  } else {
    log('✅ Test data cleaned up', 'green');
  }
}

function getDayAbbr(weekday) {
  const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return days[weekday % 7];
}

async function runTest() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚨 RECURRING APPOINTMENT MIDNIGHT BUG TEST', 'bright');
  log('='.repeat(60), 'bright');
  log('\nThis test verifies that recurring appointments display at their', 'cyan');
  log('scheduled times (e.g., 2:30 PM) and NOT at midnight (12:00 AM).', 'cyan');
  
  try {
    // Clean up any previous test data
    await cleanupTestData();
    
    // Create test appointment
    const appointment = await createTestRecurringAppointment();
    if (!appointment) {
      log('\n❌ Test failed: Could not create test appointment', 'red');
      process.exit(1);
    }
    
    // Wait a moment for data to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the display
    const isCorrect = await verifyAppointmentDisplay(appointment.id);
    
    log('\n' + '='.repeat(60), 'bright');
    log('TEST RESULTS', 'bright');
    log('='.repeat(60), 'bright');
    
    if (isCorrect) {
      log('\n✅ SUCCESS: Recurring appointments display at correct times!', 'green');
      log('   The midnight bug appears to be FIXED.', 'green');
    } else {
      log('\n❌ FAILURE: Midnight bug is still present!', 'red');
      log('   Recurring appointments are showing at 12:00 AM instead of their scheduled times.', 'red');
      log('\n   Next steps:', 'yellow');
      log('   1. Check CalendarConfig.js eventDataTransform function', 'yellow');
      log('   2. Verify RRule DTSTART parameter is being set correctly', 'yellow');
      log('   3. Check FullCalendar RRule plugin configuration', 'yellow');
    }
    
    // Clean up
    await cleanupTestData();
    
    process.exit(isCorrect ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    await cleanupTestData();
    process.exit(1);
  }
}

// Run the test
runTest();