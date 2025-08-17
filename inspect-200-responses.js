// Inspect the 200 responses to understand what's being returned
const fetch = require('node-fetch');
const fs = require('fs').promises;

async function inspect200Responses() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 INSPECTING 200 RESPONSES');
  console.log('===========================\n');
  console.log('We got 200 status codes for some endpoints!');
  console.log('Let\'s see exactly what\'s being returned...\n');
  
  const workingEndpoints = [
    '/products?limit=1',
    '/customers?limit=1', 
    '/stock?limit=1',
    '/accountbank?limit=1&page=1'
  ];
  
  for (const endpoint of workingEndpoints) {
    console.log(`\n📡 Testing: ${endpoint}`);
    console.log(''.padEnd(50, '-'));
    
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
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 200) {
        const text = await response.text();
        
        console.log(`Response Length: ${text.length} characters`);
        console.log(`First 200 chars: ${text.substring(0, 200)}`);
        
        // Check if it's JSON but with HTML wrapper
        if (text.includes('{') && text.includes('}')) {
          console.log('\\n🔍 Contains JSON! Looking for JSON within HTML...');
          
          // Try to extract JSON from HTML
          const jsonMatches = text.match(/\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}/g);
          if (jsonMatches) {
            for (let i = 0; i < jsonMatches.length && i < 3; i++) {
              try {
                const parsed = JSON.parse(jsonMatches[i]);
                console.log(`\\n✅ Found valid JSON #${i+1}:`);
                console.log(JSON.stringify(parsed, null, 2).substring(0, 300));
              } catch (e) {
                console.log(`\\n❌ JSON #${i+1} invalid: ${jsonMatches[i].substring(0, 100)}`);
              }
            }
          }
        }
        
        // Save response to file for manual inspection
        const filename = `response_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
        await fs.writeFile(filename, text);
        console.log(`\\n💾 Saved full response to: ${filename}`);
        
        // Check for specific patterns
        if (text.includes('Login')) {
          console.log('⚠️  Response contains "Login" - might be redirected to login page');
        }
        if (text.includes('error')) {
          console.log('⚠️  Response contains "error"');
        }
        if (text.includes('unauthorized')) {
          console.log('⚠️  Response contains "unauthorized"');
        }
        if (text.includes('forbidden')) {
          console.log('⚠️  Response contains "forbidden"');
        }
        if (text.includes('API')) {
          console.log('✅ Response contains "API" - might be API-related');
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\\n\\n🧪 TESTING ALTERNATIVE APPROACHES');
  console.log('==================================\\n');
  
  // Test with different content-type
  console.log('Testing with different Accept headers...');
  
  const acceptHeaders = [
    'application/json',
    'application/json, text/html',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '*/*'
  ];
  
  for (const accept of acceptHeaders) {
    console.log(`\\nTesting Accept: ${accept}`);
    
    try {
      const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?limit=1', {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Accept': accept
        }
      });
      
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      
      if (response.status === 200) {
        const text = await response.text();
        
        // Check if this Accept header gives us JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          console.log('  ✅ THIS RETURNS JSON!');
          try {
            const data = JSON.parse(text);
            console.log(`  📊 Data: ${JSON.stringify(data).substring(0, 200)}`);
          } catch (e) {
            console.log('  ❌ Invalid JSON format');
          }
        } else {
          console.log(`  ❌ Returns: ${text.substring(0, 100)}`);
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\\n\\n📋 INSPECTION COMPLETE');
  console.log('======================\\n');
  console.log('Check the saved HTML files to see what CIN7 is actually returning.');
  console.log('This will help us understand if:');
  console.log('1. We\'re getting redirected to a login page');
  console.log('2. There\'s JSON embedded in HTML');
  console.log('3. We need different authentication');
  console.log('4. The API format is different than expected');
}

inspect200Responses();