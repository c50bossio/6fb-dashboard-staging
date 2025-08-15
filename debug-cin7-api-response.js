#!/usr/bin/env node

/**
 * Debug CIN7 API Response Structure
 * 
 * This script will make direct API calls to CIN7 to see exactly what 
 * field structure is returned, compared to the live dashboard you showed.
 * 
 * Expected from your dashboard:
 * - AVAILABLE: 34903, 647, 523, 5018, 5272, 4750, 26622, 4595, 4185, 4048, 730, 4865, 2433
 * - ON HAND: Same as Available  
 * - STOCK VALUE: 87,755.3300, 47,920.0000, etc.
 */

import { createClient } from '@supabase/supabase-js';
import { decrypt } from './lib/cin7-client.js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function getCin7Credentials() {
  const { data: credentials, error } = await supabase
    .from('cin7_credentials')
    .select('encrypted_api_key, encrypted_account_id, account_name')
    .eq('is_active', true)
    .single();

  if (error || !credentials) {
    throw new Error('No active CIN7 credentials found');
  }

  const accountId = decrypt(JSON.parse(credentials.encrypted_account_id));
  const apiKey = decrypt(JSON.parse(credentials.encrypted_api_key));

  return { accountId, apiKey, accountName: credentials.account_name };
}

async function fetchCin7Products(credentials) {
  const response = await fetch(`https://inventory.dearsystems.com/ExternalAPI/v2/products?page=1&limit=5`, {
    method: 'GET',
    headers: {
      'api-auth-accountid': credentials.accountId,
      'api-auth-applicationkey': credentials.apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`CIN7 Products API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function fetchCin7StockLevels(credentials) {
  const response = await fetch(`https://inventory.dearsystems.com/ExternalAPI/v2/stocklevels?page=1&limit=5`, {
    method: 'GET',
    headers: {
      'api-auth-accountid': credentials.accountId,
      'api-auth-applicationkey': credentials.apiKey,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`CIN7 Stock API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function analyzeApiResponse() {
  try {
    console.log('🔍 CIN7 API Response Analysis\n');
    console.log('Comparing API response with your live dashboard data...\n');
    
    // Expected from your dashboard screenshot:
    const expectedDashboardData = [
      { name: 'Tomb45 Shaving', available: 34903, onHand: 34903, stockValue: 87755.3300 },
      { name: 'Tomb45 Clipper FX145T', available: 647, onHand: 647, stockValue: 47920.0000 },
      { name: 'Tomb45 Clipper FX145C', available: 523, onHand: 523, stockValue: 42184.0000 },
      { name: 'Tomb45 Beard Enhancer', available: 5018, onHand: 5018, stockValue: 38214.6000 },
      { name: 'Tomb45 Wireless', available: 5272, onHand: 5272, stockValue: 37965.6000 }
    ];
    
    console.log('📊 Expected Data from Your Dashboard:');
    expectedDashboardData.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name}`);
      console.log(`      Available: ${item.available.toLocaleString()}`);
      console.log(`      Stock Value: $${item.stockValue.toLocaleString()}`);
    });
    
    console.log('\n🔗 Fetching Live API Data...\n');
    
    // Get credentials and fetch API data
    const credentials = await getCin7Credentials();
    console.log(`✅ Connected to: ${credentials.accountName || 'CIN7 Account'}`);
    
    // Fetch both products and stock levels
    const [productsResponse, stockResponse] = await Promise.all([
      fetchCin7Products(credentials),
      fetchCin7StockLevels(credentials)
    ]);
    
    const apiProducts = productsResponse.ProductList || [];
    const apiStockLevels = stockResponse.StockItems || [];
    
    console.log(`📦 API returned ${apiProducts.length} products`);
    console.log(`📊 API returned ${apiStockLevels.length} stock items\n`);
    
    // Analyze each API product and compare with expected
    console.log('🔬 Detailed API vs Dashboard Comparison:\n');
    
    apiProducts.forEach((product, index) => {
      console.log(`--- PRODUCT ${index + 1}: ${product.Name} ---`);
      console.log(`API Product Fields:`);
      console.log(`   ID: ${product.ID}`);
      console.log(`   Name: ${product.Name}`);
      console.log(`   SKU: ${product.SKU}`);
      console.log(`   PriceTier1: ${product.PriceTier1}`);
      
      // Look for any stock-related fields in the product itself
      const productStockFields = Object.keys(product).filter(key => 
        key.toLowerCase().includes('stock') || 
        key.toLowerCase().includes('available') || 
        key.toLowerCase().includes('onhand') ||
        key.toLowerCase().includes('quantity')
      );
      
      if (productStockFields.length > 0) {
        console.log(`   Product Stock Fields Found:`, productStockFields.map(field => 
          `${field}: ${product[field]}`
        ).join(', '));
      }
      
      // Find matching stock record
      const stockRecord = apiStockLevels.find(stock => 
        stock.ProductID === product.ID || 
        stock.SKU === product.SKU
      );
      
      if (stockRecord) {
        console.log(`   Stock Record Found:`);
        
        // Show ALL fields in the stock record
        Object.keys(stockRecord).forEach(field => {
          console.log(`      ${field}: ${stockRecord[field]}`);
        });
        
        // Compare with expected dashboard values
        const expectedItem = expectedDashboardData.find(exp => 
          product.Name && product.Name.includes(exp.name.split(' ').slice(0, 2).join(' '))
        );
        
        if (expectedItem) {
          console.log(`   🎯 Dashboard Comparison:`);
          console.log(`      Expected Available: ${expectedItem.available}`);
          console.log(`      API Available: ${stockRecord.Available || 'MISSING'}`);
          console.log(`      API OnHand: ${stockRecord.OnHand || stockRecord.QtyOnHand || 'MISSING'}`);
          console.log(`      Match: ${stockRecord.Available == expectedItem.available ? '✅' : '❌'}`);
        }
      } else {
        console.log(`   ⚠️ No matching stock record found`);
      }
      
      console.log('');
    });
    
    // Show raw stock data structure
    if (apiStockLevels.length > 0) {
      console.log('📋 Raw Stock API Response Structure:');
      console.log('First stock record fields:');
      Object.keys(apiStockLevels[0]).forEach(field => {
        console.log(`   ${field}: ${apiStockLevels[0][field]} (${typeof apiStockLevels[0][field]})`);
      });
    }
    
    // Analysis summary
    console.log('\n🎯 Field Mapping Analysis:');
    
    const availableFieldExists = apiStockLevels.some(stock => stock.Available !== undefined);
    const onHandFieldExists = apiStockLevels.some(stock => stock.OnHand !== undefined);
    const qtyOnHandFieldExists = apiStockLevels.some(stock => stock.QtyOnHand !== undefined);
    
    console.log(`   Available field exists: ${availableFieldExists ? '✅' : '❌'}`);
    console.log(`   OnHand field exists: ${onHandFieldExists ? '✅' : '❌'}`);
    console.log(`   QtyOnHand field exists: ${qtyOnHandFieldExists ? '✅' : '❌'}`);
    
    // Recommendations
    console.log('\n💡 Sync Recommendations:');
    
    if (availableFieldExists) {
      console.log('✅ Use "Available" field - matches dashboard terminology');
    } else if (onHandFieldExists) {
      console.log('⚠️ Use "OnHand" field as fallback');
    } else if (qtyOnHandFieldExists) {
      console.log('⚠️ Use "QtyOnHand" field as fallback');
    } else {
      console.log('❌ Need to identify correct stock field');
    }
    
    return {
      success: true,
      productsFound: apiProducts.length,
      stockRecordsFound: apiStockLevels.length,
      availableFieldExists,
      onHandFieldExists
    };
    
  } catch (error) {
    console.error('❌ API analysis failed:', error.message);
    
    if (error.message.includes('credentials')) {
      console.log('\n🔧 Fix: Save your CIN7 credentials first');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n🔧 Fix: Check CIN7 API credentials are valid');
    } else {
      console.log('\n🔧 Fix: Check network connectivity and API status');
    }
    
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 CIN7 API Response Debug Tool\n');
  console.log('This will compare the API response structure with your live dashboard\n');
  
  const results = await analyzeApiResponse();
  
  if (results.success) {
    console.log('\n✅ Analysis completed successfully!');
    console.log('Use the field mapping recommendations above to fix the sync logic.');
  } else {
    console.log('\n❌ Analysis failed:', results.error);
  }
}

main().catch(console.error);