// Test CIN7 Core API v1 with correct authentication
const fetch = require('node-fetch');

async function testCin7CoreV1() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = process.argv[2] || 'YOUR_API_KEY_HERE';
  
  console.log('🔍 Testing CIN7 Core API v1...');
  console.log('Account ID:', accountId);
  console.log('API Key:', apiKey !== 'YOUR_API_KEY_HERE' ? 'Provided' : 'Not provided');
  console.log();
  
  // CIN7 Core v1 uses different authentication headers
  const headers = {
    'Content-Type': 'application/json',
    'x-api-account-id': accountId,
    'x-api-application-key': apiKey,
    // Also try Bearer token format
    'Authorization': `Bearer ${apiKey}`
  };
  
  // Test the products endpoint (more likely to exist)
  const endpoints = [
    'https://api.cin7.com/api/v1/Products',
    'https://api.cin7.com/api/v1/products',
    'https://api.cin7.com/v1/Products',
    'https://api.cin7.com/v1/products'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📡 Testing: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      console.log(`   Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (response.status === 401) {
          console.log('   ❌ Authentication failed');
          console.log('   Error:', data.message || data.error || 'Invalid credentials');
        } else if (response.status === 404) {
          console.log('   ❌ Endpoint not found');
        } else if (response.ok) {
          console.log('   ✅ SUCCESS! Valid endpoint found');
          console.log('   Data preview:', JSON.stringify(data).substring(0, 200));
          
          // If successful, test fetching a single page of products
          console.log('\n📦 Testing paginated products fetch...');
          const productsUrl = `${endpoint}?page=1&rows=5`;
          const productsResponse = await fetch(productsUrl, { headers });
          
          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            console.log('   Products found:', Array.isArray(productsData) ? productsData.length : 'Check data structure');
          }
          
          return; // Success, stop testing
        } else {
          console.log('   Response:', JSON.stringify(data).substring(0, 200));
        }
      } else {
        const text = await response.text();
        console.log('   Non-JSON response:', text.substring(0, 100));
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('📝 Notes:');
  console.log('1. Make sure you have the full API key from CIN7 Core');
  console.log('2. The key should be visible when you click the refresh icon in CIN7');
  console.log('3. CIN7 Core and CIN7 Omni use different API endpoints');
  console.log('4. Your account shows "bookedbarber" which suggests CIN7 Core');
}

// Run with: node test-cin7-core-v1.js YOUR_API_KEY_HERE
testCin7CoreV1();