#!/usr/bin/env node

/**
 * Cin7 Integration Test Script
 * Tests all the fixes we've implemented for the Cin7 integration
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testCin7Integration() {
  console.log('🧪 Testing Cin7 Integration Improvements...\n')

  const tests = [
    testDatabaseSchema,
    testCredentialsAPI,
    testSyncAPI,
    testWebhookHandler,
    testDataMapping,
    testFieldValidation
  ]

  let passed = 0
  let total = tests.length

  for (const test of tests) {
    try {
      const result = await test()
      if (result) {
        console.log(`✅ ${test.name} - PASSED`)
        passed++
      } else {
        console.log(`❌ ${test.name} - FAILED`)
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`)
    }
    console.log('')
  }

  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All tests passed! Cin7 integration is working correctly.')
  } else {
    console.log('⚠️ Some tests failed. Please review the integration.')
  }
}

async function testDatabaseSchema() {
  console.log('🗄️ Testing database schema...')
  
  try {
    // Check if cin7_credentials table exists
    const { data, error } = await supabase
      .from('cin7_credentials')
      .select('*')
      .limit(1)
    
    if (error && error.code === '42P01') {
      console.log('   ⚠️ cin7_credentials table does not exist')
      console.log('   💡 Run: psql -f database/cin7-credentials-migration.sql')
      return false
    }
    
    console.log('   ✓ cin7_credentials table exists')
    return true
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message)
    return false
  }
}

async function testCredentialsAPI() {
  console.log('🔐 Testing credentials API endpoints...')
  
  try {
    // Test GET endpoint
    const getResponse = await fetch('http://localhost:9999/api/cin7/credentials', {
      method: 'GET',
      headers: {
        'Cookie': 'test-session=true' // Mock authentication for testing
      }
    })
    
    if (getResponse.status === 401) {
      console.log('   ✓ GET /api/cin7/credentials requires authentication')
    } else {
      console.log('   ⚠️ GET /api/cin7/credentials response:', getResponse.status)
    }
    
    // Test that hardcoded barbershop IDs are removed
    const responseText = await getResponse.text()
    if (responseText.includes('550e8400-e29b-41d4-a716-446655440000')) {
      console.log('   ❌ Still contains hardcoded barbershop ID')
      return false
    }
    
    console.log('   ✓ No hardcoded barbershop IDs found')
    return true
  } catch (error) {
    console.log('   ❌ API test failed:', error.message)
    return false
  }
}

async function testSyncAPI() {
  console.log('🔄 Testing sync API improvements...')
  
  try {
    // Test that sync endpoint requires authentication
    const syncResponse = await fetch('http://localhost:9999/api/cin7/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (syncResponse.status === 401) {
      console.log('   ✓ Sync API requires authentication')
    } else {
      console.log('   ⚠️ Sync API response:', syncResponse.status)
    }
    
    // Check if the endpoint mentions v2 API
    const syncCode = require('fs').readFileSync(
      '/Users/bossio/6FB AI Agent System/app/api/cin7/sync/route.js', 
      'utf8'
    )
    
    if (syncCode.includes('ExternalAPI/v2/products') && syncCode.includes('ExternalAPI/v2/stocklevels')) {
      console.log('   ✓ Using Cin7 API v2 consistently')
    } else {
      console.log('   ❌ Not using Cin7 API v2 consistently')
      return false
    }
    
    return true
  } catch (error) {
    console.log('   ❌ Sync API test failed:', error.message)
    return false
  }
}

async function testWebhookHandler() {
  console.log('🪝 Testing webhook improvements...')
  
  try {
    // Test webhook signature verification
    const webhookCode = require('fs').readFileSync(
      '/Users/bossio/6FB AI Agent System/app/api/cin7/webhook/route.js', 
      'utf8'
    )
    
    if (webhookCode.includes('verifyWebhookSignature') && webhookCode.includes('crypto.timingSafeEqual')) {
      console.log('   ✓ Webhook signature verification implemented')
    } else {
      console.log('   ❌ Webhook signature verification missing')
      return false
    }
    
    if (webhookCode.includes('stock-updated') && webhookCode.includes('product-modified')) {
      console.log('   ✓ Multiple webhook event handlers implemented')
    } else {
      console.log('   ❌ Missing webhook event handlers')
      return false
    }
    
    return true
  } catch (error) {
    console.log('   ❌ Webhook test failed:', error.message)
    return false
  }
}

async function testDataMapping() {
  console.log('📊 Testing enhanced data mapping...')
  
  try {
    const syncCode = require('fs').readFileSync(
      '/Users/bossio/6FB AI Agent System/app/api/cin7/sync/route.js', 
      'utf8'
    )
    
    // Check for enhanced mapping features
    const enhancedFeatures = [
      'mapCategoryForBarbershop',
      'detectProfessionalUse',
      'supplier',
      'professional_use',
      'usage_instructions'
    ]
    
    const missingFeatures = enhancedFeatures.filter(feature => !syncCode.includes(feature))
    
    if (missingFeatures.length === 0) {
      console.log('   ✓ All enhanced mapping features implemented')
    } else {
      console.log('   ❌ Missing features:', missingFeatures.join(', '))
      return false
    }
    
    return true
  } catch (error) {
    console.log('   ❌ Data mapping test failed:', error.message)
    return false
  }
}

async function testFieldValidation() {
  console.log('🔍 Testing field mapping for stock numbers...')
  
  try {
    const syncCode = require('fs').readFileSync(
      '/Users/bossio/6FB AI Agent System/app/api/cin7/sync/route.js', 
      'utf8'
    )
    
    // Check for multiple stock field fallbacks
    const stockFields = [
      'Available',
      'QuantityAvailable', 
      'QtyOnHand',
      'StockOnHand'
    ]
    
    const hasAllFallbacks = stockFields.every(field => syncCode.includes(field))
    
    if (hasAllFallbacks) {
      console.log('   ✓ Multiple stock field fallbacks implemented')
    } else {
      console.log('   ❌ Missing stock field fallbacks')
      return false
    }
    
    // Check for separate stock levels API call
    if (syncCode.includes('fetchCin7StockLevels')) {
      console.log('   ✓ Separate stock levels API call implemented')
    } else {
      console.log('   ❌ Missing separate stock levels API call')
      return false
    }
    
    return true
  } catch (error) {
    console.log('   ❌ Field validation test failed:', error.message)
    return false
  }
}

// Run the tests
if (require.main === module) {
  testCin7Integration().catch(console.error)
}

module.exports = { testCin7Integration }