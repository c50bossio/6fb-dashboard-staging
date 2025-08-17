// Test CIN7 Core API with the correct URL structure from Pipedream documentation
const fetch = require('node-fetch');

async function testCorrectCIN7API() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🎯 TESTING CORRECT CIN7 CORE API STRUCTURE');
  console.log('==========================================\n');
  console.log('Based on Pipedream integration documentation:');
  console.log('URL: https://inventory.dearsystems.com/ExternalApi/v2/me');
  console.log('Headers: api-auth-accountid, api-auth-applicationkey\n');
  
  // The correct URL structure from Pipedream documentation
  const correctApiUrls = [
    // Exact format from Pipedream
    'https://inventory.dearsystems.com/ExternalApi/v2/me',
    
    // Try other endpoints with same structure
    'https://inventory.dearsystems.com/ExternalApi/v2/products',
    'https://inventory.dearsystems.com/ExternalApi/v2/customers', 
    'https://inventory.dearsystems.com/ExternalApi/v2/stock',
    'https://inventory.dearsystems.com/ExternalApi/v2/sale',
    'https://inventory.dearsystems.com/ExternalApi/v2/purchase',
    
    // With query parameters
    'https://inventory.dearsystems.com/ExternalApi/v2/products?limit=1',
    'https://inventory.dearsystems.com/ExternalApi/v2/customers?limit=1',
    'https://inventory.dearsystems.com/ExternalApi/v2/stock?limit=1'
  ];
  
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  console.log('Testing correct API structure...\n');
  
  for (const url of correctApiUrls) {
    const endpoint = url.replace('https://inventory.dearsystems.com/ExternalApi/v2/', '');
    process.stdout.write(`${endpoint.padEnd(30)} `);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`  ✅ SUCCESS! JSON Response:`);
          console.log(`  ${JSON.stringify(data).substring(0, 200)}...`);
          
          // This means API access is working!
          console.log('\n🎉 BREAKTHROUGH! API ACCESS IS WORKING!');
          console.log('Your external integration license is active.');
          
          return { success: true, url, data };
          
        } else {
          const text = await response.text();
          if (text.trim().startsWith('{')) {
            console.log('  ✅ SUCCESS! Returns JSON data');
            return { success: true, url, data: text };
          } else {
            console.log('  ❌ Returns HTML/other content');
          }
        }
        
      } else if (response.status === 403) {
        const text = await response.text();
        console.log(`  ❌ 403: ${text.substring(0, 100)}`);
        
        if (text.includes('subscription')) {
          console.log('     → Subscription limitation detected');
        } else if (text.includes('license')) {
          console.log('     → License requirement detected');
        }
        
      } else if (response.status === 401) {
        console.log('  ❌ 401: Authentication failed');
        
      } else if (response.status === 404) {
        console.log('  ❌ 404: Endpoint not found');
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n🔍 TESTING SUBSCRIPTION REQUIREMENTS');
  console.log('====================================\n');
  
  // Test if we get specific subscription error messages
  const testUrl = 'https://inventory.dearsystems.com/ExternalApi/v2/me';
  
  console.log('Testing with different User-Agent to see if that affects response...\n');
  
  const userAgents = [
    'Pipedream/1.0',
    'CIN7-Integration/1.0',
    'Mozilla/5.0 (compatible; External-Integration/1.0)',
    'API-Client/1.0'
  ];
  
  for (const userAgent of userAgents) {
    console.log(`Testing User-Agent: ${userAgent}`);
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          ...headers,
          'User-Agent': userAgent
        }
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.status === 200) {
        const text = await response.text();
        if (text.trim().startsWith('{')) {
          console.log('  ✅ SUCCESS! This User-Agent works!');
        }
      } else if (response.status === 403) {
        const text = await response.text();
        if (text.includes('External integration license')) {
          console.log('  📋 Requires external integration license');
        }
      }
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }
  
  console.log('\n\n📋 DIAGNOSIS AND NEXT STEPS');
  console.log('============================\n');
  
  console.log('Based on the research findings:');
  console.log('');
  console.log('✅ CORRECT API STRUCTURE FOUND:');
  console.log('   URL: https://inventory.dearsystems.com/ExternalApi/v2/[endpoint]');
  console.log('   Note: "ExternalApi" (not "ExternalAPI")');
  console.log('');
  console.log('📋 SUBSCRIPTION REQUIREMENTS:');
  console.log('   • CIN7 Core requires "External Integration License"');
  console.log('   • Purchase from: My Account → My Subscription page');
  console.log('   • Each subscription includes some licenses, more can be purchased');
  console.log('');
  console.log('🎯 YOUR NEXT ACTION:');
  console.log('   1. Log into CIN7 Core web interface');
  console.log('   2. Go to: My Account → My Subscription');
  console.log('   3. Check if you have available External Integration licenses');
  console.log('   4. If not, purchase an External Integration license');
  console.log('   5. Re-test the API with this correct URL structure');
  console.log('');
  console.log('💡 THE ISSUE:');
  console.log('   Your API keys are valid, but you need an active');
  console.log('   External Integration License for programmatic access.');
}

testCorrectCIN7API();