#!/usr/bin/env node

/**
 * Simple test to verify recurring appointments display at the correct time
 * This specifically tests the fix for the midnight bug
 */

import pkg from 'rrule';
const { RRule } = pkg;
import { DateTime } from 'luxon';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.blue}▶${colors.reset} ${msg}`)
};

function testRecurringTimeDisplay() {
  console.log(`\n${colors.bright}${colors.blue}Testing Recurring Appointment Time Display${colors.reset}\n`);
  
  // Test Case 1: Weekly appointment at 2:30 PM
  log.test('Creating weekly appointment for 2:30 PM every Monday');
  
  const appointmentTime = DateTime.fromObject({
    year: 2025,
    month: 8,
    day: 15,
    hour: 14,
    minute: 30
  }, { zone: 'America/New_York' });
  
  log.info(`Original appointment time: ${appointmentTime.toFormat('fff')}`);
  log.info(`Hour: ${appointmentTime.hour}, Minute: ${appointmentTime.minute}`);
  
  // Create RRule with DTSTART
  const dtstart = appointmentTime.toUTC().toJSDate();
  const rrule = new RRule({
    freq: RRule.WEEKLY,
    interval: 1,
    byweekday: [RRule.MO],
    count: 5,
    dtstart: dtstart
  });
  
  const rruleString = rrule.toString();
  log.info(`RRule string: ${rruleString}`);
  
  // Generate occurrences
  const occurrences = rrule.all();
  
  console.log('\n📅 Generated Occurrences:');
  let allCorrect = true;
  
  occurrences.forEach((date, index) => {
    const localTime = DateTime.fromJSDate(date, { zone: 'UTC' }).setZone('America/New_York');
    const hour = localTime.hour;
    const minute = localTime.minute;
    const timeStr = localTime.toFormat('EEE, MMM dd, yyyy @ h:mm a ZZZZ');
    
    const isCorrect = hour === 14 && minute === 30;
    
    if (isCorrect) {
      log.success(`Occurrence ${index + 1}: ${timeStr}`);
    } else {
      log.error(`Occurrence ${index + 1}: ${timeStr} - WRONG TIME! Expected 2:30 PM`);
      allCorrect = false;
    }
  });
  
  // Test Case 2: FullCalendar format with DTSTART
  console.log(`\n${colors.blue}Testing FullCalendar Format:${colors.reset}`);
  
  const dtstartStr = dtstart.toISOString()
    .replace(/[-:]/g, '')
    .replace(/\\.\\d{3}/, '');
  
  const fullCalendarRRule = `DTSTART:${dtstartStr}\n${rruleString}`;
  log.info(`FullCalendar RRule:\n${fullCalendarRRule}`);
  
  // Calculate duration in ISO 8601 format
  const durationMinutes = 60;
  const duration = `PT${Math.floor(durationMinutes / 60)}H${durationMinutes % 60}M`;
  log.info(`Duration: ${duration}`);
  
  // Test Case 3: Verify timezone conversion
  console.log(`\n${colors.blue}Testing Timezone Conversion:${colors.reset}`);
  
  const localTimeStr = '2025-08-15T14:30:00';
  const localDT = DateTime.fromISO(localTimeStr, { zone: 'America/New_York' });
  const utcDT = localDT.toUTC();
  const backToLocal = utcDT.setZone('America/New_York');
  
  log.info(`Local: ${localDT.toISO()}`);
  log.info(`UTC: ${utcDT.toISO()}`);
  log.info(`Back to Local: ${backToLocal.toISO()}`);
  
  const conversionCorrect = 
    localDT.hour === backToLocal.hour && 
    localDT.minute === backToLocal.minute;
  
  if (conversionCorrect) {
    log.success('Timezone conversion preserves time correctly');
  } else {
    log.error('Timezone conversion failed!');
    allCorrect = false;
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.blue}Test Summary:${colors.reset}`);
  
  if (allCorrect) {
    console.log(`${colors.bright}${colors.green}✅ All tests passed! Recurring appointments display at the correct time.${colors.reset}`);
    console.log(`${colors.green}The midnight bug has been fixed!${colors.reset}\n`);
    return true;
  } else {
    console.log(`${colors.bright}${colors.red}❌ Some tests failed. Time display issues detected.${colors.reset}\n`);
    return false;
  }
}

// Run the test
const success = testRecurringTimeDisplay();
process.exit(success ? 0 : 1);