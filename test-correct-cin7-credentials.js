// Test the CORRECT CIN7 credentials from the screenshot
const fetch = require('node-fetch');

async function testCin7Connection() {
  // These are the ACTUAL credentials from your CIN7 Core dashboard
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  
  // Note: You'll need to provide the full API key - it starts with 587d
  // I can't see the full key from the screenshot as it's partially hidden
  const apiKey = process.env.CIN7_API_KEY || '587d31ea-3db2-0b84-d40b-dd6378419123'; // This might be the full key
  
  console.log('🔍 Testing CIN7 Connection with CORRECT credentials...');
  console.log('Account ID:', accountId);
  console.log('API Key:', apiKey.substring(0, 7) + '...\n');
  
  try {
    // Test with the /me endpoint
    console.log('📡 Testing /me endpoint...');
    const meResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', meResponse.status, meResponse.statusText);
    
    if (meResponse.ok) {
      const userData = await meResponse.json();
      console.log('✅ Connection successful!');
      console.log('Company:', userData.Company || 'N/A');
      console.log('User:', userData.UserName || 'N/A');
      
      // Test products endpoint
      console.log('\n📦 Testing products endpoint...');
      const productsResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?page=1&limit=5', {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        const products = productsData.ProductList || productsData.Products || [];
        console.log(`✅ Found ${products.length} products`);
        
        if (products.length > 0) {
          console.log('\nFirst product:');
          console.log('- Name:', products[0].Name);
          console.log('- SKU:', products[0].SKU);
          console.log('- Price:', products[0].PriceTier1);
        }
      }
    } else {
      const errorText = await meResponse.text();
      console.log('❌ Connection failed:', errorText);
      
      if (meResponse.status === 403) {
        console.log('\n🔑 Authentication Error:');
        console.log('The Account ID is correct:', accountId);
        console.log('But the API Key might be incomplete or incorrect.');
        console.log('\nPlease copy the FULL API key from CIN7:');
        console.log('1. Go to CIN7 Core > Integrations > API');
        console.log('2. Click the refresh icon next to the Key field to show the full key');
        console.log('3. Copy the complete key (it should be longer than what we can see)');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCin7Connection();