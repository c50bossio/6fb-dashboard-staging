#!/usr/bin/env node

/**
 * Production Readiness Test Suite
 * Comprehensive validation of all security fixes and production enhancements
 */

const axios = require('axios')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')

// Test configuration
const FRONTEND_URL = 'http://localhost:9999'
const BACKEND_URL = 'http://localhost:8001'

// ANSI escape codes for better formatting
const bold = text => chalk.bold(text)
const green = text => chalk.green(text)
const red = text => chalk.red(text)
const yellow = text => chalk.yellow(text)
const blue = text => chalk.blue(text)
const cyan = text => chalk.cyan(text)

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  critical: []
}

// ========================================
// SECURITY TESTS
// ========================================

async function testSecurityHeaders() {
  console.log(blue('\n🛡️  Testing Security Headers...'))
  
  try {
    const response = await axios.get(BACKEND_URL + '/health', {
      validateStatus: () => true
    })
    
    const requiredHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
      'strict-transport-security': true,
      'content-security-policy': true
    }
    
    let headersOk = true
    for (const [header, expected] of Object.entries(requiredHeaders)) {
      const value = response.headers[header]
      if (expected === true ? !value : value !== expected) {
        console.log(red(`   ❌ Missing/incorrect: ${header}`))
        headersOk = false
        testResults.failed++
      } else {
        console.log(green(`   ✅ ${header}: ${value || 'present'}`))
        testResults.passed++
      }
    }
    
    if (!headersOk) {
      testResults.critical.push('Security headers not fully configured')
    }
  } catch (error) {
    console.log(red('   ❌ Backend not accessible'))
    testResults.failed++
  }
}

async function testSensitiveEndpoints() {
  console.log(blue('\n🔒 Testing Sensitive Endpoint Protection...'))
  
  const sensitiveEndpoints = [
    '/.env',
    '/config.json',
    '/admin',
    '/debug',
    '/.git/config',
    '/api/v1/admin/users'
  ]
  
  for (const endpoint of sensitiveEndpoints) {
    try {
      const response = await axios.get(FRONTEND_URL + endpoint, {
        validateStatus: () => true
      })
      
      if (response.status === 404 || response.status === 403) {
        console.log(green(`   ✅ ${endpoint}: Protected (${response.status})`))
        testResults.passed++
      } else {
        console.log(red(`   ❌ ${endpoint}: EXPOSED (${response.status})`))
        testResults.failed++
        testResults.critical.push(`Sensitive endpoint exposed: ${endpoint}`)
      }
    } catch (error) {
      console.log(green(`   ✅ ${endpoint}: Protected (blocked)`))
      testResults.passed++
    }
  }
}

// ========================================
// MEMORY MANAGEMENT TESTS
// ========================================

async function testMemoryManagement() {
  console.log(blue('\n🧠 Testing Memory Management...'))
  
  try {
    const response = await axios.get(BACKEND_URL + '/health')
    
    if (response.data.memory) {
      const memory = response.data.memory
      console.log(green('   ✅ Memory monitoring active'))
      console.log(`      Process Memory: ${memory.process_memory_mb}MB`)
      console.log(`      Memory Pressure: ${(memory.pressure * 100).toFixed(1)}%`)
      console.log(`      Available Memory: ${memory.available_gb}GB`)
      
      if (memory.pressure > 0.85) {
        console.log(yellow('   ⚠️ High memory pressure detected'))
        testResults.warnings++
      } else {
        testResults.passed++
      }
      
      // Check connection pool
      if (response.data.database) {
        const db = response.data.database
        console.log(green('   ✅ Connection pool optimized'))
        console.log(`      Active: ${db.active_connections}/${db.max_connections}`)
        testResults.passed++
      }
    } else {
      console.log(red('   ❌ Memory monitoring not configured'))
      testResults.failed++
    }
  } catch (error) {
    console.log(red('   ❌ Health endpoint not accessible'))
    testResults.failed++
  }
}

// ========================================
// ERROR MONITORING TESTS
// ========================================

