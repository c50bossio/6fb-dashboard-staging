#!/usr/bin/env node

// Test script for Cin7 API connection
// Run with: node test-cin7-api.js

async function testCin7Connection() {
  console.log('🧪 Testing Cin7 API Connection...\n');
  
  // Replace these with your actual credentials
  const accountId = 'YOUR_ACCOUNT_ID_HERE';
  const apiKey = 'YOUR_API_KEY_HERE';
  
  console.log('⚠️  Please edit this file and add your Cin7 Core credentials:');
  console.log('   - accountId: Should be a UUID like "1fd319f3-0a8b-4314-bb82-603f47fe20e9"');
  console.log('   - apiKey: Should be a UUID like "4c9ed612-b13e-5c36-8d71-98e196068b54"\n');
  
  if (accountId === 'YOUR_ACCOUNT_ID_HERE' || apiKey === 'YOUR_API_KEY_HERE') {
    console.log('❌ Please update the credentials in this file first!');
    return;
  }
  
  try {
    console.log('📡 Calling local API endpoint: http://localhost:9999/api/cin7/test-connection\n');
    
    const response = await fetch('http://localhost:9999/api/cin7/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accountId: accountId,
        apiKey: apiKey
      })
    });
    
    const data = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Connection to Cin7 Core established!');
      console.log('   Company:', data.company);
      console.log('   User:', data.userName);
      console.log('   Has Products:', data.hasProducts);
    } else {
      console.log('\n❌ FAILED! Error details:');
      console.log('   Error:', data.error);
      console.log('   Message:', data.message);
      if (data.debug) {
        console.log('\n🔍 Debug Info:');
        console.log('   Account ID Length:', data.debug.accountIdLength);
        console.log('   API Key Length:', data.debug.apiKeyLength);
        console.log('   Account ID Format:', data.debug.accountIdFormat);
      }
    }
  } catch (error) {
    console.error('\n❌ Network or server error:', error.message);
    console.error('   Make sure the Next.js server is running on port 9999');
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18 or higher for native fetch support');
  process.exit(1);
}

testCin7Connection();