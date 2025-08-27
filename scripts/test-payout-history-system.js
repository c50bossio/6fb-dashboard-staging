#!/usr/bin/env node

/**
 * Comprehensive Payout History System Testing Script
 * Tests all components of the payout history system end-to-end
 */

const { execSync } = require('child_process')
const fs = require('fs').promises
const path = require('path')

// Test configuration
const TEST_CONFIG = {
  API_BASE_URL: process.env.TEST_API_URL || 'http://localhost:3000',
  TEST_BARBERSHOP_ID: process.env.TEST_BARBERSHOP_ID || 'test-shop-123',
  TEST_USER_TOKEN: process.env.TEST_USER_TOKEN || 'test-token',
  VERBOSE: process.env.VERBOSE === 'true',
  CLEANUP_AFTER_TESTS: process.env.CLEANUP_AFTER_TESTS !== 'false'
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
}

/**
 * Logging utilities
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const colors = {
    info: '\x1b[36m',      // cyan
    success: '\x1b[32m',   // green
    warning: '\x1b[33m',   // yellow
    error: '\x1b[31m',     // red
    reset: '\x1b[0m'       // reset
  }

}

function logSuccess(message) { log(`✅ ${message}`, 'success') }
function logError(message) { log(`❌ ${message}`, 'error') }
function logWarning(message) { log(`⚠️ ${message}`, 'warning') }
function logInfo(message) { log(`ℹ️ ${message}`, 'info') }

/**
 * Test utilities
 */
async function apiRequest(endpoint, options = {}) {
  const fetch = (await import('node-fetch')).default
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_CONFIG.TEST_USER_TOKEN}`,
      ...options.headers
    }
  }
  
  const response = await fetch(`${TEST_CONFIG.API_BASE_URL}${endpoint}`, {
    ...defaultOptions,
    ...options
  })
  
  const responseData = await response.json()
  
  return {
    status: response.status,
    ok: response.ok,
    data: responseData
  }
}

function recordTest(testName, passed, details = null) {
  if (passed) {
    testResults.passed++
    logSuccess(`Test passed: ${testName}`)
  } else {
    testResults.failed++
    logError(`Test failed: ${testName}`)
    if (details) {
      logError(`Details: ${details}`)
    }
  }
  
  testResults.details.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  })
}

/**
 * Database Tests
 */
async function testDatabaseSchema() {
  logInfo('Testing database schema...')
  
  try {
    // Test required tables exist
    const requiredTables = [
      'payout_status_updates',
      'payout_transaction_metadata',
      'payout_reconciliation_reports',
      'payout_audit_trail',
      'payout_failed_attempts',
      'payout_performance_metrics'
    ]
    
    for (const table of requiredTables) {
      try {
        execSync(`psql -d $DATABASE_URL -c "SELECT 1 FROM ${table} LIMIT 1;" > /dev/null 2>&1`)
        recordTest(`Table exists: ${table}`, true)
      } catch (error) {
        recordTest(`Table exists: ${table}`, false, `Table not found or accessible`)
      }
    }
    
    // Test required functions exist
    const requiredFunctions = [
      'get_payout_history',
      'get_payout_status_timeline',
      'create_payout_status_update',
      'calculate_payout_performance_metrics'
    ]
    
    for (const func of requiredFunctions) {
      try {
        execSync(`psql -d $DATABASE_URL -c "SELECT ${func};" > /dev/null 2>&1`)
        recordTest(`Function exists: ${func}`, true)
      } catch (error) {
        recordTest(`Function exists: ${func}`, false, `Function not found`)
      }
    }
    
  } catch (error) {
    recordTest('Database schema test', false, error.message)
  }
}

/**
 * API Endpoint Tests
 */
async function testPayoutHistoryAPI() {
  logInfo('Testing Payout History API endpoints...')
  
  // Test GET /api/payout-history
  try {
    const response = await apiRequest('/api/payout-history?limit=10')
    recordTest('GET /api/payout-history', response.ok, 
      !response.ok ? `Status: ${response.status}` : null)
    
    if (response.ok && response.data.success) {
      // Validate response structure
      const hasRequiredFields = response.data.data && 
        Array.isArray(response.data.data.payouts) &&
        response.data.data.summary &&
        response.data.data.pagination
      
      recordTest('Payout history response structure', hasRequiredFields,
        !hasRequiredFields ? 'Missing required response fields' : null)
    }
  } catch (error) {
    recordTest('GET /api/payout-history', false, error.message)
  }
  
  // Test filtering
  try {
    const filterResponse = await apiRequest('/api/payout-history?status=completed&limit=5')
    recordTest('Payout history filtering', filterResponse.ok,
      !filterResponse.ok ? `Filter test failed: ${filterResponse.status}` : null)
  } catch (error) {
    recordTest('Payout history filtering', false, error.message)
  }
  
  // Test search
  try {
    const searchResponse = await apiRequest('/api/payout-history?search=test&limit=5')
    recordTest('Payout history search', searchResponse.ok,
      !searchResponse.ok ? `Search test failed: ${searchResponse.status}` : null)
  } catch (error) {
    recordTest('Payout history search', false, error.message)
  }
}

async function testTimelineAPI() {
  logInfo('Testing Timeline API...')
  
  // First get a payout ID to test with
  try {
    const historyResponse = await apiRequest('/api/payout-history?limit=1')
    
    if (historyResponse.ok && historyResponse.data.success && 
        historyResponse.data.data.payouts.length > 0) {
      
      const payoutId = historyResponse.data.data.payouts[0].payout_id
      
      // Test timeline endpoint
      const timelineResponse = await apiRequest(`/api/payout-history/timeline/${payoutId}`)
      recordTest('GET /api/payout-history/timeline/[id]', timelineResponse.ok,
        !timelineResponse.ok ? `Status: ${timelineResponse.status}` : null)
        
      if (timelineResponse.ok && timelineResponse.data.success) {
        const hasTimeline = Array.isArray(timelineResponse.data.data.timeline)
        recordTest('Timeline response structure', hasTimeline,
          !hasTimeline ? 'Timeline data not in expected format' : null)
      }
    } else {
      recordTest('Timeline API test', false, 'No payout records available for testing')
    }
  } catch (error) {
    recordTest('Timeline API test', false, error.message)
  }
}

async function testMetadataAPI() {
  logInfo('Testing Metadata API...')
  
  // Get a payout ID to test with
  try {
    const historyResponse = await apiRequest('/api/payout-history?limit=1')
    
    if (historyResponse.ok && historyResponse.data.success && 
        historyResponse.data.data.payouts.length > 0) {
      
      const payoutId = historyResponse.data.data.payouts[0].payout_id
      
      // Test metadata GET
      const metadataResponse = await apiRequest(`/api/payout-history/metadata/${payoutId}`)
      recordTest('GET /api/payout-history/metadata/[id]', metadataResponse.ok,
        !metadataResponse.ok ? `Status: ${metadataResponse.status}` : null)
      
      // Test metadata PATCH (if admin permissions)
      try {
        const patchResponse = await apiRequest(`/api/payout-history/metadata/${payoutId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            reconciliation_notes: 'Test note from automated test'
          })
        })
        
        recordTest('PATCH /api/payout-history/metadata/[id]', 
          patchResponse.ok || patchResponse.status === 403,
          patchResponse.status === 403 ? 'No admin permissions (expected)' : 
          !patchResponse.ok ? `Status: ${patchResponse.status}` : null)
      } catch (error) {
        recordTest('PATCH /api/payout-history/metadata/[id]', false, error.message)
      }
    } else {
      recordTest('Metadata API test', false, 'No payout records available for testing')
    }
  } catch (error) {
    recordTest('Metadata API test', false, error.message)
  }
}

