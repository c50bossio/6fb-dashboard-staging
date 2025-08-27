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
        
        passed++
      } else {
        
      }
    } catch (error) {
      
    }
    
  }

  if (passed === total) {
    
  } else {
    
  }
}

async function testDatabaseSchema() {

  try {
    // Check if cin7_credentials table exists
    const { data, error } = await supabase
      .from('cin7_credentials')
      .select('*')
      .limit(1)
    
    if (error && error.code === '42P01') {

      return false
    }

    return true
  } catch (error) {
    
    return false
  }
}

async function testCredentialsAPI() {

  try {
    // Test GET endpoint
    const getResponse = await fetch('http://localhost:9999/api/cin7/credentials', {
      method: 'GET',
      headers: {
        'Cookie': 'test-session=true' // Mock authentication for testing
      }
    })
    
    if (getResponse.status === 401) {
      
    } else {
      
    }
    
    // Test that hardcoded barbershop IDs are removed
    const responseText = await getResponse.text()
    if (responseText.includes('550e8400-e29b-41d4-a716-446655440000')) {
      
      return false
    }

    return true
  } catch (error) {
    
    return false
  }
}

async function testSyncAPI() {

  try {
    // Test that sync endpoint requires authentication
    const syncResponse = await fetch('http://localhost:9999/api/cin7/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (syncResponse.status === 401) {
      
    } else {
      
    }
    
    // Check if the endpoint mentions v2 API
    const syncCode = require('fs').readFileSync(
      '/Users/bossio/6FB AI Agent System/app/api/cin7/sync/route.js', 
      'utf8'
    )
    
    if (syncCode.includes('ExternalAPI/v2/products') && syncCode.includes('ExternalAPI/v2/stocklevels')) {
      
    } else {
      
      return false
    }
    
    return true
  } catch (error) {
    
    return false
  }
}

async function testWebhookHandler() {

  try {
    // Test webhook signature verification
    const webhookCode = require('fs').readFileSync(
      '/Users/bossio/6FB AI Agent System/app/api/cin7/webhook/route.js', 
      'utf8'
    )
    
    if (webhookCode.includes('verifyWebhookSignature') && webhookCode.includes('crypto.timingSafeEqual')) {
      
    } else {
      
      return false
    }
    
    if (webhookCode.includes('stock-updated') && webhookCode.includes('product-modified')) {
      
    } else {
      
      return false
    }
    
    return true
  } catch (error) {
    
    return false
  }
}

async function testDataMapping() {

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
      
    } else {
      )
      return false
    }
    
    return true
  } catch (error) {
    
    return false
  }
}

async function testFieldValidation() {

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
      
    } else {
      
      return false
    }
    
    // Check for separate stock levels API call
    if (syncCode.includes('fetchCin7StockLevels')) {
      
    } else {
      
      return false
    }
    
    return true
  } catch (error) {
    
    return false
  }
}

// Run the tests
if (require.main === module) {
  testCin7Integration().catch(console.error)
}

module.exports = { testCin7Integration }