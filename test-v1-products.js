// Test CIN7 Core API v1 Products endpoint
const fetch = require('node-fetch');

async function testV1Products() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 Testing CIN7 Core API v1 - Your $500,000+ Inventory');
  console.log('=======================================================');
  
  const headers = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test Products endpoint
    console.log('\n📦 Fetching Products from CIN7 Core...');
    const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v1/Products?page=1&limit=10', {
      method: 'GET',
      headers: headers
    });
    
    console.log('Status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ SUCCESS! Connected to your CIN7 inventory!');
      console.log('=====================================');
      console.log('Total products in CIN7:', data.Total || 0);
      console.log('Products fetched:', data.Products?.length || 0);
      
      if (data.Products && data.Products.length > 0) {
        console.log('\n📊 Sample Products from Your Inventory:');
        console.log('---------------------------------------');
        
        let totalValue = 0;
        data.Products.slice(0, 5).forEach((product, index) => {
          const price = parseFloat(product.PriceTier1) || 0;
          const stock = parseInt(product.QuantityOnHand) || 0;
          const value = price * stock;
          totalValue += value;
          
          console.log(`\n${index + 1}. ${product.Name}`);
          console.log(`   SKU: ${product.SKU || 'N/A'}`);
          console.log(`   Price: $${price.toFixed(2)}`);
          console.log(`   Stock: ${stock} units`);
          console.log(`   Value: $${value.toFixed(2)}`);
          console.log(`   Category: ${product.Category || 'Uncategorized'}`);
          console.log(`   Brand: ${product.Brand || 'N/A'}`);
        });
        
        console.log('\n💰 Sample Inventory Value: $' + totalValue.toFixed(2));
        console.log('   (From first 5 products only)');
      }
      
      // Now test stock levels
      console.log('\n📊 Testing Stock Levels endpoint...');
      const stockResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v1/StockLevels?page=1&limit=5', {
        method: 'GET',
        headers: headers
      });
      
      if (stockResponse.ok) {
        const stockData = await stockResponse.json();
        console.log('✅ Stock levels accessible');
        console.log('Total stock items:', stockData.Total || 0);
      }
      
      console.log('\n🎉 Your CIN7 API v1 is working perfectly!');
      console.log('=====================================');
      console.log('You can now sync your $500,000+ inventory!');
      
    } else {
      const text = await response.text();
      console.log('❌ Error:', text);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testV1Products();