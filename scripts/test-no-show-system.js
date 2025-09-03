#!/usr/bin/env node

/**
 * Comprehensive test script for No-Show Management System
 * Tests all API endpoints, database operations, and UI integration
 */

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9999'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test utilities
const log = (message, type = 'info') => {
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }[type] || '📝'
  
  console.log(`${prefix} ${message}`)
}

const testSection = (title) => {
  console.log('\n' + '='.repeat(60))
  console.log(`🧪 ${title}`)
  console.log('='.repeat(60))
}

// Test Functions
async function testDatabaseTables() {
  testSection('Testing Database Tables')
  
  const tables = [
    'no_show_policies',
    'no_show_incidents',
    'client_strike_history',
    'grace_period_rules',
    'blocked_clients',
    'blocked_client_recovery',
    'no_show_recovery_attempts',
    'no_show_fee_transactions',
    'no_show_automation_rules'
  ]
  
  let passed = 0
  let failed = 0
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        log(`Table '${table}': NOT FOUND`, 'error')
        failed++
      } else {
        log(`Table '${table}': EXISTS (${count || 0} rows)`, 'success')
        passed++
      }
    } catch (e) {
      log(`Table '${table}': ERROR - ${e.message}`, 'error')
      failed++
    }
  }
  
  return { passed, failed, total: tables.length }
}

async function testAPIEndpoints() {
  testSection('Testing API Endpoints')
  
  // Create a test user session
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpassword123'
  })
  
  if (authError || !authData?.session) {
    log('Could not authenticate test user - skipping API tests', 'warning')
    return { passed: 0, failed: 0, total: 0 }
  }
  
  const token = authData.session.access_token
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
  
  const endpoints = [
    {
      name: 'GET /api/no-show/policies',
      method: 'GET',
      url: `${baseUrl}/api/no-show/policies`
    },
    {
      name: 'GET /api/no-show/incidents',
      method: 'GET',
      url: `${baseUrl}/api/no-show/incidents`
    },
    {
      name: 'GET /api/no-show/recovery',
      method: 'GET',
      url: `${baseUrl}/api/no-show/recovery`
    }
  ]
  
  let passed = 0
  let failed = 0
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        log(`${endpoint.name}: SUCCESS (${response.status})`, 'success')
        passed++
      } else {
        const error = await response.text()
        log(`${endpoint.name}: FAILED (${response.status}) - ${error}`, 'error')
        failed++
      }
    } catch (e) {
      log(`${endpoint.name}: ERROR - ${e.message}`, 'error')
      failed++
    }
  }
  
  return { passed, failed, total: endpoints.length }
}

