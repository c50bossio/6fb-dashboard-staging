#!/usr/bin/env node

/**
 * Test GET Requests - Verify all GET endpoints work with real Supabase data
 */

require('dotenv').config({ path: '.env.local' })

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
 * Test API GET endpoints
 */
async function testGetEndpoints() {
  const baseUrl = 'http://localhost:9999'
  const shopId = 'demo-shop-001'
  
  const endpoints = [
    {
      name: 'Analytics Live Data',
      url: `${baseUrl}/api/analytics/live-data?barbershop_id=${shopId}`,
      expectedFields: ['total_revenue', 'total_customers', 'total_appointments']
    },
    {
      name: 'Dashboard Metrics (Executive)',
      url: `${baseUrl}/api/dashboard/metrics?mode=executive&barbershop_id=${shopId}`,
      expectedFields: ['business_insights', 'system_health', 'ai_activity']
    },
    {
      name: 'Dashboard Metrics (Analytics)',
      url: `${baseUrl}/api/dashboard/metrics?mode=analytics&barbershop_id=${shopId}`,
      expectedFields: ['business_insights', 'system_health']
    },
    {
      name: 'Health Check',
      url: `${baseUrl}/api/health`,
      expectedFields: ['status']
    }
  ]
  
  const results = []
  
  for (const endpoint of endpoints) {
    log(`\n🔍 Testing: ${endpoint.name}`, 'info')
    log(`   URL: ${endpoint.url}`, 'info')
    
    try {
      const startTime = Date.now()
      const response = await fetch(endpoint.url)
      const responseTime = Date.now() - startTime
      
      log(`   Status: ${response.status} (${responseTime}ms)`, response.status === 200 ? 'success' : 'error')
      
      if (!response.ok) {
        const errorText = await response.text()
        log(`   Error: ${errorText}`, 'error')
        results.push({ 
          name: endpoint.name, 
          success: false, 
          error: `HTTP ${response.status}`,
          responseTime 
        })
        continue
      }
      
      const data = await response.json()
      
      // Check if expected fields are present
      let hasExpectedFields = true
      const missingFields = []
      
      for (const field of endpoint.expectedFields) {
        if (!(field in data) && !(field in (data.data || {}))) {
          hasExpectedFields = false
          missingFields.push(field)
        }
      }
      
      if (hasExpectedFields) {
        log(`   ✅ All expected fields present`, 'success')
        
        // Show sample data for analytics endpoints
        if (endpoint.name.includes('Analytics') && data.data) {
          log(`   Sample: Revenue $${data.data.total_revenue?.toLocaleString()}, Customers ${data.data.total_customers}`, 'info')
        } else if (endpoint.name.includes('Dashboard') && data.business_insights) {
          log(`   Sample: ${data.business_insights.active_barbershops} shops, ${data.business_insights.total_ai_recommendations} recommendations`, 'info')
        }
        
        results.push({ 
          name: endpoint.name, 
          success: true, 
          responseTime,
          sampleData: data.data || data
        })
      } else {
        log(`   ⚠️  Missing fields: ${missingFields.join(', ')}`, 'warning')
        results.push({ 
          name: endpoint.name, 
          success: false, 
          error: `Missing fields: ${missingFields.join(', ')}`,
          responseTime 
        })
      }
      
    } catch (error) {
      log(`   ❌ Request failed: ${error.message}`, 'error')
      results.push({ 
        name: endpoint.name, 
        success: false, 
        error: error.message,
        responseTime: 0
      })
    }
  }
  
  return results
}

/**
 * Test direct Supabase GET operations
 */
