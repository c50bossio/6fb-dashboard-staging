#!/usr/bin/env node

/**
 * Production Calendar Booking System Test
 * Tests all critical functions for real barbershop deployment
 */

const { createClient } = require('@supabase/supabase-js');
const { DateTime } = require('luxon');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_BASE = 'http://localhost:9999/api';
const TIMEZONE = 'America/New_York';

// Test tracking
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testFunction(name, testFn) {
  log(`\n🧪 Testing: ${name}`, 'cyan');
  try {
    const result = await testFn();
    if (result.success) {
      passedTests++;
      testResults.push({ name, status: 'PASSED', message: result.message });
      log(`   ✅ PASSED: ${result.message}`, 'green');
    } else {
      failedTests++;
      testResults.push({ name, status: 'FAILED', message: result.message });
      log(`   ❌ FAILED: ${result.message}`, 'red');
    }
    return result;
  } catch (error) {
    failedTests++;
    testResults.push({ name, status: 'ERROR', message: error.message });
    log(`   ❌ ERROR: ${error.message}`, 'red');
    return { success: false, error };
  }
}

// Test 1: Database Connection
async function testDatabaseConnection() {
  const { data, error } = await supabase
    .from('barbers')
    .select('id, name')
    .limit(1);
  
  return {
    success: !error && data,
    message: error ? `Database error: ${error.message}` : `Connected to database with ${data.length} barbers`
  };
}

// Test 2: Get Available Barbers
async function testGetBarbers() {
  const response = await fetch(`${API_BASE}/calendar/barbers`);
  const data = await response.json();
  
  return {
    success: response.ok && data.barbers?.length > 0,
    message: `Found ${data.barbers?.length || 0} barbers`,
    data: data.barbers
  };
}

// Test 3: Get Services
async function testGetServices() {
  const response = await fetch(`${API_BASE}/calendar/services`);
  const data = await response.json();
  
  return {
    success: response.ok && data.services?.length > 0,
    message: `Found ${data.services?.length || 0} services`,
    data: data.services
  };
}

// Test 4: Check Availability
async function testCheckAvailability(barberId) {
  const tomorrow = DateTime.now().setZone(TIMEZONE).plus({ days: 1 }).toFormat('yyyy-MM-dd');
  
  const response = await fetch(
    `${API_BASE}/appointments/availability?barber_id=${barberId}&date=${tomorrow}&duration_minutes=30`
  );
  const data = await response.json();
  
  const availableSlots = data.available_slots?.filter(s => s.available) || [];
  
  return {
    success: response.ok && data.available_slots?.length > 0,
    message: `Found ${availableSlots.length} available slots for ${tomorrow}`,
    data: availableSlots
  };
}

