// Test both CIN7 Core API v1 and v2
const fetch = require('node-fetch');

async function testAPIVersions() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 Testing CIN7 Core API Versions...');
  console.log('=====================================');
  console.log('Account ID:', accountId);
  console.log('API Key:', apiKey);
  console.log();
  
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Content-Type': 'application/json'
  };
  
  // Test different API versions and endpoints
  const tests = [
    {
      name: 'API v2 - Me endpoint (what we\'re using)',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/me'
    },
    {
      name: 'API v1 - Me endpoint',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/me'
    },
    {
      name: 'API v2 - Products endpoint',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/products?page=1&limit=1'
    },
    {
      name: 'API v1 - Products endpoint',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/products?page=1&limit=1'
    },
    {
      name: 'API v2 - Account endpoint',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/account'
    },
    {
      name: 'API v1 - Account endpoint',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/account'
    },
    {
      name: 'API without version - Products',
      url: 'https://inventory.dearsystems.com/ExternalAPI/products?page=1&limit=1'
    },
    {
      name: 'Lowercase URL - v2',
      url: 'https://inventory.dearsystems.com/externalapi/v2/me'
    },
    {
      name: 'Lowercase URL - v1',
      url: 'https://inventory.dearsystems.com/externalapi/v1/me'
    }
  ];
  
  for (const test of tests) {
    console.log(`📡 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS! This endpoint works!');
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log('   Response preview:', JSON.stringify(data).substring(0, 200));
        }
        
        console.log('\n🎉 Found working endpoint!');
        console.log('Use this URL:', test.url);
        return;
      } else if (response.status === 403) {
        const text = await response.text();
        console.log('   ❌ 403 Forbidden:', text);
      } else if (response.status === 404) {
        console.log('   ❌ 404 Not Found - Endpoint doesn\'t exist');
      } else if (response.status === 401) {
        console.log('   ❌ 401 Unauthorized');
      } else {
        const text = await response.text();
        console.log('   Response:', text.substring(0, 100));
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('❌ None of the API versions worked.');
  console.log('\n📝 Important Notes:');
  console.log('1. Your account might only have access to API v1');
  console.log('2. Some CIN7 accounts need to be migrated to use API v2');
  console.log('3. Contact CIN7 support and ask:');
  console.log('   - "Is my account enabled for API v2?"');
  console.log('   - "Which API version should I use?"');
  console.log('   - "Is API access fully activated for bookedbarber?"');
}

testAPIVersions();