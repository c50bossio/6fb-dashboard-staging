// Test different CIN7 Core API endpoints
const fetch = require('node-fetch');

async function testCin7CoreEndpoints() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = process.argv[2] || 'YOUR_API_KEY_HERE';
  
  console.log('🔍 Testing CIN7 Core API endpoints...');
  console.log('Account ID:', accountId);
  console.log('API Key provided:', apiKey !== 'YOUR_API_KEY_HERE' ? 'Yes' : 'No');
  console.log();
  
  // Different possible CIN7 Core endpoints
  const endpoints = [
    'https://api.cin7.com/api/v1/me',
    'https://api.cin7core.com/api/v1/me',
    'https://inventory.cin7.com/api/v1/me',
    'https://inventory.dearsystems.com/ExternalAPI/v2/me',
    'https://api.dearsystems.com/ExternalAPI/v2/me',
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📡 Testing: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      // Check what type of response we got
      const contentType = response.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('   ✅ JSON response received');
        if (response.ok) {
          console.log('   🎉 SUCCESS! This is the correct endpoint');
          console.log('   Company:', data.Company || 'N/A');
          break;
        }
      } else if (contentType && contentType.includes('text/html')) {
        console.log('   ❌ HTML response (wrong endpoint or error page)');
      } else {
        const text = await response.text();
        console.log('   Response preview:', text.substring(0, 100));
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('\n📚 CIN7 Core API Documentation:');
  console.log('If none of the above work, please check:');
  console.log('1. Your CIN7 Core dashboard for the correct API endpoint');
  console.log('2. The API documentation at: https://api.cin7.com/');
  console.log('3. Your account type (CIN7 Core vs CIN7 Omni)');
}

testCin7CoreEndpoints();