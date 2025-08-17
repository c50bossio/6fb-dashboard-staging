/**
 * Direct test of user's CIN7 credentials
 */

const accountId = '587d31ea-3db2-0b84-d40b-dd6378419123';
const apiKey = 'fc68b1ee-3c13-41d0-a9ba-bfa123dbb123';

async function testCIN7Connection() {
  console.log('🔍 Testing CIN7 Connection...');
  console.log('Account ID:', accountId);
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  
  try {
    // Test the /me endpoint first (account info)
    console.log('\n📡 Testing /me endpoint...');
    const meResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', meResponse.status, meResponse.statusText);
    
    if (meResponse.ok) {
      const meData = await meResponse.json();
      console.log('✅ Connection successful!');
      console.log('Account info:', JSON.stringify(meData, null, 2));
      
      // Now test products endpoint
      console.log('\n📦 Testing products endpoint...');
      const productsResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?page=1&limit=5', {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Products response status:', productsResponse.status);
      
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        console.log('✅ Products endpoint working!');
        console.log('Total products:', productsData.Total || 0);
        console.log('Sample product:', productsData.ProductList?.[0]?.Name || 'No products');
        
        // Calculate total value if products exist
        if (productsData.ProductList && productsData.ProductList.length > 0) {
          let totalValue = 0;
          productsData.ProductList.forEach(product => {
            const price = parseFloat(product.PriceTier1 || 0);
            const stock = parseFloat(product.StockOnHand || 0);
            totalValue += price * stock;
          });
          console.log(`\n💰 Sample inventory value: $${totalValue.toFixed(2)} (for first ${productsData.ProductList.length} products)`);
        }
      } else {
        const errorText = await productsResponse.text();
        console.error('❌ Products endpoint failed:', errorText);
      }
      
    } else {
      const errorText = await meResponse.text();
      console.error('❌ Connection failed:', errorText);
      
      // Check if it's an auth error
      if (meResponse.status === 403 || meResponse.status === 401) {
        console.error('\n🔑 Authentication Error:');
        console.error('- Check that your Account ID is correct');
        console.error('- Verify your API Key is active and not expired');
        console.error('- Ensure API access is enabled in your CIN7 settings');
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.error('This could mean:');
    console.error('- CIN7 servers are unreachable');
    console.error('- Network connection issues');
    console.error('- CORS restrictions (if running from browser)');
  }
}

// Run the test
testCIN7Connection();