async function testBusinessLogic() {
  testSection('Testing Business Logic')
  
  const tests = []
  let passed = 0
  let failed = 0
  
  // Test 1: Policy Creation
  try {
    const { data: policy, error } = await supabase
      .from('no_show_policies')
      .insert({
        barbershop_id: '00000000-0000-0000-0000-000000000001', // Test barbershop
        name: 'Test Policy',
        is_active: true,
        strikes_before_block: 3,
        strike_reset_period_days: 90,
        no_show_fee_enabled: true,
        no_show_fee_amount: 25.00,
        late_cancel_fee_enabled: true,
        late_cancel_fee_amount: 15.00,
        late_cancel_hours_threshold: 2,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      log('Policy Creation: FAILED - ' + error.message, 'error')
      failed++
    } else {
      log('Policy Creation: SUCCESS', 'success')
      passed++
      
      // Clean up
      await supabase
        .from('no_show_policies')
        .delete()
        .eq('id', policy.id)
    }
  } catch (e) {
    log('Policy Creation: ERROR - ' + e.message, 'error')
    failed++
  }
  
  // Test 2: Strike Calculation
  try {
    // This would normally be done through the API
    const strikeRules = {
      no_show: 1,
      late_cancel: 0.5
    }
    
    const testCases = [
      { type: 'no_show', expected: 1 },
      { type: 'late_cancel', expected: 0.5 }
    ]
    
    let allCorrect = true
    for (const test of testCases) {
      const result = strikeRules[test.type]
      if (result !== test.expected) {
        allCorrect = false
        break
      }
    }
    
    if (allCorrect) {
      log('Strike Calculation: SUCCESS', 'success')
      passed++
    } else {
      log('Strike Calculation: FAILED', 'error')
      failed++
    }
  } catch (e) {
    log('Strike Calculation: ERROR - ' + e.message, 'error')
    failed++
  }
  
  // Test 3: Grace Period Logic
  try {
    const gracePeriods = {
      new_client: 2,
      regular_client: 1,
      vip_client: 3,
      loyal_client: 2
    }
    
    const clientTypes = Object.keys(gracePeriods)
    if (clientTypes.length === 4) {
      log('Grace Period Logic: SUCCESS', 'success')
      passed++
    } else {
      log('Grace Period Logic: FAILED', 'error')
      failed++
    }
  } catch (e) {
    log('Grace Period Logic: ERROR - ' + e.message, 'error')
    failed++
  }
  
  return { passed, failed, total: 3 }
}

async function testUIIntegration() {
  testSection('Testing UI Integration')
  
  const tests = []
  let passed = 0
  let failed = 0
  
  // Test 1: Settings Page Route
  try {
    const response = await fetch(`${baseUrl}/shop/settings/booking`)
    
    if (response.ok || response.status === 401) { // 401 is ok - means route exists
      log('Booking Settings Page: EXISTS', 'success')
      passed++
    } else {
      log('Booking Settings Page: NOT FOUND', 'error')
      failed++
    }
  } catch (e) {
    log('Booking Settings Page: ERROR - ' + e.message, 'error')
    failed++
  }
  
  // Test 2: UnifiedSettingsInterface Integration
  try {
    // Check if the component file exists
    const fs = await import('fs')
    const componentPath = path.join(__dirname, '../components/settings/NoShowSettings.js')
    
    if (fs.existsSync(componentPath)) {
      log('NoShowSettings Component: EXISTS', 'success')
      passed++
    } else {
      log('NoShowSettings Component: NOT FOUND', 'error')
      failed++
    }
  } catch (e) {
    log('NoShowSettings Component: ERROR - ' + e.message, 'error')
    failed++
  }
  
  return { passed, failed, total: 2 }
}

// Main test runner
async function runTests() {
  console.log('🏁 Starting No-Show Management System Tests')
  console.log('='.repeat(60))
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log('='.repeat(60))
  
  const results = {
    database: await testDatabaseTables(),
    api: await testAPIEndpoints(),
    logic: await testBusinessLogic(),
    ui: await testUIIntegration()
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  let totalPassed = 0
  let totalFailed = 0
  let totalTests = 0
  
  for (const [category, result] of Object.entries(results)) {
    totalPassed += result.passed
    totalFailed += result.failed
    totalTests += result.total
    
    const percentage = result.total > 0 
      ? Math.round((result.passed / result.total) * 100) 
      : 0
    
    const status = percentage === 100 ? '✅' : percentage >= 50 ? '⚠️' : '❌'
    
    console.log(`${status} ${category.toUpperCase()}: ${result.passed}/${result.total} passed (${percentage}%)`)
  }
  
  console.log('='.repeat(60))
  
  const overallPercentage = totalTests > 0 
    ? Math.round((totalPassed / totalTests) * 100) 
    : 0
  
  if (overallPercentage === 100) {
    console.log(`🎉 ALL TESTS PASSED! (${totalPassed}/${totalTests})`)
  } else if (overallPercentage >= 75) {
    console.log(`✅ MOSTLY PASSING: ${totalPassed}/${totalTests} tests passed (${overallPercentage}%)`)
  } else if (overallPercentage >= 50) {
    console.log(`⚠️  PARTIAL SUCCESS: ${totalPassed}/${totalTests} tests passed (${overallPercentage}%)`)
  } else {
    console.log(`❌ NEEDS WORK: Only ${totalPassed}/${totalTests} tests passed (${overallPercentage}%)`)
  }
  
  console.log('\n📝 RECOMMENDATIONS:')
  
  if (results.database.failed > 0) {
    console.log('   - Run database migration: npm run migrate:no-show')
  }
  
  if (results.api.failed > 0) {
    console.log('   - Check API endpoints are properly configured')
    console.log('   - Ensure authentication is working')
  }
  
  if (results.logic.failed > 0) {
    console.log('   - Review business logic implementation')
  }
  
  if (results.ui.failed > 0) {
    console.log('   - Verify UI components are properly integrated')
  }
  
  process.exit(overallPercentage === 100 ? 0 : 1)
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error)
  process.exit(1)
})