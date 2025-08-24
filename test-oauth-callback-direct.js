#!/usr/bin/env node

/**
 * Direct OAuth Callback Test
 * 
 * Test the OAuth callback endpoint directly with simulated cookies
 * to see if our debugging and fixes are working.
 */

const http = require('http')
const https = require('https')

async function testOAuthCallback() {
  console.log('🧪 DIRECT OAUTH CALLBACK TEST')
  console.log('=' .repeat(50))
  
  console.log('\n📋 Test Objective:')
  console.log('   Test OAuth callback with simulated PKCE cookies')
  console.log('   to verify our debugging and fixes work')

  // Simulate an OAuth callback with problematic PKCE cookies
  const testData = {
    url: 'http://localhost:9999/auth/callback?code=test_authorization_code_123&state=test_state',
    headers: {
      'Cookie': 'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier="quoted-verifier-value-that-should-be-fixed"; other-cookie=normal-value',
      'User-Agent': 'Mozilla/5.0 (Test) OAuth Callback Test',
      'Accept': 'text/html,application/xhtml+xml'
    }
  }

  console.log('\n📍 Step 1: Preparing test request')
  console.log('   URL:', testData.url)
  console.log('   Cookie (problematic):', testData.headers.Cookie)
  console.log('   🔍 This cookie has JSON-stringified quotes around the verifier')

  console.log('\n📍 Step 2: Sending request to OAuth callback')
  console.log('   🔍 Watch server logs for:')
  console.log('     - 🚨 FIXING PKCE COOKIE (our fix working)')
  console.log('     - 🚨 [SERVER-CLIENT] GETALL CALLED (custom handlers used)')
  console.log('     - 🚨 exchangeCodeForSession COMPLETED (OAuth result)')

  try {
    const response = await makeRequest(testData.url, {
      headers: testData.headers,
      followRedirect: false  // Don't follow redirects, just see what happens
    })

    console.log('\n✅ Response received:')
    console.log('   Status:', response.statusCode)
    console.log('   Headers:', Object.keys(response.headers).join(', '))
    
    if (response.headers.location) {
      console.log('   Redirect to:', response.headers.location)
      
      // Analyze the redirect to understand the result
      if (response.headers.location.includes('error=')) {
        console.log('   🔍 OAuth failed - check server logs for debugging info')
      } else if (response.headers.location.includes('dashboard')) {
        console.log('   🎉 OAuth success - user would be redirected to dashboard')
      }
    }

    console.log('\n📊 NEXT STEPS:')
    console.log('1. Check the server logs above for our debugging messages')
    console.log('2. If you see "🚨 [SERVER-CLIENT] GETALL CALLED":')
    console.log('   ✅ SUCCESS: Our custom handlers are being used')
    console.log('3. If you see "🚨 FIXING PKCE COOKIE":')
    console.log('   ✅ SUCCESS: Our cookie fix is working')
    console.log('4. If you see neither, Supabase may bypass our handlers')

  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http
    
    const req = client.request(url, {
      method: 'GET',
      headers: options.headers || {},
      timeout: 10000
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        })
      })
    })
    
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

// Load environment for Next.js server
require('dotenv').config({ path: '.env.local' })

testOAuthCallback().catch(console.error)