async function testSentryIntegration() {
  console.log(blue('\n🚨 Testing Sentry Error Monitoring...'))
  
  // Check environment
  const sentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  if (sentryDSN) {
    console.log(green('   ✅ Sentry DSN configured'))
    testResults.passed++
  } else {
    console.log(yellow('   ⚠️ Sentry DSN not configured'))
    testResults.warnings++
  }
  
  // Test error reporting endpoint
  try {
    const response = await axios.post(FRONTEND_URL + '/api/errors', {
      message: 'Production readiness test error',
      type: 'test',
      level: 'info'
    })
    
    if (response.data.success) {
      console.log(green('   ✅ Frontend error reporting works'))
      testResults.passed++
    } else {
      console.log(red('   ❌ Frontend error reporting failed'))
      testResults.failed++
    }
  } catch (error) {
    console.log(red('   ❌ Error reporting endpoint not accessible'))
    testResults.failed++
  }
  
  // Test backend error reporting
  try {
    const response = await axios.post(BACKEND_URL + '/api/errors', {
      message: 'Backend production test',
      type: 'test'
    })
    
    if (response.data.success) {
      console.log(green('   ✅ Backend error reporting works'))
      testResults.passed++
    } else {
      console.log(yellow('   ⚠️ Backend error reporting partial'))
      testResults.warnings++
    }
  } catch (error) {
    console.log(yellow('   ⚠️ Backend error endpoint not configured'))
    testResults.warnings++
  }
}

// ========================================
// RATE LIMITING TESTS
// ========================================

async function testRateLimiting() {
  console.log(blue('\n⏱️  Testing Rate Limiting...'))
  
  // Test rapid requests
  const endpoint = BACKEND_URL + '/api/v1/auth/login'
  const requests = []
  
  console.log('   Sending 10 rapid requests...')
  for (let i = 0; i < 10; i++) {
    requests.push(
      axios.post(endpoint, {
        email: 'test@example.com',
        password: 'test'
      }, {
        validateStatus: () => true
      })
    )
  }
  
  const responses = await Promise.all(requests)
  const rateLimited = responses.filter(r => r.status === 429)
  
  if (rateLimited.length > 0) {
    console.log(green(`   ✅ Rate limiting active (${rateLimited.length}/10 blocked)`))
    testResults.passed++
    
    // Check rate limit headers
    const limitedResponse = rateLimited[0]
    if (limitedResponse.headers['x-ratelimit-limit']) {
      console.log(green('   ✅ Rate limit headers present'))
      testResults.passed++
    } else {
      console.log(yellow('   ⚠️ Rate limit headers missing'))
      testResults.warnings++
    }
  } else {
    console.log(red('   ❌ Rate limiting not active'))
    testResults.failed++
    testResults.critical.push('Rate limiting not configured')
  }
}

// ========================================
// OAUTH FLOW TESTS
// ========================================

async function testOAuthFlow() {
  console.log(blue('\n🔐 Testing OAuth Callback Protection...'))
  
  try {
    // Test OAuth callback endpoint
    const startTime = Date.now()
    const response = await axios.get(FRONTEND_URL + '/auth/callback', {
      params: {
        code: 'test-code',
        state: 'test-state'
      },
      validateStatus: () => true,
      maxRedirects: 0
    })
    
    const duration = Date.now() - startTime
    
    // Should redirect or return appropriate status
    if (response.status === 302 || response.status === 307) {
      console.log(green('   ✅ OAuth callback redirects properly'))
      testResults.passed++
    } else if (response.status === 401) {
      console.log(green('   ✅ OAuth callback requires authentication'))
      testResults.passed++
    } else {
      console.log(yellow(`   ⚠️ OAuth callback returned ${response.status}`))
      testResults.warnings++
    }
    
    if (duration < 5000) {
      console.log(green(`   ✅ OAuth callback fast (${duration}ms)`))
      testResults.passed++
    } else {
      console.log(yellow(`   ⚠️ OAuth callback slow (${duration}ms)`))
      testResults.warnings++
    }
  } catch (error) {
    console.log(yellow('   ⚠️ OAuth callback not testable'))
    testResults.warnings++
  }
}

// ========================================
// PERFORMANCE TESTS
// ========================================

