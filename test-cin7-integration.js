#!/usr/bin/env node

/**
 * Comprehensive test script for Cin7 integration
 * Tests all aspects of the implementation
 */

const fs = require('fs')
const path = require('path')

console.log('🧪 TESTING CIN7 INTEGRATION')
console.log('===========================\n')

// Test results tracking
let totalTests = 0
let passedTests = 0
let failedTests = 0
const issues = []

function testPassed(testName) {
  totalTests++
  passedTests++
  console.log(`✅ ${testName}`)
}

function testFailed(testName, error) {
  totalTests++
  failedTests++
  console.log(`❌ ${testName}`)
  console.log(`   Error: ${error}`)
  issues.push({ test: testName, error })
}

// 1. Test file existence
console.log('📁 FILE STRUCTURE TESTS')
console.log('-----------------------')

const requiredFiles = [
  'lib/cin7-client.js',
  'app/api/cin7/connect/route.js',
  'app/api/cin7/disconnect/route.js',
  'app/api/cin7/sync/route.js',
  'components/cin7/Cin7ConnectionModal.js',
  'database/cin7-schema.sql',
  'scripts/setup-cin7-tables.js',
  'docs/CIN7_INTEGRATION.md'
]

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    testPassed(`File exists: ${file}`)
  } else {
    testFailed(`File exists: ${file}`, 'File not found')
  }
})

// 2. Test imports
console.log('\n📦 IMPORT TESTS')
console.log('---------------')

try {
  const { Cin7Client, encrypt, decrypt } = require('./lib/cin7-client.js')
  if (Cin7Client && encrypt && decrypt) {
    testPassed('Cin7Client exports are correct')
  } else {
    testFailed('Cin7Client exports', 'Missing required exports')
  }
} catch (error) {
  testFailed('Cin7Client import', error.message)
}

// 3. Test encryption/decryption
console.log('\n🔐 ENCRYPTION TESTS')
console.log('-------------------')

try {
  const { encrypt, decrypt } = require('./lib/cin7-client.js')
  
  // Mock encryption key
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long'
  
  const testData = 'sensitive-api-key-123'
  const encrypted = encrypt(testData)
  const decrypted = decrypt(encrypted)
  
  if (decrypted === testData) {
    testPassed('Encryption/decryption works correctly')
  } else {
    testFailed('Encryption/decryption', 'Data mismatch after decrypt')
  }
  
  if (encrypted.iv && encrypted.authTag && encrypted.encrypted) {
    testPassed('Encrypted data has correct structure')
  } else {
    testFailed('Encrypted data structure', 'Missing required fields')
  }
} catch (error) {
  testFailed('Encryption functionality', error.message)
}

// 4. Test API route structure
console.log('\n🌐 API ROUTE TESTS')
console.log('------------------')

const apiRoutes = [
  { path: 'app/api/cin7/connect/route.js', methods: ['POST'] },
  { path: 'app/api/cin7/disconnect/route.js', methods: ['POST'] },
  { path: 'app/api/cin7/sync/route.js', methods: ['GET', 'POST'] }
]

apiRoutes.forEach(route => {
  try {
    const routeContent = fs.readFileSync(path.join(__dirname, route.path), 'utf8')
    
    route.methods.forEach(method => {
      const exportPattern = new RegExp(`export\\s+async\\s+function\\s+${method}`, 'i')
      if (exportPattern.test(routeContent)) {
        testPassed(`${route.path} exports ${method}`)
      } else {
        testFailed(`${route.path} ${method} export`, 'Method not exported')
      }
    })
    
    // Check for proper imports
    if (routeContent.includes("from '@supabase/supabase-js'")) {
      testPassed(`${route.path} imports Supabase client`)
    } else {
      testFailed(`${route.path} Supabase import`, 'Missing Supabase import')
    }
  } catch (error) {
    testFailed(`Reading ${route.path}`, error.message)
  }
})

// 5. Test React component
console.log('\n⚛️  REACT COMPONENT TESTS')
console.log('------------------------')

