// Test all Cin7 endpoint variations to find the correct one
async function testCin7Endpoints() {
  const accountId = "HG13P3-0a8b-4314-be92-603d47be2069";
  const testKey = "test-key-12345";
  
  console.log('🔍 TESTING ALL CIN7 API ENDPOINT VARIATIONS');
  console.log('============================================\n');
  
  const endpoints = [
    'https://inventory.dearsystems.com/externalapi/v2/products?limit=1',
    'https://inventory.dearsystems.com/ExternalApi/v2/products?limit=1',
    'https://inventory.dearsystems.com/externalapi/products?limit=1',
    'https://inventory.dearsystems.com/ExternalApi/products?limit=1',
    'https://inventory.dearsystems.com/externalapi/v1/products?limit=1',
    'https://inventory.dearsystems.com/ExternalApi/v1/products?limit=1'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔍 Testing: ${endpoint}`);
    console.log('-'.repeat(60));
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': testKey,
          'Content-Type': 'application/json'
        }
      });
      
      const contentType = response.headers.get('content-type') || '';
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Content-Type: ${contentType}`);
      
      if (response.status === 401) {
        console.log('✅ AUTHENTICATION ERROR - This endpoint exists but needs valid credentials!');
        console.log('   This is likely the correct endpoint!');
      } else if (response.status === 404) {
        console.log('❌ NOT FOUND - This endpoint does not exist');
      } else if (response.status === 200 && contentType.includes('text/html')) {
        const text = await response.text();
        if (text.includes('Page not found')) {
          console.log('❌ PAGE NOT FOUND - Endpoint structure is wrong');
        } else {
          console.log('⚠️ UNEXPECTED HTML RESPONSE');
          console.log(`   Preview: ${text.substring(0, 100)}...`);
        }
      } else if (response.status === 200 && contentType.includes('application/json')) {
        console.log('🎉 SUCCESS - Valid JSON response (but with test key)');
        const data = await response.json();
        console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`⚠️ UNEXPECTED RESPONSE: ${response.status}`);
        const text = await response.text();
        console.log(`   Preview: ${text.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
}

testCin7Endpoints().catch(console.error);