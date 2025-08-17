// Test CIN7 API with EXACT browser format from network inspection
const fetch = require('node-fetch');

async function testExactBrowserFormat() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔬 TESTING EXACT BROWSER REQUEST FORMAT');
  console.log('======================================\n');
  console.log('Since CIN7 Core APIs are designed for external access,');
  console.log('we must be missing something in our request format.\n');
  
  // Test different header combinations that browsers typically send
  const headerVariations = [
    {
      name: 'Standard API Headers',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Browser-like Headers',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    },
    {
      name: 'CIN7 Web App Headers',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://inventory.dearsystems.com/ExternalApi/Settings',
        'Origin': 'https://inventory.dearsystems.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    },
    {
      name: 'Alternative Auth Header Format',
      headers: {
        'Api-Auth-AccountId': accountId,
        'Api-Auth-ApplicationKey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Lowercase Auth Headers',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'content-type': 'application/json',
        'accept': 'application/json'
      }
    },
    {
      name: 'Authorization Header Format',
      headers: {
        'Authorization': `AccountId=${accountId}, ApplicationKey=${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    },
    {
      name: 'Basic Auth Format',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountId}:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  ];
  
  // Test different URL formats
  const urlFormats = [
    'https://inventory.dearsystems.com/ExternalAPI/v2/me',
    'https://inventory.dearsystems.com/ExternalAPIs/v2/me',
    'https://inventory.dearsystems.com/externalapi/v2/me',
    'https://inventory.dearsystems.com/external-api/v2/me',
    'https://inventory.dearsystems.com/api/v2/me'
  ];
  
  console.log('Testing different header combinations with multiple URL formats...\n');
  
  let foundWorking = false;
  
  for (const headerSet of headerVariations) {
    console.log(`\n🧪 Testing: ${headerSet.name}`);
    console.log(''.padEnd(50, '-'));
    
    for (const url of urlFormats) {
      const urlLabel = url.replace('https://inventory.dearsystems.com/', '');
      process.stdout.write(`  ${urlLabel.padEnd(30)} `);
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: headerSet.headers,
          redirect: 'manual'
        });
        
        if (response.status === 200) {
          const text = await response.text();
          
          // Check if it's valid JSON
          if (text.trim().startsWith('{') && !text.includes('<!DOCTYPE')) {
            try {
              const data = JSON.parse(text);
              console.log('✅ SUCCESS!');
              console.log(`    Response: ${JSON.stringify(data).substring(0, 100)}...`);
              foundWorking = true;
            } catch (e) {
              console.log('❌ Invalid JSON');
            }
          } else if (text.includes('<!DOCTYPE')) {
            console.log('❌ HTML response (error page)');
          } else {
            console.log(`❌ Unexpected response: ${text.substring(0, 50)}`);
          }
        } else if (response.status === 403) {
          console.log('❌ 403 Forbidden');
        } else if (response.status === 302) {
          console.log('❌ 302 Redirect');
        } else if (response.status === 401) {
          console.log('❌ 401 Unauthorized');
        } else {
          console.log(`❌ ${response.status} ${response.statusText}`);
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }
  
  if (!foundWorking) {
    console.log('\n\n🔍 ADVANCED DEBUGGING');
    console.log('=====================\n');
    
    // Test with query parameters (like the API Explorer shows)
    console.log('Testing with query parameters (like API Explorer)...\n');
    
    const endpointsWithParams = [
      '/me',
      '/products?limit=1',
      '/customers?limit=1', 
      '/stock?limit=1',
      '/accountbank?limit=1&page=1'  // From your screenshot
    ];
    
    for (const endpoint of endpointsWithParams) {
      console.log(`Testing: ${endpoint}`);
      
      const url = `https://inventory.dearsystems.com/ExternalAPI/v2${endpoint}`;
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': apiKey,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; CIN7-Integration/1.0)'
          }
        });
        
        console.log(`  Status: ${response.status}`);
        
        if (response.status === 200) {
          const text = await response.text();
          if (text.trim().startsWith('{')) {
            console.log('  ✅ SUCCESS - Returns JSON!');
            foundWorking = true;
          } else {
            console.log('  ❌ Returns HTML/other');
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n\n📋 SUMMARY');
  console.log('==========\n');
  
  if (foundWorking) {
    console.log('🎉 BREAKTHROUGH! Found working API format!');
    console.log('Your CIN7 Core API keys DO have external access.');
    console.log('We can now build the full integration.');
  } else {
    console.log('🤔 Still no working format found.');
    console.log('');
    console.log('Next debugging steps:');
    console.log('1. Inspect browser network tab during API Explorer call');
    console.log('2. Check for any missing authentication tokens');
    console.log('3. Verify if API requires specific User-Agent strings');
    console.log('4. Test if there\'s a session initialization step needed');
    console.log('');
    console.log('Since CIN7 Core APIs are designed for external access,');
    console.log('there must be a specific request format we haven\'t tried yet.');
  }
}

testExactBrowserFormat();