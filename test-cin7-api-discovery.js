// Discover the correct CIN7 API URL structure
const fetch = require('node-fetch');

async function discoverCIN7API() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 CIN7 API DISCOVERY');
  console.log('====================\n');
  console.log('Since we\'re getting 404 errors, let\'s discover the correct API structure...\n');
  
  // Test different subdomains and paths
  const apiVariations = [
    // Different subdomains
    'https://api.dearsystems.com/ExternalAPI/v2/me',
    'https://api.inventory.dearsystems.com/v2/me',
    'https://external.dearsystems.com/api/v2/me',
    'https://core.dearsystems.com/api/v2/me',
    
    // Different paths on main domain
    'https://inventory.dearsystems.com/api/ExternalAPI/v2/me',
    'https://inventory.dearsystems.com/external/api/v2/me',
    'https://inventory.dearsystems.com/ExternalAPI/me',  // No v2
    'https://inventory.dearsystems.com/api/v2/me',
    'https://inventory.dearsystems.com/rest/v2/me',
    
    // Try different endpoint names
    'https://inventory.dearsystems.com/ExternalAPI/v2/account',
    'https://inventory.dearsystems.com/ExternalAPI/v2/user',
    'https://inventory.dearsystems.com/ExternalAPI/v2/company',
    
    // Maybe it needs .json extension?
    'https://inventory.dearsystems.com/ExternalAPI/v2/me.json',
    'https://inventory.dearsystems.com/ExternalAPI/v2/products.json',
    
    // Perhaps different version
    'https://inventory.dearsystems.com/ExternalAPI/v1/me',
    'https://inventory.dearsystems.com/ExternalAPI/v3/me'
  ];
  
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  console.log('Testing API endpoint variations...\n');
  
  for (const url of apiVariations) {
    const urlLabel = url.replace('https://', '').substring(0, 60);
    process.stdout.write(`${urlLabel.padEnd(65)} `);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        redirect: 'manual',
        timeout: 5000
      });
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          console.log('✅ JSON Response!');
          
          const data = await response.json();
          console.log(`    Data: ${JSON.stringify(data).substring(0, 100)}`);
          
        } else if (contentType.includes('text/html')) {
          const text = await response.text();
          
          if (text.includes('Page not found')) {
            console.log('❌ 404 HTML page');
          } else if (text.includes('Login')) {
            console.log('🔐 Redirected to login');
          } else {
            console.log('❓ Unknown HTML response');
          }
        } else {
          console.log(`✅ Status 200 (${contentType})`);
        }
        
      } else if (response.status === 401) {
        console.log('🔐 401 Unauthorized (API exists!)');
      } else if (response.status === 403) {
        console.log('🚫 403 Forbidden (API exists!)');
      } else if (response.status === 404) {
        console.log('❌ 404 Not Found');
      } else if (response.status === 302) {
        console.log('🔄 302 Redirect');
      } else {
        console.log(`❓ ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        console.log('❌ Domain not found');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('⏰ Timeout');
      } else {
        console.log(`❌ ${error.message}`);
      }
    }
  }
  
  console.log('\n\n🔍 TESTING CIN7 CORE SPECIFIC PATTERNS');
  console.log('=======================================\n');
  
  // Test patterns specific to what we know about CIN7 Core
  const corePatterns = [
    // Based on your API Explorer screenshots
    'https://inventory.dearsystems.com/ExternalApiSettings/v2/me',
    'https://inventory.dearsystems.com/External/API/v2/me',
    'https://inventory.dearsystems.com/Integration/API/v2/me',
    
    // Maybe the API Explorer uses a different internal path
    'https://inventory.dearsystems.com/ApiExplorer/v2/me',
    'https://inventory.dearsystems.com/ApiExplorer/ExternalAPI/v2/me',
    
    // Test with exact AccountBank endpoint from your screenshot
    'https://inventory.dearsystems.com/ExternalAPI/v2/AccountBank',
    'https://inventory.dearsystems.com/ExternalAPIs/v2/AccountBank'
  ];
  
  for (const url of corePatterns) {
    const urlLabel = url.replace('https://inventory.dearsystems.com/', '');
    process.stdout.write(`${urlLabel.padEnd(50)} `);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        const text = await response.text();
        if (text.trim().startsWith('{')) {
          console.log('  ✅ Returns JSON data!');
        }
      }
      
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
  
  console.log('\n\n🎯 FINAL DISCOVERY ATTEMPT');
  console.log('===========================\n');
  console.log('Testing if we need to hit the API through a proxy or gateway...\n');
  
  // Maybe there's an API gateway or proxy
  const gatewayTests = [
    'https://inventory.dearsystems.com/proxy/ExternalAPI/v2/me',
    'https://inventory.dearsystems.com/gateway/ExternalAPI/v2/me',
    'https://inventory.dearsystems.com/api-gateway/v2/me'
  ];
  
  for (const url of gatewayTests) {
    console.log(`Testing: ${url}`);
    
    try {
      const response = await fetch(url, { method: 'GET', headers });
      console.log(`  Result: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
  
  console.log('\n📋 DISCOVERY SUMMARY');
  console.log('====================\n');
  console.log('If none of these URLs work, it suggests:');
  console.log('1. The API might use a completely different authentication method');
  console.log('2. There might be a session initialization step required');
  console.log('3. The API might only be accessible from within the CIN7 web app');
  console.log('4. Your account might need additional API permissions enabled');
  console.log('');
  console.log('Next step: Check the browser Network tab when using API Explorer');
  console.log('to see the exact URL and headers being used.');
}

discoverCIN7API();