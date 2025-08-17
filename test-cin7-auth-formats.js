// Test different authentication formats for CIN7 Core
const fetch = require('node-fetch');

async function testAuthFormats() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('❌ Please provide your API key as an argument:');
    console.log('   node test-cin7-auth-formats.js YOUR_API_KEY');
    process.exit(1);
  }
  
  console.log('🔍 Testing CIN7 Core authentication formats...');
  console.log('Account ID:', accountId);
  console.log('API Key length:', apiKey.length, 'characters');
  console.log();
  
  const authFormats = [
    {
      name: 'CIN7 Core v1 Headers',
      headers: {
        'x-api-account-id': accountId,
        'x-api-application-key': apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Bearer Token with Account ID',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'x-account-id': accountId,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'Basic Auth Format',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountId}:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'CIN7 Legacy Format',
      headers: {
        'CIN7-Account-ID': accountId,
        'CIN7-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    },
    {
      name: 'API Key Only in Authorization',
      headers: {
        'Authorization': apiKey,
        'x-account-id': accountId,
        'Content-Type': 'application/json'
      }
    }
  ];
  
  const testUrl = 'https://api.cin7.com/api/v1/Products?page=1&rows=1';
  
  for (const format of authFormats) {
    console.log(`📡 Testing: ${format.name}`);
    console.log(`   URL: ${testUrl}`);
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: format.headers
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS! This authentication format works!');
        console.log('   Headers used:', JSON.stringify(format.headers, null, 2));
        
        const data = await response.json();
        console.log('   Response preview:', JSON.stringify(data).substring(0, 200));
        
        console.log('\n🎉 Found working authentication format!');
        console.log('Use these headers in your API calls:');
        console.log(JSON.stringify(format.headers, null, 2));
        
        return;
      } else if (response.status === 401) {
        console.log('   ❌ Authentication failed (401)');
      } else if (response.status === 403) {
        console.log('   ❌ Forbidden (403) - API access may be disabled');
      } else {
        console.log(`   ❌ Unexpected status: ${response.status}`);
      }
      
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        if (error.message || error.error) {
          console.log(`   Error: ${error.message || error.error}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('📝 None of the authentication formats worked.');
  console.log('Please verify:');
  console.log('1. The API key is complete and correct');
  console.log('2. API access is enabled in your CIN7 Core account');
  console.log('3. The API key hasn\'t expired');
  console.log('4. You\'re using CIN7 Core (not CIN7 Omni)');
}

testAuthFormats();