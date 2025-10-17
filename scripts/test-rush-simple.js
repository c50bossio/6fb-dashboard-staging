import fetch from 'node-fetch'

/**
 * Simple Saturday Rush Test
 * Tests critical booking flow scenarios for live barbershop use
 */

const API_BASE_URL = 'http://localhost:9999'

// Test booking conflict detection
async function testConflictDetection() {

  const timeSlot = '2025-01-15T09:00:00.000Z'
  const customers = [
    { name: 'John Doe', phone: '555-0101', email: 'john@test.com' },
    { name: 'Jane Smith', phone: '555-0102', email: 'jane@test.com' },
    { name: 'Bob Wilson', phone: '555-0103', email: 'bob@test.com' }
  ]
  
  const bookingTemplate = {
    barbershop_id: 'test-shop-id',
    barber_id: 'test-barber-id',
    service_id: 'test-service-id',
    scheduled_at: timeSlot,
    duration_minutes: 30,
    service_price: 25.00,
    tip_amount: 5.00,
    is_walk_in: false
  }

  const results = []
  
  // Sequential test (easier to debug than concurrent)
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i]
    const booking = {
      ...bookingTemplate,
      client_name: customer.name,
      client_phone: customer.phone,
      client_email: customer.email
    }
    
    try {

      const response = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      })
      
      const result = await response.json()
      
      results.push({
        customer: customer.name,
        status: response.status,
        success: response.ok,
        message: result.error || 'Success'
      })
      
    } catch (error) {
      results.push({
        customer: customer.name,
        status: 'ERROR',
        success: false,
        message: error.message
      })
    }
  }

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    
  })
  
  const successCount = results.filter(r => r.success).length
  const conflictCount = results.filter(r => r.status === 409).length

  return successCount === 1 && conflictCount === 2
}

// Test rapid sequential bookings (busy morning)
async function testRapidBookings() {

  const timeSlots = [
    '2025-01-15T09:00:00.000Z',
    '2025-01-15T09:30:00.000Z', 
    '2025-01-15T10:00:00.000Z',
    '2025-01-15T10:30:00.000Z',
    '2025-01-15T11:00:00.000Z'
  ]
  
  const customers = [
    { name: 'Mike Johnson', phone: '555-0201', email: 'mike@test.com' },
    { name: 'Sarah Davis', phone: '555-0202', email: 'sarah@test.com' },
    { name: 'Tom Brown', phone: '555-0203', email: 'tom@test.com' },
    { name: 'Lisa Wilson', phone: '555-0204', email: 'lisa@test.com' },
    { name: 'Chris Lee', phone: '555-0205', email: 'chris@test.com' }
  ]
  
  const bookingTemplate = {
    barbershop_id: 'test-shop-id',
    barber_id: 'test-barber-id',
    service_id: 'test-service-id',
    duration_minutes: 30,
    service_price: 30.00,
    tip_amount: 6.00,
    is_walk_in: false
  }
  
  const startTime = Date.now()
  const results = []
  
  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i]
    const timeSlot = timeSlots[i]
    const booking = {
      ...bookingTemplate,
      scheduled_at: timeSlot,
      client_name: customer.name,
      client_phone: customer.phone,
      client_email: customer.email
    }
    
    try {
      .toLocaleTimeString()}`)
      
      const response = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
      })
      
      const result = await response.json()
      
      results.push({
        customer: customer.name,
        timeSlot: new Date(timeSlot).toLocaleTimeString(),
        status: response.status,
        success: response.ok,
        message: result.error || 'Success'
      })
      
    } catch (error) {
      results.push({
        customer: customer.name,
        timeSlot: new Date(timeSlots[i]).toLocaleTimeString(),
        status: 'ERROR',
        success: false,
        message: error.message
      })
    }
  }
  
  const totalTime = Date.now() - startTime
  const successCount = results.filter(r => r.success).length

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    : ${result.status}`)
  })

  .toFixed(1)}%)`)
  .toFixed(0)}ms`)
  
  return {
    successRate: successCount / results.length,
    totalTime,
    avgTime: totalTime / results.length
  }
}

// Test analytics performance under load
async function testAnalyticsPerformance() {

  const startTime = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/shop/analytics/dashboard?period_days=30`)
    const result = await response.json()
    const responseTime = Date.now() - startTime
    
    if (response.ok) {

      return { success: true, responseTime }
    } else {
      
      return { success: false, responseTime }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    return { success: false, responseTime }
  }
}

// Main test function
async function runSaturdayRushTest() {

  const results = {
    conflictDetection: false,
    rapidBookings: { successRate: 0, avgTime: 0 },
    analytics: { success: false, responseTime: 0 }
  }
  
  try {
    // Test 1: Conflict Detection
    
    results.conflictDetection = await testConflictDetection()
    
    // Test 2: Rapid Sequential Bookings  
    
    results.rapidBookings = await testRapidBookings()
    
    // Test 3: Analytics Performance
    
    results.analytics = await testAnalyticsPerformance()
    
    // Summary

    const conflictStatus = results.conflictDetection ? '✅ PASS' : '❌ FAIL'

    const bookingStatus = results.rapidBookings.successRate >= 0.8 ? '✅ PASS' : '❌ FAIL'
    .toFixed(1)}% success, ${results.rapidBookings.avgTime.toFixed(0)}ms avg)`)
    
    const analyticsStatus = results.analytics.success && results.analytics.responseTime < 3000 ? '✅ PASS' : '❌ FAIL'
    `)
    
    // Overall assessment
    const allTestsPassed = results.conflictDetection && 
                          results.rapidBookings.successRate >= 0.8 &&
                          results.analytics.success

    if (allTestsPassed) {

    } else {

    }
    
    return allTestsPassed
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message)
    return false
  }
}

// Run the test
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runSaturdayRushTest()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Fatal error:', error.message)
      process.exit(1)
    })
}

export { runSaturdayRushTest }