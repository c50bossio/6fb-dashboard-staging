#!/usr/bin/env node

// Test Cin7 API directly to see what stock fields are available
const fetch = require('node-fetch');

async function testCin7StockFields() {
  // These credentials are from your environment or database
  const accountId = process.env.CIN7_ACCOUNT_ID || '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = process.env.CIN7_API_KEY || '85fbad0e-5748-41ba-8e41-72e887db0e06';
  
  if (!accountId || !apiKey) {
    console.error('❌ Missing CIN7_ACCOUNT_ID or CIN7_API_KEY environment variables');
    process.exit(1);
  }
  
  console.log('🔍 Fetching products from Cin7 to inspect stock fields...\n');
  
  try {
    const url = 'https://inventory.dearsystems.com/externalapi/products?limit=3&page=1';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const products = data?.ProductList || data?.Products || [];
    
    console.log(`📦 Found ${products.length} products\n`);
    
    if (products.length > 0) {
      // Inspect the first product thoroughly
      const product = products[0];
      
      console.log('🔍 PRODUCT STRUCTURE ANALYSIS:');
      console.log('================================\n');
      
      console.log('📋 Basic Info:');
      console.log(`   Name: ${product.Name || product.ProductName || 'N/A'}`);
      console.log(`   SKU: ${product.SKU || product.Code || 'N/A'}`);
      console.log(`   ID: ${product.ID || product.ProductID || 'N/A'}`);
      
      console.log('\n📊 STOCK-RELATED FIELDS:');
      console.log('   (Looking for any field with qty/stock/available...)\n');
      
      // Find all potential stock fields
      const stockFields = {};
      Object.keys(product).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('qty') || 
            lowerKey.includes('stock') || 
            lowerKey.includes('available') ||
            lowerKey.includes('quantity') ||
            lowerKey.includes('onhand') ||
            lowerKey.includes('allocated') ||
            lowerKey.includes('free')) {
          stockFields[key] = product[key];
        }
      });
      
      if (Object.keys(stockFields).length > 0) {
        console.log('   ✅ Found stock-related fields:');
        Object.entries(stockFields).forEach(([field, value]) => {
          console.log(`      ${field}: ${JSON.stringify(value)}`);
        });
      } else {
        console.log('   ⚠️  No obvious stock fields found in main product object');
      }
      
      // Check for nested inventory/stock objects
      console.log('\n📦 NESTED OBJECTS:');
      Object.keys(product).forEach(key => {
        if (typeof product[key] === 'object' && product[key] !== null) {
          console.log(`   ${key}: ${JSON.stringify(product[key]).substring(0, 100)}...`);
        }
      });
      
      // Show all fields for debugging
      console.log('\n🔍 ALL PRODUCT FIELDS:');
      Object.keys(product).forEach(key => {
        const value = product[key];
        const displayValue = typeof value === 'object' ? 
          `[${Array.isArray(value) ? 'Array' : 'Object'}]` : 
          value;
        console.log(`   ${key}: ${displayValue}`);
      });
      
      // Check the next 2 products briefly
      console.log('\n📊 OTHER PRODUCTS QUICK CHECK:');
      products.slice(1, 3).forEach((p, index) => {
        console.log(`\n   Product ${index + 2}: ${p.Name || p.ProductName}`);
        
        // Check for any numeric stock value
        const stockValues = [];
        Object.keys(p).forEach(key => {
          const lowerKey = key.toLowerCase();
          if ((lowerKey.includes('qty') || 
               lowerKey.includes('stock') || 
               lowerKey.includes('available')) &&
              typeof p[key] === 'number') {
            stockValues.push(`${key}: ${p[key]}`);
          }
        });
        
        if (stockValues.length > 0) {
          console.log(`      Stock fields: ${stockValues.join(', ')}`);
        } else {
          console.log('      No numeric stock fields found');
        }
      });
    }
    
    console.log('\n✅ Analysis complete!');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   Update mapCin7ProductToLocal() to use the correct field names shown above');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testCin7StockFields();