#!/usr/bin/env node

// Debug script to test CIN7 API responses and fix stock mapping
import fetch from 'node-fetch';

// Mock CIN7 credentials for testing - replace with real ones
const MOCK_ACCOUNT_ID = 'your-account-id';
const MOCK_API_KEY = 'your-api-key';

async function testCin7Products() {
  try {
    console.log('🔍 Testing CIN7 Products API...');
    
    const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?page=1&limit=3', {
      method: 'GET',
      headers: {
        'api-auth-accountid': MOCK_ACCOUNT_ID,
        'api-auth-applicationkey': MOCK_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ Products API failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Products API successful');
    console.log('📊 Sample product structure:');
    
    if (data.ProductList && data.ProductList.length > 0) {
      const product = data.ProductList[0];
      console.log({
        ID: product.ID,
        Name: product.Name,
        SKU: product.SKU,
        QtyOnHand: product.QtyOnHand,
        Available: product.Available,
        StockOnHand: product.StockOnHand,
        // Log other potential stock fields
        ...Object.keys(product).filter(key => 
          key.toLowerCase().includes('stock') || 
          key.toLowerCase().includes('qty') ||
          key.toLowerCase().includes('available')
        ).reduce((obj, key) => ({ ...obj, [key]: product[key] }), {})
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Products API error:', error.message);
    return null;
  }
}

async function testCin7StockLevels() {
  try {
    console.log('\n🔍 Testing CIN7 Stock Levels API...');
    
    const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/stocklevels?page=1&limit=3', {
      method: 'GET',
      headers: {
        'api-auth-accountid': MOCK_ACCOUNT_ID,
        'api-auth-applicationkey': MOCK_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ Stock Levels API failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Stock Levels API successful');
    console.log('📊 Sample stock structure:');
    
    if (data.StockItems && data.StockItems.length > 0) {
      const stock = data.StockItems[0];
      console.log({
        ProductID: stock.ProductID,
        SKU: stock.SKU,
        Available: stock.Available,
        QuantityAvailable: stock.QuantityAvailable,
        QtyOnHand: stock.QtyOnHand,
        StockOnHand: stock.StockOnHand,
        // Log all fields to see what's available
        allFields: Object.keys(stock)
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Stock Levels API error:', error.message);
    return null;
  }
}

// For testing without real credentials
function simulateStockIssue() {
  console.log('\n🧪 Simulating stock mapping issue...');
  
  // Mock data to test the mapping logic
  const mockProducts = [
    { ID: 'PROD001', Name: 'Test Product 1', SKU: 'SKU001' },
    { ID: 'PROD002', Name: 'Test Product 2', SKU: 'SKU002' }
  ];
  
  const mockStockLevels = [
    { ProductID: 'PROD001', SKU: 'SKU001', Available: 25, QtyOnHand: 30 },
    { ProductID: 'PROD002', SKU: 'DIFFERENT_SKU', Available: 0, QtyOnHand: 0 } // Mismatched SKU
  ];
  
  mockProducts.forEach(product => {
    const stockInfo = mockStockLevels.find(stock => 
      stock.ProductID === product.ID || 
      stock.SKU === product.SKU
    );
    
    const currentStock = parseInt(
      stockInfo?.Available || 
      stockInfo?.QuantityAvailable || 
      stockInfo?.QtyOnHand ||
      stockInfo?.StockOnHand ||
      product.QtyOnHand ||
      0
    );
    
    console.log(`📦 ${product.Name}:`);
    console.log(`   Product ID: ${product.ID}, SKU: ${product.SKU}`);
    console.log(`   Stock Info Found: ${!!stockInfo}`);
    if (stockInfo) {
      console.log(`   Stock Details: Available=${stockInfo.Available}, QtyOnHand=${stockInfo.QtyOnHand}`);
    }
    console.log(`   Final Stock: ${currentStock}`);
    console.log('');
  });
}

async function main() {
  console.log('🚀 CIN7 API Debug Tool\n');
  
  if (MOCK_ACCOUNT_ID === 'your-account-id') {
    console.log('⚠️ No real credentials provided. Running simulation only...\n');
    simulateStockIssue();
    
    console.log('📋 To test with real CIN7 credentials:');
    console.log('1. Replace MOCK_ACCOUNT_ID and MOCK_API_KEY in this script');
    console.log('2. Run: node debug-cin7-api.js');
    return;
  }
  
  const productsData = await testCin7Products();
  const stockData = await testCin7StockLevels();
  
  if (productsData && stockData) {
    console.log('\n🔍 Analyzing field matching...');
    
    // Test if the matching logic works
    if (productsData.ProductList && stockData.StockItems) {
      const product = productsData.ProductList[0];
      const matchedStock = stockData.StockItems.find(stock => 
        stock.ProductID === product.ID || 
        stock.SKU === product.SKU
      );
      
      console.log('🎯 Matching test:');
      console.log(`   Product: ${product.Name} (ID: ${product.ID}, SKU: ${product.SKU})`);
      console.log(`   Stock Match Found: ${!!matchedStock}`);
      if (matchedStock) {
        console.log(`   Matched Stock: Available=${matchedStock.Available}, QtyOnHand=${matchedStock.QtyOnHand}`);
      }
    }
  }
}

main().catch(console.error);