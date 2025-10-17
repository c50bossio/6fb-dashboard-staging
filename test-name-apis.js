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

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Name-Structure-Test/1.0'
      }
    })

    if (response.ok) {
      const data = await response.json()
      
      // Check for name fields in the response
      const hasNameFields = checkNameFields(data)

      if (hasNameFields) {
        
      }
      
      return { success: true, hasNameFields, data }
    } else {
      const errorText = await response.text()

      return { success: false, error: errorText }
    }
  } catch (error) {
    
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
        
        return true
      } else {
        
        return false
      }
    } else {
      
      return false
    }
  } catch (error) {
    
    return false
  }
}

/**
 * Main test runner
 */
async function runTests() {

  .toISOString()}`)
  
  // Test name utilities
  const utilitiesValid = testNameUtilities()
  
  // Test each API endpoint
  const results = []
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpoint(endpoint)
    results.push({ endpoint, ...result })
  }
  
  // Summary

  const successfulTests = results.filter(r => r.success)
  const nameStructureSupport = results.filter(r => r.hasNameFields)

  results.forEach(({ endpoint, success, hasNameFields, error }) => {
    const status = success ? '✅' : '❌'
    const nameSupport = hasNameFields ? '📝' : '📋'
    ` : ''}`)
  })
  
  // Recommendations
  if (successfulTests.length === results.length && utilitiesValid) {
    
  } else {
    
  }

}

// Run the tests
runTests().catch(console.error)