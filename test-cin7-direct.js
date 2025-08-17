// Direct test of CIN7 API with exact documentation format
const fetch = require('node-fetch');

async function testCIN7Direct() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 Core API Direct Access');
  console.log('=======================================\n');
  console.log('Account ID:', accountId);
  console.log('API Key:', apiKey);
  console.log('');
  
  // Test the exact URL from documentation
  const baseUrl = 'https://inventory.dearsystems.com/externalapi';
  
  const endpoints = [
    '/v2/me',
    '/v2/Me',
    '/v2/account',
    '/v2/Account',
    '/v1/me',
    '/v1/Me',
    '/me',
    '/Me'
  ];
  
  for (const endpoint of endpoints) {
    const url = baseUrl + endpoint;
    console.log('\nTesting: ' + url);
    
    const headers = {
      'api-auth-accountid': accountId,
      'api-auth-applicationkey': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    console.log('   Headers:', JSON.stringify(headers, null, 2));
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        redirect: 'manual'
      });
      
      console.log('   Status: ' + response.status + ' ' + response.statusText);
      console.log('   Headers received:', response.headers.raw());
      
      const text = await response.text();
      
      if (response.status === 200) {
        console.log('   SUCCESS! This endpoint works!');
        try {
          const data = JSON.parse(text);
          console.log('   Response:', JSON.stringify(data, null, 2));
          
          // If successful, try products endpoint
          console.log('\n   Now testing Products endpoint...');
          const productsUrl = baseUrl + endpoint.replace(/me/i, 'Products');
          const productsResponse = await fetch(productsUrl, {
            method: 'GET',
            headers: headers
          });
          
          console.log('   Products Status: ' + productsResponse.status);
          if (productsResponse.status === 200) {
            const productsData = await productsResponse.json();
            console.log('   Products accessible! Total: ' + (productsData.Total || 0));
          }
          
          return true;
        } catch (e) {
          console.log('   Response (not JSON):', text.substring(0, 200));
        }
      } else if (response.status === 302 || response.status === 301) {
        console.log('   Redirect to: ' + response.headers.get('location'));
      } else {
        console.log('   Response: ' + text.substring(0, 200));
      }
    } catch (error) {
      console.log('   Error: ' + error.message);
    }
  }
  
  console.log('\n\nTesting with lowercase URL (case sensitivity check)');
  console.log('=====================================================\n');
  
  const lowerCaseUrl = 'https://inventory.dearsystems.com/externalapi/v2/me';
  console.log('Testing: ' + lowerCaseUrl);
  
  try {
    const response = await fetch(lowerCaseUrl, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey
      }
    });
    
    console.log('Status: ' + response.status);
    const text = await response.text();
    console.log('Response: ' + text.substring(0, 200));
  } catch (error) {
    console.log('Error: ' + error.message);
  }
  
  console.log('\n\nSummary');
  console.log('===========');
  console.log('If all attempts failed with "Incorrect credentials", possible issues:');
  console.log('1. The API key needs to be regenerated in CIN7');
  console.log('2. The account is using CIN7 Omni, not CIN7 Core');
  console.log('3. API access is not enabled for this account');
  console.log('4. The account is on a different region/server');
  console.log('\nNext steps:');
  console.log('1. Log into CIN7 at https://inventory.dearsystems.com');
  console.log('2. Go to Settings → Integrations & API → API v2');
  console.log('3. Check if API is enabled and regenerate the key if needed');
}

testCIN7Direct();
