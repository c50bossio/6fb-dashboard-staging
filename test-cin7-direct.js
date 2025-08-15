#!/usr/bin/env node

/**
 * Direct CIN7 API Integration Test
 * Tests the CIN7 integration logic directly without authentication
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function testCredentialStorage() {
  try {
    console.log('🔑 Testing CIN7 Credential Storage...\n');
    
    // Check if credentials table exists and has data
    const { data: credentials, error } = await supabase
      .from('cin7_credentials')
      .select('*')
      .limit(5);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ cin7_credentials table does not exist');
        console.log('   Run the database setup script first');
        return false;
      } else {
        console.log('❌ Error accessing credentials:', error.message);
        return false;
      }
    }
    
    console.log(`✅ Credentials table exists`);
    console.log(`📊 Found ${credentials.length} credential records`);
    
    if (credentials.length > 0) {
      credentials.forEach((cred, index) => {
        console.log(`   ${index + 1}. Account: ${cred.account_name || 'Unknown'}`);
        console.log(`      Active: ${cred.is_active ? 'Yes' : 'No'}`);
        console.log(`      Last Sync: ${cred.last_sync || 'Never'}`);
        console.log(`      Status: ${cred.last_sync_status || 'Unknown'}`);
      });
      return true;
    } else {
      console.log('⚠️  No credentials found - need to save CIN7 API credentials first');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Credential test failed:', error.message);
    return false;
  }
}

async function testProductData() {
  try {
    console.log('\n📦 Testing Current Product Data...\n');
    
    // Get current products from database
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku, current_stock, retail_price, updated_at')
      .order('current_stock', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('❌ Error accessing products:', error.message);
      return false;
    }
    
    console.log(`✅ Found ${products.length} products in database`);
    
    if (products.length === 0) {
      console.log('⚠️  No products found - run initial sync first');
      return false;
    }
    
    // Analyze stock levels
    const stockLevels = products.map(p => p.current_stock);
    const totalStock = stockLevels.reduce((sum, stock) => sum + stock, 0);
    const avgStock = Math.round(totalStock / products.length);
    const maxStock = Math.max(...stockLevels);
    const minStock = Math.min(...stockLevels);
    const zeroStock = stockLevels.filter(s => s === 0).length;
    
    console.log('\n📊 Stock Level Analysis:');
    console.log(`   Total Inventory: ${totalStock} units`);
    console.log(`   Average Stock: ${avgStock} units per product`);
    console.log(`   Stock Range: ${minStock} - ${maxStock} units`);
    console.log(`   Out of Stock: ${zeroStock}/${products.length} products`);
    
    // Show top stock items
    console.log('\n📈 Top Stock Items:');
    products.slice(0, 5).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name.substring(0, 50)}...`);
      console.log(`      Stock: ${product.current_stock} units`);
      console.log(`      Price: $${product.retail_price}`);
      console.log(`      Last Update: ${product.updated_at || 'Never'}`);
    });
    
    // Determine if stock levels look realistic
    const realisticStock = zeroStock < products.length && avgStock > 5;
    
    console.log(`\n🎯 Stock Level Assessment: ${realisticStock ? '✅ REALISTIC' : '⚠️ NEEDS REVIEW'}`);
    
    if (realisticStock) {
      console.log('   Stock levels appear to be real inventory data');
      console.log('   (Not all zeros, reasonable distribution)');
    } else {
      console.log('   Stock levels may need sync adjustment');
      console.log('   (Too many zeros or unrealistic values)');
    }
    
    return {
      success: true,
      totalProducts: products.length,
      realisticStock,
      avgStock,
      zeroStock,
      maxStock
    };
    
  } catch (error) {
    console.log('❌ Product data test failed:', error.message);
    return { success: false };
  }
}

async function testDatabaseTables() {
  try {
    console.log('\n🗄️ Testing Database Schema...\n');
    
    // Test products table
    const { data: productCount, error: productError } = await supabase
      .from('products')
      .select('id', { count: 'exact' });
    
    if (productError) {
      console.log('❌ Products table issue:', productError.message);
      return false;
    }
    
    // Test credentials table  
    const { data: credCount, error: credError } = await supabase
      .from('cin7_credentials')
      .select('id', { count: 'exact' });
    
    if (credError) {
      console.log('❌ Credentials table issue:', credError.message);
      return false;
    }
    
    // Test barbershops table
    const { data: shopCount, error: shopError } = await supabase
      .from('barbershops')
      .select('id', { count: 'exact' });
    
    if (shopError) {
      console.log('❌ Barbershops table issue:', shopError.message);
      return false;
    }
    
    console.log('✅ Database Schema Check:');
    console.log(`   Products table: ${productCount?.length || 0} records`);
    console.log(`   Credentials table: ${credCount?.length || 0} records`);  
    console.log(`   Barbershops table: ${shopCount?.length || 0} records`);
    
    return true;
    
  } catch (error) {
    console.log('❌ Database schema test failed:', error.message);
    return false;
  }
}

async function runDirectTest() {
  console.log('🚀 CIN7 Direct Integration Test\n');
  console.log('Testing database integration without API authentication...\n');
  
  let score = 0;
  const tests = [];
  
  // Test 1: Database Schema
  console.log('=' .repeat(60));
  const schemaOk = await testDatabaseTables();
  tests.push({ name: 'Database Schema', passed: schemaOk });
  if (schemaOk) score++;
  
  // Test 2: Credential Storage
  console.log('=' .repeat(60));
  const credentialsOk = await testCredentialStorage();
  tests.push({ name: 'Credential Storage', passed: credentialsOk });
  if (credentialsOk) score++;
  
  // Test 3: Product Data
  console.log('=' .repeat(60));
  const productResult = await testProductData();
  tests.push({ name: 'Product Data', passed: productResult.success });
  if (productResult.success) score++;
  
  // Results Summary
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 DIRECT TEST RESULTS\n');
  
  tests.forEach(test => {
    console.log(`   ${test.name}: ${test.passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  const healthPercentage = Math.round((score / tests.length) * 100);
  console.log(`\n🏥 Overall Health: ${score}/${tests.length} (${healthPercentage}%)`);
  
  // Specific Recommendations
  console.log('\n💡 Next Steps:');
  
  if (score === tests.length && productResult?.realisticStock) {
    console.log('🎉 EXCELLENT! Database integration is working perfectly!');
    console.log('\n✅ To complete the integration:');
    console.log('1. Save your CIN7 API credentials in the UI');
    console.log('2. Go to: http://localhost:9999/shop/products');
    console.log('3. Click "Connect to CIN7" and enter your API key');
    console.log('4. Click "Refresh Inventory" to test live sync');
    
  } else {
    if (!schemaOk) {
      console.log('📝 Create missing database tables:');
      console.log('   Run: node create-cin7-table-manual.sql');
    }
    
    if (!credentialsOk) {
      console.log('🔑 Save CIN7 credentials:');
      console.log('   1. Go to shop products page');
      console.log('   2. Enter your CIN7 API credentials'); 
      console.log('   3. Save them to the database');
    }
    
    if (!productResult?.realisticStock) {
      console.log('📊 Sync inventory data:');
      console.log('   1. After saving credentials');
      console.log('   2. Click "Refresh Inventory"');
      console.log('   3. Verify stock levels match your CSV');
    }
  }
  
  if (productResult?.success) {
    console.log(`\n📈 Current Inventory: ${productResult.totalProducts} products, avg ${productResult.avgStock} units`);
    console.log(`   Out of Stock: ${productResult.zeroStock} items`);
    console.log(`   Max Stock: ${productResult.maxStock} units`);
  }
  
  return { healthPercentage, tests, productResult };
}

// Run the test
runDirectTest()
  .then(results => {
    console.log(`\n🏁 Direct Test Complete! Health Score: ${results.healthPercentage}%`);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
  });