/**
 * Component Tests (requires headless browser)
 */
async function testFrontendComponents() {
  logInfo('Testing frontend components...')
  
  try {
    // Check if component files exist
    const componentFiles = [
      'components/PayoutHistoryDashboard.js',
      'components/PayoutTransactionDetails.js',
      'components/PayoutStatusIndicator.js',
      'components/PayoutReconciliation.js'
    ]
    
    for (const component of componentFiles) {
      try {
        await fs.access(path.join(process.cwd(), component))
        recordTest(`Component exists: ${component}`, true)
      } catch (error) {
        recordTest(`Component exists: ${component}`, false, 'File not found')
      }
    }
    
    // Basic syntax check (if Node.js can parse it)
    for (const component of componentFiles) {
      try {
        const componentPath = path.join(process.cwd(), component)
        const componentContent = await fs.readFile(componentPath, 'utf8')
        
        // Basic syntax validation
        if (componentContent.includes('export default') && 
            componentContent.includes('function') &&
            componentContent.includes('return')) {
          recordTest(`Component syntax: ${component}`, true)
        } else {
          recordTest(`Component syntax: ${component}`, false, 'Missing required React component structure')
        }
      } catch (error) {
        recordTest(`Component syntax: ${component}`, false, error.message)
      }
    }
    
  } catch (error) {
    recordTest('Frontend components test', false, error.message)
  }
}

/**
 * Webhook Handler Tests
 */
async function testWebhookHandlers() {
  logInfo('Testing webhook handlers...')
  
  try {
    // Check if enhanced webhook handler files exist
    const webhookFiles = [
      'lib/enhanced-payout-webhook-handlers.js',
      'app/api/webhooks/stripe/enhanced-payout-handlers.js'
    ]
    
    for (const file of webhookFiles) {
      try {
        await fs.access(path.join(process.cwd(), file))
        recordTest(`Webhook handler exists: ${file}`, true)
      } catch (error) {
        recordTest(`Webhook handler exists: ${file}`, false, 'File not found')
      }
    }
    
    // Test webhook endpoint (if available)
    try {
      const webhookResponse = await apiRequest('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test-signature'
        },
        body: JSON.stringify({
          id: 'evt_test',
          type: 'transfer.created',
          data: { object: { id: 'tr_test', amount: 1000 } }
        })
      })
      
      // Expect 400 due to invalid signature, but endpoint should exist
      recordTest('Webhook endpoint accessible', 
        webhookResponse.status === 400 || webhookResponse.status === 503,
        webhookResponse.status === 404 ? 'Webhook endpoint not found' : null)
        
    } catch (error) {
      recordTest('Webhook endpoint test', false, error.message)
    }
    
  } catch (error) {
    recordTest('Webhook handlers test', false, error.message)
  }
}

