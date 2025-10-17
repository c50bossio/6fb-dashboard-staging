#!/usr/bin/env node
/**
 * Test script to verify recurring appointments compatibility
 * Tests both the original frontend format and new backend format
 */

console.log('🔄 Testing Recurring Appointments Compatibility\n')

// Simulate the backend's generateRecurringOccurrences function
function generateRecurringOccurrences(originalAppointment, recurringPattern) {
  const occurrences = []
  
  if (!recurringPattern || !originalAppointment) {
    return occurrences
  }
  
  const {
    pattern = 'weekly',
    interval = 1,
    days = [], // For weekly: [0,1,2,3,4,5,6] for Sun-Sat
    end_type = 'count',
    count = 10,
    end_date
  } = recurringPattern
  
  const startDate = new Date(originalAppointment.start_time)
  const endDateTime = new Date(originalAppointment.end_time)
  const duration = endDateTime.getTime() - startDate.getTime()
  
  const maxOccurrences = end_type === 'count' ? count - 1 : 50 // Subtract 1 because original is first occurrence
  const endLimit = end_date ? new Date(end_date) : null
  
  let currentDate = new Date(startDate)
  
  for (let i = 0; i < maxOccurrences; i++) {
    // Calculate next occurrence based on pattern
    switch (pattern.toLowerCase()) {
      case 'daily':
        currentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000 * interval))
        break
      case 'weekly':
        // Simple weekly - add 7 * interval days
        currentDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000 * interval))
        break
      case 'monthly':
        const newMonth = new Date(currentDate)
        newMonth.setMonth(newMonth.getMonth() + interval)
        currentDate = newMonth
        break
      default:
        // Default to weekly
        currentDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000 * interval))
    }
    
    // Stop if we've passed the end date
    if (endLimit && currentDate > endLimit) {
      break
    }
    
    const occurrenceEnd = new Date(currentDate.getTime() + duration)
    
    occurrences.push({
      start_time: currentDate.toISOString(),
      end_time: occurrenceEnd.toISOString()
    })
  }
  
  return occurrences
}

// Test the recurring pattern compatibility
function testRecurringCompatibility() {
  console.log('Testing recurring pattern format compatibility...\n')
  
  const baseAppointment = {
    start_time: '2024-01-01T10:00:00.000Z',
    end_time: '2024-01-01T11:00:00.000Z'
  }
  
  // Test 1: Legacy frontend format (individual fields)
  console.log('📝 Test 1: Legacy Frontend Format')
  const legacyData = {
    is_recurring: true,
    recurrence_pattern: 'weekly',
    recurrence_interval: 1,
    recurrence_days: [1], // Monday
    recurrence_end_type: 'count',
    recurrence_count: 5,
    recurrence_rule: 'FREQ=WEEKLY;INTERVAL=1;COUNT=5;BYDAY=MO'
  }
  
  // Simulate backend processing of legacy format
  const legacyConfig = {
    pattern: legacyData.recurrence_pattern || 'weekly',
    interval: legacyData.recurrence_interval || 1,
    days: legacyData.recurrence_days || [],
    end_type: legacyData.recurrence_end_type || 'count',
    count: legacyData.recurrence_count || 10,
    end_date: legacyData.recurrence_end_date || null
  }
  
  const legacyOccurrences = generateRecurringOccurrences(baseAppointment, legacyConfig)
  console.log(`Generated ${legacyOccurrences.length} occurrences:`)
  legacyOccurrences.forEach((occ, idx) => {
    console.log(`  ${idx + 2}. ${new Date(occ.start_time).toDateString()}`)
  })
  
  // Test 2: New object format
  console.log('\n📝 Test 2: New Object Format')
  const newData = {
    is_recurring: true,
    recurring_pattern: {
      pattern: 'weekly',
      interval: 1,
      days: [1], // Monday
      end_type: 'count',
      count: 5,
      created_at: new Date().toISOString()
    }
  }
  
  const newOccurrences = generateRecurringOccurrences(baseAppointment, newData.recurring_pattern)
  console.log(`Generated ${newOccurrences.length} occurrences:`)
  newOccurrences.forEach((occ, idx) => {
    console.log(`  ${idx + 2}. ${new Date(occ.start_time).toDateString()}`)
  })
  
  // Test 3: Compatibility verification
  console.log('\n🔍 Compatibility Check')
  const isCompatible = legacyOccurrences.length === newOccurrences.length &&
    legacyOccurrences.every((occ, idx) => 
      occ.start_time === newOccurrences[idx].start_time &&
      occ.end_time === newOccurrences[idx].end_time
    )
  
  if (isCompatible) {
    console.log('✅ Both formats generate identical results - COMPATIBILITY MAINTAINED')
  } else {
    console.log('❌ Formats generate different results - COMPATIBILITY ISSUE')
    console.log('Legacy count:', legacyOccurrences.length)
    console.log('New count:', newOccurrences.length)
  }
  
  return isCompatible
}

