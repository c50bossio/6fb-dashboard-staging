// Test CIN7 Omni API endpoints
const fetch = require('node-fetch');

async function testCIN7Omni() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 Omni API Endpoints');
  console.log('================================\n');
  
  // CIN7 Omni uses different endpoints
  const tests = [
    {
      name: 'CIN7 Omni API v1',
      url: 'https://api.cin7.com/api/v1/Account',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'CIN7 Omni with CIN7AccountID header',
      url: 'https://api.cin7.com/api/v1/Products',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'CIN7AccountID': accountId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'CIN7 Omni OAuth style',
      url: 'https://api.cin7.com/api/v1/Products',
      headers: {
        'Authorization': 'CIN7 ' + apiKey,
        'X-AccountID': accountId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'CIN7 Core-compatible headers on Omni domain',
      url: 'https://api.cin7.com/api/v1/Products',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    }
  ];
  
  for (const test of tests) {
    console.log('\nTesting: ' + test.name);
    console.log('URL: ' + test.url);
    console.log('Headers:', JSON.stringify(test.headers, null, 2));
    
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: test.headers,
        redirect: 'manual'
      });
      
      console.log('Status: ' + response.status);
      
      if (response.status === 200) {
        console.log('SUCCESS! This format works!');
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          console.log('Response has data:', Object.keys(data).join(', '));
          if (data.Total !== undefined) {
            console.log('Total items: ' + data.Total);
          }
          console.log('\nFOUND WORKING ENDPOINT!');
          console.log('========================');
          return test;
        } catch (e) {
          console.log('Response (not JSON):', text.substring(0, 100));
        }
      } else if (response.status === 401) {
        console.log('401 Unauthorized - different from 403, might be closer');
        const text = await response.text();
        console.log('Response:', text.substring(0, 100));
      } else if (response.status === 403) {
        const text = await response.text();
        console.log('403 Forbidden:', text);
      } else {
        const text = await response.text();
        console.log('Response:', text.substring(0, 100));
      }
    } catch (error) {
      console.log('Error: ' + error.message);
    }
  }
  
  console.log('\n\nConclusion');
  console.log('===========');
  console.log('If your account is CIN7 Omni (not Core), you may need to:');
  console.log('1. Use different API endpoints (api.cin7.com instead of inventory.dearsystems.com)');
  console.log('2. Use OAuth 2.0 authentication instead of API keys');
  console.log('3. Check if your account type supports API access');
  console.log('\nTo verify your account type:');
  console.log('1. Log into your CIN7 account');
  console.log('2. Check the URL - if it\'s app.cin7.com, you have Omni');
  console.log('3. If it\'s inventory.dearsystems.com, you have Core');
}

testCIN7Omni();
