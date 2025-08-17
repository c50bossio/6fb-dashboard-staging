// Test CIN7 API using EXACT format from API Explorer screenshots
const fetch = require('node-fetch');

async function testExactAPIExplorerFormat() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 API with EXACT API Explorer Format');
  console.log('=================================================\n');
  console.log('Using the exact URLs shown in your API Explorer screenshots...\n');
  
  // EXACT endpoints from your screenshots
  const endpoints = [
    // From screenshot - notice the slightly different path structure
    { 
      url: 'https://inventory.dearsystems.com/ExternalAPIs/v2/me',
      description: 'Account info (ExternalAPIs with s)'
    },
    {
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/me',
      description: 'Account info (ExternalAPI no s)'
    },
    {
      url: 'https://inventory.dearsystems.com/ExternalAPIs/v2/Me',
      description: 'Account info (capitalized Me)'
    },
    {
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/Me',
      description: 'Account info (no s, capitalized)'
    },
    // Test product endpoints
    {
      url: 'https://inventory.dearsystems.com/ExternalAPIs/v2/products',
      description: 'Products (with s in APIs)'
    },
    {
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/products',
      description: 'Products (no s in API)'
    },
    // Test with query parameters like in Explorer
    {
      url: 'https://inventory.dearsystems.com/ExternalAPIs/v2/products?limit=1',
      description: 'Products with limit param'
    }
  ];
  
  console.log('Testing all URL variations...\n');
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint.description}`);
    console.log(`URL: ${endpoint.url}`);
    
    try {
      // Test with different header combinations
      const headerVariations = [
        {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Accept': 'application/json'
        },
        {
          'Api-Auth-AccountId': accountId,  // Different capitalization
          'Api-Auth-ApplicationKey': apiKey,
          'Content-Type': 'application/json'
        }
      ];
      
      let success = false;
      
      for (let i = 0; i < headerVariations.length; i++) {
        const response = await fetch(endpoint.url, {
          method: 'GET',
          headers: headerVariations[i],
          redirect: 'manual'
        });
        
        if (response.status === 200) {
          const text = await response.text();
          
          // Check if it's JSON or HTML
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            try {
              const data = JSON.parse(text);
              console.log(`  ✅ SUCCESS with header variation ${i + 1}!`);
              console.log(`  Response keys: ${Object.keys(data).join(', ')}`);
              
              // Show some data
              if (data.Company) {
                console.log(`  Company: ${data.Company}`);
              }
              if (data.Total !== undefined) {
                console.log(`  Total items: ${data.Total}`);
              }
              
              success = true;
              break;
            } catch (e) {
              console.log(`  Header ${i + 1}: Returns non-parseable response`);
            }
          } else if (text.includes('<!DOCTYPE')) {
            console.log(`  Header ${i + 1}: Returns HTML error page`);
          } else {
            console.log(`  Header ${i + 1}: Returns: ${text.substring(0, 100)}`);
          }
        } else if (response.status === 403) {
          const text = await response.text();
          if (i === 0) {  // Only show error once
            console.log(`  ❌ 403 Forbidden: ${text.substring(0, 100)}`);
          }
        } else if (response.status === 302) {
          if (i === 0) {
            console.log(`  ❌ 302 Redirect (authentication failed)`);
          }
        }
      }
      
      if (!success) {
        console.log('  ❌ Failed with all header variations');
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('\n===========================================');
  console.log('IMPORTANT FINDING:');
  console.log('===========================================\n');
  console.log('Your API Explorer uses BROWSER SESSION authentication.');
  console.log('It works because you\'re logged in via browser cookies.');
  console.log('');
  console.log('The API keys are for EXTERNAL applications (like our Node.js app)');
  console.log('but your subscription may not include external API access.');
  console.log('');
  console.log('SOLUTION OPTIONS:');
  console.log('1. Use Playwright to automate the browser (mimics API Explorer)');
  console.log('2. Contact CIN7 to upgrade subscription for external API access');
  console.log('3. Use browser extension to capture API Explorer requests/responses');
}

testExactAPIExplorerFormat();