#!/usr/bin/env node

/**
 * Quick Performance Test for Customer Intelligence Dashboard
 * Verifies that optimizations are working correctly
 */

require('dotenv').config()
const fetch = require('node-fetch')

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'

async function testPerformance() {
  
  )
  
  const tests = []
  
  // Test 1: Customer Count API (should be fast)
  
  const start1 = Date.now()
  try {
    const response = await fetch(`${BASE_URL}/api/customers?limit=1`, {
      headers: {
        'Cookie': 'test-auth-token=test' // You'll need to add actual auth
      }
    })
    const time1 = Date.now() - start1
    const data = await response.json()

    tests.push({
      name: 'Customer Count API',
      time: time1,
      passed: time1 < 200,
      benchmark: 200
    })
  } catch (error) {
    
  }
  
  // Test 2: Paginated Customer Fetch
  
  const start2 = Date.now()
  try {
    const response = await fetch(`${BASE_URL}/api/customers?page=1&limit=10`, {
      headers: {
        'Cookie': 'test-auth-token=test'
      }
    })
    const time2 = Date.now() - start2
    const data = await response.json()

    tests.push({
      name: 'Paginated Fetch',
      time: time2,
      passed: time2 < 300,
      benchmark: 300
    })
  } catch (error) {
    
  }
  
  // Test 3: Cache Performance (second call should be faster)

  // First call (cache miss)
  const start3a = Date.now()
  try {
    await fetch(`${BASE_URL}/api/customers/analytics/health-scores?barbershop_id=test&limit=10`)
    const time3a = Date.now() - start3a
    : ${time3a}ms`)
    
    // Second call (should hit cache)
    const start3b = Date.now()
    await fetch(`${BASE_URL}/api/customers/analytics/health-scores?barbershop_id=test&limit=10`)
    const time3b = Date.now() - start3b
    : ${time3b}ms`)
    
    const improvement = ((time3a - time3b) / time3a * 100).toFixed(1)

    tests.push({
      name: 'Cache Performance',
      cacheImprovement: improvement,
      passed: time3b < time3a * 0.5, // Should be at least 50% faster
      benchmark: '50% improvement'
    })
  } catch (error) {
    
  }
  
  // Test 4: Memory Usage
  
  const memUsage = process.memoryUsage()
  const heapMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1)
  
  .toFixed(1)}MB`)
  
  tests.push({
    name: 'Memory Usage',
    heapMB: parseFloat(heapMB),
    passed: parseFloat(heapMB) < 100,
    benchmark: '< 100MB'
  })
  
  // Summary
  )
  
  )
  
  const passed = tests.filter(t => t.passed).length
  const total = tests.length
  const passRate = (passed / total * 100).toFixed(0)
  
  `)
  
  tests.forEach(test => {
    const status = test.passed ? '✅' : '❌'
    const timeStr = test.time ? `${test.time}ms` : test.cacheImprovement ? `${test.cacheImprovement}%` : `${test.heapMB}MB`
    `)
  })
  
  // Performance improvements achieved
  
  )
  ')

}

// Run the test
testPerformance().catch(console.error)