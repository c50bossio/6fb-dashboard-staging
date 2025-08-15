// Test real Cin7 API to see what products are available
const fetch = require('node-fetch');

async function testCin7API() {
  const accountId = '11d319f3-0a8b-4314-bb82-603f47fe2069';
  // Using a test API key - you'll need to provide the real one
  const apiKey = 'test-key'; // Replace with your actual API key
  
  console.log('Testing Cin7 API connection...');
  console.log('Account ID:', accountId);
  
  try {
    const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?limit=10', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Successfully connected to Cin7!');
      console.log('Total products found:', data?.ProductList?.length || 0);
      
      if (data?.ProductList?.length > 0) {
        console.log('\nFirst 3 products from your Cin7 warehouse:');
        data.ProductList.slice(0, 3).forEach((product, i) => {
          console.log(`\n${i + 1}. ${product.Name}`);
          console.log(`   SKU: ${product.SKU}`);
          console.log(`   Category: ${product.Category || 'N/A'}`);
          console.log(`   Price: $${product.SalePrice || 0}`);
          console.log(`   Stock: ${product.AvailableQuantity || 0}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
      console.log('\nNote: You need to provide your actual Cin7 API key');
      console.log('1. Log into Cin7 at inventory.dearsystems.com');
      console.log('2. Go to Settings → Integrations & API → API v2');
      console.log('3. Create or copy your API Application Key');
    }
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

testCin7API();