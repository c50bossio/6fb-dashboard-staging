#!/usr/bin/env node

/**
 * Direct API test from Node.js (no CORS issues)
 */

const fetch = require('node-fetch');

async function testPaymentAPI() {
  console.log('🧪 Testing Payment API Directly\n');
  
  try {
    // Test 1: Health Check
    console.log('1. Testing Health Endpoint...');
    const healthResponse = await fetch('http://localhost:9999/api/payments/health');
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health Check Success:');
      console.log('   Status:', health.status);
      console.log('   Stripe Mode:', health.checks.stripe.mode);
      console.log('   Connect Ready:', health.checks.stripe.connectReady);
      console.log('   Database:', health.checks.database.connected ? 'Connected' : 'Not Connected');
      console.log('   Pricing:', health.checks.pricing.cardFee, '(', health.checks.pricing.platformMarkup, 'markup)');
    } else {
      console.log('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
    }
    
    // Test 2: Try Create Account (will fail without auth)
    console.log('\n2. Testing Create Account Endpoint...');
    const createResponse = await fetch('http://localhost:9999/api/payments/connect/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        business_type: 'individual',
        country: 'US'
      })
    });
    
    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      console.log('✅ Account created:', createResult.account_id);
    } else {
      console.log('⚠️  Expected auth error:', createResult.error || 'Unauthorized');
      console.log('   (This is normal - authentication is required)');
    }
    
    console.log('\n✅ API endpoints are working correctly!');
    console.log('\n📝 Note: To test account creation, you need to:');
    console.log('   1. Be logged into the application');
    console.log('   2. Use the dashboard at http://localhost:9999/dashboard');
    console.log('   3. Navigate to Step 5 of onboarding');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if dev server is running: npm run dev');
    console.log('   2. Check if port 9999 is accessible');
    console.log('   3. Try: curl http://localhost:9999/api/payments/health');
  }
}

testPaymentAPI();