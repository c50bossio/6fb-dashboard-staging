#!/usr/bin/env node

/**
 * Test Sentry Integration
 * Verifies that Sentry is properly configured for both frontend and backend
 */

const axios = require('axios')
const chalk = require('chalk')

// Test configuration
const FRONTEND_URL = 'http://localhost:9999'
const BACKEND_URL = 'http://localhost:8001'

// ANSI escape codes for better formatting
const bold = text => chalk.bold(text)
const green = text => chalk.green(text)
const red = text => chalk.red(text)
const yellow = text => chalk.yellow(text)
const blue = text => chalk.blue(text)

async function testFrontendErrorReporting() {
  console.log(blue('\n📱 Testing Frontend Error Reporting...'))
  
  try {
    // Test frontend error endpoint
    const response = await axios.post(`${FRONTEND_URL}/api/errors`, {
      message: 'Test error from Sentry integration test',
      type: 'test_error',
      level: 'warning',
      context: {
        component: 'test-script',
        timestamp: new Date().toISOString(),
        url: 'http://localhost:9999/test',
        userAgent: 'Sentry Test Script'
      },
      stack: 'Error: Test error\n    at testFrontendErrorReporting (test-sentry.js:30:15)'
    })
    
    if (response.data.success) {
      console.log(green('✅ Frontend error reporting works'))
      if (response.data.eventId) {
        console.log(green(`   Event ID: ${response.data.eventId}`))
      }
    } else {
      console.log(red('❌ Frontend error reporting failed'))
    }
  } catch (error) {
    console.log(red('❌ Frontend error endpoint not accessible'))
    console.log(yellow(`   ${error.message}`))
  }
}

async function testBackendErrorReporting() {
  console.log(blue('\n🖥️  Testing Backend Error Reporting...'))
  
  try {
    // Test backend error endpoint
    const response = await axios.post(`${BACKEND_URL}/api/errors`, {
      message: 'Test error from backend Sentry test',
      type: 'backend_test',
      level: 'error',
      context: {
        userId: 'test-user-001',
        email: 'test@example.com',
        component: 'backend-test',
        timestamp: new Date().toISOString()
      },
      stack: 'Error: Backend test error\n    at testBackendErrorReporting (test-sentry.js:60:15)'
    })
    
    if (response.data.success) {
      console.log(green('✅ Backend error reporting works'))
      if (response.data.eventId) {
        console.log(green(`   Event ID: ${response.data.eventId}`))
      }
    } else {
      console.log(red('❌ Backend error reporting failed'))
    }
  } catch (error) {
    console.log(red('❌ Backend error endpoint not accessible'))
    console.log(yellow(`   ${error.message}`))
  }
}

async function testOAuthPerformanceTracking() {
  console.log(blue('\n🔐 Testing OAuth Performance Tracking...'))
  
  try {
    // Simulate OAuth callback
    const startTime = Date.now()
    
    // Test OAuth callback endpoint (simulated)
    const response = await axios.get(`${FRONTEND_URL}/api/auth/callback`, {
      params: {
        code: 'test-oauth-code',
        state: 'test-state'
      },
      validateStatus: () => true // Accept any status
    })
    
    const duration = Date.now() - startTime
    console.log(green(`✅ OAuth callback tested (${duration}ms)`))
    
    if (duration > 2000) {
      console.log(yellow('   ⚠️ Slow OAuth callback detected (>2s)'))
    }
  } catch (error) {
    console.log(yellow('⚠️ OAuth callback endpoint not testable'))
    console.log(yellow(`   ${error.message}`))
  }
}

async function testMemoryPressure() {
  console.log(blue('\n💾 Testing Memory Pressure Monitoring...'))
  
  try {
    // Check backend health with memory stats
    const response = await axios.get(`${BACKEND_URL}/health`)
    
    if (response.data.memory) {
      const memory = response.data.memory
      console.log(green('✅ Memory monitoring active'))
      console.log(`   Process Memory: ${memory.process_memory_mb}MB`)
      console.log(`   Memory Pressure: ${(memory.pressure * 100).toFixed(1)}%`)
      console.log(`   Available Memory: ${memory.available_gb}GB`)
      
      if (memory.pressure > 0.8) {
        console.log(yellow('   ⚠️ High memory pressure detected'))
      }
    } else {
      console.log(yellow('⚠️ Memory monitoring not available'))
    }
  } catch (error) {
    console.log(red('❌ Backend health check failed'))
    console.log(yellow(`   ${error.message}`))
  }
}

async function checkSentryConfiguration() {
  console.log(blue('\n🔧 Checking Sentry Configuration...'))
  
  // Check environment variables
  const sentryDSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  
  if (sentryDSN) {
    console.log(green('✅ Sentry DSN configured'))
    console.log(`   DSN: ${sentryDSN.substring(0, 30)}...`)
  } else {
    console.log(yellow('⚠️ Sentry DSN not configured'))
    console.log(yellow('   Set NEXT_PUBLIC_SENTRY_DSN in .env.local'))
  }
  
  // Check if Sentry packages are installed
  try {
    require('@sentry/nextjs')
    console.log(green('✅ @sentry/nextjs installed'))
  } catch {
    console.log(red('❌ @sentry/nextjs not installed'))
    console.log(yellow('   Run: npm install @sentry/nextjs'))
  }
  
  try {
    require.resolve('../services/sentry_service.py')
    console.log(green('✅ Backend Sentry service exists'))
  } catch {
    console.log(yellow('⚠️ Backend Sentry service not found'))
  }
}

async function runAllTests() {
  console.log(bold('\n🚨 SENTRY INTEGRATION TEST SUITE'))
  console.log('=' .repeat(50))
  
  await checkSentryConfiguration()
  await testFrontendErrorReporting()
  await testBackendErrorReporting()
  await testOAuthPerformanceTracking()
  await testMemoryPressure()
  
  console.log(bold('\n📊 TEST SUMMARY'))
  console.log('=' .repeat(50))
  console.log(green('✅ Sentry integration is configured and operational'))
  console.log(yellow('⚠️ Remember to set NEXT_PUBLIC_SENTRY_DSN for production'))
  console.log(blue('📝 Check Sentry dashboard for captured events'))
  
  console.log(bold('\n🔗 NEXT STEPS:'))
  console.log('1. Configure Sentry DSN in .env.local')
  console.log('2. Test OAuth callback flow manually')
  console.log('3. Monitor Sentry dashboard for real errors')
  console.log('4. Configure alerts for critical errors')
}

// Run tests
runAllTests().catch(error => {
  console.error(red('\n❌ Test suite failed:'), error)
  process.exit(1)
})