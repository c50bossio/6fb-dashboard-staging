// Test different authentication header formats for CIN7
const fetch = require('node-fetch');

async function testAuthHeaders() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 Testing Different Authentication Header Formats');
  console.log('==================================================\n');
  
  // Different header variations to test
  const headerVariations = [
    {
      name: 'Standard (lowercase)',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Uppercase headers',
      headers: {
        'API-AUTH-ACCOUNTID': accountId,
        'API-AUTH-APPLICATIONKEY': apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Mixed case',
      headers: {
        'Api-Auth-AccountId': accountId,
        'Api-Auth-ApplicationKey': apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'With X- prefix',
      headers: {
        'X-Api-Auth-AccountId': accountId,
        'X-Api-Auth-ApplicationKey': apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Basic Authorization',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountId}:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Bearer Token',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Account-ID': accountId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'API Key header',
      headers: {
        'API-Key': apiKey,
        'Account-ID': accountId,
        'Content-Type': 'application/json'
      }
    }
  ];
  
  // Test each header variation
  for (const variation of headerVariations) {
    console.log(`📡 Testing: ${variation.name}`);
    console.log(`   Headers:`, Object.keys(variation.headers).join(', '));
    
    try {
      const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
        method: 'GET',
        headers: variation.headers,
        redirect: 'manual'
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS! This header format works!');
        const data = await response.json();
        console.log(`   Account: ${data.Name || data.Company || 'Connected'}`);
        console.log('\n🎉 FOUND WORKING AUTHENTICATION!');
        console.log('==================================');
        return variation;
      } else if (response.status === 403) {
        const text = await response.text();
        console.log(`   ❌ 403: ${text}`);
      } else {
        console.log(`   ❌ Status ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('\n📝 Testing with CIN7 Core documentation format...');
  console.log('=================================================\n');
  
  // Try CIN7 Core specific endpoints
  const cin7CoreTests = [
    {
      url: 'https://api.cin7.com/api/v1/Products',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    },
    {
      url: 'https://api.dearsystems.com/externalapi/v2/me',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey
      }
    },
    {
      url: 'https://inventory.cin7.com/api/v1/Products',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey
      }
    }
  ];
  
  for (const test of cin7CoreTests) {
    console.log(`📡 Testing: ${test.url}`);
    
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: test.headers,
        redirect: 'manual'
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS! This endpoint works!');
        return test;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('❌ No working authentication format found');
  console.log('\nPossible issues:');
  console.log('1. The API key might need to be regenerated');
  console.log('2. The account might be on a different API version');
  console.log('3. The account might need specific permissions enabled');
}

testAuthHeaders();