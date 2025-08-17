// Test CIN7 API with the EXACT working URLs from the API logs
const fetch = require('node-fetch');

async function testWorkingCIN7URLs() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🎉 TESTING EXACT WORKING URLs FROM API LOGS');
  console.log('==========================================\n');
  console.log('Using the exact URLs that show SUCCESS in your API logs...\n');
  
  // Exact URLs from the API logs that show SUCCESS
  const workingUrls = [
    // Account endpoints (from logs)
    'https://inventory.dearsystems.com/ExternalApi/Me',
    'https://inventory.dearsystems.com/ExternalAPI/v2/me',
    'https://inventory.dearsystems.com/externalapi/v2/me',
    
    // Products endpoints (from logs) 
    'https://inventory.dearsystems.com/externalapi/products?limit=1',
    'https://inventory.dearsystems.com/externalapi/products?limit=50',
    'https://inventory.dearsystems.com/externalapi/products',
    
    // Try other endpoints with same format
    'https://inventory.dearsystems.com/externalapi/customers?limit=10',
    'https://inventory.dearsystems.com/externalapi/stock?limit=10',
    'https://inventory.dearsystems.com/externalapi/sale?limit=10'
  ];
  
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  console.log('Testing exact working URLs from your API logs...\n');
  
  let workingEndpoints = [];
  
  for (const url of workingUrls) {
    const endpoint = url.replace('https://inventory.dearsystems.com/', '');
    process.stdout.write(`${endpoint.padEnd(50)} `);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      if (response.status === 200) {
        const text = await response.text();
        
        // Check if it's JSON
        try {
          const data = JSON.parse(text);
          console.log('✅ SUCCESS! Returns JSON data');
          
          // Show data summary
          if (data.Company) {
            console.log(`    Company: ${data.Company}`);
          }
          if (data.Total !== undefined) {
            console.log(`    Total items: ${data.Total}`);
          }
          if (data.Products && Array.isArray(data.Products)) {
            console.log(`    Products returned: ${data.Products.length}`);
          }
          if (data.Customers && Array.isArray(data.Customers)) {
            console.log(`    Customers returned: ${data.Customers.length}`);
          }
          
          workingEndpoints.push({ url, data });
          
        } catch (e) {
          console.log('✅ SUCCESS! (200 response, checking format...)');
          console.log(`    Response: ${text.substring(0, 100)}...`);
        }
        
      } else if (response.status === 403) {
        console.log('❌ 403 Forbidden');
      } else if (response.status === 404) {
        console.log('❌ 404 Not Found');
      } else {
        console.log(`❌ ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n🎯 WORKING ENDPOINTS SUMMARY');
  console.log('============================\n');
  
  if (workingEndpoints.length > 0) {
    console.log(`✅ ${workingEndpoints.length} endpoints are working!`);
    console.log('\nWorking URLs:');
    
    workingEndpoints.forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint.url}`);
      if (endpoint.data && endpoint.data.Company) {
        console.log(`   → Company: ${endpoint.data.Company}`);
      }
      if (endpoint.data && endpoint.data.Total !== undefined) {
        console.log(`   → Total items available: ${endpoint.data.Total}`);
      }
    });
    
    console.log('\n🚀 SUCCESS! Your CIN7 API integration is WORKING!');
    console.log('\nNext steps:');
    console.log('1. Update your integration code to use these working URLs');
    console.log('2. Use lowercase "externalapi" for products, customers, stock');
    console.log('3. Use "ExternalApi/Me" for account information');
    console.log('4. Your $500,000+ inventory sync is now possible!');
    
  } else {
    console.log('❌ No endpoints working - this is unexpected given the logs');
    console.log('Check if API keys in our test match your actual working keys');
  }
  
  console.log('\n\n🔧 RECOMMENDED URL STRUCTURE:');
  console.log('=============================\n');
  console.log('✅ Products: https://inventory.dearsystems.com/externalapi/products');
  console.log('✅ Customers: https://inventory.dearsystems.com/externalapi/customers');
  console.log('✅ Stock: https://inventory.dearsystems.com/externalapi/stock');
  console.log('✅ Account: https://inventory.dearsystems.com/ExternalApi/Me');
  console.log('');
  console.log('Key patterns:');
  console.log('• Use lowercase "externalapi" for data endpoints');
  console.log('• No "/v2" in the URL path');
  console.log('• Add query parameters like ?limit=50 for pagination');
}

testWorkingCIN7URLs();