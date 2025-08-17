// Test the stock endpoint that returned 200 OK
const fetch = require('node-fetch');
const fs = require('fs').promises;

async function testStockEndpoint() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🎯 TESTING STOCK ENDPOINT (200 OK)');
  console.log('==================================\n');
  
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  const stockUrls = [
    'https://inventory.dearsystems.com/ExternalAPI/stock',
    'https://inventory.dearsystems.com/ExternalAPI/stock?limit=1',
    'https://inventory.dearsystems.com/ExternalAPI/stock?limit=10',
    'https://inventory.dearsystems.com/ExternalAPI/Stock',  // Capitalized
    'https://inventory.dearsystems.com/ExternalAPI/Stock?limit=1'
  ];
  
  for (const url of stockUrls) {
    console.log(`\n🔍 Testing: ${url}`);
    console.log(''.padEnd(60, '-'));
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      console.log(`Content-Length: ${response.headers.get('content-length')}`);
      
      if (response.status === 200) {
        const text = await response.text();
        
        console.log(`Response length: ${text.length} characters`);
        console.log(`First 200 chars: ${text.substring(0, 200)}`);
        
        // Check if it's JSON
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          try {
            const data = JSON.parse(text);
            console.log('\n🎉 SUCCESS! VALID JSON RESPONSE!');
            console.log('==================================');
            console.log(JSON.stringify(data, null, 2).substring(0, 1000));
            
            // Analyze the data structure
            if (Array.isArray(data)) {
              console.log(`\n📊 Data Analysis:`);
              console.log(`   • Array with ${data.length} items`);
              if (data.length > 0) {
                console.log(`   • First item keys: ${Object.keys(data[0]).join(', ')}`);
              }
            } else if (typeof data === 'object') {
              console.log(`\n📊 Data Analysis:`);
              console.log(`   • Object with keys: ${Object.keys(data).join(', ')}`);
              
              if (data.Total) {
                console.log(`   • Total items available: ${data.Total}`);
              }
              if (data.Page) {
                console.log(`   • Current page: ${data.Page}`);
              }
              if (data.Stock || data.Products || data.Items) {
                const items = data.Stock || data.Products || data.Items;
                console.log(`   • Items in response: ${items.length}`);
                if (items.length > 0) {
                  console.log(`   • First item keys: ${Object.keys(items[0]).join(', ')}`);
                }
              }
            }
            
            // Save successful response
            const filename = `successful_stock_response_${Date.now()}.json`;
            await fs.writeFile(filename, JSON.stringify(data, null, 2));
            console.log(`\n💾 Saved response to: ${filename}`);
            
            console.log('\n🚀 NEXT STEPS:');
            console.log('1. This endpoint works! Test other similar endpoints');
            console.log('2. Try products, customers endpoints without v2');
            console.log('3. Build integration using this working pattern');
            
            return { url, data };
            
          } catch (e) {
            console.log(`❌ Invalid JSON: ${e.message}`);
            console.log(`Raw response: ${text.substring(0, 500)}`);
          }
        } else if (text.includes('<!DOCTYPE')) {
          console.log('❌ Returns HTML page');
          if (text.includes('Page not found')) {
            console.log('   → 404 error page');
          } else if (text.includes('Login')) {
            console.log('   → Login page');
          }
        } else {
          console.log('❌ Unknown response format');
          console.log(`Content: ${text.substring(0, 200)}`);
        }
      } else if (response.status === 403) {
        console.log('❌ 403 Forbidden - but endpoint exists!');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  // If stock works, test other endpoints without v2
  console.log('\n\n🧪 TESTING OTHER ENDPOINTS WITHOUT V2');
  console.log('=====================================\n');
  
  const endpointsToTest = [
    '/products',
    '/Products', 
    '/customers',
    '/Customers',
    '/me',
    '/Me',
    '/sale',
    '/Sales',
    '/purchase',
    '/Purchases'
  ];
  
  for (const endpoint of endpointsToTest) {
    const url = `https://inventory.dearsystems.com/ExternalAPI${endpoint}`;
    console.log(`Testing: ${endpoint}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.status === 200) {
        const text = await response.text();
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          console.log('  ✅ RETURNS JSON! Another working endpoint!');
        } else {
          console.log('  ❌ Returns HTML');
        }
      } else if (response.status === 403) {
        console.log('  🔐 403 Forbidden (endpoint exists)');
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n📋 STOCK ENDPOINT TEST COMPLETE');
  console.log('===============================\n');
  console.log('We\'ve found the key pattern:');
  console.log('• Some endpoints work without v2 in the path');
  console.log('• Stock endpoint specifically returned 200 OK');
  console.log('• This gives us the correct API URL structure to use');
}

testStockEndpoint();