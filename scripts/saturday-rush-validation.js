#!/usr/bin/env node

import fetch from 'node-fetch'

const API_BASE = 'http://localhost:9999'

/**
 * Saturday Morning Rush Validation
 * Tests system performance and reliability for live barbershop operations
 */

// Test system health under load
async function testSystemHealth() {

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

  if (successCount >= 8) {
    
    return true
  } else if (successCount >= 6) {
    
    return true
  } else {
    
    return false
  }
}

// Test response times under concurrent load
async function testResponseTimes() {

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
    
    return false
  }
  
  const avgResponseTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length
  const maxResponseTime = Math.max(...successfulResults.map(r => r.responseTime))
  const minResponseTime = Math.min(...successfulResults.map(r => r.responseTime))

  }ms`)

  if (avgResponseTime < 1000 && maxResponseTime < 3000) {
    
    return true
  } else if (avgResponseTime < 2000 && maxResponseTime < 5000) {
    
    return true
  } else {
    
    return false
  }
}

// Test system memory and performance indicators
async function testSystemPerformance() {

  try {
    const response = await fetch(`${API_BASE}/api/health`)
    const healthData = await response.json()
    
    if (!response.ok || !healthData.system) {
      
      return false
    }
    
    const memory = healthData.system.memory
    const uptime = healthData.system.uptime
    
    .toFixed(1)}%)`)
    }m ${uptime%60}s`)
    
    const memoryUsagePercent = memory.used / memory.total
    
    if (memoryUsagePercent < 0.7) {
      
    } else if (memoryUsagePercent < 0.85) {
      
    } else {
      ')
    }
    
    // Test service connectivity
    const services = healthData.services || {}
    const serviceCount = Object.keys(services).length
    const healthyServices = Object.values(services).filter(s => 
      s.status === 'healthy' || s.status === 'configured'
    ).length

    if (services.supabase?.status === 'healthy') {
      
    } else {
      
    }
    
    return memoryUsagePercent < 0.85 && healthyServices >= serviceCount * 0.8
    
  } catch (error) {
    
    return false
  }
}

// Test error handling and resilience
async function testErrorResilience() {

  // Test invalid endpoint
  try {
    const response = await fetch(`${API_BASE}/api/invalid-endpoint`)

    if (response.status === 404) {
      
    } else {
      
    }
  } catch (error) {
    
    return false
  }
  
  // Test malformed request
  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"malformed": json'  // Invalid JSON
    })

    if (response.status >= 400 && response.status < 500) {
      
      return true
    } else {
      
      return false
    }
  } catch (error) {
    // This is actually expected for malformed requests
    
    return true
  }
}

// Simulate concurrent booking attempts (Saturday rush scenario)
async function testConcurrentBookingLoad() {

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

  if (serverErrors === 0 && authErrors >= 10) {
    
    return true
  } else {
    
    return false
  }
}

// Main test runner
async function runSaturdayRushValidation() {

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

      if (test.passed) allPassed++
      if (test.critical) {
        totalCritical++
        if (test.passed) criticalPassed++
      }
    })

    // Final assessment

    if (criticalPassed === totalCritical && allPassed >= 4) {

      return true
    } else if (criticalPassed === totalCritical) {

      return true
    } else {

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
      
      process.exit(passed ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 Fatal validation error:', error.message)
      process.exit(1)
    })
}