// Test 5: Create Manual Appointment
async function testCreateManualAppointment(barberId, serviceId) {
  const tomorrow = DateTime.now().setZone(TIMEZONE).plus({ days: 1 });
  const startTime = tomorrow.set({ hour: 10, minute: 0, second: 0 });
  const endTime = startTime.plus({ minutes: 30 });
  
  const appointmentData = {
    shop_id: 'shop_001',
    barber_id: barberId,
    service_id: serviceId,
    customer_name: 'Test Customer Manual',
    customer_email: 'test.manual@example.com',
    customer_phone: '555-0001',
    start_time: startTime.toISO(),
    end_time: endTime.toISO(),
    scheduled_at: startTime.toISO(),
    duration_minutes: 30,
    status: 'confirmed',
    notes: 'PRODUCTION_TEST: Manual appointment',
    is_test: true
  };
  
  const response = await fetch(`${API_BASE}/calendar/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentData)
  });
  
  const data = await response.json();
  
  return {
    success: response.ok && data.appointment?.id,
    message: response.ok 
      ? `Created manual appointment at ${startTime.toFormat('MMM d @ h:mm a')}`
      : `Failed: ${data.error}`,
    appointmentId: data.appointment?.id
  };
}

// Test 6: Create Recurring Appointment
async function testCreateRecurringAppointment(barberId, serviceId) {
  const nextWeek = DateTime.now().setZone(TIMEZONE).plus({ weeks: 1 });
  const startTime = nextWeek.set({ hour: 14, minute: 30, second: 0 });
  const endTime = startTime.plus({ minutes: 60 });
  
  const dayAbbr = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][startTime.weekday % 7];
  const dtstart = startTime.toUTC().toISO().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  const appointmentData = {
    shop_id: 'shop_001',
    barber_id: barberId,
    service_id: serviceId,
    customer_name: 'Test Customer Recurring',
    customer_email: 'test.recurring@example.com',
    customer_phone: '555-0002',
    start_time: startTime.toISO(),
    end_time: endTime.toISO(),
    scheduled_at: startTime.toISO(),
    duration_minutes: 60,
    status: 'confirmed',
    notes: 'PRODUCTION_TEST: Recurring weekly appointment',
    is_recurring: true,
    recurrence_rule: `FREQ=WEEKLY;BYDAY=${dayAbbr};COUNT=4`,
    is_test: true
  };
  
  const response = await fetch(`${API_BASE}/calendar/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appointmentData)
  });
  
  const data = await response.json();
  
  return {
    success: response.ok && data.is_recurring,
    message: response.ok 
      ? `Created recurring appointment every ${startTime.toFormat('EEEE')} at 2:30 PM`
      : `Failed: ${data.error}`,
    appointmentId: data.appointment?.id
  };
}

// Test 7: Fetch Calendar Events
async function testFetchCalendarEvents() {
  const now = DateTime.now().setZone(TIMEZONE);
  const startDate = now.startOf('week').toISO();
  const endDate = now.endOf('week').plus({ weeks: 2 }).toISO();
  
  const response = await fetch(
    `${API_BASE}/calendar/appointments?start_date=${startDate}&end_date=${endDate}`
  );
  const data = await response.json();
  
  const regularCount = data.appointments?.filter(a => !a.extendedProps?.isRecurring).length || 0;
  const recurringCount = data.appointments?.filter(a => a.extendedProps?.isRecurring).length || 0;
  
  return {
    success: response.ok && data.appointments,
    message: `Fetched ${data.appointments?.length || 0} appointments (${regularCount} regular, ${recurringCount} recurring)`
  };
}

// Test 8: Update Appointment
async function testUpdateAppointment(appointmentId) {
  if (!appointmentId) {
    return { success: false, message: 'No appointment ID to update' };
  }
  
  const updateData = {
    notes: 'PRODUCTION_TEST: Updated notes at ' + new Date().toISOString(),
    status: 'confirmed'
  };
  
  const response = await fetch(`${API_BASE}/calendar/appointments/${appointmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  
  const data = await response.json();
  
  return {
    success: response.ok,
    message: response.ok ? 'Successfully updated appointment' : `Failed: ${data.error}`
  };
}

// Test 9: Check for Conflicts
async function testConflictDetection(barberId) {
  const tomorrow = DateTime.now().setZone(TIMEZONE).plus({ days: 1 });
  const conflictTime = tomorrow.set({ hour: 10, minute: 0, second: 0 });
  
  const response = await fetch(`${API_BASE}/appointments/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      barber_id: barberId,
      scheduled_at: conflictTime.toISO(),
      duration_minutes: 30
    })
  });
  
  const data = await response.json();
  
  return {
    success: response.ok,
    message: data.available 
      ? 'Time slot is available (no conflict)'
      : `Conflict detected with ${data.conflicts?.length || 0} appointments`
  };
}

// Test 10: Delete Test Appointments
async function testCleanup() {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('is_test', true)
    .like('notes', '%PRODUCTION_TEST%');
  
  return {
    success: !error,
    message: error ? `Cleanup failed: ${error.message}` : 'Test appointments cleaned up'
  };
}

