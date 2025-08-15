#!/usr/bin/env node

/**
 * Cin7 Integration Validation Script
 * Validates that all the code fixes have been properly implemented
 */

const fs = require('fs')
const path = require('path')

function validateCin7Fixes() {
  console.log('🔍 Validating Cin7 Integration Fixes...\n')

  const validations = [
    validateCredentialsAPI,
    validateSyncAPI,
    validateWebhookHandler,
    validateDatabaseMigration,
    validateEnhancedMapping
  ]

  let passed = 0
  let total = validations.length

  for (const validation of validations) {
    try {
      const result = validation()
      if (result.success) {
        console.log(`✅ ${validation.name} - PASSED`)
        if (result.details) {
          console.log(`   ${result.details}`)
        }
        passed++
      } else {
        console.log(`❌ ${validation.name} - FAILED`)
        if (result.reason) {
          console.log(`   ${result.reason}`)
        }
      }
    } catch (error) {
      console.log(`❌ ${validation.name} - ERROR: ${error.message}`)
    }
    console.log('')
  }

  console.log(`📊 Validation Results: ${passed}/${total} validations passed\n`)
  
  if (passed === total) {
    console.log('🎉 All validations passed! Your Cin7 integration fixes are correctly implemented.')
    console.log('\n🚀 Ready to test with real Cin7 credentials!')
  } else {
    console.log('⚠️ Some validations failed. Please review the code changes.')
  }

  return passed === total
}

function validateCredentialsAPI() {
  const filePath = '/Users/bossio/6FB AI Agent System/app/api/cin7/credentials/route.js'
  
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'Credentials API file not found' }
  }

  const content = fs.readFileSync(filePath, 'utf8')
  
  // Check for hardcoded barbershop ID removal
  if (content.includes('550e8400-e29b-41d4-a716-446655440000')) {
    return { success: false, reason: 'Still contains hardcoded barbershop ID' }
  }

  // Check for proper authentication
  if (!content.includes('supabase.auth.getUser()')) {
    return { success: false, reason: 'Missing proper user authentication' }
  }

  // Check for AES encryption
  if (!content.includes('encrypt(') || !content.includes('decrypt(')) {
    return { success: false, reason: 'Missing AES encryption implementation' }
  }

  // Check for webhook registration
  if (!content.includes('registerCin7Webhooks')) {
    return { success: false, reason: 'Missing webhook registration' }
  }

  return { 
    success: true, 
    details: 'User authentication, AES encryption, and webhook registration implemented' 
  }
}

function validateSyncAPI() {
  const filePath = '/Users/bossio/6FB AI Agent System/app/api/cin7/sync/route.js'
  
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'Sync API file not found' }
  }

  const content = fs.readFileSync(filePath, 'utf8')
  
  // Check for API v2 consistency
  if (!content.includes('ExternalAPI/v2/products') || !content.includes('ExternalAPI/v2/stocklevels')) {
    return { success: false, reason: 'Not using Cin7 API v2 consistently' }
  }

  // Check for separate stock levels call
  if (!content.includes('fetchCin7StockLevels')) {
    return { success: false, reason: 'Missing separate stock levels API call' }
  }

  // Check for proper credential decryption
  if (!content.includes('decrypt(JSON.parse(')) {
    return { success: false, reason: 'Missing proper credential decryption' }
  }

  // Check for multiple stock field fallbacks
  const stockFields = ['Available', 'QuantityAvailable', 'QtyOnHand', 'StockOnHand']
  const hasAllFallbacks = stockFields.every(field => content.includes(field))
  
  if (!hasAllFallbacks) {
    return { success: false, reason: 'Missing comprehensive stock field fallbacks' }
  }

  return { 
    success: true, 
    details: 'API v2, separate stock calls, and comprehensive field mapping implemented' 
  }
}

function validateWebhookHandler() {
  const filePath = '/Users/bossio/6FB AI Agent System/app/api/cin7/webhook/route.js'
  
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'Webhook handler file not found' }
  }

  const content = fs.readFileSync(filePath, 'utf8')
  
  // Check for signature verification
  if (!content.includes('verifyWebhookSignature') || !content.includes('crypto.timingSafeEqual')) {
    return { success: false, reason: 'Missing proper webhook signature verification' }
  }

  // Check for multiple event handlers
  const eventHandlers = ['handleStockUpdated', 'handleProductModified', 'handleSaleCompleted']
  const hasAllHandlers = eventHandlers.every(handler => content.includes(handler))
  
  if (!hasAllHandlers) {
    return { success: false, reason: 'Missing comprehensive webhook event handlers' }
  }

  // Check for webhook routing
  if (!content.includes('stock-updated') || !content.includes('product-modified')) {
    return { success: false, reason: 'Missing webhook path routing' }
  }

  return { 
    success: true, 
    details: 'Signature verification and comprehensive event handling implemented' 
  }
}

function validateDatabaseMigration() {
  const filePath = '/Users/bossio/6FB AI Agent System/database/cin7-credentials-migration.sql'
  
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'Database migration file not found' }
  }

  const content = fs.readFileSync(filePath, 'utf8')
  
  // Check for proper table structure
  if (!content.includes('CREATE TABLE IF NOT EXISTS cin7_credentials')) {
    return { success: false, reason: 'Missing cin7_credentials table creation' }
  }

  // Check for RLS policies
  if (!content.includes('ROW LEVEL SECURITY') || !content.includes('auth.uid()')) {
    return { success: false, reason: 'Missing Row Level Security policies' }
  }

  // Check for webhook fields
  if (!content.includes('webhook_registered') || !content.includes('webhook_secret')) {
    return { success: false, reason: 'Missing webhook-related fields' }
  }

  return { 
    success: true, 
    details: 'Proper table structure, RLS policies, and webhook fields defined' 
  }
}

function validateEnhancedMapping() {
  const filePath = '/Users/bossio/6FB AI Agent System/app/api/cin7/sync/route.js'
  
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'Sync API file not found' }
  }

  const content = fs.readFileSync(filePath, 'utf8')
  
  // Check for enhanced mapping features
  const enhancedFeatures = [
    'mapCategoryForBarbershop',
    'detectProfessionalUse',
    'supplier',
    'professional_use',
    'usage_instructions',
    'ingredients'
  ]
  
  const missingFeatures = enhancedFeatures.filter(feature => !content.includes(feature))
  
  if (missingFeatures.length > 0) {
    return { 
      success: false, 
      reason: `Missing enhanced features: ${missingFeatures.join(', ')}` 
    }
  }

  // Check for barbershop-specific category mapping
  if (!content.includes('hair_care') || !content.includes('beard_care') || !content.includes('tools')) {
    return { success: false, reason: 'Missing barbershop-specific category mapping' }
  }

  return { 
    success: true, 
    details: 'Enhanced mapping with barbershop categories and professional detection' 
  }
}

// Run validation if called directly
if (require.main === module) {
  const success = validateCin7Fixes()
  process.exit(success ? 0 : 1)
}

module.exports = { validateCin7Fixes }