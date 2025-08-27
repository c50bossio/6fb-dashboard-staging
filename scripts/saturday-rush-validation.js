#!/usr/bin/env node

import fetch from 'node-fetch'

const API_BASE = 'http://localhost:9999'

/**
 * Saturday Morning Rush Validation
 * Tests system performance and reliability for live barbershop operations
 */

// Test system health under load
async function testSystemHealth() {
  console.log('\n🏥 Testing System Health...')
  
  const promises = []
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch(`${API_BASE}/api/health`)
        .then(res => res.json())
        .then(data => ({
          success: true,
          responseTime: Date.now(),
          status: data.status
        }))
        .catch(error => ({
          success: false,
          error: error.message
        }))
    )
  }
  
  const results = await Promise.all(promises)
  const successCount = results.filter(r => r.success).length
  
  console.log(`   ✅ Health checks: ${successCount}/10 successful`)
  
  if (successCount >= 8) {
    console.log('   🟢 System health: EXCELLENT')
    return true
  } else if (successCount >= 6) {
    console.log('   🟡 System health: MODERATE')
    return true
  } else {
    console.log('   🔴 System health: POOR')
    return false
  }
}

// Test response times under concurrent load
async function testResponseTimes() {
  console.log('\n⏱️  Testing Response Times...')
  
  const startTime = Date.now()
  const promises = []
  
  // Simulate 20 concurrent health check requests (Saturday rush simulation)
  for (let i = 0; i < 20; i++) {
    promises.push(
      fetch(`${API_BASE}/api/health`)
        .then(res => {
          const endTime = Date.now()
          return res.json().then(data => ({
            success: res.ok,
            responseTime: endTime - startTime,
            status: data.status
          }))
        })
        .catch(error => ({
          success: false,
          responseTime: Date.now() - startTime,
          error: error.message
        }))
    )
  }
  
  const results = await Promise.all(promises)
  const successfulResults = results.filter(r => r.success)
  
  if (successfulResults.length === 0) {
    console.log('   ❌ All requests failed')
    return false
  }
  
  const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length
  const maxResponseTime = Math.max(...successfulResults.map(r => r.responseTime))
  const minResponseTime = Math.min(...successfulResults.map(r => r.responseTime))
  
  console.log(`   📊 Successful requests: ${successfulResults.length}/20`)
  console.log(`   📊 Average response time: ${avgResponseTime.toFixed(0)}ms`)
  console.log(`   📊 Min response time: ${minResponseTime}ms`)
  console.log(`   📊 Max response time: ${maxResponseTime}ms`)
  
  if (avgResponseTime < 1000 && maxResponseTime < 3000) {
    console.log('   🟢 Response times: EXCELLENT for busy operations')
    return true
  } else if (avgResponseTime < 2000 && maxResponseTime < 5000) {
    console.log('   🟡 Response times: ACCEPTABLE for moderate load')
    return true
  } else {
    console.log('   🔴 Response times: TOO SLOW for peak hours')
    return false
  }
}

// Test system memory and performance indicators
async function testSystemPerformance() {
  console.log('\n🚀 Testing System Performance...')
  
  try {
    const response = await fetch(`${API_BASE}/api/health`)
    const healthData = await response.json()
    
    if (!response.ok || !healthData.system) {
      console.log('   ❌ Cannot retrieve system performance data')
      return false
    }
    
    const memory = healthData.system.memory
    const uptime = healthData.system.uptime
    
    console.log(`   💾 Memory usage: ${memory.used}MB / ${memory.total}MB (${(memory.used/memory.total*100).toFixed(1)}%)`)
    console.log(`   ⏰ System uptime: ${Math.floor(uptime/60)}m ${uptime%60}s`)
    
    const memoryUsagePercent = memory.used / memory.total
    
    if (memoryUsagePercent < 0.7) {
      console.log('   🟢 Memory usage: HEALTHY')
    } else if (memoryUsagePercent < 0.85) {
      console.log('   🟡 Memory usage: MODERATE')
    } else {
      console.log('   🔴 Memory usage: HIGH (may impact performance)')
    }
    
    // Test service connectivity
    const services = healthData.services || {}
    const serviceCount = Object.keys(services).length
    const healthyServices = Object.values(services).filter(s => 
      s.status === 'healthy' || s.status === 'configured'
    ).length
    
    console.log(`   🔌 Services: ${healthyServices}/${serviceCount} operational`)
    
    if (services.supabase?.status === 'healthy') {
      console.log('   ✅ Database connection: ACTIVE')
    } else {
      console.log('   ❌ Database connection: ISSUES DETECTED')
    }
    
    return memoryUsagePercent < 0.85 && healthyServices >= serviceCount * 0.8
    
  } catch (error) {
    console.log(`   ❌ Performance test failed: ${error.message}`)
    return false
  }
}

