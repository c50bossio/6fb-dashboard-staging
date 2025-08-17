#!/usr/bin/env node

const API_BASE = 'http://localhost:9999/api';

async function testContinueSetup() {
  console.log('🧪 Testing Continue Setup Button Flow\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check if we have an existing Stripe account
    console.log('\n1. Creating new Stripe Connect account...');
    const createResponse = await fetch(`${API_BASE}/payments/connect/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_type: 'company',
        business_name: 'Test Setup Company',
        email: 'demo@bookedbarber.com',
        country: 'US',
        account_type: 'express'
      })
    });
    
    const createData = await createResponse.json();
    console.log('   Account creation status:', createResponse.status);
    
    if (!createResponse.ok) {
      console.log('   Response:', JSON.stringify(createData, null, 2));
      console.log('   (This might be expected if account already exists)');
    } else {
      console.log('   ✅ New account created:', createData.account_id);
    }
    
    // Use existing account ID or new one
    const accountId = createData.account_id || 'acct_1RxD85Ir88CV6vjh';
    
    // Test 2: Generate onboarding link (Continue Setup button functionality)
    console.log('\n2. Testing Continue Setup (onboarding link generation)...');
    const onboardingResponse = await fetch(`${API_BASE}/payments/connect/onboarding-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_id: accountId,
        refresh_url: 'http://localhost:9999/dashboard/onboarding?refresh=true',
        return_url: 'http://localhost:9999/dashboard/onboarding?step=banking&success=true'
      })
    });
    
    const onboardingData = await onboardingResponse.json();
    console.log('   Onboarding link status:', onboardingResponse.status);
    
    if (onboardingResponse.ok) {
      console.log('   ✅ Continue Setup button should work!');
      console.log('   🔗 Onboarding URL:', onboardingData.url);
      console.log('   ⏰ Expires at:', new Date(onboardingData.expires_at * 1000).toLocaleString());
    } else {
      console.log('   ❌ Continue Setup failed:', onboardingData);
    }
    
    console.log('\n' + '=' .repeat(50));
    if (onboardingResponse.ok) {
      console.log('✅ Continue Setup button should now work correctly!');
      console.log('\nWhat happens when clicked:');
      console.log('1. Creates Stripe onboarding link with production URLs');
      console.log('2. Opens Stripe Connect onboarding flow');
      console.log('3. User completes bank account setup');
      console.log('4. Returns to dashboard on completion');
    } else {
      console.log('❌ Continue Setup button will still have issues');
      console.log('Check the errors above for troubleshooting');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testContinueSetup();