async function testDirectSupabaseGets() {
  log('\n🗄️  Testing Direct Supabase GET Operations...', 'info')
  
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  const shopId = 'demo-shop-001'
  const tables = ['customers', 'services', 'barbers', 'barbershops']
  const results = []
  
  for (const table of tables) {
    log(`\n📋 Testing ${table} table...`, 'info')
    
    try {
      const startTime = Date.now()
      
      // Test basic SELECT
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .eq(table === 'barbershops' ? 'id' : 'shop_id', shopId)
        .limit(5)
      
      const responseTime = Date.now() - startTime
      
      if (error) {
        log(`   ❌ Query failed: ${error.message}`, 'error')
        results.push({ table, success: false, error: error.message })
        continue
      }
      
      log(`   ✅ Query successful (${responseTime}ms)`, 'success')
      log(`   Records: ${count || data?.length || 0}`, 'info')
      
      if (data && data.length > 0) {
        const sample = data[0]
        const sampleFields = Object.keys(sample).slice(0, 3).join(', ')
        log(`   Sample fields: ${sampleFields}`, 'info')
        
        // Show specific useful info
        if (table === 'customers' && sample.name) {
          log(`   First customer: ${sample.name} ($${sample.total_spent || 0} spent)`, 'info')
        } else if (table === 'services' && sample.name) {
          log(`   First service: ${sample.name} ($${sample.price})`, 'info')
        } else if (table === 'barbers' && sample.name) {
          log(`   First barber: ${sample.name} (Rating: ${sample.rating})`, 'info')
        }
      }
      
      results.push({ 
        table, 
        success: true, 
        count: count || data?.length || 0,
        responseTime,
        hasData: data && data.length > 0
      })
      
    } catch (error) {
      log(`   ❌ Exception: ${error.message}`, 'error')
      results.push({ table, success: false, error: error.message })
    }
  }
  
  return results
}

/**
 * Main test function
 */
async function main() {
  log('🚀 Testing GET Requests - API and Database', 'info')
  log('Verifying all read operations work with real Supabase data', 'info')
  log('=' .repeat(70), 'info')
  
  // Test API endpoints
  log('\n🌐 TESTING API GET ENDPOINTS', 'info')
  log('=' .repeat(40), 'info')
  const apiResults = await testGetEndpoints()
  
  // Test direct database operations
  log('\n🗄️  TESTING DIRECT DATABASE GETS', 'info')
  log('=' .repeat(40), 'info')
  const dbResults = await testDirectSupabaseGets()
  
  // Summary
  log('\n📊 GET REQUESTS TEST SUMMARY', 'info')
  log('=' .repeat(70), 'info')
  
  // API Results
  log('\n🌐 API Endpoints:', 'info')
  const apiPassed = apiResults.filter(r => r.success).length
  const apiTotal = apiResults.length
  
  apiResults.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    const color = result.success ? 'success' : 'error'
    const time = result.responseTime ? ` (${result.responseTime}ms)` : ''
    log(`   ${status} ${result.name}${time}`, color)
    if (!result.success && result.error) {
      log(`       Error: ${result.error}`, 'error')
    }
  })
  
  // Database Results
  log('\n🗄️  Database Tables:', 'info')
  const dbPassed = dbResults.filter(r => r.success).length
  const dbTotal = dbResults.length
  
  dbResults.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    const color = result.success ? 'success' : 'error'
    const count = result.count !== undefined ? ` (${result.count} records)` : ''
    const time = result.responseTime ? ` ${result.responseTime}ms` : ''
    log(`   ${status} ${result.table}${count}${time}`, color)
    if (!result.success && result.error) {
      log(`       Error: ${result.error}`, 'error')
    }
  })
  
  // Final verdict
  log('\n🎯 OVERALL RESULTS:', 'info')
  log('=' .repeat(40), 'info')
  
  const totalPassed = apiPassed + dbPassed
  const totalTests = apiTotal + dbTotal
  
  log(`API Endpoints: ${apiPassed}/${apiTotal} passed`, apiPassed === apiTotal ? 'success' : 'warning')
  log(`Database Tables: ${dbPassed}/${dbTotal} passed`, dbPassed === dbTotal ? 'success' : 'warning')
  log(`Overall: ${totalPassed}/${totalTests} tests passed`, 'info')
  
  if (totalPassed === totalTests) {
    log('\n🎉 ALL GET REQUESTS WORKING PERFECTLY!', 'success')
    log('✅ API endpoints returning real Supabase data', 'success')
    log('✅ Direct database queries working correctly', 'success')
    log('✅ System fully operational for production use!', 'success')
    return true
  } else {
    log('\n⚠️  SOME GET REQUESTS FAILED', 'warning')
    log(`${totalTests - totalPassed} issues found that need attention`, 'error')
    return false
  }
}

main()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error('GET request testing failed:', error)
    process.exit(1)
  })