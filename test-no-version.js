// Test CIN7 API without version number
const fetch = require('node-fetch');

async function testNoVersion() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 Testing CIN7 API without version (original DEAR format)');
  console.log('==========================================================');
  
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // Test the base API without version
  const endpoints = [
    '/me',
    '/Products',
    '/products',
    '/Product',
    '/Inventory',
    '/Stock',
    '/Account'
  ];
  
  for (const endpoint of endpoints) {
    const url = `https://inventory.dearsystems.com/ExternalAPI${endpoint}`;
    console.log(`\n📡 Testing: ${endpoint}`);
    console.log(`   Full URL: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        redirect: 'manual'
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS! This endpoint exists!');
        
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          console.log('   Response type: JSON');
          console.log('   Data keys:', Object.keys(data).join(', '));
          
          if (endpoint.toLowerCase().includes('product')) {
            console.log(`   Total products: ${data.Total || 0}`);
            if (data.Products) {
              console.log(`   Products array length: ${data.Products.length}`);
            }
          }
        } catch (e) {
          console.log('   Response preview:', text.substring(0, 100));
        }
      } else if (response.status === 302) {
        console.log(`   ❌ Redirect to: ${response.headers.get('location')}`);
      } else if (response.status === 403) {
        const text = await response.text();
        console.log(`   ❌ 403: ${text}`);
      } else if (response.status === 404) {
        console.log('   ❌ 404 Not Found');
      } else {
        const text = await response.text();
        console.log(`   Response: ${text.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n🔍 Now testing with query parameters...');
  console.log('=========================================');
  
  // Test Products with different parameter formats
  const productTests = [
    '?Page=1',
    '?page=1',
    '?Page=1&Limit=10',
    '?page=1&limit=10',
    '?limit=10',
    '?search=',
    ''
  ];
  
  for (const params of productTests) {
    const url = `https://inventory.dearsystems.com/ExternalAPI/Products${params}`;
    console.log(`\n📡 /Products${params}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        redirect: 'manual'
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS! These parameters work!');
        
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          console.log(`   Total products: ${data.Total || 0}`);
          console.log(`   Products returned: ${data.Products?.length || 0}`);
          
          if (data.Products && data.Products.length > 0) {
            console.log('\n   🎉 YOUR INVENTORY IS ACCESSIBLE!');
            console.log('   ================================');
            console.log(`   First product: ${data.Products[0].Name}`);
            console.log(`   SKU: ${data.Products[0].SKU}`);
            console.log(`   Price: $${data.Products[0].PriceTier1 || 0}`);
          }
          
          return;
        } catch (e) {
          console.log('   Not JSON:', text.substring(0, 50));
        }
      } else if (response.status === 403) {
        const text = await response.text();
        console.log(`   403: ${text}`);
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }
}

testNoVersion();