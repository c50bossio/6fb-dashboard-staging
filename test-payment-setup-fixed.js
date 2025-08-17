#!/usr/bin/env node

const API_BASE = 'http://localhost:9999/api';

async function testPaymentSetup() {
  console.log('🧪 Testing Payment Setup Flow (Fixed)\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Create Stripe Connect Account
    console.log('\n1. Creating Stripe Connect Account...');
    const createResponse = await fetch(`${API_BASE}/payments/connect/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_type: 'company',
        business_name: 'Test Barbershop',
        email: 'demo@bookedbarber.com',
        country: 'US',
        account_type: 'express'
      })
    });
    
    const createData = await createResponse.json();
    console.log('   Status:', createResponse.status);
    console.log('   Response:', JSON.stringify(createData, null, 2));
    
    if (!createResponse.ok) {
      console.error('❌ Failed to create account:', createData.error);
      return;
    }
    
    const accountId = createData.account_id;
    console.log('✅ Account created:', accountId);
    
    // Test 2: Get Onboarding Link
    console.log('\n2. Getting Onboarding Link...');
    const onboardingResponse = await fetch(`${API_BASE}/payments/connect/onboarding-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_id: accountId,
        refresh_url: 'https://bookedbarber.com/dashboard/settings#payments',
        return_url: 'https://bookedbarber.com/dashboard/settings?section=payments&success=true'
      })
    });
    
    const onboardingData = await onboardingResponse.json();
    console.log('   Status:', onboardingResponse.status);
    console.log('   Response:', JSON.stringify(onboardingData, null, 2));
    
    if (!onboardingResponse.ok) {
      console.error('❌ Failed to get onboarding link:', onboardingData.error);
      return;
    }
    
    console.log('✅ Onboarding URL:', onboardingData.url);
    
    // Test 3: Check Account Status
    console.log('\n3. Checking Account Status...');
    const statusResponse = await fetch(`${API_BASE}/payments/connect/status/${accountId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const statusData = await statusResponse.json();
    console.log('   Status:', statusResponse.status);
    console.log('   Response:', JSON.stringify(statusData, null, 2));
    
    if (!statusResponse.ok) {
      console.error('❌ Failed to get account status:', statusData.error);
      return;
    }
    
    console.log('✅ Account status retrieved successfully');
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ All payment setup endpoints are working!');
    console.log('\nNext steps:');
    console.log('1. Visit the onboarding URL to complete Stripe setup');
    console.log('2. The account will be marked as onboarded once complete');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPaymentSetup();