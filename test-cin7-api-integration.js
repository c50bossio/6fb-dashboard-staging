#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { decrypt } from './lib/cin7-client.js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function getCin7Credentials() {
  try {
    const { data: credentials, error } = await supabase
      .from('cin7_credentials')
      .select('encrypted_api_key, encrypted_account_id, account_name')
      .eq('is_active', true)
      .single();

    if (error || !credentials) {
      throw new Error('No active CIN7 credentials found');
    }

    // Decrypt credentials
    const accountId = decrypt(JSON.parse(credentials.encrypted_account_id));
    const apiKey = decrypt(JSON.parse(credentials.encrypted_api_key));

    return { accountId, apiKey, accountName: credentials.account_name };
  } catch (error) {
    throw new Error(`Failed to get credentials: ${error.message}`);
  }
}

async function fetchFromCin7API(endpoint, credentials) {
  try {
    const url = `https://inventory.dearsystems.com/ExternalAPI/v2${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-auth-accountid': credentials.accountId,
        'api-auth-applicationkey': credentials.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`CIN7 API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`API request failed: ${error.message}`);
  }
}

function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

async function testCin7APIIntegration() {
  try {
    console.log('🚀 Testing CIN7 API Integration\n');
    
    // 1. Get saved credentials
    console.log('🔑 Retrieving saved CIN7 credentials...');
    const credentials = await getCin7Credentials();
    console.log(`✅ Connected to: ${credentials.accountName || 'CIN7 Account'}`);
    
    // 2. Test API connectivity
    console.log('\n🌐 Testing CIN7 API connectivity...');
    const accountInfo = await fetchFromCin7API('/me', credentials);
    console.log(`✅ API Connection successful: ${accountInfo.Name || accountInfo.Company || 'Connected'}`);
    
    // 3. Fetch products from API
    console.log('\n📦 Fetching products from CIN7 API...');
    const productsResponse = await fetchFromCin7API('/products?page=1&limit=10', credentials);
    const apiProducts = productsResponse.ProductList || [];
    console.log(`✅ Retrieved ${apiProducts.length} products from API`);
    
    // 4. Fetch stock levels from API
    console.log('\n📊 Fetching stock levels from CIN7 API...');
    const stockResponse = await fetchFromCin7API('/stocklevels?page=1&limit=10', credentials);
    const apiStockLevels = stockResponse.StockItems || [];
    console.log(`✅ Retrieved ${apiStockLevels.length} stock items from API`);
    
    // 5. Load CSV for verification
    console.log('\n📄 Loading CSV file for verification...');
    const csvContent = readFileSync('/Users/bossio/Downloads/AvailabilityReport_2025-08-15.csv', 'utf8');
    const csvData = parseCSV(csvContent);
    console.log(`✅ Loaded ${csvData.length} items from CSV report`);
    
    // 6. Compare API data with CSV data
    console.log('\n🔍 Comparing API data with CSV report...\n');
    
    let perfectMatches = 0;
    let stockMatches = 0;
    let priceMatches = 0;
    let totalComparisons = 0;
    
    const comparisonResults = [];
    
    apiProducts.forEach(apiProduct => {
      // Find corresponding item in CSV
      const csvItem = csvData.find(item => 
        item.SKU === apiProduct.SKU && 
        item.ProductName === apiProduct.Name
      );
      
      if (csvItem) {
        totalComparisons++;
        
        // Find stock info for this product
        const apiStock = apiStockLevels.find(stock => 
          stock.ProductID === apiProduct.ID || 
          stock.SKU === apiProduct.SKU
        );
        
        const apiAvailable = parseFloat(apiStock?.Available || 0);
        const csvAvailable = parseFloat(csvItem.Available || 0);
        const apiPrice = parseFloat(apiProduct.PriceTier1 || 0);
        const csvPrice = parseFloat(csvItem.PriceTier1 || 0);
        
        const stockMatch = Math.abs(apiAvailable - csvAvailable) < 0.01;
        const priceMatch = Math.abs(apiPrice - csvPrice) < 0.01;
        
        if (stockMatch) stockMatches++;
        if (priceMatch) priceMatches++;
        if (stockMatch && priceMatch) perfectMatches++;
        
        comparisonResults.push({
          name: apiProduct.Name,
          sku: apiProduct.SKU,
          apiStock: apiAvailable,
          csvStock: csvAvailable,
          stockMatch,
          apiPrice,
          csvPrice,
          priceMatch,
          perfectMatch: stockMatch && priceMatch
        });
        
        console.log(`📊 ${apiProduct.Name.substring(0, 50)}...`);
        console.log(`   SKU: ${apiProduct.SKU}`);
        console.log(`   Stock - API: ${apiAvailable} | CSV: ${csvAvailable} ${stockMatch ? '✅' : '❌'}`);
        console.log(`   Price - API: $${apiPrice} | CSV: $${csvPrice} ${priceMatch ? '✅' : '❌'}`);
        console.log(`   Overall: ${stockMatch && priceMatch ? '✅ PERFECT MATCH' : '⚠️ DISCREPANCY'}`);
        console.log('');
      }
    });
    
    // 7. Summary results
    console.log('📋 Integration Test Results:');
    console.log(`   🔗 API Connectivity: ✅ Working`);
    console.log(`   📦 Products Retrieved: ${apiProducts.length}`);
    console.log(`   📊 Stock Items Retrieved: ${apiStockLevels.length}`);
    console.log(`   📄 CSV Items Loaded: ${csvData.length}`);
    console.log(`   🎯 Items Compared: ${totalComparisons}`);
    console.log(`   ✅ Perfect Matches: ${perfectMatches}/${totalComparisons} (${Math.round(perfectMatches/totalComparisons*100)}%)`);
    console.log(`   📊 Stock Matches: ${stockMatches}/${totalComparisons} (${Math.round(stockMatches/totalComparisons*100)}%)`);
    console.log(`   💰 Price Matches: ${priceMatches}/${totalComparisons} (${Math.round(priceMatches/totalComparisons*100)}%)`);
    
    // 8. Determine integration health
    const integrationHealth = perfectMatches / totalComparisons;
    
    console.log('\n🎯 Integration Health Assessment:');
    if (integrationHealth >= 0.9) {
      console.log('   🟢 EXCELLENT: API integration is working perfectly!');
      console.log('   📋 Action: Ready for production use');
    } else if (integrationHealth >= 0.7) {
      console.log('   🟡 GOOD: API integration is mostly working');
      console.log('   📋 Action: Minor sync adjustments needed');
    } else if (integrationHealth >= 0.5) {
      console.log('   🟠 FAIR: API integration has some issues');
      console.log('   📋 Action: Review field mapping and sync logic');
    } else {
      console.log('   🔴 POOR: API integration needs major fixes');
      console.log('   📋 Action: Complete sync logic overhaul required');
    }
    
    // 9. Specific recommendations
    console.log('\n💡 Recommendations:');
    
    if (stockMatches < totalComparisons) {
      console.log(`   📊 ${totalComparisons - stockMatches} products have stock discrepancies`);
      console.log('   🔄 Consider using "Available" field from API for accurate stock levels');
    }
    
    if (priceMatches < totalComparisons) {
      console.log(`   💰 ${totalComparisons - priceMatches} products have price discrepancies`);
      console.log('   🔄 Consider syncing prices from "PriceTier1" field');
    }
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Use this API integration to sync live data (not CSV)');
    console.log('2. Update sync logic based on field mapping insights');
    console.log('3. Set up automatic periodic sync');
    console.log('4. Implement webhook for real-time updates');
    
    return {
      success: true,
      apiWorking: true,
      credentialsValid: true,
      integrationHealth,
      perfectMatches,
      totalComparisons
    };
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    
    console.log('\n🔧 Troubleshooting:');
    if (error.message.includes('credentials')) {
      console.log('   1. Ensure CIN7 credentials are saved in the system');
      console.log('   2. Verify credentials are valid and not expired');
    } else if (error.message.includes('API')) {
      console.log('   1. Check CIN7 API status');
      console.log('   2. Verify API endpoints and authentication');
    } else {
      console.log('   1. Check network connectivity');
      console.log('   2. Review error logs for details');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 CIN7 API Integration Verification\n');
  console.log('This test will:');
  console.log('• Connect to CIN7 API using saved credentials');
  console.log('• Fetch live product and stock data');
  console.log('• Compare with CSV report for accuracy');
  console.log('• Assess integration health\n');
  
  const results = await testCin7APIIntegration();
  
  if (results.success) {
    console.log('\n🎉 API Integration Test Completed Successfully!');
    console.log(`Integration Health: ${Math.round(results.integrationHealth * 100)}%`);
  } else {
    console.log('\n❌ API Integration Test Failed');
    console.log('Please resolve the issues above and try again.');
  }
}

main().catch(console.error);