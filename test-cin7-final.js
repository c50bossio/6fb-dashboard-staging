// Final test for CIN7 Core with correct API format
const fetch = require('node-fetch');

async function testCin7Final() {
  // Your correct Account ID from CIN7 Core dashboard
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('❌ Please provide your API key:');
    console.log('   node test-cin7-final.js YOUR_API_KEY');
    console.log('\nTo get your API key:');
    console.log('1. Go to CIN7 Core > Integrations > API');
    console.log('2. Click the refresh icon next to the Key field');
    console.log('3. Copy the ENTIRE key that appears');
    process.exit(1);
  }
  
  console.log('🔍 Testing CIN7 Core connection...');
  console.log('=====================================');
  console.log('Account ID:', accountId);
  console.log('API Key:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
  console.log('API Key length:', apiKey.length, 'characters');
  console.log();
  
  // According to CIN7 Core documentation, use these exact headers
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test 1: ME endpoint
    console.log('📡 Test 1: User Information (/me endpoint)');
    const meResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: headers
    });
    
    console.log('   Status:', meResponse.status, meResponse.statusText);
    
    if (meResponse.status === 403) {
      const errorText = await meResponse.text();
      console.log('   ❌ Authentication failed!');
      console.log('   Error:', errorText);
      console.log('\n   Possible issues:');
      console.log('   1. The API key is incorrect or incomplete');
      console.log('   2. The API key has expired');
      console.log('   3. API access is disabled in CIN7 Core');
      console.log('   4. The account is using CIN7 Omni instead of CIN7 Core');
      return;
    }
    
    if (meResponse.status === 401) {
      console.log('   ❌ Unauthorized - Check if API is enabled in CIN7 Core');
      return;
    }
    
    if (!meResponse.ok) {
      console.log('   ❌ Unexpected error:', meResponse.status);
      const text = await meResponse.text();
      console.log('   Response:', text.substring(0, 200));
      return;
    }
    
    const userData = await meResponse.json();
    console.log('   ✅ SUCCESS! Connected to CIN7 Core');
    console.log('   Company:', userData.Company);
    console.log('   User:', userData.UserName);
    console.log('   Email:', userData.Email);
    
    // Test 2: Products endpoint
    console.log('\n📦 Test 2: Products Endpoint');
    const productsResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?page=1&limit=5', {
      method: 'GET',
      headers: headers
    });
    
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      const products = productsData.ProductList || productsData.Products || [];
      console.log('   ✅ Products endpoint working');
      console.log('   Total products found:', products.length);
      
      if (products.length > 0) {
        console.log('\n   Sample products:');
        products.slice(0, 3).forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.Name}`);
          console.log(`      SKU: ${product.SKU}`);
          console.log(`      Price: $${product.PriceTier1 || 'N/A'}`);
        });
      }
    } else {
      console.log('   ❌ Products endpoint failed:', productsResponse.status);
    }
    
    console.log('\n🎉 CIN7 Core API is working correctly!');
    console.log('=====================================');
    console.log('You can now use these credentials in the app:');
    console.log('Account ID:', accountId);
    console.log('API Key:', '[Keep this secret]');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCin7Final();