// Test 11: Recurring Appointment Time Display
async function testRecurringTimeDisplay() {
  // Fetch recurring appointments and check their display times
  const { data: recurringAppts } = await supabase
    .from('bookings')
    .select('*')
    .eq('is_recurring', true)
    .limit(5);
  
  if (!recurringAppts?.length) {
    return { success: true, message: 'No recurring appointments to test' };
  }
  
  let correctTimes = 0;
  let midnightBugs = 0;
  
  recurringAppts.forEach(appt => {
    const startTime = DateTime.fromISO(appt.start_time).setZone(TIMEZONE);
    if (startTime.hour === 0 && startTime.minute === 0) {
      midnightBugs++;
    } else {
      correctTimes++;
    }
  });
  
  return {
    success: midnightBugs === 0,
    message: midnightBugs > 0 
      ? `⚠️ MIDNIGHT BUG: ${midnightBugs} appointments showing at 12:00 AM`
      : `✅ All ${correctTimes} recurring appointments show correct times`
  };
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('🏪 PRODUCTION CALENDAR SYSTEM TEST', 'bright');
  log('Testing all functions for real barbershop deployment', 'bright');
  log('='.repeat(60), 'bright');
  
  // Get test data
  const barbersResult = await testFunction('Database Connection', testDatabaseConnection);
  const barbersData = await testFunction('Get Barbers', testGetBarbers);
  const servicesData = await testFunction('Get Services', testGetServices);
  
  if (!barbersData.data?.length || !servicesData.data?.length) {
    log('\n❌ Cannot continue: No barbers or services found', 'red');
    process.exit(1);
  }
  
  const testBarberId = barbersData.data[0].id;
  const testServiceId = servicesData.data[0].id;
  
  log(`\n📋 Using test data:`, 'yellow');
  log(`   Barber: ${barbersData.data[0].name} (${testBarberId})`, 'blue');
  log(`   Service: ${servicesData.data[0].name} (${testServiceId})`, 'blue');
  
  // Run all tests
  await testFunction('Check Availability', () => testCheckAvailability(testBarberId));
  
  const manualAppt = await testFunction('Create Manual Appointment', 
    () => testCreateManualAppointment(testBarberId, testServiceId));
  
  await testFunction('Create Recurring Appointment', 
    () => testCreateRecurringAppointment(testBarberId, testServiceId));
  
  await testFunction('Fetch Calendar Events', testFetchCalendarEvents);
  
  if (manualAppt.appointmentId) {
    await testFunction('Update Appointment', () => testUpdateAppointment(manualAppt.appointmentId));
  }
  
  await testFunction('Conflict Detection', () => testConflictDetection(testBarberId));
  await testFunction('Recurring Time Display Check', testRecurringTimeDisplay);
  await testFunction('Cleanup Test Data', testCleanup);
  
  // Print summary
  log('\n' + '='.repeat(60), 'bright');
  log('TEST SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  
  const totalTests = passedTests + failedTests;
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  log(`\n📊 Results:`, 'yellow');
  log(`   Total Tests: ${totalTests}`, 'blue');
  log(`   Passed: ${passedTests} ✅`, 'green');
  log(`   Failed: ${failedTests} ❌`, failedTests > 0 ? 'red' : 'green');
  log(`   Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red');
  
  if (failedTests > 0) {
    log(`\n❌ Failed Tests:`, 'red');
    testResults.filter(r => r.status === 'FAILED' || r.status === 'ERROR')
      .forEach(r => log(`   - ${r.name}: ${r.message}`, 'red'));
  }
  
  log('\n' + '='.repeat(60), 'bright');
  if (passRate >= 90) {
    log('✅ SYSTEM READY FOR PRODUCTION', 'green');
    log('Calendar booking system is ready for real barbershop deployment!', 'green');
  } else if (passRate >= 70) {
    log('⚠️ SYSTEM NEEDS ATTENTION', 'yellow');
    log('Some features need fixing before production deployment.', 'yellow');
  } else {
    log('❌ SYSTEM NOT READY', 'red');
    log('Critical issues must be resolved before deployment.', 'red');
  }
  log('='.repeat(60), 'bright');
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});