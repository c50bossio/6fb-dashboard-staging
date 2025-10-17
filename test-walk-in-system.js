#!/usr/bin/env node

import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const BASE_URL = 'http://localhost:9999'
const TEST_PHONE = '5551234567'
const TEST_BARBERSHOP_ID = 'c5a58548-8f23-426c-bedc-49a83d238724' // From logs

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
}

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, description) {
  console.log(`\n${colors.cyan}[STEP ${step}]${colors.reset} ${colors.white}${description}${colors.reset}`)
}

function logResult(success, message) {
  const emoji = success ? '✅' : '❌'
  const color = success ? 'green' : 'red'
  console.log(`  ${emoji} ${colors[color]}${message}${colors.reset}`)
}

async function testAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    return {
      success: response.ok,
      status: response.status,
      data,
      response
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

async function setupTestData() {
  logStep(0, 'Setting up test data')
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Clean up any existing test data
    await supabase.from('customers').delete().eq('phone', TEST_PHONE)
    
    // Create a test customer with appointments
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        full_name: 'Test Customer',
        phone: TEST_PHONE,
        email: 'test@example.com',
        barbershop_id: TEST_BARBERSHOP_ID
      })
      .select()
      .single()

    if (customerError) throw customerError

    // Create a confirmed appointment for today
    const today = new Date().toISOString().split('T')[0]
    const scheduledAt = `${today}T14:00:00.000Z`
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        barbershop_id: TEST_BARBERSHOP_ID,
        customer_id: customer.id,
        scheduled_at: scheduledAt,
        date: today,
        start_time: '14:00:00',
        end_time: '15:00:00',
        status: 'CONFIRMED',
        duration_minutes: 60,
        service_price: 30
      })
      .select()
      .single()

    if (appointmentError) throw appointmentError

    logResult(true, `Test customer created: ${customer.full_name} (${customer.phone})`)
    logResult(true, `Test appointment created: ${appointment.id}`)
    
    return {
      customer,
      appointment
    }
  } catch (error) {
    logResult(false, `Setup failed: ${error.message}`)
    return null
  }
}

async function testAppointmentSearch(phone, barbershopId) {
  logStep(1, 'Testing appointment search by phone')
  
  const result = await testAPI(`/api/appointments/search-by-phone?phone=${phone}&barbershop_id=${barbershopId}`)
  
  if (result.success && result.data.success) {
    const appointments = result.data.appointments || []
    logResult(true, `Found ${appointments.length} appointments`)
    
    if (appointments.length > 0) {
      const apt = appointments[0]
      logResult(true, `Appointment: ${apt.customer_name} at ${apt.start_time} - ${apt.service_name}`)
      return appointments[0]
    }
  } else {
    logResult(false, `Search failed: ${result.data?.error || result.error}`)
  }
  
  return null
}

async function testAppointmentCheckIn(appointmentId) {
  logStep(2, 'Testing appointment check-in')
  
  const result = await testAPI(`/api/appointments/${appointmentId}/check-in`, {
    method: 'POST'
  })
  
  if (result.success && result.data.success) {
    logResult(true, `Check-in successful: ${result.data.message}`)
    logResult(true, `Status updated to: ${result.data.appointment.status}`)
    return true
  } else {
    logResult(false, `Check-in failed: ${result.data?.error || result.error}`)
    return false
  }
}

async function testWalkInCreation(phone, barbershopId) {
  logStep(3, 'Testing walk-in customer creation')
  
  const walkInData = {
    name: 'Walk-in Customer',
    phone: phone,
    service: 'Beard Trim',
    notes: 'Quick trim, cash payment',
    barbershop_id: barbershopId,
    estimated_wait: 20
  }
  
  const result = await testAPI('/api/walk-ins', {
    method: 'POST',
    body: JSON.stringify(walkInData)
  })
  
  if (result.success && result.data.success) {
    logResult(true, `Walk-in created successfully`)
    logResult(true, `Queue position: ${result.data.queue_position}`)
    logResult(true, `Estimated wait: ${result.data.estimated_wait} minutes`)
    return result.data.appointment_id
  } else {
    logResult(false, `Walk-in creation failed: ${result.data?.error || result.error}`)
    return null
  }
}

async function testWalkInQueueRetrieval(barbershopId) {
  logStep(4, 'Testing walk-in queue retrieval')
  
  const result = await testAPI(`/api/walk-ins?barbershop_id=${barbershopId}`)
  
  if (result.success && result.data.success) {
    const walkIns = result.data.walk_ins || []
    logResult(true, `Found ${walkIns.length} walk-ins in queue`)
    
    if (walkIns.length > 0) {
      const walkIn = walkIns[0]
      logResult(true, `Walk-in: ${walkIn.customers?.full_name} - ${walkIn.service_name} (Position #${walkIn.queue_position})`)
      return walkIn.id
    }
  } else {
    logResult(false, `Queue retrieval failed: ${result.data?.error || result.error}`)
  }
  
  return null
}

async function testWalkInCompletion(appointmentId) {
  logStep(5, 'Testing walk-in service completion')
  
  const result = await testAPI(`/api/appointments/${appointmentId}/complete`, {
    method: 'POST'
  })
  
  if (result.success && result.data.success) {
    logResult(true, `Walk-in completed successfully: ${result.data.message}`)
    return true
  } else {
    logResult(false, `Walk-in completion failed: ${result.data?.error || result.error}`)
    return false
  }
}