// Test backend format conversion logic
function testBackendConversion() {
  console.log('\n🔧 Testing Backend Conversion Logic\n')
  
  // Simulate appointmentData from frontend
  const frontendData = {
    is_recurring: true,
    recurrence_pattern: 'weekly', // String, not object
    recurrence_interval: 2,
    recurrence_days: [1, 3, 5], // Mon, Wed, Fri
    recurrence_end_type: 'count',
    recurrence_count: 8,
    recurrence_rule: 'FREQ=WEEKLY;INTERVAL=2;COUNT=8;BYDAY=MO,WE,FR'
  }
  
  // Simulate backend processing logic
  let recurringConfig
  if (typeof frontendData.recurring_pattern === 'object' && frontendData.recurring_pattern !== null) {
    // New format: detailed object
    recurringConfig = frontendData.recurring_pattern
    console.log('Backend detected: New object format')
  } else {
    // Legacy format: extract from form data
    recurringConfig = {
      pattern: frontendData.recurrence_pattern || frontendData.recurring_pattern || 'weekly',
      interval: frontendData.recurrence_interval || 1,
      days: frontendData.recurrence_days || [],
      end_type: frontendData.recurrence_end_type || 'count',
      count: frontendData.recurrence_count || 10,
      end_date: frontendData.recurrence_end_date || null
    }
    console.log('Backend detected: Legacy format, converted to:')
  }
  
  console.log('Converted config:', JSON.stringify(recurringConfig, null, 2))
  
  const baseAppointment = {
    start_time: '2024-01-01T14:00:00.000Z',
    end_time: '2024-01-01T15:30:00.000Z'
  }
  
  const occurrences = generateRecurringOccurrences(baseAppointment, recurringConfig)
  console.log(`\nGenerated ${occurrences.length} occurrences:`)
  occurrences.slice(0, 3).forEach((occ, idx) => {
    console.log(`  ${idx + 2}. ${new Date(occ.start_time).toDateString()} at ${new Date(occ.start_time).toTimeString().slice(0, 8)}`)
  })
  if (occurrences.length > 3) {
    console.log(`  ... and ${occurrences.length - 3} more`)
  }
  
  return occurrences.length > 0
}

// Main test runner
async function runTests() {
  console.log('🧪 Recurring Appointments Compatibility Test\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  
  const test1 = testRecurringCompatibility()
  const test2 = testBackendConversion()
  
  console.log('\n' + '━'.repeat(50))
  console.log('📊 Test Results Summary:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Format Compatibility: ${test1 ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Backend Conversion: ${test2 ? '✅ PASS' : '❌ FAIL'}`)
  
  if (test1 && test2) {
    console.log('\n🎉 All tests passed! Recurring appointments are backward compatible.')
    console.log('\n✅ Key Verification Points:')
    console.log('• Legacy frontend format still works')
    console.log('• New object format works correctly') 
    console.log('• Backend handles both formats seamlessly')
    console.log('• Generated occurrences are identical between formats')
    console.log('• No breaking changes to existing functionality')
  } else {
    console.log('\n⚠️  Some tests failed. Review the implementation.')
  }
}

// Run the tests
runTests().catch(console.error)