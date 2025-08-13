#!/usr/bin/env node

/**
 * CORS Configuration Test Script
 * Tests CORS configuration and validates security settings
 */

import { getCorsStatus, isOriginAllowed, getCorsHeaders } from '../lib/cors-config.js'

async function testCorsConfiguration() {
  console.log('🌍 Testing CORS Configuration')
  console.log('=============================\n')

  // Test 1: Basic configuration
  console.log('1. Testing basic CORS configuration...')
  const corsStatus = getCorsStatus()
  
  console.log(`   Environment: ${corsStatus.environment.nodeEnv} (${corsStatus.environment.deploymentEnv})`)
  console.log(`   ENV configured: ${corsStatus.configuration.envOriginsConfigured ? '✅ Yes' : '❌ No'}`)
  console.log(`   Total origins: ${corsStatus.configuration.totalAllowedOrigins}`)
  console.log(`   Development mode: ${corsStatus.security.developmentMode ? '✅ Yes' : '❌ No'}`)
  
  console.log('\n   Allowed origins:')
  corsStatus.allowedOrigins.forEach((origin, index) => {
    console.log(`     ${index + 1}. ${origin}`)
  })

  // Test 2: Origin validation
  console.log('\n2. Testing origin validation...')
  
  const testOrigins = [
    'http://localhost:9999',
    'https://localhost:9999',
    'http://127.0.0.1:9999',
    'https://6fb-ai.com',
    'https://malicious-site.com',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    null,
    undefined,
    ''
  ]
  
  for (const origin of testOrigins) {
    const isAllowed = isOriginAllowed(origin)
    const status = isAllowed ? '✅ ALLOWED' : '❌ BLOCKED'
    const displayOrigin = origin === null ? 'null' : origin === undefined ? 'undefined' : origin || '(empty)'
    console.log(`     ${displayOrigin}: ${status}`)
  }

  // Test 3: CORS headers generation
  console.log('\n3. Testing CORS headers generation...')
  
  const testCorsOrigins = [
    'http://localhost:9999',
    'https://6fb-ai.com',
    null
  ]
  
  for (const origin of testCorsOrigins) {
    console.log(`\n   Origin: ${origin || '(none)'}`)
    const headers = getCorsHeaders(origin)
    
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`)
    })
  }

  // Test 4: Security validation
  console.log('\n4. Testing security validation...')
  
  const securityTests = [
    {
      origin: 'javascript:alert(1)',
      description: 'JavaScript protocol injection'
    },
    {
      origin: 'data:text/html,<script>',
      description: 'Data URL injection'
    },
    {
      origin: 'http://evil.com<script>alert(1)</script>',
      description: 'Script tag injection'
    },
    {
      origin: 'http://evil.com" onload="alert(1)',
      description: 'HTML attribute injection'
    },
    {
      origin: 'vbscript:msgbox(1)',
      description: 'VBScript protocol injection'
    }
  ]
  
  console.log('   Testing malicious patterns:')
  for (const test of securityTests) {
    const isAllowed = isOriginAllowed(test.origin)
    const status = isAllowed ? '❌ VULNERABLE' : '✅ BLOCKED'
    console.log(`     ${test.description}: ${status}`)
    
    if (isAllowed) {
      console.log(`       ⚠️  SECURITY ISSUE: "${test.origin}" was allowed!`)
    }
  }

  // Test 5: Environment-specific behavior
  console.log('\n5. Testing environment-specific behavior...')
  
  const originalNodeEnv = process.env.NODE_ENV
  
  // Test development environment
  process.env.NODE_ENV = 'development'
  const devOriginTest = isOriginAllowed('http://localhost:3000')
  console.log(`   Development localhost:3000: ${devOriginTest ? '✅ ALLOWED' : '❌ BLOCKED'}`)
  
  // Test production environment
  process.env.NODE_ENV = 'production'
  const prodOriginTest = isOriginAllowed('http://localhost:3000')
  console.log(`   Production localhost:3000: ${prodOriginTest ? '❌ ALLOWED' : '✅ BLOCKED'}`)
  
  // Restore original environment
  process.env.NODE_ENV = originalNodeEnv

  // Test 6: Performance test
  console.log('\n6. Testing performance...')
  
  const perfOrigin = 'https://test-perf.com'
  const iterations = 1000
  const startTime = Date.now()
  
  for (let i = 0; i < iterations; i++) {
    isOriginAllowed(perfOrigin)
  }
  
  const endTime = Date.now()
  const duration = endTime - startTime
  const opsPerSecond = Math.round((iterations / duration) * 1000)
  
  console.log(`   ${iterations} validations in ${duration}ms`)
  console.log(`   Performance: ~${opsPerSecond} validations/second`)

  // Test 7: Configuration recommendations
  console.log('\n7. Configuration recommendations...')
  
  const issues = []
  const recommendations = []
  
  if (!corsStatus.configuration.envOriginsConfigured) {
    issues.push('CORS_ORIGINS environment variable not set')
    recommendations.push('Set CORS_ORIGINS with your production domains')
  }
  
  if (corsStatus.security.developmentMode && process.env.DEPLOYMENT_ENV === 'production') {
    issues.push('Development mode in production environment')
    recommendations.push('Set NODE_ENV=production for production deployment')
  }
  
  if (corsStatus.allowedOrigins.some(origin => origin.includes('*'))) {
    issues.push('Wildcard origins detected')
    recommendations.push('Replace wildcards with specific domains')
  }
  
  const httpOrigins = corsStatus.allowedOrigins.filter(origin => 
    origin.startsWith('http://') && !origin.includes('localhost')
  )
  if (httpOrigins.length > 0 && corsStatus.environment.nodeEnv === 'production') {
    issues.push('HTTP origins in production')
    recommendations.push('Use HTTPS for all production origins')
  }
  
  if (issues.length === 0) {
    console.log('   ✅ No security issues found')
  } else {
    console.log('   ⚠️  Issues found:')
    issues.forEach((issue, index) => {
      console.log(`     ${index + 1}. ${issue}`)
    })
    
    console.log('\n   📋 Recommendations:')
    recommendations.forEach((rec, index) => {
      console.log(`     ${index + 1}. ${rec}`)
    })
  }

  console.log('\n✅ CORS configuration testing completed!')
  
  return {
    totalTests: 7,
    issues: issues.length,
    recommendations: recommendations.length,
    securityPassed: securityTests.every(test => !isOriginAllowed(test.origin))
  }
}

async function testCorsEndpoint() {
  console.log('\n🔗 Testing CORS API endpoint...')
  
  try {
    // Test the health endpoint
    const response = await fetch('http://localhost:9999/api/health/cors')
    
    if (response.ok) {
      const data = await response.json()
      console.log('   ✅ CORS health endpoint accessible')
      console.log(`   Status: ${data.status}`)
      console.log(`   Origins: ${data.configuration?.totalAllowedOrigins || 0}`)
      
      if (data.warnings && data.warnings.length > 0) {
        console.log('   ⚠️  Warnings:')
        data.warnings.forEach((warning, index) => {
          console.log(`     ${index + 1}. ${warning}`)
        })
      }
    } else {
      console.log(`   ❌ CORS health endpoint failed: ${response.status}`)
    }
    
  } catch (error) {
    console.log(`   ⚠️  CORS health endpoint not accessible: ${error.message}`)
    console.log('   (This is normal if the server is not running)')
  }
}

// Main execution
async function main() {
  try {
    console.log('🔍 Environment Information:')
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`)
    console.log(`   DEPLOYMENT_ENV: ${process.env.DEPLOYMENT_ENV || 'undefined'}`)
    console.log(`   CORS_ORIGINS: ${process.env.CORS_ORIGINS ? 'configured' : 'not configured'}`)
    console.log()
    
    const results = await testCorsConfiguration()
    await testCorsEndpoint()
    
    console.log('\n📊 Test Summary:')
    console.log('===============')
    console.log(`Total tests: ${results.totalTests}`)
    console.log(`Security: ${results.securityPassed ? '✅ Passed' : '❌ Failed'}`)
    console.log(`Issues: ${results.issues}`)
    console.log(`Recommendations: ${results.recommendations}`)
    
    if (results.issues === 0 && results.securityPassed) {
      console.log('\n🎉 CORS configuration is secure and ready for production!')
    } else {
      console.log('\n⚠️  Please review and address the issues above before production deployment.')
    }
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()