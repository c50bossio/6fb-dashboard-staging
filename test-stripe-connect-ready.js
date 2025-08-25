#!/usr/bin/env node

/**
 * Test if Stripe Connect is actually working
 * The STRIPE_CONNECT_CLIENT_ID is only for OAuth flow, not Express accounts
 */

const https = require('https');

console.log('🔍 Testing Stripe Connect configuration...\n');

// First check the health endpoint
function checkHealth() {
  return new Promise((resolve) => {
    https.get('https://bookedbarber.com/api/payments/health', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📊 Health Check Results:');
          console.log('========================');
          const stripe = response.checks?.stripe || {};
          console.log(`Mode: ${stripe.mode === 'live' ? '✅ LIVE' : '⚠️ TEST'}`);
          console.log(`Configured: ${stripe.configured ? '✅ YES' : '❌ NO'}`);
          console.log(`Connect Ready: ${stripe.connectReady ? '✅ YES' : '❌ NO'}`);
          
          resolve(stripe);
        } catch (error) {
          console.error('Error parsing health response:', error.message);
          resolve(null);
        }
      });
    }).on('error', (error) => {
      console.error('Error checking health:', error.message);
      resolve(null);
    });
  });
}

// Test the actual create endpoint (will fail without auth, but shows if API is working)
function testCreateEndpoint() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ test: true });
    
    const options = {
      hostname: 'bookedbarber.com',
      path: '/api/payments/connect/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n📝 Create Endpoint Test:');
        console.log('========================');
        console.log(`Status Code: ${res.statusCode}`);
        
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 401 || response.error === 'Authentication required') {
            console.log('✅ Endpoint is responding correctly (auth required)');
            console.log('   This means the API is working, just needs login');
          } else if (response.error) {
            console.log(`⚠️ Error: ${response.error}`);
          } else {
            console.log('Response:', JSON.stringify(response, null, 2));
          }
        } catch (error) {
          console.log('Raw response:', data.substring(0, 200));
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('Error testing create endpoint:', error.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  const healthStatus = await checkHealth();
  await testCreateEndpoint();
  
  console.log('\n📋 Analysis:');
  console.log('============');
  
  if (healthStatus) {
    if (healthStatus.mode === 'live') {
      console.log('✅ Production is using LIVE Stripe keys');
      
      if (!healthStatus.configured) {
        console.log('\n⚠️ Configuration shows as incomplete because:');
        console.log('   - STRIPE_SECRET_KEY might not be set');
        console.log('   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY might not be set');
        console.log('   - STRIPE_CONNECT_CLIENT_ID is not set (only needed for OAuth)');
        console.log('\n   For Stripe Connect Express (what you\'re using):');
        console.log('   - Only STRIPE_SECRET_KEY is required');
        console.log('   - STRIPE_CONNECT_CLIENT_ID is NOT required');
        console.log('\n   The payment setup should work if STRIPE_SECRET_KEY is valid');
      } else {
        console.log('✅ All required configuration is present');
      }
    } else {
      console.log('⚠️ Production is in TEST mode - switch to live keys');
    }
  }
  
  console.log('\n🔗 Test the actual flow:');
  console.log('1. Go to https://bookedbarber.com');
  console.log('2. Login with your account');
  console.log('3. Navigate to Settings > Payment Setup');
  console.log('4. Try to set up Stripe Connect');
  console.log('\nIf it fails, check the browser console for errors.');
}

runTests();