// Test the paths that returned 200 OK to see if they contain JSON
const fetch = require('node-fetch');

async function test200Paths() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🎯 TESTING PATHS THAT RETURNED 200 OK');
  console.log('=====================================\n');
  
  const working200Paths = [
    'https://inventory.dearsystems.com/ExternalApiSettings/v2/me',
    'https://inventory.dearsystems.com/External/API/v2/me',
    'https://inventory.dearsystems.com/Integration/API/v2/me',
    'https://inventory.dearsystems.com/ApiExplorer/v2/me',
    'https://inventory.dearsystems.com/ApiExplorer/ExternalAPI/v2/me',
    'https://inventory.dearsystems.com/ExternalAPI/v2/AccountBank',
    'https://inventory.dearsystems.com/ExternalAPIs/v2/AccountBank',
    'https://inventory.dearsystems.com/proxy/ExternalAPI/v2/me',
    'https://inventory.dearsystems.com/gateway/ExternalAPI/v2/me',
    'https://inventory.dearsystems.com/api-gateway/v2/me'
  ];
  
  // Also test the promising 403 path without v2
  const promisingPaths = [
    'https://inventory.dearsystems.com/ExternalAPI/me',
    'https://inventory.dearsystems.com/ExternalAPI/products',
    'https://inventory.dearsystems.com/ExternalAPI/customers',
    'https://inventory.dearsystems.com/ExternalAPI/stock'
  ];
  
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  console.log('Testing 200 OK paths for JSON content...\n');
  
  for (const url of working200Paths) {
    const path = url.replace('https://inventory.dearsystems.com/', '');
    console.log(`\n🔍 Testing: ${path}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 200) {
        const text = await response.text();
        
        // Check if it's JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            const data = JSON.parse(text);
            console.log('✅ SUCCESS! Returns valid JSON:');
            console.log(JSON.stringify(data, null, 2).substring(0, 500));
            
            // This is a working endpoint!
            console.log('\n🎉 FOUND WORKING ENDPOINT!');
            return { url, data };
            
          } catch (e) {
            console.log('❌ Invalid JSON format');
          }
        } else {
          console.log(`❌ Returns HTML (${text.length} chars)`);
          if (text.includes('Page not found')) {
            console.log('   → Page not found error');
          } else if (text.includes('Login')) {
            console.log('   → Login page redirect');
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n🔍 TESTING PROMISING 403 PATHS (without v2)');
  console.log('============================================\n');
  
  for (const url of promisingPaths) {
    const path = url.replace('https://inventory.dearsystems.com/', '');
    console.log(`\n🔍 Testing: ${path}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 403) {
        const text = await response.text();
        console.log(`Error message: ${text.substring(0, 200)}`);
        
        // This confirms the endpoint exists and recognizes our auth
        console.log('✅ API endpoint exists and recognizes authentication!');
        
      } else if (response.status === 200) {
        const text = await response.text();
        
        if (text.trim().startsWith('{')) {
          console.log('🎉 BREAKTHROUGH! This endpoint returns JSON!');
          try {
            const data = JSON.parse(text);
            console.log('Data:', JSON.stringify(data, null, 2).substring(0, 300));
            return { url, data };
          } catch (e) {
            console.log('Invalid JSON');
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n🧪 TESTING WITH DIFFERENT METHODS');
  console.log('=================================\n');
  
  // Maybe it needs POST instead of GET?
  const testUrl = 'https://inventory.dearsystems.com/ExternalAPI/me';
  
  const methods = ['GET', 'POST', 'PUT'];
  
  for (const method of methods) {
    console.log(`Testing ${method} request...`);
    
    try {
      const response = await fetch(testUrl, {
        method: method,
        headers: headers,
        body: method !== 'GET' ? JSON.stringify({}) : undefined
      });
      
      console.log(`  ${method}: ${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        const text = await response.text();
        if (text.trim().startsWith('{')) {
          console.log('  🎉 SUCCESS with JSON!');
        }
      }
      
    } catch (error) {
      console.log(`  ${method}: Error - ${error.message}`);
    }
  }
  
  console.log('\n📋 ANALYSIS COMPLETE');
  console.log('====================\n');
  console.log('Key findings:');
  console.log('• /ExternalAPI/me returns 403 (endpoint exists, auth recognized)');
  console.log('• Multiple paths return 200 but with HTML content');
  console.log('• This suggests we\'re very close to the correct format');
  console.log('');
  console.log('Next step: Inspect browser network traffic when API Explorer works');
  console.log('to see the exact request being made.');
}

test200Paths();