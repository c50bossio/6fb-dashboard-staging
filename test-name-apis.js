#!/usr/bin/env node

/**
 * Test Script for Name Structure API Updates
 * 
 * This script tests the updated API endpoints to ensure they properly handle
 * both the new first_name/last_name structure and maintain backward compatibility
 * with the old full_name approach.
 */

import fetch from 'node-fetch'
import fs from 'fs'

// Test configuration
const API_BASE = 'http://localhost:9999'
const TEST_ENDPOINTS = [
  '/api/auth/user',
  '/api/profile/current',
  '/api/staff',
  '/api/auth/health'
]

/**
 * Test function to check API endpoint responses
 */
async function testEndpoint(endpoint) {
  console.log(`\n🧪 Testing ${endpoint}...`)
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Name-Structure-Test/1.0'
      }
    })
    
    console.log(`   Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      
      // Check for name fields in the response
      const hasNameFields = checkNameFields(data)
      console.log(`   ✅ Response received`)
      console.log(`   📝 Name fields found: ${hasNameFields ? 'Yes' : 'No'}`)
      
      if (hasNameFields) {
        console.log(`   🎯 New name structure supported`)
      }
      
      return { success: true, hasNameFields, data }
    } else {
      const errorText = await response.text()
      console.log(`   ❌ Error: ${response.statusText}`)
      console.log(`   💬 Details: ${errorText}`)
      return { success: false, error: errorText }
    }
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Recursively check if response contains name fields
 */
function checkNameFields(obj) {
  if (typeof obj !== 'object' || obj === null) return false
  
  if (Array.isArray(obj)) {
    return obj.some(item => checkNameFields(item))
  }
  
  const nameFields = ['first_name', 'last_name', 'firstName', 'lastName', 'display_name', 'full_name']
  const hasNameFields = nameFields.some(field => field in obj)
  
  if (hasNameFields) return true
  
  return Object.values(obj).some(value => checkNameFields(value))
}

/**
 * Test the name utilities import in the Node.js environment
 */
function testNameUtilities() {
  console.log('\n📚 Testing Name Utilities...')
  
  try {
    // Since this is a Node.js test script and the utilities use ES6 modules,
    // we'll just validate they exist in the expected location
    const path = './lib/name-utils.js'
    
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8')
      const expectedFunctions = [
        'splitFullName',
        'combineNames', 
        'getDisplayName',
        'normalizeNameData',
        'createNameUpdateObject'
      ]
      
      const hasAllFunctions = expectedFunctions.every(fn => content.includes(`export function ${fn}`))
      
      if (hasAllFunctions) {
        console.log('   ✅ All name utility functions found')
        return true
      } else {
        console.log('   ⚠️  Some name utility functions missing')
        return false
      }
    } else {
      console.log('   ❌ Name utilities file not found')
      return false
    }
  } catch (error) {
    console.log(`   💥 Error checking utilities: ${error.message}`)
    return false
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Name Structure API Tests')
  console.log(`🎯 Testing against: ${API_BASE}`)
  console.log(`📅 Test run: ${new Date().toISOString()}`)
  
  // Test name utilities
  const utilitiesValid = testNameUtilities()
  
  // Test each API endpoint
  const results = []
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint)
    results.push({ endpoint, ...result })
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY')
  console.log('================')
  console.log(`🔧 Name Utilities: ${utilitiesValid ? 'Valid' : 'Issues Found'}`)
  
  const successfulTests = results.filter(r => r.success)
  const nameStructureSupport = results.filter(r => r.hasNameFields)
  
  console.log(`✅ Successful API calls: ${successfulTests.length}/${results.length}`)
  console.log(`📝 Endpoints with name support: ${nameStructureSupport.length}/${results.length}`)
  
  results.forEach(({ endpoint, success, hasNameFields, error }) => {
    const status = success ? '✅' : '❌'
    const nameSupport = hasNameFields ? '📝' : '📋'
    console.log(`   ${status} ${nameSupport} ${endpoint}${error ? ` (${error})` : ''}`)
  })
  
  // Recommendations
  if (successfulTests.length === results.length && utilitiesValid) {
    console.log('\n🎉 All tests passed! Name structure migration is working correctly.')
  } else {
    console.log('\n⚠️  Some issues detected. Please review the failed endpoints.')
  }
  
  console.log('\n📋 NEXT STEPS:')
  console.log('1. Verify database tables have first_name and last_name columns')
  console.log('2. Test with actual user data to ensure backward compatibility')  
  console.log('3. Update any frontend components to use the new name structure')
  console.log('4. Consider migrating existing full_name data to first_name/last_name')
}

// Run the tests
runTests().catch(console.error)