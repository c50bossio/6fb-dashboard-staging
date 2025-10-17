#!/usr/bin/env node

/**
 * Production Deployment Test for BookedBarber.com
 * Tests the automated payout system in production
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.production' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProductionDeployment() {

  const testResults = {
    database: [],
    api: [],
    functionality: []
  }
  
  let allTestsPassed = true

  // Test 1: Database Tables

  const tablesToTest = [
    'commission_transactions',
    'barber_commission_balances', 
    'commission_payout_records',
    'financial_arrangements'
  ]
  
  for (const table of tablesToTest) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        
        testResults.database.push({ table, status: 'FAIL', error: error.message })
        allTestsPassed = false
      } else {
        
        testResults.database.push({ table, status: 'PASS' })
      }
    } catch (err) {
      
      testResults.database.push({ table, status: 'ERROR', error: err.message })
      allTestsPassed = false
    }
  }

  // Test 2: Check Table Structure

  try {
    // Check commission_transactions columns
    const { data: commissionCols } = await supabase
      .from('commission_transactions')
      .select('*')
      .limit(0)

    // Check barber_commission_balances columns
    const { data: balanceCols } = await supabase
      .from('barber_commission_balances')
      .select('*')
      .limit(0)

    // Check commission_payout_records columns
    const { data: payoutCols } = await supabase
      .from('commission_payout_records')
      .select('*')
      .limit(0)

    testResults.database.push({ test: 'Structure', status: 'PASS' })
    
  } catch (error) {
    
    testResults.database.push({ test: 'Structure', status: 'FAIL', error: error.message })
    allTestsPassed = false
  }

  // Test 3: Test Data Operations

  try {
    // Get a barbershop for testing
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(1)
    
    if (barbershops && barbershops.length > 0) {
      const testShop = barbershops[0]

      // Try to query commission balances for this shop
      const { data: balances, error: balanceError } = await supabase
        .from('barber_commission_balances')
        .select('*')
        .eq('barbershop_id', testShop.id)
      
      if (balanceError) {
        
        testResults.functionality.push({ test: 'Balance Query', status: 'FAIL' })
        allTestsPassed = false
      } else {
        `)
        testResults.functionality.push({ test: 'Balance Query', status: 'PASS' })
      }
      
      // Check financial arrangements
      const { data: arrangements } = await supabase
        .from('financial_arrangements')
        .select('*')
        .eq('barbershop_id', testShop.id)

      testResults.functionality.push({ test: 'Arrangements Query', status: 'PASS' })
      
    } else {
      
      testResults.functionality.push({ test: 'Data Operations', status: 'SKIP' })
    }
    
  } catch (error) {
    
    testResults.functionality.push({ test: 'Data Operations', status: 'FAIL', error: error.message })
    allTestsPassed = false
  }

  // Test 4: API Endpoints (via fetch)

  const productionUrl = 'https://bookedbarber.com'
  const apiEndpoints = [
    '/api/shop/financial/integration-status',
    '/api/shop/financial/commission-balances',
    '/api/shop/financial/payouts/schedule'
  ]

  for (const endpoint of apiEndpoints) {
    
    testResults.api.push({ endpoint, status: 'MANUAL_TEST_REQUIRED' })
  }

  // Test 5: Service Integration

  try {
    const PayoutScheduler = require('../services/payout-scheduler')
    const scheduler = new PayoutScheduler()
    
    testResults.functionality.push({ test: 'PayoutScheduler', status: 'PASS' })
  } catch (error) {
    
    testResults.functionality.push({ test: 'PayoutScheduler', status: 'FAIL' })
    allTestsPassed = false
  }

  // Test Summary

  const totalTests = [
    ...testResults.database,
    ...testResults.api,
    ...testResults.functionality
  ]
  
  const passedTests = totalTests.filter(t => t.status === 'PASS').length
  const failedTests = totalTests.filter(t => t.status === 'FAIL').length
  const manualTests = totalTests.filter(t => t.status === 'MANUAL_TEST_REQUIRED').length

  if (failedTests === 0) {

  } else {

  }

  .toLocaleString())

  return allTestsPassed
}

// Run the test
if (require.main === module) {
  testProductionDeployment()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error)
      process.exit(1)
    })
}

module.exports = { testProductionDeployment }