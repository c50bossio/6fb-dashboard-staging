// Debug CIN7 Core authentication issue
const fetch = require('node-fetch');

async function debugCin7Auth() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('❌ Please provide your API key:');
    console.log('   node test-cin7-debug.js YOUR_API_KEY');
    process.exit(1);
  }
  
  console.log('🔍 Debugging CIN7 Core Authentication...');
  console.log('=========================================');
  console.log('Account ID:', accountId);
  console.log('API Key length:', apiKey.length, 'characters');
  console.log('API Key format check:');
  console.log('  - Contains only alphanumeric and dashes?', /^[a-zA-Z0-9-]+$/.test(apiKey));
  console.log('  - Looks like UUID format?', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apiKey));
  console.log();
  
  // Test different API versions and endpoints
  const tests = [
    {
      name: 'CIN7 Core V2 (DEAR format)',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/me',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'CIN7 Core V1 (DEAR format)',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/me',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Try with lowercase headers',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/me',
      headers: {
        'api-auth-accountid': accountId.toLowerCase(),
        'api-auth-applicationkey': apiKey.toLowerCase(),
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Try without Content-Type',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/me',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey
      }
    },
    {
      name: 'Try with Accept header',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/me',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  ];
  
  for (const test of tests) {
    console.log(`📡 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: test.headers
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      // Get all response headers for debugging
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('   Response headers:', JSON.stringify(responseHeaders, null, 2));
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS! This format works!');
        const data = await response.json();
        console.log('   Company:', data.Company);
        console.log('   User:', data.UserName);
        return;
      } else if (response.status === 401) {
        const text = await response.text();
        console.log('   ❌ 401 Unauthorized');
        console.log('   Response:', text);
      } else if (response.status === 403) {
        const text = await response.text();
        console.log('   ❌ 403 Forbidden');
        console.log('   Response:', text);
      } else {
        const text = await response.text();
        console.log('   Response:', text.substring(0, 200));
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('📝 Troubleshooting steps:');
  console.log('1. In CIN7 Core, go to Settings > Integrations > API');
  console.log('2. Check if there\'s an "Enable API Access" toggle - make sure it\'s ON');
  console.log('3. Check if your account has API permissions');
  console.log('4. Try generating a completely new API key (not just viewing the existing one)');
  console.log('5. Check if there are IP restrictions on the API access');
  console.log('6. Verify your CIN7 account type (Core vs Omni)');
  console.log('\nNote: Some CIN7 accounts require contacting support to enable API access.');
}

debugCin7Auth();