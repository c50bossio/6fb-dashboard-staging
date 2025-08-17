// Test to determine exact CIN7 account configuration
const fetch = require('node-fetch');

async function testAccountConfiguration() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 Account Configuration');
  console.log('====================================\n');
  
  // Test if this might be a sub-account or restricted account
  const tests = [
    {
      name: 'Test with trimmed credentials',
      accountId: accountId.trim(),
      apiKey: apiKey.trim()
    },
    {
      name: 'Test with URL-encoded credentials',
      accountId: encodeURIComponent(accountId),
      apiKey: encodeURIComponent(apiKey)
    },
    {
      name: 'Test swapped credentials (in case they were reversed)',
      accountId: apiKey,
      apiKey: accountId
    }
  ];
  
  for (const test of tests) {
    console.log('\nTesting: ' + test.name);
    
    const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': test.accountId,
        'api-auth-applicationkey': test.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const text = await response.text();
    console.log('Status: ' + response.status);
    console.log('Response: ' + text);
    
    if (response.status === 200) {
      console.log('\nSUCCESS! Found working configuration!');
      console.log('Account ID should be: ' + test.accountId);
      console.log('API Key should be: ' + test.apiKey);
      return;
    }
  }
  
  // Test if API v2 is even available
  console.log('\n\nTesting API availability without auth...');
  const noAuthResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/', {
    method: 'GET'
  });
  console.log('No auth status: ' + noAuthResponse.status);
  
  // Check if there's a different server/region
  console.log('\n\nPossible issues:');
  console.log('1. API v2 access might not be enabled for your account plan');
  console.log('2. Your account might be on a different CIN7 server (regional)');
  console.log('3. The account might require additional setup in CIN7');
  console.log('4. There might be IP restrictions on the API key');
  console.log('\nSince you paid extra for this integration, contact CIN7 support');
  console.log('and ask them to verify API v2 access is enabled for account:');
  console.log('Account ID: ' + accountId);
}

testAccountConfiguration();