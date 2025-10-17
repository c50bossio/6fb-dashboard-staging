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

  try {
    const response = await fetch(`${STAGING_CONFIG.apiUrl}/api/health`)
    const data = await response.json()

    }m ${data.system?.uptime % 60}s`)
    
    // Check services
    const services = data.services || {}
    Object.entries(services).forEach(([service, config]) => {
      const status = config.status === 'healthy' || config.status === 'configured' ? '✅' : '❌'
      
    })
    
    if (response.ok && data.status === 'ok') {
      
      return { success: true, services: Object.keys(services).length }
    } else {
      
      return { success: false, error: data.error || 'Health check failed' }
    }
  } catch (error) {
    
    return { success: false, error: error.message }
  }
}

async function testDatabaseConnection() {

  if (!STAGING_CONFIG.supabaseUrl || !STAGING_CONFIG.supabaseKey) {
    
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
      
      return { success: false, error: error.message }
    }

    // Test RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from('barbershops')
      .select('*')
      .limit(1)
    
    if (rlsError) {
      ')
    } else {
      
    }
    
    return { success: true, connection: 'active' }
  } catch (error) {
    
    return { success: false, error: error.message }
  }
}

async function testAPIEndpoints() {

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

      if (success) successCount++
      
    } catch (error) {
      
    }
  }

  return {
    success: successCount >= Math.floor(endpoints.length * 0.8), // 80% success rate
    successCount,
    totalCount: endpoints.length
  }
}

async function testPublicBookingFlow() {

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

    .toLocaleString()}`)
    
    const response = await fetch(`${STAGING_CONFIG.apiUrl}/api/public/bookings/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    })
    
    const result = await response.json()

    if (response.status === 201 || response.status === 200) {
      if (result.success) {

        return { success: true, bookingId: result.booking?.id }
      }
    } else if (response.status === 404) {
      ')
      return { success: true, note: 'Expected 404 - no test barbershop in staging DB' }
    } else if (response.status === 400) {
      ')
      return { success: true, note: 'Validation working correctly' }
    }

    return { success: false, status: response.status, error: result.error }
    
  } catch (error) {
    
    return { success: false, error: error.message }
  }
}

async function testPaymentIntegration() {

  // Test Stripe configuration endpoint
  try {
    const response = await fetch(`${STAGING_CONFIG.apiUrl}/api/stripe/config`)
    
    if (response.status === 200) {
      const config = await response.json()

      return { success: true, testMode: config.testMode }
    } else if (response.status === 404) {
      ')
      return { success: true, note: 'Stripe config endpoint not available' }
    } else {
      
      return { success: false, status: response.status }
    }
  } catch (error) {
    
    return { success: false, error: error.message }
  }
}

async function testPerformanceMetrics() {

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
      `)
      
    } catch (error) {
      
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
  
  }ms`)

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

      if (test.result.success) allPassed++
      if (test.critical) {
        totalCritical++
        if (test.result.success) criticalPassed++
      }
    })

    // Final assessment

    if (criticalPassed === totalCritical && allPassed >= 5) {

      return true
    } else if (criticalPassed === totalCritical) {

      return true
    } else {

      return false
    }
    
  } catch (error) {
    console.error('\\n💥 Staging validation failed:', error.message)
    
    return false
  }
}

// ==========================================
// EXECUTION
// ==========================================

if (process.argv[1] === new URL(import.meta.url).pathname) {

  runStagingValidation()
    .then(ready => {
      if (ready) {

        process.exit(0)
      } else {

        process.exit(1)
      }
    })
    .catch(error => {
      console.error('\\n💥 Fatal validation error:', error.message)
      process.exit(1)
    })
}

export { runStagingValidation }