// Test the EXACT credentials from CIN7 Core
const fetch = require('node-fetch');

async function testExactCredentials() {
  // Your exact credentials from the screenshots
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 Testing your exact CIN7 Core credentials...');
  console.log('=====================================');
  console.log('Account ID:', accountId);
  console.log('API Key:', apiKey);
  console.log('Name: bookedbarber');
  console.log('Status: Is active ✅');
  console.log();
  
  // Test with the exact headers CIN7 Core requires
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Content-Type': 'application/json'
  };
  
  console.log('📡 Testing connection to CIN7 Core API...');
  console.log('URL: https://inventory.dearsystems.com/ExternalAPI/v2/me');
  console.log('Headers:', JSON.stringify(headers, null, 2));
  console.log();
  
  try {
    const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: headers
    });
    
    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const contentType = response.headers.get('content-type');
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('\n✅ SUCCESS! Connected to CIN7 Core!');
      console.log('Company:', data.Company);
      console.log('User:', data.UserName);
      console.log('Email:', data.Email);
      
      // Test products endpoint
      console.log('\n📦 Testing products endpoint...');
      const productsResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?page=1&limit=5', {
        method: 'GET',
        headers: headers
      });
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const products = productsData.ProductList || productsData.Products || [];
        console.log('✅ Found', products.length, 'products');
        
        if (products.length > 0) {
          console.log('\nFirst product:');
          console.log('- Name:', products[0].Name);
          console.log('- SKU:', products[0].SKU);
          console.log('- Price:', products[0].PriceTier1);
        }
      }
    } else {
      const responseText = await response.text();
      console.log('\n❌ Authentication failed!');
      console.log('Response body:', responseText);
      
      if (response.status === 401) {
        console.log('\n🔍 401 Unauthorized - Possible causes:');
        console.log('1. API access might be disabled in your CIN7 account settings');
        console.log('2. The API subscription might not be active');
        console.log('3. There might be additional permissions needed');
        console.log('\nSuggested actions:');
        console.log('1. Contact CIN7 support to verify API access is enabled for your account');
        console.log('2. Check if there\'s a separate "API Access" subscription or feature to enable');
        console.log('3. Verify with CIN7 if "bookedbarber" account has API permissions');
      } else if (response.status === 403) {
        console.log('\n🔍 403 Forbidden - The credentials format is correct but not authorized');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testExactCredentials();