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

  const timeSlot = generateTimeSlots()[0] // 9:00 AM slot
  const customers = generateCustomers(3) // 3 customers for same slot
  
  const promises = customers.map(async (customer, index) => {
    const request = createBookingRequest(customer, timeSlot)

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

  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    
  })
  
  // Should have exactly 1 success and 2 conflicts
  const successCount = results.filter(r => r.success).length
  const conflictCount = results.filter(r => r.status === 409).length

  if (successCount === 1 && conflictCount === 2) {
    
    return true
  } else {
    
    return false
  }
}

// Test high-volume sequential bookings
const testHighVolumeBookings = async () => {

  const timeSlots = generateTimeSlots()
  const customers = generateCustomers(6) // One per slot
  
  const results = []
  const startTime = Date.now()
  
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i]
    const timeSlot = timeSlots[i]
    const request = createBookingRequest(customer, timeSlot)
    
    .toLocaleTimeString()}`)
    
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

  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    : ${result.status}`)
  })

  .toFixed(1)}%)`)
  }ms`)
  
  return {
    successRate: successCount / results.length,
    avgResponseTime,
    totalTime
  }
}

// Test appointment retrieval performance
const testAppointmentRetrieval = async () => {

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
      
      return { success: true, responseTime, count: result.bookings?.length || 0 }
    } else {
      
      return { success: false, responseTime, error: result.error }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return { success: false, responseTime, error: error.message }
  }
}

// Test analytics dashboard during high load
const testAnalyticsDashboard = async () => {

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

      return { success: true, responseTime, data: result }
    } else {
      
      return { success: false, responseTime, error: result.error }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return { success: false, responseTime, error: error.message }
  }
}

// Cleanup test data
const cleanupTestData = async () => {

  try {
    // Delete test appointments
    const { error: appointmentsError } = await supabase
      .from('bookings')
      .delete()
      .eq('barbershop_id', TEST_BARBERSHOP_ID)
    
    if (appointmentsError) {
      
    }
    
    // Delete test customers (users with test emails)
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .like('email', '%@test.com')
    
    if (usersError) {
      
    }

  } catch (error) {
    
  }
}

// Main test execution
const runSaturdayRushTest = async () => {

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

    const conflictStatus = testResults.conflictDetection ? '✅ PASS' : '❌ FAIL'

    const bookingStatus = testResults.highVolumeBookings.successRate >= 0.8 ? '✅ PASS' : '❌ FAIL'
    .toFixed(1)}% success)`)
    
    const retrievalStatus = testResults.appointmentRetrieval.success && testResults.appointmentRetrieval.responseTime < 2000 ? '✅ PASS' : '❌ FAIL'
    `)
    
    const dashboardStatus = testResults.analyticsDashboard.success && testResults.analyticsDashboard.responseTime < 3000 ? '✅ PASS' : '❌ FAIL'
    `)
    
    // Overall assessment
    const allTestsPassed = testResults.conflictDetection && 
                          testResults.highVolumeBookings.successRate >= 0.8 &&
                          testResults.appointmentRetrieval.success &&
                          testResults.analyticsDashboard.success

    if (allTestsPassed) {

    } else {

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