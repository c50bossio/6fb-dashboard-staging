#!/usr/bin/env node

/**
 * Test Real Database Operations - End-to-End Testing
 * Verify that we can actually CREATE, READ, UPDATE records in Supabase
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const SHOP_ID = "demo-shop-001"

/**
 * Log with colors
 */
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  }
  console.log(`${colors[type]}${message}${colors.reset}`)
}

/**
 * Test 1: Read existing data (should work)
 */
async function testReadOperations() {
  log('🔍 TEST 1: Reading existing data from Supabase...', 'info')
  
  try {
    // Test reading customers
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', SHOP_ID)
      .limit(5)
    
    if (customersError) throw customersError
    
    log(`✅ READ SUCCESS: Found ${customers.length} customers`, 'success')
    if (customers.length > 0) {
      log(`   Sample: ${customers[0].name} (${customers[0].email})`, 'info')
    }
    
    // Test reading services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', SHOP_ID)
      .limit(3)
    
    if (servicesError) throw servicesError
    
    log(`✅ READ SUCCESS: Found ${services.length} services`, 'success')
    if (services.length > 0) {
      log(`   Sample: ${services[0].name} ($${services[0].price})`, 'info')
    }
    
    return true
    
  } catch (error) {
    log(`❌ READ FAILED: ${error.message}`, 'error')
    return false
  }
}

/**
 * Test 2: Create new record (critical test)
 */
async function testCreateOperations() {
  log('\n📝 TEST 2: Creating new records in Supabase...', 'info')
  
  try {
    // Create a test customer
    const testCustomer = {
      name: 'End-to-End Test Customer',
      email: `test-${Date.now()}@barbershop.com`,
      phone: '555-TEST-123',
      shop_id: SHOP_ID,
      barbershop_id: SHOP_ID,
      preferences: { notification_sms: true },
      is_test: true, // Mark as test data
      total_visits: 1,
      total_spent: 45.00
    }
    
    const { data: createdCustomer, error: createError } = await supabase
      .from('customers')
      .insert([testCustomer])
      .select()
    
    if (createError) throw createError
    
    if (createdCustomer && createdCustomer.length > 0) {
      log(`✅ CREATE SUCCESS: New customer created with ID ${createdCustomer[0].id}`, 'success')
      log(`   Name: ${createdCustomer[0].name}`, 'info')
      log(`   Email: ${createdCustomer[0].email}`, 'info')
      return createdCustomer[0]
    } else {
      throw new Error('Customer created but no data returned')
    }
    
  } catch (error) {
    log(`❌ CREATE FAILED: ${error.message}`, 'error')
    log(`   This means data is NOT posting to Supabase database!`, 'error')
    return null
  }
}

/**
 * Test 3: Update existing record
 */