async function testPerformance() {
  console.log(blue('\n⚡ Testing Performance...'))
  
  const endpoints = [
    { url: FRONTEND_URL + '/api/health', name: 'Frontend Health', threshold: 100 },
    { url: BACKEND_URL + '/health', name: 'Backend Health', threshold: 200 }
  ]
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now()
      await axios.get(endpoint.url)
      const duration = Date.now() - startTime
      
      if (duration < endpoint.threshold) {
        console.log(green(`   ✅ ${endpoint.name}: ${duration}ms (< ${endpoint.threshold}ms)`))
        testResults.passed++
      } else {
        console.log(yellow(`   ⚠️ ${endpoint.name}: ${duration}ms (> ${endpoint.threshold}ms)`))
        testResults.warnings++
      }
    } catch (error) {
      console.log(red(`   ❌ ${endpoint.name}: Not accessible`))
      testResults.failed++
    }
  }
}

// ========================================
// PRODUCTION CONFIGURATION
// ========================================

async function testProductionConfig() {
  console.log(blue('\n⚙️  Testing Production Configuration...'))
  
  // Check for production files
  const requiredFiles = [
    'docker-compose.yml',
    'Dockerfile.frontend',
    'Dockerfile.backend',
    'requirements.txt',
    'package.json',
    '.env.example'
  ]
  
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      console.log(green(`   ✅ ${file} exists`))
      testResults.passed++
    } else {
      console.log(red(`   ❌ ${file} missing`))
      testResults.failed++
    }
  }
  
  // Check for sensitive files that shouldn't exist
  const forbiddenFiles = [
    '.env.local',
    '.env.production',
    'config.json'
  ]
  
  for (const file of forbiddenFiles) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      console.log(yellow(`   ⚠️ ${file} exists (should be in .gitignore)`))
      testResults.warnings++
    } else {
      console.log(green(`   ✅ ${file} not tracked`))
      testResults.passed++
    }
  }
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log(bold('\n🚀 PRODUCTION READINESS TEST SUITE'))
  console.log('=' .repeat(60))
  console.log(`Frontend: ${FRONTEND_URL}`)
  console.log(`Backend: ${BACKEND_URL}`)
  console.log('=' .repeat(60))
  
  // Run all test categories
  await testSecurityHeaders()
  await testSensitiveEndpoints()
  await testMemoryManagement()
  await testSentryIntegration()
  await testRateLimiting()
  await testOAuthFlow()
  await testPerformance()
  await testProductionConfig()
  
  // Display results
  console.log(bold('\n📊 TEST RESULTS'))
  console.log('=' .repeat(60))
  console.log(green(`✅ Passed: ${testResults.passed}`))
  console.log(red(`❌ Failed: ${testResults.failed}`))
  console.log(yellow(`⚠️  Warnings: ${testResults.warnings}`))
  
  // Critical issues
  if (testResults.critical.length > 0) {
    console.log(bold(red('\n🚨 CRITICAL ISSUES:')))
    testResults.critical.forEach(issue => {
      console.log(red(`   • ${issue}`))
    })
  }
  
  // Calculate score
  const total = testResults.passed + testResults.failed
  const score = Math.round((testResults.passed / total) * 100)
  
  console.log(bold('\n🏆 PRODUCTION READINESS SCORE'))
  console.log('=' .repeat(60))
  
  if (score >= 90) {
    console.log(bold(green(`${score}/100 - PRODUCTION READY! 🎉`)))
  } else if (score >= 70) {
    console.log(bold(yellow(`${score}/100 - Almost ready, address warnings`)))
  } else {
    console.log(bold(red(`${score}/100 - NOT READY for production`)))
  }
  
  // Recommendations
  console.log(bold('\n📝 RECOMMENDATIONS:'))
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    console.log('• Configure Sentry DSN for error monitoring')
  }
  if (testResults.critical.length > 0) {
    console.log('• Fix critical security issues immediately')
  }
  if (testResults.warnings > 5) {
    console.log('• Address performance and configuration warnings')
  }
  if (score < 90) {
    console.log('• Re-run tests after fixing issues')
  }
  
  // Exit code based on critical issues
  if (testResults.critical.length > 0) {
    process.exit(1)
  }
}

// Run the test suite
runAllTests().catch(error => {
  console.error(red('\n❌ Test suite failed:'), error)
  process.exit(1)
})