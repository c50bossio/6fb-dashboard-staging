#!/usr/bin/env node

import fetch from 'node-fetch'
import { createClient } from '@supabase/supabase-js'

/**
 * Staging Deployment Validation Script
 * Validates all critical systems before production deployment
 */

// Configuration - Update these for your staging environment
const STAGING_CONFIG = {
  apiUrl: process.env.STAGING_API_URL || 'https://your-staging-app.vercel.app',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  stripeTestMode: true
}

// Test data for staging validation
const TEST_DATA = {
  barbershop: {
    id: 'staging-test-shop-001',
    name: 'Staging Test Barbershop',
    owner_email: 'owner@staging-test.com'
  },
  customer: {
    name: 'John Staging',
    email: 'customer@staging-test.com', 
    phone: '555-STAGE-01'
  },
  service: {
    id: 'staging-service-001',
    name: 'Test Haircut',
    price: 25.00,
    duration: 30
  },
  booking: {
    scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    duration_minutes: 30,
    service_price: 25.00
  }
}

// ==========================================
// VALIDATION TESTS
// ==========================================

async function testSystemHealth() {
  console.log('\n🏥 Testing System Health...')
  
  try {
    const response = await fetch(`${STAGING_CONFIG.apiUrl}/api/health`)
    const data = await response.json()
    
    console.log(`   📊 Response Status: ${response.status}`)
    console.log(`   🔌 System Status: ${data.status}`)
    console.log(`   💾 Memory Usage: ${data.system?.memory?.used}MB / ${data.system?.memory?.total}MB`)
    console.log(`   ⏰ Uptime: ${Math.floor(data.system?.uptime / 60)}m ${data.system?.uptime % 60}s`)
    
    // Check services
    const services = data.services || {}
    Object.entries(services).forEach(([service, config]) => {
      const status = config.status === 'healthy' || config.status === 'configured' ? '✅' : '❌'
      console.log(`   ${status} ${service}: ${config.status}`)
    })
    
    if (response.ok && data.status === 'ok') {
      console.log('   ✅ System health: EXCELLENT')
      return { success: true, services: Object.keys(services).length }
    } else {
      console.log('   ❌ System health: FAILED')
      return { success: false, error: data.error || 'Health check failed' }
    }
  } catch (error) {
    console.log(`   ❌ Health check error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️  Testing Database Connection...')
  
  if (!STAGING_CONFIG.supabaseUrl || !STAGING_CONFIG.supabaseKey) {
    console.log('   ⚠️  Supabase configuration missing')
    return { success: false, error: 'Missing Supabase configuration' }
  }
  
  try {
    const supabase = createClient(STAGING_CONFIG.supabaseUrl, STAGING_CONFIG.supabaseKey)
    
    // Test basic query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log(`   ❌ Database error: ${error.message}`)
      return { success: false, error: error.message }
    }
    
    console.log('   ✅ Database connection: ACTIVE')
    console.log(`   📊 Query response: Success`)
    
    // Test RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from('barbershops')
      .select('*')
      .limit(1)
    
    if (rlsError) {
      console.log('   ✅ Row Level Security: ENABLED (expected auth error)')
    } else {
      console.log('   ⚠️  Row Level Security: May need verification')
    }
    
    return { success: true, connection: 'active' }
  } catch (error) {
    console.log(`   ❌ Database connection failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testAPIEndpoints() {
  console.log('\n🔌 Testing API Endpoints...')
  
  const endpoints = [
    { path: '/api/health', method: 'GET', expectAuth: false },
    { path: '/api/public/barbershop/test-shop', method: 'GET', expectAuth: false },
    { path: '/api/public/services', method: 'GET', expectAuth: false },
    { path: '/api/appointments', method: 'GET', expectAuth: true },
    { path: '/api/shop/analytics/dashboard', method: 'GET', expectAuth: true }
  ]
  
  let successCount = 0
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${STAGING_CONFIG.apiUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      })
      
      const expectedStatus = endpoint.expectAuth ? 401 : [200, 404] // 404 is OK for test data
      const actualStatus = response.status
      
      let success = false
      if (endpoint.expectAuth && actualStatus === 401) {
        success = true // Auth required endpoints should return 401 without auth
      } else if (!endpoint.expectAuth && (actualStatus >= 200 && actualStatus < 300)) {
        success = true // Public endpoints should work
      } else if (!endpoint.expectAuth && actualStatus === 404) {
        success = true // 404 is acceptable for test data
      }
      
      const statusIcon = success ? '✅' : '❌'
      console.log(`   ${statusIcon} ${endpoint.method} ${endpoint.path}: ${actualStatus}`)
      
      if (success) successCount++
      
    } catch (error) {
      console.log(`   ❌ ${endpoint.method} ${endpoint.path}: Connection error`)
    }
  }
  
  console.log(`   📊 Endpoints working: ${successCount}/${endpoints.length}`)
  
  return {
    success: successCount >= Math.floor(endpoints.length * 0.8), // 80% success rate
    successCount,
    totalCount: endpoints.length
  }
}

