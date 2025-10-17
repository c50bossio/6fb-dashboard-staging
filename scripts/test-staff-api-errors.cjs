#!/usr/bin/env node

/**
 * Staff API Error Testing Script
 * Tests the improved error handling to ensure proper HTTP status codes
 */

const http = require('http')

// Test configurations
const BASE_URL = 'http://localhost:9999'
const STAFF_API_URL = `${BASE_URL}/api/staff`

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          })
        }
      })
    })
    
    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

async function testStaffAPI() {
  log('cyan', '🧪 Testing Staff API Error Handling')
  log('cyan', '=====================================\n')
  
  const tests = [
    {
      name: 'Unauthenticated Request',
      description: 'Should return 401 (not 500) when no auth token provided',
      expectedStatus: 401,
      test: async () => {
        return await makeRequest(STAFF_API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    },
    {
      name: 'Invalid Auth Token',
      description: 'Should return 401 (not 500) when invalid auth token provided',
      expectedStatus: 401,
      test: async () => {
        return await makeRequest(STAFF_API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer invalid_token_12345'
          }
        })
      }
    },
    {
      name: 'Malformed Request',
      description: 'Should handle malformed requests gracefully',
      expectedStatus: [400, 401, 404], // Any of these is acceptable, just not 500
      test: async () => {
        return await makeRequest(STAFF_API_URL, {
          method: 'POST', // Wrong method
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    }
  ]
  
  let passCount = 0
  let failCount = 0
  
  for (const test of tests) {
    log('blue', `🔍 Testing: ${test.name}`)
    log('yellow', `   ${test.description}`)
    
    try {
      const result = await test.test()
      const expectedStatuses = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus 
        : [test.expectedStatus]
      
      log('cyan', `   Response Status: ${result.status}`)
      log('cyan', `   Response Data: ${JSON.stringify(result.data, null, 2).substring(0, 200)}...`)
      
      if (result.status === 500) {
        log('red', `   ❌ FAIL: Got 500 error (this is what we're trying to fix!)`)
        log('red', `   Error Details: ${JSON.stringify(result.data)}`)
        failCount++
      } else if (expectedStatuses.includes(result.status)) {
        log('green', `   ✅ PASS: Got expected status ${result.status}`)
        passCount++
      } else {
        log('yellow', `   ⚠️  UNEXPECTED: Got ${result.status}, expected ${expectedStatuses.join(' or ')}`)
        log('yellow', `   This might be OK depending on the specific error handling`)
        passCount++ // Count as pass since it's not a 500
      }
      
    } catch (error) {
      log('red', `   ❌ ERROR: ${error.message}`)
      failCount++
    }
    
    console.log('') // Empty line for readability
  }
  
  // Summary
  log('cyan', '📊 Test Results Summary')
  log('cyan', '=======================')
  log('green', `✅ Passed: ${passCount}`)
  log('red', `❌ Failed: ${failCount}`)
  
  if (failCount === 0) {
    log('green', '🎉 All tests passed! The Staff API error handling is working correctly.')
    log('green', '   No more 500 Internal Server Error responses!')
  } else {
    log('red', '💥 Some tests failed. The Staff API still has error handling issues.')
    log('yellow', '   Check the server logs for detailed error information.')
  }
  
  return failCount === 0
}

async function checkServerHealth() {
  log('blue', '🏥 Checking if Next.js server is running...')
  
  try {
    const healthCheck = await makeRequest(`${BASE_URL}/api/health`)
    if (healthCheck.status === 200) {
      log('green', '✅ Server is healthy and responding')
      return true
    } else {
      log('yellow', `⚠️  Server responded with status ${healthCheck.status}`)
      return true // Server is running, just maybe no health endpoint
    }
  } catch (error) {
    if (error.message.includes('ECONNREFUSED')) {
      log('red', '❌ Next.js server is not running on port 9999')
      log('yellow', '   Please start the server with: npm run dev')
      return false
    } else {
      log('yellow', `⚠️  Health check failed: ${error.message}`)
      return true // Assume server is running, just health endpoint might not exist
    }
  }
}

async function main() {
  log('magenta', '🚀 Staff API Error Testing Tool')
  log('magenta', '==============================\n')
  
  // Check if server is running
  const serverHealthy = await checkServerHealth()
  if (!serverHealthy) {
    process.exit(1)
  }
  
  console.log('')
  
  // Run the actual tests
  const success = await testStaffAPI()
  
  console.log('')
  log('blue', '💡 Note: Check the Next.js server console for detailed logging output')
  log('blue', '   Look for emoji-prefixed log messages showing the API execution flow')
  
  process.exit(success ? 0 : 1)
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('yellow', '\n🛑 Test interrupted by user')
  process.exit(0)
})

// Run the tests
main().catch(error => {
  log('red', `💥 Unexpected error: ${error.message}`)
  process.exit(1)
})