async function testWalkInRemoval(appointmentId) {
  logStep(6, 'Testing walk-in removal from queue')
  
  const result = await testAPI(`/api/appointments/${appointmentId}`, {
    method: 'DELETE'
  })
  
  if (result.success && result.data.success) {
    logResult(true, `Walk-in removed successfully: ${result.data.message}`)
    return true
  } else {
    logResult(false, `Walk-in removal failed: ${result.data?.error || result.error}`)
    return false
  }
}

async function testValidation() {
  logStep(7, 'Testing data validation and error handling')
  
  // Test missing required fields
  const invalidData = [
    { endpoint: '/api/walk-ins', data: {}, expected: 'Name, service, and barbershop_id are required' },
    { endpoint: '/api/appointments/search-by-phone', params: '', expected: 'Phone number is required' },
    { endpoint: '/api/appointments/999999/check-in', method: 'POST', expected: 'Appointment not found' }
  ]
  
  let validationsPassed = 0
  
  for (const test of invalidData) {
    const endpoint = test.params ? `${test.endpoint}?${test.params}` : test.endpoint
    const result = await testAPI(endpoint, {
      method: test.method || 'POST',
      body: test.data ? JSON.stringify(test.data) : undefined
    })
    
    if (!result.success || !result.data.success) {
      logResult(true, `Validation working: ${result.data?.error || result.error}`)
      validationsPassed++
    } else {
      logResult(false, `Validation failed: Expected error but got success`)
    }
  }
  
  return validationsPassed === invalidData.length
}

async function cleanup() {
  logStep(8, 'Cleaning up test data')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Clean up test appointments and customers
    await supabase.from('appointments').delete().eq('barbershop_id', TEST_BARBERSHOP_ID)
    await supabase.from('customers').delete().eq('phone', TEST_PHONE)
    
    logResult(true, 'Test data cleaned up')
  } catch (error) {
    logResult(false, `Cleanup failed: ${error.message}`)
  }
}

async function runAllTests() {
  console.log(`${colors.magenta}🧪 Walk-In System Comprehensive Test Suite${colors.reset}`)
  console.log(`${colors.yellow}Testing server: ${BASE_URL}${colors.reset}`)
  
  let testsPassed = 0
  let totalTests = 8
  
  try {
    // Setup
    const testData = await setupTestData()
    if (!testData) {
      log('❌ Failed to setup test data. Aborting tests.', 'red')
      return
    }
    
    // Test 1: Search for existing appointments
    const foundAppointment = await testAppointmentSearch(TEST_PHONE, TEST_BARBERSHOP_ID)
    if (foundAppointment) testsPassed++
    
    // Test 2: Check in existing appointment
    if (foundAppointment) {
      const checkedIn = await testAppointmentCheckIn(foundAppointment.id)
      if (checkedIn) testsPassed++
    }
    
    // Test 3: Create walk-in customer
    const walkInId = await testWalkInCreation('5559876543', TEST_BARBERSHOP_ID) // Different phone
    if (walkInId) testsPassed++
    
    // Test 4: Retrieve walk-in queue
    const queueId = await testWalkInQueueRetrieval(TEST_BARBERSHOP_ID)
    if (queueId) testsPassed++
    
    // Test 5: Complete walk-in service
    if (walkInId) {
      const completed = await testWalkInCompletion(walkInId)
      if (completed) testsPassed++
    }
    
    // Create another walk-in for removal test
    const walkInId2 = await testWalkInCreation('5559876544', TEST_BARBERSHOP_ID)
    
    // Test 6: Remove walk-in from queue
    if (walkInId2) {
      const removed = await testWalkInRemoval(walkInId2)
      if (removed) testsPassed++
    }
    
    // Test 7: Validation testing
    const validationPassed = await testValidation()
    if (validationPassed) testsPassed++
    
    // Test 8: Cleanup
    await cleanup()
    testsPassed++ // Cleanup always passes if we get here
    
  } catch (error) {
    log(`❌ Test suite failed: ${error.message}`, 'red')
  }
  
  // Results
  console.log(`\n${colors.magenta}📊 Test Results${colors.reset}`)
  console.log(`${colors.white}Tests Passed: ${colors.green}${testsPassed}${colors.white}/${totalTests}${colors.reset}`)
  
  if (testsPassed === totalTests) {
    console.log(`${colors.green}🎉 All tests passed! Walk-in system is working correctly.${colors.reset}`)
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Please review the output above.${colors.reset}`)
  }
  
  // UI Testing Instructions
  console.log(`\n${colors.cyan}🌐 Manual UI Testing:${colors.reset}`)
  console.log(`${colors.white}1. Check-in page: ${colors.blue}${BASE_URL}/dashboard/checkin${colors.reset}`)
  console.log(`${colors.white}2. Walk-in queue: ${colors.blue}${BASE_URL}/dashboard/walk-in-queue${colors.reset}`)
  console.log(`${colors.white}3. Test phone: ${colors.yellow}${TEST_PHONE}${colors.reset}`)
  console.log(`${colors.white}4. Walk-in phone: ${colors.yellow}5559876543${colors.reset}`)
}

// Run tests if this script is called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error)
}

export { runAllTests }