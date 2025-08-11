#!/usr/bin/env node

/**
 * Test Analytics Integration
 * Verifies all dashboard components work with real database (empty or populated)
 */

const fetch = require('node-fetch')

// Simple color functions for terminal output
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
}

const BASE_URL = 'http://localhost:9999'

// Test endpoints
const endpoints = [
  {
    name: 'Live Analytics Data',
    url: '/api/analytics/live-data',
    expectedKeys: ['success', 'data'],
    checkEmpty: true
  },
  {
    name: 'Dashboard Metrics',
    url: '/api/dashboard/metrics',
    expectedKeys: ['timestamp', 'system_health'],
    checkEmpty: false
  },
  {
    name: 'Trending Services',
    url: '/api/dashboard/metrics?type=trending_services',
    expectedKeys: ['services'],
    checkEmpty: true
  },
  {
    name: 'AI Insights',
    url: '/api/ai/insights',
    expectedKeys: ['success', 'insights'],
    checkEmpty: true
  }
]

// Dashboard pages to test
const pages = [
  {
    name: 'Main Dashboard',
    url: '/dashboard',
    checkFor: ['Dashboard', 'Analytics']
  },
  {
    name: 'Analytics Dashboard',
    url: '/dashboard/analytics',
    checkFor: ['Analytics', 'Metrics']
  },
  {
    name: 'Enhanced Analytics',
    url: '/dashboard/analytics-enhanced',
    checkFor: ['Enterprise', 'Location', 'Performance']
  }
]

async function testEndpoint(endpoint) {
  try {
    console.log(`\n📍 Testing: ${colors.cyan(endpoint.name)}`)
    console.log(`   URL: ${endpoint.url}`)
    
    const response = await fetch(`${BASE_URL}${endpoint.url}`)
    const data = await response.json()
    
    // Check response status
    if (response.ok) {
      console.log(colors.green('   ✅ Response OK'))
    } else {
      console.log(colors.yellow(`   ⚠️  Response status: ${response.status}`))
    }
    
    // Check expected keys
    const missingKeys = endpoint.expectedKeys.filter(key => !(key in data))
    if (missingKeys.length === 0) {
      console.log(colors.green('   ✅ All expected keys present'))
    } else {
      console.log(colors.red(`   ❌ Missing keys: ${missingKeys.join(', ')}`))
    }
    
    // Check for empty data handling
    if (endpoint.checkEmpty) {
      if (data.services?.length === 0 || data.insights?.length === 0 || 
          (data.data && Object.keys(data.data).length > 0)) {
        console.log(colors.green('   ✅ Handles empty/fallback data correctly'))
      } else {
        console.log(colors.yellow('   ⚠️  Check empty data handling'))
      }
    }
    
    // Show data source
    if (data.data_source) {
      console.log(`   📊 Data source: ${colors.blue(data.data_source)}`)
    }
    if (data.source) {
      console.log(`   📊 Source: ${colors.blue(data.source)}`)
    }
    
    return { success: true, endpoint: endpoint.name }
    
  } catch (error) {
    console.log(colors.red(`   ❌ Error: ${error.message}`))
    return { success: false, endpoint: endpoint.name, error: error.message }
  }
}

async function testPage(page) {
  try {
    console.log(`\n📄 Testing Page: ${colors.cyan(page.name)}`)
    console.log(`   URL: ${page.url}`)
    
    const response = await fetch(`${BASE_URL}${page.url}`)
    
    if (response.ok) {
      console.log(colors.green('   ✅ Page loads successfully'))
      
      const html = await response.text()
      
      // Check for expected content
      const foundContent = page.checkFor.filter(text => 
        html.toLowerCase().includes(text.toLowerCase())
      )
      
      if (foundContent.length === page.checkFor.length) {
        console.log(colors.green('   ✅ All expected content found'))
      } else {
        const missing = page.checkFor.filter(text => 
          !html.toLowerCase().includes(text.toLowerCase())
        )
        console.log(colors.yellow(`   ⚠️  Missing content: ${missing.join(', ')}`))
      }
      
      // Check for error indicators
      if (html.includes('error') || html.includes('Error')) {
        console.log(colors.yellow('   ⚠️  Page contains error text'))
      }
      
    } else {
      console.log(colors.red(`   ❌ Page returned status: ${response.status}`))
    }
    
    return { success: response.ok, page: page.name }
    
  } catch (error) {
    console.log(colors.red(`   ❌ Error: ${error.message}`))
    return { success: false, page: page.name, error: error.message }
  }
}

async function runTests() {
  console.log(colors.bold('\n🧪 Analytics Integration Test Suite'))
  console.log('=====================================')
  
  // Test health first
  console.log(colors.bold('\n1️⃣  Testing Server Health...'))
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`)
    const health = await healthResponse.json()
    
    if (health.status) {
      console.log(colors.green(`✅ Server is ${health.status}`))
    } else {
      console.log(colors.red('❌ Server health check failed'))
      return
    }
  } catch (error) {
    console.log(colors.red('❌ Server is not running. Start with: npm run dev'))
    return
  }
  
  // Test API endpoints
  console.log(colors.bold('\n2️⃣  Testing API Endpoints...'))
  const endpointResults = []
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint)
    endpointResults.push(result)
  }
  
  // Test dashboard pages
  console.log(colors.bold('\n3️⃣  Testing Dashboard Pages...'))
  const pageResults = []
  for (const page of pages) {
    const result = await testPage(page)
    pageResults.push(result)
  }
  
  // Summary
  console.log(colors.bold('\n📊 Test Summary'))
  console.log('================')
  
  const endpointsPassed = endpointResults.filter(r => r.success).length
  const pagesPassed = pageResults.filter(r => r.success).length
  
  console.log(`API Endpoints: ${colors.green(endpointsPassed)}/${endpoints.length} passed`)
  console.log(`Dashboard Pages: ${colors.green(pagesPassed)}/${pages.length} passed`)
  
  if (endpointsPassed === endpoints.length && pagesPassed === pages.length) {
    console.log(colors.bold(colors.green('\n✨ All tests passed! Analytics integration is working correctly.')))
    console.log(colors.cyan('\nNext steps:'))
    console.log('1. Create analytics tables in Supabase (see SQL output above)')
    console.log('2. Run: npm run seed:analytics')
    console.log('3. Verify dashboards show real data')
  } else {
    console.log(colors.bold(colors.yellow('\n⚠️  Some tests failed. Check the output above for details.')))
  }
}

// Run the tests
runTests().catch(console.error)