async function testUpdateOperations(customerId) {
  log('\n✏️  TEST 3: Updating records in Supabase...', 'info')
  
  if (!customerId) {
    log('⏭️  SKIPPING: No customer ID to update', 'warning')
    return false
  }
  
  try {
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({ 
        total_visits: 2, 
        total_spent: 90.00,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
    
    if (updateError) throw updateError
    
    if (updatedCustomer && updatedCustomer.length > 0) {
      log(`✅ UPDATE SUCCESS: Customer updated`, 'success')
      log(`   Total Visits: ${updatedCustomer[0].total_visits}`, 'info')
      log(`   Total Spent: $${updatedCustomer[0].total_spent}`, 'info')
      return true
    }
    
    return false
    
  } catch (error) {
    log(`❌ UPDATE FAILED: ${error.message}`, 'error')
    return false
  }
}

/**
 * Test 4: Delete test record (cleanup)
 */
async function testDeleteOperations(customerId) {
  log('\n🗑️  TEST 4: Cleaning up test records...', 'info')
  
  if (!customerId) {
    log('⏭️  SKIPPING: No customer ID to delete', 'warning')
    return false
  }
  
  try {
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)
    
    if (deleteError) throw deleteError
    
    log(`✅ DELETE SUCCESS: Test customer removed`, 'success')
    return true
    
  } catch (error) {
    log(`❌ DELETE FAILED: ${error.message}`, 'error')
    return false
  }
}

/**
 * Test 5: Verify our dashboard data calculations work with real data
 */
async function testDashboardCalculations() {
  log('\n📊 TEST 5: Testing dashboard calculations with real data...', 'info')
  
  try {
    // Import our dashboard data functions
    const { getBusinessMetrics } = await import('./lib/dashboard-data.js')
    
    const metrics = await getBusinessMetrics(SHOP_ID)
    
    log(`✅ METRICS SUCCESS: Dashboard calculations working`, 'success')
    log(`   Revenue: $${metrics.revenue}`, 'info')
    log(`   Customers: ${metrics.customers}`, 'info')
    log(`   Appointments: ${metrics.appointments}`, 'info')
    log(`   Satisfaction: ${metrics.satisfaction}`, 'info')
    
    // Verify numbers make sense
    if (metrics.customers > 0 && metrics.revenue > 0) {
      const avgSpend = Math.round(metrics.revenue / metrics.customers)
      log(`   Avg Customer Spend: $${avgSpend}`, 'info')
      
      if (avgSpend > 10 && avgSpend < 2000) { // Reasonable range
        log(`✅ DATA QUALITY: Numbers look realistic`, 'success')
        return true
      } else {
        log(`⚠️  DATA QUALITY: Numbers seem unrealistic`, 'warning')
        return false
      }
    }
    
    return metrics.customers > 0
    
  } catch (error) {
    log(`❌ METRICS FAILED: ${error.message}`, 'error')
    return false
  }
}

/**
 * Main test suite
 */
async function runEndToEndTests() {
  log('🚀 Starting End-to-End Database Testing...', 'info')
  log('Testing real CREATE, READ, UPDATE, DELETE operations on Supabase', 'info')
  log('=' .repeat(60), 'info')
  
  const results = {
    read: false,
    create: false,
    update: false,
    delete: false,
    dashboard: false
  }
  
  let testCustomerId = null
  
  try {
    // Test 1: Read operations
    results.read = await testReadOperations()
    
    // Test 2: Create operations (CRITICAL)
    const createdCustomer = await testCreateOperations()
    if (createdCustomer) {
      results.create = true
      testCustomerId = createdCustomer.id
    }
    
    // Test 3: Update operations
    results.update = await testUpdateOperations(testCustomerId)
    
    // Test 4: Delete operations (cleanup)
    results.delete = await testDeleteOperations(testCustomerId)
    
    // Test 5: Dashboard calculations
    results.dashboard = await testDashboardCalculations()
    
  } catch (error) {
    log(`❌ TESTING FAILED: ${error.message}`, 'error')
  }
  
  // Final Results
  log('\n📊 FINAL TEST RESULTS:', 'info')
  log('=' .repeat(60), 'info')
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL'
    const color = passed ? 'success' : 'error'
    log(`${status} ${test.toUpperCase()} operations`, color)
  })
  
  const allPassed = Object.values(results).every(r => r)
  const passedCount = Object.values(results).filter(r => r).length
  const totalTests = Object.values(results).length
  
  log('=' .repeat(60), 'info')
  
  if (allPassed) {
    log(`🎉 ALL TESTS PASSED! (${passedCount}/${totalTests})`, 'success')
    log('✅ Database is working correctly - data DOES post to Supabase!', 'success')
    log('✅ Ready for production deployment!', 'success')
  } else {
    log(`⚠️  SOME TESTS FAILED (${passedCount}/${totalTests})`, 'warning')
    
    if (!results.create) {
      log('❌ CRITICAL: CREATE operations failed - data is NOT posting to Supabase!', 'error')
    }
    if (!results.dashboard) {
      log('❌ CRITICAL: Dashboard calculations failed - metrics may be incorrect!', 'error')
    }
  }
  
  return allPassed
}

// Run the tests
if (require.main === module) {
  runEndToEndTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test runner failed:', error)
      process.exit(1)
    })
}

module.exports = { runEndToEndTests }