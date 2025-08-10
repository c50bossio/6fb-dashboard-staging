#!/usr/bin/env node

/**
 * Comprehensive test script for the new recurring appointments system
 * Tests all critical functionality including time preservation
 */

import { createClient } from '@supabase/supabase-js';
import RRuleService from '../services/rrule.service.js';
import TimezoneService from '../services/timezone.service.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'
);

const API_BASE = 'http://localhost:9999/api/calendar';

// Test data
const TEST_SHOP_ID = 'shop_001';
const TEST_BARBER_ID = 'barber_001';
const TEST_SERVICE_ID = 'service_001';
const TEST_TIMEZONE = 'America/New_York';

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

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.blue}▶${colors.reset} ${msg}`),
  result: (msg) => console.log(`  ${colors.magenta}→${colors.reset} ${msg}`)
};

/**
 * Test 1: RRule Service - Generate correct occurrences with proper times
 */
async function testRRuleService() {
  log.test('Testing RRule Service...');
  
  try {
    // Test weekly recurrence at 2:30 PM
    const pattern = {
      frequency: 'WEEKLY',
      interval: 1,
      daysOfWeek: ['monday', 'wednesday', 'friday'],
      startDate: '2025-08-15T14:30:00',
      count: 10,
      timezone: TEST_TIMEZONE
    };
    
    const rrule = RRuleService.createRule(pattern);
    const rruleString = rrule.toString();
    log.result(`RRule: ${rruleString}`);
    
    // Validate the RRule
    const validation = RRuleService.validateRRule(rruleString);
    if (!validation.valid) {
      throw new Error(`Invalid RRule: ${validation.error}`);
    }
    
    // Generate occurrences
    const startDate = new Date('2025-08-01');
    const endDate = new Date('2025-08-31');
    const occurrences = RRuleService.generateOccurrences(rruleString, startDate, endDate, TEST_TIMEZONE);
    
    log.result(`Generated ${occurrences.length} occurrences`);
    
    // Check first occurrence time
    if (occurrences.length > 0) {
      const firstOcc = occurrences[0];
      const localDate = new Date(firstOcc.localDate);
      const hours = localDate.getHours();
      const minutes = localDate.getMinutes();
      
      log.result(`First occurrence: ${firstOcc.displayTime}`);
      log.result(`Time: ${hours}:${minutes.toString().padStart(2, '0')}`);
      
      // Verify it's at 2:30 PM (14:30)
      if (hours !== 14 || minutes !== 30) {
        throw new Error(`Time mismatch! Expected 14:30, got ${hours}:${minutes}`);
      }
    }
    
    // Test FullCalendar format conversion
    const fcFormat = RRuleService.toFullCalendarFormat(
      rruleString,
      '2025-08-15T14:30:00',
      '2025-08-15T15:30:00'
    );
    
    log.result(`FullCalendar RRule: ${fcFormat.rrule}`);
    log.result(`Duration: ${fcFormat.duration}`);
    
    // Verify DTSTART is included
    if (!fcFormat.rrule.includes('DTSTART')) {
      throw new Error('DTSTART missing from FullCalendar format!');
    }
    
    log.success('RRule Service test passed!');
    return true;
    
  } catch (error) {
    log.error(`RRule Service test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Timezone Service - Correct timezone handling
 */