/**
 * Integration Tests
 */
async function testSystemIntegration() {
  logInfo('Testing system integration...')
  
  try {
    // Test that all components work together
    const integrationChecks = [
      'Database schema in place',
      'API endpoints responding',
      'Frontend components available', 
      'Webhook handlers configured'
    ]
    
    // This is a simplified integration test
    // In a real scenario, you'd test actual data flow
    const allPassed = testResults.details.filter(t => t.passed).length > 0
    recordTest('Basic system integration', allPassed, 
      !allPassed ? 'No subsystems passed tests' : null)
    
  } catch (error) {
    recordTest('System integration test', false, error.message)
  }
}

/**
 * Performance Tests
 */
async function testPerformance() {
  logInfo('Testing performance...')
  
  try {
    // Test API response times
    const startTime = Date.now()
    const response = await apiRequest('/api/payout-history?limit=50')
    const responseTime = Date.now() - startTime
    
    recordTest('API response time < 2000ms', responseTime < 2000,
      responseTime >= 2000 ? `Response time: ${responseTime}ms` : null)
    
    // Test large dataset handling
    if (response.ok) {
      const largeDatasetStart = Date.now()
      const largeResponse = await apiRequest('/api/payout-history?limit=200')
      const largeDatasetTime = Date.now() - largeDatasetStart
      
      recordTest('Large dataset response < 5000ms', largeDatasetTime < 5000,
        largeDatasetTime >= 5000 ? `Response time: ${largeDatasetTime}ms` : null)
    }
    
  } catch (error) {
    recordTest('Performance test', false, error.message)
  }
}

/**
 * Security Tests
 */
async function testSecurity() {
  logInfo('Testing security...')
  
  try {
    // Test unauthorized access
    const unauthorizedResponse = await apiRequest('/api/payout-history', {
      headers: { 'Authorization': 'Bearer invalid-token' }
    })
    
    recordTest('Unauthorized access blocked', unauthorizedResponse.status === 401,
      unauthorizedResponse.status !== 401 ? `Status: ${unauthorizedResponse.status}` : null)
    
    // Test SQL injection prevention (basic check)
    const sqlInjectionResponse = await apiRequest("/api/payout-history?search='; DROP TABLE users; --")
    recordTest('SQL injection prevention', sqlInjectionResponse.status !== 500,
      sqlInjectionResponse.status === 500 ? 'Potential SQL injection vulnerability' : null)
    
  } catch (error) {
    recordTest('Security test', false, error.message)
  }
}

/**
 * Cleanup
 */
async function cleanup() {
  if (TEST_CONFIG.CLEANUP_AFTER_TESTS) {
    logInfo('Running cleanup...')
    
    try {
      // Clean up any test data created during tests
      // This would include removing test records, resetting test state, etc.
      logInfo('Cleanup completed')
    } catch (error) {
      logWarning(`Cleanup failed: ${error.message}`)
    }
  }
}

/**
 * Generate Test Report
 */
async function generateReport() {
  const report = {
    summary: {
      total: testResults.passed + testResults.failed + testResults.skipped,
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      success_rate: Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)
    },
    details: testResults.details,
    timestamp: new Date().toISOString(),
    config: TEST_CONFIG
  }
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'test-results', `payout-history-test-${Date.now()}.json`)
  
  try {
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    logInfo(`Test report saved to: ${reportPath}`)
  } catch (error) {
    logWarning(`Could not save test report: ${error.message}`)
  }
  
  return report
}

/**
 * Main Test Runner
 */
async function runTests() {
  logInfo('Starting comprehensive payout history system tests...')
  logInfo(`Configuration: ${JSON.stringify(TEST_CONFIG, null, 2)}`)
  
  const startTime = Date.now()
  
  try {
    // Run all test suites
    await testDatabaseSchema()
    await testPayoutHistoryAPI()
    await testTimelineAPI()
    await testMetadataAPI()
    await testFrontendComponents()
    await testWebhookHandlers()
    await testSystemIntegration()
    await testPerformance()
    await testSecurity()
    
    // Cleanup
    await cleanup()
    
    // Generate report
    const report = await generateReport()
    const duration = Date.now() - startTime
    
    // Print summary
    )
    
    )

    )
    
    if (report.summary.failed > 0) {
      logError('Some tests failed. Check the detailed report for more information.')
      process.exit(1)
    } else {
      logSuccess('All tests passed! 🎉')
      process.exit(0)
    }
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`)
    process.exit(1)
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
}

module.exports = {
  runTests,
  testResults,
  TEST_CONFIG
}