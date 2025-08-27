#!/usr/bin/env node

/**
 * Saturday Morning Rush Test
 * Simulates high-volume booking scenario for live barbershop use
 */

import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:9999'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Test data
const TEST_BARBERSHOP_ID = 'test-barbershop-id'
const TEST_BARBER_ID = 'test-barber-id' 
const TEST_SERVICE_ID = 'test-service-id'

// Simulate Saturday morning rush: 9 AM - 12 PM with 30-minute slots
const generateTimeSlots = () => {
  const slots = []
  const startDate = new Date()
  startDate.setHours(9, 0, 0, 0) // 9:00 AM
  
  for (let i = 0; i < 6; i++) { // 6 slots (9:00-11:30)
    const slotTime = new Date(startDate.getTime() + (i * 30 * 60 * 1000))
    slots.push(slotTime.toISOString())
  }
  
  return slots
}

// Generate test customers
const generateCustomers = (count) => {
  const customers = []
  for (let i = 1; i <= count; i++) {
    customers.push({
      name: `Customer ${i}`,
      phone: `555-010${String(i).padStart(2, '0')}`,
      email: `customer${i}@test.com`
    })
  }
  return customers
}

// Create appointment booking request
const createBookingRequest = (customer, timeSlot) => ({
  barbershop_id: TEST_BARBERSHOP_ID,
  barber_id: TEST_BARBER_ID,
  service_id: TEST_SERVICE_ID,
  scheduled_at: timeSlot,
  duration_minutes: 30,
  service_price: 25.00,
  tip_amount: 5.00,
  client_name: customer.name,
  client_phone: customer.phone,
  client_email: customer.email,
  is_walk_in: false
})

// Test concurrent bookings for the same slot
const testConflictDetection = async () => {
  console.log('\n🚨 Testing Conflict Detection...')
  
  const timeSlot = generateTimeSlots()[0] // 9:00 AM slot
  const customers = generateCustomers(3) // 3 customers for same slot
  
  const promises = customers.map(async (customer, index) => {
    const request = createBookingRequest(customer, timeSlot)
    
    console.log(`   Booking ${index + 1}: ${customer.name} at ${timeSlot}`)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN || 'test-token'}`
        },
        body: JSON.stringify(request)
      })
      
      const result = await response.json()
      
      return {
        customer: customer.name,
        status: response.status,
        success: response.ok,
        message: result.error || result.message || 'Success',
        bookingId: result.data?.id
      }
    } catch (error) {
      return {
        customer: customer.name,
        status: 500,
        success: false,
        message: error.message,
        bookingId: null
      }
    }
  })
  
  const results = await Promise.all(promises)
  
  console.log('\n   Results:')
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`   ${status} ${result.customer}: ${result.status} - ${result.message}`)
  })
  
  // Should have exactly 1 success and 2 conflicts
  const successCount = results.filter(r => r.success).length
  const conflictCount = results.filter(r => r.status === 409).length
  
  console.log(`\n   Summary: ${successCount} bookings accepted, ${conflictCount} conflicts detected`)
  
  if (successCount === 1 && conflictCount === 2) {
    console.log('   ✅ Conflict detection working properly!')
    return true
  } else {
    console.log('   ❌ Conflict detection failed!')
    return false
  }
}

// Test high-volume sequential bookings
const testHighVolumeBookings = async () => {
  console.log('\n📈 Testing High-Volume Sequential Bookings...')
  
  const timeSlots = generateTimeSlots()
  const customers = generateCustomers(6) // One per slot
  
  const results = []
  const startTime = Date.now()
  
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i]
    const timeSlot = timeSlots[i]
    const request = createBookingRequest(customer, timeSlot)
    
    console.log(`   Booking ${i + 1}/6: ${customer.name} at ${new Date(timeSlot).toLocaleTimeString()}`)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TEST_USER_TOKEN || 'test-token'}`
        },
        body: JSON.stringify(request)
      })
      
      const result = await response.json()
      
      results.push({
        customer: customer.name,
        timeSlot: new Date(timeSlot).toLocaleTimeString(),
        status: response.status,
        success: response.ok,
        responseTime: Date.now() - startTime,
        bookingId: result.data?.id
      })
    } catch (error) {
      results.push({
        customer: customer.name,
        timeSlot: new Date(timeSlot).toLocaleTimeString(),
        status: 500,
        success: false,
        responseTime: Date.now() - startTime,
        error: error.message
      })
    }
  }
  
  const totalTime = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  
  console.log('\n   Results:')
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`   ${status} ${result.customer} (${result.timeSlot}): ${result.status}`)
  })
  
  console.log(`\n   Performance:`)
  console.log(`   📊 Total time: ${totalTime}ms`)
  console.log(`   📊 Success rate: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)`)
  console.log(`   📊 Avg response time: ${avgResponseTime.toFixed(0)}ms`)
  
  return {
    successRate: successCount / results.length,
    avgResponseTime,
    totalTime
  }
}