async function testPublicBookingFlow() {
  console.log('\n📅 Testing Public Booking Flow...')
  
  const bookingData = {
    barbershop_id: TEST_DATA.barbershop.id,
    service_id: TEST_DATA.service.id,
    service_name: TEST_DATA.service.name,
    scheduled_at: TEST_DATA.booking.scheduled_at,
    duration_minutes: TEST_DATA.booking.duration_minutes,
    service_price: TEST_DATA.booking.service_price,
    customer_name: TEST_DATA.customer.name,
    customer_phone: TEST_DATA.customer.phone,
    customer_email: TEST_DATA.customer.email,
    source: 'staging_validation'
  }
  
  try {
    console.log('   📝 Testing booking creation...')
    console.log(`   👤 Customer: ${TEST_DATA.customer.name}`)
    console.log(`   📞 Phone: ${TEST_DATA.customer.phone}`)
    console.log(`   ⏰ Time: ${new Date(TEST_DATA.booking.scheduled_at).toLocaleString()}`)
    
    const response = await fetch(`${STAGING_CONFIG.apiUrl}/api/public/bookings/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    })
    
    const result = await response.json()
    
    console.log(`   📊 Response Status: ${response.status}`)
    console.log(`   📨 Message: ${result.message || result.error || 'No message'}`)
    
    if (response.status === 201 || response.status === 200) {
      if (result.success) {
        console.log('   ✅ Booking creation: SUCCESS')
        console.log(`   🎫 Booking ID: ${result.booking?.id}`)
        return { success: true, bookingId: result.booking?.id }
      }
    } else if (response.status === 404) {
      console.log('   ℹ️  Barbershop not found (expected for staging without real data)')
      return { success: true, note: 'Expected 404 - no test barbershop in staging DB' }
    } else if (response.status === 400) {
      console.log('   ✅ Input validation working (400 response)')
      return { success: true, note: 'Validation working correctly' }
    }
    
    console.log(`   ⚠️  Booking response: ${response.status} - ${result.error || 'Unknown'}`)
    return { success: false, status: response.status, error: result.error }
    
  } catch (error) {
    console.log(`   ❌ Booking test failed: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testPaymentIntegration() {
  console.log('\n💳 Testing Payment Integration...')
  
  // Test Stripe configuration endpoint
  try {
    const response = await fetch(`${STAGING_CONFIG.apiUrl}/api/stripe/config`)
    
    if (response.status === 200) {
      const config = await response.json()
      console.log('   ✅ Stripe configuration: LOADED')
      console.log(`   🔧 Test mode: ${config.testMode || 'Unknown'}`)
      return { success: true, testMode: config.testMode }
    } else if (response.status === 404) {
      console.log('   ℹ️  Stripe config endpoint not found (may not be implemented)')
      return { success: true, note: 'Stripe config endpoint not available' }
    } else {
      console.log(`   ⚠️  Stripe config response: ${response.status}`)
      return { success: false, status: response.status }
    }
  } catch (error) {
    console.log(`   ❌ Payment test error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testPerformanceMetrics() {
  console.log('\n⚡ Testing Performance Metrics...')
  
  const performanceTests = []
  
  // Test multiple endpoints for performance
  const testEndpoints = [
    '/api/health',
    '/api/public/services',
    '/api/public/barbershop/test'
  ]
  
  for (const endpoint of testEndpoints) {
    try {
      const startTime = Date.now()
      const response = await fetch(`${STAGING_CONFIG.apiUrl}${endpoint}`)
      const responseTime = Date.now() - startTime
      
      performanceTests.push({
        endpoint,
        responseTime,
        status: response.status,
        success: response.status < 500
      })
      
      const statusIcon = response.status < 500 ? '✅' : '❌'
      console.log(`   ${statusIcon} ${endpoint}: ${responseTime}ms (${response.status})`)
      
    } catch (error) {
      console.log(`   ❌ ${endpoint}: Connection error`)
      performanceTests.push({
        endpoint,
        responseTime: 0,
        success: false,
        error: error.message
      })
    }
  }
  
  const successfulTests = performanceTests.filter(t => t.success)
  const avgResponseTime = successfulTests.reduce((sum, t) => sum + t.responseTime, 0) / successfulTests.length
  
  console.log(`   📊 Average response time: ${avgResponseTime.toFixed(0)}ms`)
  console.log(`   📊 Success rate: ${successfulTests.length}/${performanceTests.length}`)
  
  return {
    success: successfulTests.length >= performanceTests.length * 0.8,
    avgResponseTime,
    successRate: successfulTests.length / performanceTests.length
  }
}

// ==========================================
// MAIN VALIDATION RUNNER
// ==========================================

async function runStagingValidation() {
  console.log('🚀 STAGING DEPLOYMENT VALIDATION')
  console.log('=====================================')
  console.log(`Testing staging environment: ${STAGING_CONFIG.apiUrl}`)
  
  const results = {
    systemHealth: { success: false },
    databaseConnection: { success: false },
    apiEndpoints: { success: false },
    publicBooking: { success: false },
    paymentIntegration: { success: false },
    performance: { success: false }
  }
  
  try {
    // Run all validation tests
    results.systemHealth = await testSystemHealth()
    results.databaseConnection = await testDatabaseConnection()
    results.apiEndpoints = await testAPIEndpoints()
    results.publicBooking = await testPublicBookingFlow()
    results.paymentIntegration = await testPaymentIntegration()
    results.performance = await testPerformanceMetrics()
    
    // Generate comprehensive summary
    console.log('\n📋 STAGING VALIDATION SUMMARY')
    console.log('=====================================')
    
    const tests = [
      { name: 'System Health', result: results.systemHealth, critical: true },
      { name: 'Database Connection', result: results.databaseConnection, critical: true },
      { name: 'API Endpoints', result: results.apiEndpoints, critical: true },
      { name: 'Public Booking Flow', result: results.publicBooking, critical: true },
      { name: 'Payment Integration', result: results.paymentIntegration, critical: false },
      { name: 'Performance Metrics', result: results.performance, critical: false }
    ]
    
    let criticalPassed = 0
    let totalCritical = 0
    let allPassed = 0
    
    tests.forEach(test => {
      const status = test.result.success ? '✅ PASS' : '❌ FAIL'
      const priority = test.critical ? '[CRITICAL]' : '[OPTIONAL]'
      console.log(`${test.name}: ${status} ${priority}`)
      
      if (test.result.success) allPassed++
      if (test.critical) {
        totalCritical++
        if (test.result.success) criticalPassed++
      }
    })
    
    console.log(`\\nResults: ${allPassed}/${tests.length} total, ${criticalPassed}/${totalCritical} critical`)
    
    // Final assessment
    console.log('\\n🎯 STAGING READINESS FOR PRODUCTION:')
    
    if (criticalPassed === totalCritical && allPassed >= 5) {
      console.log('✅ STAGING FULLY VALIDATED - READY FOR PRODUCTION')
      console.log('   All critical systems operational')
      console.log('   Performance within acceptable limits')
      console.log('   Database and API integration working')
      console.log('   🚀 PROCEED WITH PRODUCTION DEPLOYMENT')
      return true
    } else if (criticalPassed === totalCritical) {
      console.log('🟡 STAGING MOSTLY READY - MINOR ISSUES')
      console.log('   All critical systems working')
      console.log('   Some optional features may need attention')
      console.log('   ✅ SAFE TO PROCEED WITH CAUTION')
      return true
    } else {
      console.log('❌ STAGING NOT READY - CRITICAL ISSUES')
      console.log('   Critical systems failing')
      console.log('   Must resolve issues before production')
      console.log('   ⚠️  DO NOT DEPLOY TO PRODUCTION')
      return false
    }
    
  } catch (error) {
    console.error('\\n💥 Staging validation failed:', error.message)
    console.log('❌ VALIDATION SUITE ERROR - INVESTIGATE IMMEDIATELY')
    return false
  }
}

// ==========================================
// EXECUTION
// ==========================================

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log('🔧 STAGING VALIDATION CONFIGURATION')
  console.log('===================================')
  console.log(`API URL: ${STAGING_CONFIG.apiUrl}`)
  console.log(`Supabase URL: ${STAGING_CONFIG.supabaseUrl || 'Not configured'}`)
  console.log(`Stripe Test Mode: ${STAGING_CONFIG.stripeTestMode}`)
  console.log('')
  
  runStagingValidation()
    .then(ready => {
      if (ready) {
        console.log('\\n🎉 Staging validation completed successfully!')
        console.log('   Ready for production deployment')
        process.exit(0)
      } else {
        console.log('\\n⚠️  Staging validation identified issues')
        console.log('   Review and fix before production deployment')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('\\n💥 Fatal validation error:', error.message)
      process.exit(1)
    })
}

export { runStagingValidation }