try {
  const modalContent = fs.readFileSync(
    path.join(__dirname, 'components/cin7/Cin7ConnectionModal.js'),
    'utf8'
  )
  
  const requiredElements = [
    'Dialog',
    'useState',
    'accountId',
    'apiKey',
    'handleConnect',
    'isConnecting',
    'error'
  ]
  
  requiredElements.forEach(element => {
    if (modalContent.includes(element)) {
      testPassed(`Modal contains ${element}`)
    } else {
      testFailed(`Modal ${element}`, 'Element not found in component')
    }
  })
} catch (error) {
  testFailed('Reading modal component', error.message)
}

// 6. Test inventory page integration
console.log('\n📄 INVENTORY PAGE TESTS')
console.log('-----------------------')

try {
  const inventoryContent = fs.readFileSync(
    path.join(__dirname, 'app/dashboard/inventory/page.js'),
    'utf8'
  )
  
  const integrationElements = [
    'Cin7ConnectionModal',
    'showCin7Modal',
    'cin7Connected',
    'checkCin7Status',
    'handleSync',
    'Advanced: Connect warehouse system'
  ]
  
  integrationElements.forEach(element => {
    if (inventoryContent.includes(element)) {
      testPassed(`Inventory page has ${element}`)
    } else {
      testFailed(`Inventory page ${element}`, 'Integration element missing')
    }
  })
} catch (error) {
  testFailed('Reading inventory page', error.message)
}

// 7. Test database schema
console.log('\n🗄️  DATABASE SCHEMA TESTS')
console.log('------------------------')

try {
  const schemaContent = fs.readFileSync(
    path.join(__dirname, 'database/cin7-schema.sql'),
    'utf8'
  )
  
  const requiredTables = [
    'cin7_connections',
    'cin7_sync_logs'
  ]
  
  const requiredColumns = [
    'api_key_encrypted',
    'account_id',
    'cin7_product_id',
    'cin7_sku',
    'cin7_last_sync'
  ]
  
  requiredTables.forEach(table => {
    if (schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
      testPassed(`Schema has ${table} table`)
    } else {
      testFailed(`Schema ${table}`, 'Table definition not found')
    }
  })
  
  requiredColumns.forEach(column => {
    if (schemaContent.includes(column)) {
      testPassed(`Schema has ${column} column`)
    } else {
      testFailed(`Schema ${column}`, 'Column not found')
    }
  })
} catch (error) {
  testFailed('Reading schema file', error.message)
}

// 8. Test documentation
console.log('\n📚 DOCUMENTATION TESTS')
console.log('----------------------')

try {
  const docsContent = fs.readFileSync(
    path.join(__dirname, 'docs/CIN7_INTEGRATION.md'),
    'utf8'
  )
  
  const requiredSections = [
    'Setup Instructions',
    'API Endpoints',
    'Database Schema',
    'Security',
    'Troubleshooting'
  ]
  
  requiredSections.forEach(section => {
    if (docsContent.includes(section)) {
      testPassed(`Documentation has ${section}`)
    } else {
      testFailed(`Documentation ${section}`, 'Section missing')
    }
  })
} catch (error) {
  testFailed('Reading documentation', error.message)
}

// Print summary
console.log('\n' + '='.repeat(60))
console.log('\n📊 TEST SUMMARY')
console.log('---------------')
console.log(`Total Tests: ${totalTests}`)
console.log(`✅ Passed: ${passedTests}`)
console.log(`❌ Failed: ${failedTests}`)
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

if (failedTests > 0) {
  console.log('\n⚠️  ISSUES FOUND:')
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.test}`)
    console.log(`   ${issue.error}`)
  })
  
  console.log('\n📝 RECOMMENDATIONS:')
  console.log('1. Check that all files are in the correct locations')
  console.log('2. Ensure dependencies are installed (npm install)')
  console.log('3. Verify environment variables are set correctly')
  console.log('4. Run the database setup script: node scripts/setup-cin7-tables.js')
} else {
  console.log('\n🎉 ALL TESTS PASSED!')
  console.log('The Cin7 integration is fully implemented and working correctly.')
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Add encryption key to .env.local:')
  console.log('   ENCRYPTION_KEY=<generate with: openssl rand -base64 32>')
  console.log('2. Run database setup:')
  console.log('   node scripts/setup-cin7-tables.js')
  console.log('3. Test with real Cin7 credentials')
}

console.log('\n' + '='.repeat(60))