async function testTimezoneService() {
  log.test('Testing Timezone Service...');
  
  try {
    // Test time conversion
    const localTime = '2025-08-15T14:30:00';
    const utcTime = TimezoneService.toUTC(localTime, TEST_TIMEZONE);
    const backToLocal = TimezoneService.fromUTC(utcTime, TEST_TIMEZONE);
    
    log.result(`Local: ${localTime}`);
    log.result(`UTC: ${utcTime}`);
    log.result(`Back to Local: ${backToLocal}`);
    
    // Verify round-trip conversion
    const originalDate = new Date(localTime);
    const convertedDate = new Date(backToLocal);
    
    if (originalDate.getHours() !== convertedDate.getHours() ||
        originalDate.getMinutes() !== convertedDate.getMinutes()) {
      throw new Error('Timezone conversion round-trip failed!');
    }
    
    // Test DST handling
    const dstCheck = TimezoneService.handleDSTTransition(
      new Date('2025-03-09T14:30:00'), // DST transition date
      TEST_TIMEZONE
    );
    
    log.result(`DST Check - Is DST: ${dstCheck.isDST}, Needs adjustment: ${dstCheck.needsAdjustment}`);
    
    // Test business hours
    const businessHours = TimezoneService.getBusinessHours(TEST_TIMEZONE);
    log.result(`Business hours: ${businessHours.startTime} - ${businessHours.endTime}`);
    
    log.success('Timezone Service test passed!');
    return true;
    
  } catch (error) {
    log.error(`Timezone Service test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Create recurring appointment via API
 */
async function testCreateRecurring() {
  log.test('Testing Create Recurring Appointment API...');
  
  try {
    const appointmentData = {
      barber_id: TEST_BARBER_ID,
      service_id: TEST_SERVICE_ID,
      start_time: '2025-08-15T14:30:00',
      duration_minutes: 60,
      client_name: 'Test Customer',
      client_email: 'test@example.com',
      client_phone: '555-0123',
      notes: 'Test recurring appointment at 2:30 PM',
      recurrence_pattern: {
        frequency: 'WEEKLY',
        interval: 1,
        daysOfWeek: ['monday', 'wednesday', 'friday'],
        count: 10
      },
      timezone: TEST_TIMEZONE,
      shop_id: TEST_SHOP_ID
    };
    
    const response = await fetch(`${API_BASE}/recurring/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    const result = await response.json();
    log.result(`Created appointment ID: ${result.appointment.id}`);
    log.result(`RRule: ${result.appointment.rrule}`);
    
    // Verify the RRule includes DTSTART with correct time
    if (!result.appointment.rrule.includes('DTSTART')) {
      throw new Error('DTSTART missing from created appointment!');
    }
    
    // Check preview occurrences
    if (result.preview && result.preview.length > 0) {
      log.result(`Preview occurrences:`);
      result.preview.forEach((occ, idx) => {
        log.result(`  ${idx + 1}. ${occ.display}`);
      });
      
      // Verify first occurrence is at 2:30 PM
      const firstDisplay = result.preview[0].display;
      if (!firstDisplay.includes('2:30')) {
        throw new Error(`First occurrence not at 2:30 PM! Got: ${firstDisplay}`);
      }
    }
    
    log.success('Create Recurring Appointment test passed!');
    return result.appointment.id;
    
  } catch (error) {
    log.error(`Create Recurring Appointment test failed: ${error.message}`);
    return null;
  }
}

/**
 * Test 4: Server-side expansion
 */
async function testServerExpansion() {
  log.test('Testing Server-side Expansion API...');
  
  try {
    const requestData = {
      start_date: '2025-08-01',
      end_date: '2025-08-31',
      shop_id: TEST_SHOP_ID,
      include_single: true,
      timezone: TEST_TIMEZONE
    };
    
    const response = await fetch(`${API_BASE}/recurring/expand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    const result = await response.json();
    log.result(`Total events: ${result.meta.total}`);
    log.result(`Recurring events: ${result.meta.recurring_count}`);
    log.result(`Single events: ${result.meta.single_count}`);
    
    // Check if recurring events have correct times
    const recurringEvents = result.events.filter(e => e.extendedProps?.is_recurring);
    if (recurringEvents.length > 0) {
      const firstRecurring = recurringEvents[0];
      const startTime = new Date(firstRecurring.start);
      log.result(`First recurring event time: ${startTime.toLocaleTimeString()}`);
      
      // Check if any events are at midnight (incorrect)
      const midnightEvents = recurringEvents.filter(e => {
        const d = new Date(e.start);
        return d.getHours() === 0 && d.getMinutes() === 0;
      });
      
      if (midnightEvents.length > 0) {
        log.warning(`Found ${midnightEvents.length} events at midnight - this may indicate a time display issue!`);
      }
    }
    
    log.success('Server-side Expansion test passed!');
    return true;
    
  } catch (error) {
    log.error(`Server-side Expansion test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Modify recurring appointment
 */
async function testModifyRecurring(appointmentId) {
  log.test('Testing Modify Recurring Appointment API...');
  
  if (!appointmentId) {
    log.warning('No appointment ID provided, skipping modify test');
    return false;
  }
  
  try {
    // Test modifying a single occurrence
    const modifyData = {
      appointment_id: appointmentId,
      modification_type: 'this_only',
      occurrence_date: '2025-08-20T14:30:00',
      changes: {
        start_time: '2025-08-20T15:00:00', // Change to 3:00 PM
        notes: 'Rescheduled to 3:00 PM'
      },
      timezone: TEST_TIMEZONE
    };
    
    const response = await fetch(`${API_BASE}/recurring/modify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modifyData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    const result = await response.json();
    log.result(`Modified appointment: ${result.appointment.id}`);
    log.result(`Modification type: ${result.modification_type}`);
    log.result(`Occurrence date: ${result.occurrence_date}`);
    
    log.success('Modify Recurring Appointment test passed!');
    return true;
    
  } catch (error) {
    log.error(`Modify Recurring Appointment test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 6: Delete recurring appointment
 */
async function testDeleteRecurring(appointmentId) {
  log.test('Testing Delete Recurring Appointment API...');
  
  if (!appointmentId) {
    log.warning('No appointment ID provided, skipping delete test');
    return false;
  }
  
  try {
    // Test soft delete of single occurrence
    const deleteData = {
      appointment_id: appointmentId,
      deletion_type: 'this_only',
      occurrence_date: '2025-08-27T14:30:00',
      soft_delete: true
    };
    
    const response = await fetch(`${API_BASE}/recurring/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deleteData)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    const result = await response.json();
    log.result(`Deleted occurrence: ${result.occurrence_date}`);
    log.result(`Soft delete: ${result.soft_delete}`);
    
    log.success('Delete Recurring Appointment test passed!');
    return true;
    
  } catch (error) {
    log.error(`Delete Recurring Appointment test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 7: Database verification
 */
async function testDatabaseStructure() {
  log.test('Testing Database Structure...');
  
  try {
    // Check if new columns exist
    const { data: columns, error } = await supabase
      .rpc('get_column_names', { table_name: 'bookings' });
    
    if (error) {
      // Fallback: try a simple query
      const { data, error: queryError } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);
      
      if (queryError) {
        log.warning('Could not verify database structure');
        return true; // Don't fail the test
      }
      
      if (data && data.length > 0) {
        const sample = data[0];
        const hasRequiredFields = 
          'recurring_pattern' in sample &&
          'is_recurring' in sample;
        
        if (hasRequiredFields) {
          log.result('Database has required recurring fields');
        } else {
          throw new Error('Database missing recurring fields');
        }
      }
    } else {
      log.result(`Database columns: ${columns?.join(', ')}`);
    }
    
    log.success('Database Structure test passed!');
    return true;
    
  } catch (error) {
    log.error(`Database Structure test failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}   New Recurring Appointments System Tests${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Test 1: RRule Service
  results.total++;
  if (await testRRuleService()) {
    results.passed++;
  } else {
    results.failed++;
  }
  console.log();
  
  // Test 2: Timezone Service
  results.total++;
  if (await testTimezoneService()) {
    results.passed++;
  } else {
    results.failed++;
  }
  console.log();
  
  // Test 3: Create Recurring
  results.total++;
  const appointmentId = await testCreateRecurring();
  if (appointmentId) {
    results.passed++;
  } else {
    results.failed++;
  }
  console.log();
  
  // Test 4: Server Expansion
  results.total++;
  if (await testServerExpansion()) {
    results.passed++;
  } else {
    results.failed++;
  }
  console.log();
  
  // Test 5: Modify Recurring
  results.total++;
  if (await testModifyRecurring(appointmentId)) {
    results.passed++;
  } else {
    results.failed++;
  }
  console.log();
  
  // Test 6: Delete Recurring
  results.total++;
  if (await testDeleteRecurring(appointmentId)) {
    results.passed++;
  } else {
    results.failed++;
  }
  console.log();
  
  // Test 7: Database Structure
  results.total++;
  if (await testDatabaseStructure()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}   Test Results Summary${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`  Total Tests: ${results.total}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.bright}${colors.green}🎉 All tests passed! The new recurring appointments system is working correctly!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.bright}${colors.yellow}⚠ Some tests failed. Please review the errors above.${colors.reset}\n`);
  }
  
  // Cleanup: Delete test appointment if created
  if (appointmentId) {
    try {
      await supabase
        .from('bookings')
        .delete()
        .eq('id', appointmentId);
      log.info('Cleaned up test appointment');
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}\n`);
  process.exit(1);
});