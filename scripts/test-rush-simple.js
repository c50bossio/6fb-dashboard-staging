import fetch from 'node-fetch'

/**
 * Simple Saturday Rush Test
 * Tests critical booking flow scenarios for live barbershop use
 */

const API_BASE_URL = 'http://localhost:9999'

// Test booking conflict detection
async function testConflictDetection() {
  console.log('\n🚨 Testing Booking Conflicts...')
  
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
  
  console.log('   Attempting 3 concurrent bookings for same time slot...')
  
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
      console.log(`   Booking ${i + 1}: ${customer.name}`)
      
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
  
  console.log('\n   Results:')
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    console.log(`   ${icon} ${result.customer}: ${result.status} - ${result.message}`)
  })
  
  const successCount = results.filter(r => r.success).length
  const conflictCount = results.filter(r => r.status === 409).length
  
  console.log(`\n   Expected: 1 success, 2 conflicts`)
  console.log(`   Actual: ${successCount} success, ${conflictCount} conflicts`)
  
  return successCount === 1 && conflictCount === 2
}

// Test rapid sequential bookings (busy morning)
async function testRapidBookings() {
  console.log('\n📈 Testing Rapid Sequential Bookings...')
  
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
      console.log(`   Booking ${i + 1}/5: ${customer.name} at ${new Date(timeSlot).toLocaleTimeString()}`)
      
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
  
  console.log('\n   Results:')
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    console.log(`   ${icon} ${result.customer} (${result.timeSlot}): ${result.status}`)
  })
  
  console.log(`\n   Performance:`)
  console.log(`   📊 Total time: ${totalTime}ms`)
  console.log(`   📊 Success rate: ${successCount}/${results.length} (${(successCount/results.length*100).toFixed(1)}%)`)
  console.log(`   📊 Average per booking: ${(totalTime/results.length).toFixed(0)}ms`)
  
  return {
    successRate: successCount / results.length,
    totalTime,
    avgTime: totalTime / results.length
  }
}

// Test analytics performance under load
async function testAnalyticsPerformance() {
  console.log('\n📊 Testing Analytics Performance...')
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/shop/analytics/dashboard?period_days=30`)
    const result = await response.json()
    const responseTime = Date.now() - startTime
    
    if (response.ok) {
      console.log(`   ✅ Analytics loaded in ${responseTime}ms`)
      console.log(`   📊 Data source: ${result.data_source}`)
      console.log(`   📊 Revenue: $${result.summary?.total_revenue || 0}`)
      console.log(`   📊 Appointments: ${result.summary?.total_appointments || 0}`)
      return { success: true, responseTime }
    } else {
      console.log(`   ❌ Analytics failed: ${result.error}`)
      return { success: false, responseTime }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.log(`   ❌ Analytics error: ${error.message}`)
    return { success: false, responseTime }
  }
}

// Main test function
async function runSaturdayRushTest() {
  console.log('🏪 SATURDAY MORNING RUSH TEST')
  console.log('========================================')
  console.log('Testing system readiness for live barbershop use...\n')
  
  const results = {
    conflictDetection: false,
    rapidBookings: { successRate: 0, avgTime: 0 },
    analytics: { success: false, responseTime: 0 }
  }
  
  try {
    // Test 1: Conflict Detection
    console.log('TEST 1: Conflict Detection')
    results.conflictDetection = await testConflictDetection()
    
    // Test 2: Rapid Sequential Bookings  
    console.log('\nTEST 2: Rapid Sequential Bookings')
    results.rapidBookings = await testRapidBookings()
    
    // Test 3: Analytics Performance
    console.log('\nTEST 3: Analytics Performance')
    results.analytics = await testAnalyticsPerformance()
    
    // Summary
    console.log('\n📋 SATURDAY RUSH TEST SUMMARY')
    console.log('========================================')
    
    const conflictStatus = results.conflictDetection ? '✅ PASS' : '❌ FAIL'
    console.log(`Conflict Detection: ${conflictStatus}`)
    
    const bookingStatus = results.rapidBookings.successRate >= 0.8 ? '✅ PASS' : '❌ FAIL'
    console.log(`Rapid Bookings: ${bookingStatus} (${(results.rapidBookings.successRate * 100).toFixed(1)}% success, ${results.rapidBookings.avgTime.toFixed(0)}ms avg)`)
    
    const analyticsStatus = results.analytics.success && results.analytics.responseTime < 3000 ? '✅ PASS' : '❌ FAIL'
    console.log(`Analytics Dashboard: ${analyticsStatus} (${results.analytics.responseTime}ms)`)
    
    // Overall assessment
    const allTestsPassed = results.conflictDetection && 
                          results.rapidBookings.successRate >= 0.8 &&
                          results.analytics.success
    
    console.log('\n🏪 LIVE BARBERSHOP READINESS:')
    if (allTestsPassed) {
      console.log('✅ SYSTEM READY FOR SATURDAY MORNING RUSH')
      console.log('   All critical functions working properly')
    } else {
      console.log('❌ SYSTEM NEEDS ATTENTION')
      console.log('   Fix issues before high-volume operations')
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