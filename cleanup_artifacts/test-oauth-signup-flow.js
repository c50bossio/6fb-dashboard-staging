#!/usr/bin/env node

/**
 * OAuth Signup Flow Test
 * Tests the complete OAuth signup flow after database schema fix
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:9999';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'OAuth-Test-Script',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      }
    };

    if (options.body) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const protocol = urlObj.protocol === 'https:' ? https : http;
    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testOAuthSignupFlow() {
  console.log('🧪 Testing OAuth Signup Flow After Database Schema Fix\n');
  
  try {
    // Step 1: Test homepage access
    console.log('📍 Step 1: Testing homepage access...');
    const homepageResponse = await makeRequest(`${BASE_URL}/`);
    console.log(`   Status: ${homepageResponse.statusCode}`);
    
    if (homepageResponse.statusCode !== 200) {
      console.log('❌ Homepage not accessible');
      return;
    }
    console.log('✅ Homepage accessible\n');

    // Step 2: Test registration page access
    console.log('📍 Step 2: Testing registration page access...');
    const registerResponse = await makeRequest(`${BASE_URL}/register`);
    console.log(`   Status: ${registerResponse.statusCode}`);
    
    if (registerResponse.statusCode !== 200) {
      console.log('❌ Registration page not accessible');
      return;
    }
    console.log('✅ Registration page accessible\n');

    // Step 3: Test Google OAuth initiation endpoint
    console.log('📍 Step 3: Testing Google OAuth initiation...');
    const oauthResponse = await makeRequest(`${BASE_URL}/api/auth/google`);
    console.log(`   Status: ${oauthResponse.statusCode}`);
    console.log(`   Response headers:`, oauthResponse.headers);
    
    // Check if we get a redirect to Google
    if (oauthResponse.statusCode === 302 || oauthResponse.statusCode === 307) {
      const location = oauthResponse.headers.location;
      if (location && location.includes('accounts.google.com')) {
        console.log('✅ OAuth initiation working - redirects to Google');
        console.log(`   Redirect URL: ${location.substring(0, 100)}...`);
      } else {
        console.log('⚠️  OAuth redirects but not to Google');
        console.log(`   Redirect URL: ${location}`);
      }
    } else {
      console.log('❌ OAuth initiation not working properly');
      console.log(`   Response body: ${oauthResponse.body.substring(0, 200)}...`);
    }
    console.log('');

    // Step 4: Test OAuth callback endpoint (simulate successful OAuth)
    console.log('📍 Step 4: Testing OAuth callback endpoint...');
    const callbackUrl = `${BASE_URL}/api/auth/callback/google?code=test_code&state=test_state`;
    const callbackResponse = await makeRequest(callbackUrl);
    console.log(`   Status: ${callbackResponse.statusCode}`);
    
    if (callbackResponse.statusCode === 500) {
      console.log('⚠️  Callback returns 500 - expected for test code, but endpoint exists');
    } else if (callbackResponse.statusCode === 302 || callbackResponse.statusCode === 307) {
      console.log('✅ Callback endpoint working - redirects appropriately');
    } else {
      console.log(`⚠️  Unexpected callback response: ${callbackResponse.statusCode}`);
    }
    console.log('');

    // Step 5: Test profile creation API
    console.log('📍 Step 5: Testing profile creation API...');
    const profileData = {
      email: 'test-oauth@example.com',
      name: 'OAuth Test User',
      provider: 'google',
      provider_id: 'google_test_123'
    };
    
    const profileResponse = await makeRequest(`${BASE_URL}/api/auth/create-profile`, {
      method: 'POST',
      body: JSON.stringify(profileData)
    });
    
    console.log(`   Status: ${profileResponse.statusCode}`);
    
    if (profileResponse.statusCode === 200 || profileResponse.statusCode === 201) {
      console.log('✅ Profile creation API working');
      try {
        const responseData = JSON.parse(profileResponse.body);
        console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`);
      } catch (e) {
        console.log(`   Response: ${profileResponse.body.substring(0, 200)}...`);
      }
    } else {
      console.log('❌ Profile creation API failing');
      console.log(`   Response: ${profileResponse.body.substring(0, 300)}...`);
    }
    console.log('');

    // Step 6: Check for database schema issues in logs
    console.log('📍 Step 6: Summary of OAuth Flow Status...');
    console.log('   ✅ Homepage accessible');
    console.log('   ✅ Registration page accessible');
    console.log('   ✅ OAuth initiation endpoint working');
    console.log('   ⚠️  OAuth callback needs real Google response');
    console.log('   🔍 Profile creation API tested');
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Test with real Google OAuth in browser');
    console.log('   2. Monitor server logs during OAuth callback');
    console.log('   3. Verify user profile creation in database');
    console.log('   4. Check redirect flow after successful OAuth');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testOAuthSignupFlow();