// Test appointment retrieval performance
const testAppointmentRetrieval = async () => {
  console.log('\n📋 Testing Appointment Retrieval Performance...')
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/appointments?barbershop_id=${TEST_BARBERSHOP_ID}&limit=50`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN || 'test-token'}`
      }
    })
    
    const result = await response.json()
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      console.log(`   ✅ Retrieved ${result.bookings?.length || 0} appointments in ${responseTime}ms`)
      return { success: true, responseTime, count: result.bookings?.length || 0 }
    } else {
      console.log(`   ❌ Failed to retrieve appointments: ${result.error}`)
      return { success: false, responseTime, error: result.error }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.log(`   ❌ Error retrieving appointments: ${error.message}`)
    return { success: false, responseTime, error: error.message }
  }
}

// Test analytics dashboard during high load
const testAnalyticsDashboard = async () => {
  console.log('\n📊 Testing Analytics Dashboard Performance...')
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/shop/analytics/dashboard?period_days=7`, {
      headers: {
        'Authorization': `Bearer ${process.env.TEST_USER_TOKEN || 'test-token'}`
      }
    })
    
    const result = await response.json()
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      console.log(`   ✅ Analytics loaded in ${responseTime}ms`)
      console.log(`   📊 Revenue: $${result.summary?.total_revenue || 0}`)
      console.log(`   📊 Appointments: ${result.summary?.total_appointments || 0}`)
      return { success: true, responseTime, data: result }
    } else {
      console.log(`   ❌ Analytics failed: ${result.error}`)
      return { success: false, responseTime, error: result.error }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.log(`   ❌ Analytics error: ${error.message}`)
    return { success: false, responseTime, error: error.message }
  }
}

// Cleanup test data
const cleanupTestData = async () => {
  console.log('\n🧹 Cleaning up test data...')
  
  try {
    // Delete test appointments
    const { error: appointmentsError } = await supabase
      .from('bookings')
      .delete()
      .eq('barbershop_id', TEST_BARBERSHOP_ID)
    
    if (appointmentsError) {
      console.log(`   ⚠️  Appointment cleanup warning: ${appointmentsError.message}`)
    }
    
    // Delete test customers (users with test emails)
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .like('email', '%@test.com')
    
    if (usersError) {
      console.log(`   ⚠️  User cleanup warning: ${usersError.message}`)
    }
    
    console.log('   ✅ Cleanup completed')
  } catch (error) {
    console.log(`   ❌ Cleanup error: ${error.message}`)
  }
}

// Main test execution
const runSaturdayRushTest = async () => {
  console.log('🏪 Saturday Morning Rush Test')
  console.log('========================================')
  console.log('Simulating busy barbershop operations...')
  
  // Verify environment
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase configuration')
    process.exit(1)
  }
  
  const testResults = {
    conflictDetection: false,
    highVolumeBookings: { successRate: 0, avgResponseTime: 0 },
    appointmentRetrieval: { success: false, responseTime: 0 },
    analyticsDashboard: { success: false, responseTime: 0 }
  }
  
  try {
    // Test 1: Conflict Detection
    testResults.conflictDetection = await testConflictDetection()
    
    // Test 2: High-Volume Sequential Bookings
    testResults.highVolumeBookings = await testHighVolumeBookings()
    
    // Test 3: Appointment Retrieval Performance
    testResults.appointmentRetrieval = await testAppointmentRetrieval()
    
    // Test 4: Analytics Dashboard Performance
    testResults.analyticsDashboard = await testAnalyticsDashboard()
    
    // Final Summary
    console.log('\n📋 SATURDAY RUSH TEST SUMMARY')
    console.log('========================================')
    
    const conflictStatus = testResults.conflictDetection ? '✅ PASS' : '❌ FAIL'
    console.log(`Conflict Detection: ${conflictStatus}`)
    
    const bookingStatus = testResults.highVolumeBookings.successRate >= 0.8 ? '✅ PASS' : '❌ FAIL'
    console.log(`High-Volume Bookings: ${bookingStatus} (${(testResults.highVolumeBookings.successRate * 100).toFixed(1)}% success)`)
    
    const retrievalStatus = testResults.appointmentRetrieval.success && testResults.appointmentRetrieval.responseTime < 2000 ? '✅ PASS' : '❌ FAIL'
    console.log(`Appointment Retrieval: ${retrievalStatus} (${testResults.appointmentRetrieval.responseTime}ms)`)
    
    const dashboardStatus = testResults.analyticsDashboard.success && testResults.analyticsDashboard.responseTime < 3000 ? '✅ PASS' : '❌ FAIL'
    console.log(`Analytics Dashboard: ${dashboardStatus} (${testResults.analyticsDashboard.responseTime}ms)`)
    
    // Overall assessment
    const allTestsPassed = testResults.conflictDetection && 
                          testResults.highVolumeBookings.successRate >= 0.8 &&
                          testResults.appointmentRetrieval.success &&
                          testResults.analyticsDashboard.success
    
    console.log('\n🏪 OVERALL ASSESSMENT:')
    if (allTestsPassed) {
      console.log('✅ SYSTEM READY FOR LIVE BARBERSHOP USE')
      console.log('   The booking system can handle Saturday morning rush scenarios')
    } else {
      console.log('❌ SYSTEM NEEDS ATTENTION BEFORE LIVE USE')
      console.log('   Review failed tests and optimize before production deployment')
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message)
  } finally {
    // Cleanup
    await cleanupTestData()
  }
}

// Execute if run directly
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  runSaturdayRushTest()
}

export { runSaturdayRushTest }