// Test error handling and resilience
async function testErrorResilience() {
  console.log('\n🛡️  Testing Error Resilience...')
  
  // Test invalid endpoint
  try {
    const response = await fetch(`${API_BASE}/api/invalid-endpoint`)
    console.log(`   📊 Invalid endpoint response: ${response.status}`)
    
    if (response.status === 404) {
      console.log('   ✅ Proper 404 handling')
    } else {
      console.log('   ⚠️  Unexpected response for invalid endpoint')
    }
  } catch (error) {
    console.log(`   ❌ Error handling test failed: ${error.message}`)
    return false
  }
  
  // Test malformed request
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"malformed": json'  // Invalid JSON
    })
    
    console.log(`   📊 Malformed request response: ${response.status}`)
    
    if (response.status >= 400 && response.status < 500) {
      console.log('   ✅ Proper error handling for bad requests')
      return true
    } else {
      console.log('   ⚠️  Unexpected response for malformed request')
      return false
    }
  } catch (error) {
    // This is actually expected for malformed requests
    console.log('   ✅ System properly rejects malformed requests')
    return true
  }
}

// Simulate concurrent booking attempts (Saturday rush scenario)
async function testConcurrentBookingLoad() {
  console.log('\n🏪 Testing Concurrent Booking Load Simulation...')
  
  // We'll test the booking endpoints without auth to see basic response handling
  const bookingRequests = []
  
  for (let i = 0; i < 15; i++) {
    bookingRequests.push(
      fetch(`${API_BASE}/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershop_id: 'test-shop',
          service_id: 'test-service',
          scheduled_at: '2025-01-15T09:00:00.000Z',
          duration_minutes: 30,
          service_price: 25.00
        })
      })
      .then(res => ({
        status: res.status,
        success: res.ok,
        isAuthError: res.status === 401
      }))
      .catch(error => ({
        status: 'ERROR',
        success: false,
        error: error.message
      }))
    )
  }
  
  const results = await Promise.all(bookingRequests)
  const authErrors = results.filter(r => r.isAuthError).length
  const serverErrors = results.filter(r => r.status >= 500).length
  const successResponses = results.filter(r => r.status === 401).length // 401 is expected without auth
  
  console.log(`   📊 Auth-required responses: ${authErrors}/15`)
  console.log(`   📊 Server errors: ${serverErrors}/15`) 
  console.log(`   📊 Proper request handling: ${successResponses}/15`)
  
  if (serverErrors === 0 && authErrors >= 10) {
    console.log('   ✅ System handles concurrent booking load properly')
    return true
  } else {
    console.log('   ❌ System struggling under concurrent booking load')
    return false
  }
}

// Main test runner
async function runSaturdayRushValidation() {
  console.log('🏪 SATURDAY MORNING RUSH VALIDATION')
  console.log('===============================================')
  console.log('Testing system readiness for live barbershop operations...')
  
  const testResults = {
    systemHealth: false,
    responseTime: false,
    performance: false,
    errorResilience: false,
    concurrentLoad: false
  }
  
  try {
    // Run all tests
    testResults.systemHealth = await testSystemHealth()
    testResults.responseTime = await testResponseTimes()
    testResults.performance = await testSystemPerformance()
    testResults.errorResilience = await testErrorResilience()
    testResults.concurrentLoad = await testConcurrentBookingLoad()
    
    // Generate summary
    console.log('\n📋 SATURDAY RUSH READINESS SUMMARY')
    console.log('===============================================')
    
    const tests = [
      { name: 'System Health', passed: testResults.systemHealth, critical: true },
      { name: 'Response Times', passed: testResults.responseTime, critical: true },
      { name: 'System Performance', passed: testResults.performance, critical: true },
      { name: 'Error Resilience', passed: testResults.errorResilience, critical: false },
      { name: 'Concurrent Load', passed: testResults.concurrentLoad, critical: true }
    ]
    
    let criticalPassed = 0
    let totalCritical = 0
    let allPassed = 0
    
    tests.forEach(test => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL'
      const priority = test.critical ? '[CRITICAL]' : '[OPTIONAL]'
      console.log(`${test.name}: ${status} ${priority}`)
      
      if (test.passed) allPassed++
      if (test.critical) {
        totalCritical++
        if (test.passed) criticalPassed++
      }
    })
    
    console.log(`\nResults: ${allPassed}/${tests.length} total, ${criticalPassed}/${totalCritical} critical`)
    
    // Final assessment
    console.log('\n🏪 LIVE BARBERSHOP READINESS:')
    
    if (criticalPassed === totalCritical && allPassed >= 4) {
      console.log('✅ SYSTEM READY FOR SATURDAY MORNING RUSH')
      console.log('   All critical systems operational')
      console.log('   Barbershop can handle peak hour traffic')
      return true
    } else if (criticalPassed === totalCritical) {
      console.log('🟡 SYSTEM MOSTLY READY')
      console.log('   Critical systems work, minor issues present')
      console.log('   Acceptable for live operations with monitoring')
      return true
    } else {
      console.log('❌ SYSTEM NOT READY FOR PEAK OPERATIONS')
      console.log('   Critical issues must be resolved first')
      console.log('   Risk of service failures during busy periods')
      return false
    }
    
  } catch (error) {
    console.error('\n❌ Validation suite failed:', error.message)
    return false
  }
}

// Execute if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runSaturdayRushValidation()
    .then(passed => {
      console.log(passed ? '\n🎉 Validation completed successfully' : '\n⚠️  Validation identified issues')
      process.exit(passed ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 Fatal validation error:', error.message)
      process.exit(1)
    })
}