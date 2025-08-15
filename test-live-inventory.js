#!/usr/bin/env node

/**
 * Test Live Inventory Data
 * 
 * This checks what's currently in the database after your sync
 * and compares it with the expected values from your CIN7 dashboard.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Expected values from your CIN7 dashboard screenshot
const expectedInventory = [
  { name: 'TOMB45SHAVECBLCK', available: 34903, stockValue: 87755.3300 },
  { name: 'FX145T', available: 647, stockValue: 47920.0000 },
  { name: 'FX145C', available: 523, stockValue: 42184.0000 },
  { name: 'ONYXCOLOR', available: 5018, stockValue: 38214.6000 },
  { name: 'PCPOWERCLIPPER', available: 5272, stockValue: 37965.6000 },
  { name: 'PCMAGIC', available: 4750, stockValue: 34214.4000 },
  { name: 'T45FP', available: 26622, stockValue: 33984.7200 },
  { name: 'PCSENIOR', available: 4595, stockValue: 33084.0000 },
  { name: 'PCDETAILER', available: 4185, stockValue: 30132.0000 },
  { name: 'PCFINALESHAVER', available: 4048, stockValue: 29145.6000 },
  { name: 'PODBASE6', available: 730, stockValue: 28893.4000 },
  { name: 'T45ND', available: 4865, stockValue: 25699.8000 },
  { name: 'PCFOLUX', available: 2433, stockValue: 17524.8000 }
];

async function analyzeDatabaseInventory() {
  try {
    console.log('🔍 Live Database Inventory Analysis\n');
    console.log('Comparing database contents with your CIN7 dashboard...\n');
    
    // Get all products from database
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('current_stock', { ascending: false });
    
    if (error) {
      console.log('❌ Database error:', error.message);
      return;
    }
    
    console.log(`📦 Found ${products.length} products in database\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No products in database - sync may not have worked');
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure you\'re logged into the UI as a barbershop owner');
      console.log('2. Go to: http://localhost:9999/shop/products');
      console.log('3. Try the sync button again');
      console.log('4. Check browser console for error messages');
      return;
    }
    
    // Show top products by stock
    console.log('📈 Top Products by Stock Level:');
    products.slice(0, 10).forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name}`);
      console.log(`      SKU: ${product.sku || 'N/A'}`);
      console.log(`      Stock: ${product.current_stock.toLocaleString()} units`);
      console.log(`      Price: $${product.retail_price}`);
      console.log(`      Value: $${(product.current_stock * product.retail_price).toLocaleString()}`);
    });
    
    // Calculate totals
    const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0);
    const totalValue = products.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0);
    const avgStock = Math.round(totalStock / products.length);
    
    console.log('\n📊 Inventory Summary:');
    console.log(`   Total Products: ${products.length}`);
    console.log(`   Total Stock: ${totalStock.toLocaleString()} units`);
    console.log(`   Total Value: $${totalValue.toLocaleString()}`);
    console.log(`   Average Stock: ${avgStock} units per product`);
    
    // Compare with expected CIN7 data
    console.log('\n🎯 CIN7 Dashboard Comparison:');
    
    let matches = 0;
    let stockMatches = 0;
    
    expectedInventory.forEach(expected => {
      const dbProduct = products.find(p => 
        p.sku && p.sku.includes(expected.name) ||
        p.name && p.name.toLowerCase().includes(expected.name.toLowerCase()) ||
        p.cin7_sku === expected.name
      );
      
      if (dbProduct) {
        matches++;
        const stockMatch = Math.abs(dbProduct.current_stock - expected.available) < 1;
        if (stockMatch) stockMatches++;
        
        console.log(`✅ Found: ${expected.name}`);
        console.log(`   Database Stock: ${dbProduct.current_stock.toLocaleString()}`);
        console.log(`   CIN7 Expected: ${expected.available.toLocaleString()}`);
        console.log(`   Match: ${stockMatch ? '✅ PERFECT' : '❌ DIFFERENT'}`);
        
        if (!stockMatch) {
          const difference = dbProduct.current_stock - expected.available;
          console.log(`   Difference: ${difference > 0 ? '+' : ''}${difference.toLocaleString()}`);
        }
      } else {
        console.log(`❌ Missing: ${expected.name} (not found in database)`);
      }
    });
    
    console.log(`\n📋 Match Summary:`);
    console.log(`   Products Found: ${matches}/${expectedInventory.length}`);
    console.log(`   Stock Matches: ${stockMatches}/${matches}`);
    console.log(`   Accuracy: ${matches > 0 ? Math.round(stockMatches/matches*100) : 0}%`);
    
    // Determine sync quality
    if (stockMatches === expectedInventory.length) {
      console.log('\n🎉 PERFECT! All stock levels match your CIN7 dashboard exactly!');
      console.log('✅ The API integration is working perfectly');
    } else if (matches > 0 && stockMatches > matches * 0.8) {
      console.log('\n🟡 GOOD! Most stock levels match, minor discrepancies');
      console.log('✅ The API integration is mostly working');
      console.log('💡 Small differences may be due to timing or field mapping');
    } else if (matches > 0) {
      console.log('\n🟠 PARTIAL! Products found but stock levels don\'t match');
      console.log('⚠️ The sync is working but may be using wrong stock fields');
      console.log('🔧 Need to adjust field mapping in sync logic');
    } else {
      console.log('\n🔴 FAILED! No matching products found');
      console.log('❌ The sync either didn\'t run or products aren\'t matching');
      console.log('🔧 Check if sync actually completed successfully');
    }
    
    // Show unusual patterns
    const zeroStock = products.filter(p => p.current_stock === 0).length;
    const highStock = products.filter(p => p.current_stock > 10000).length;
    const negativeStock = products.filter(p => p.current_stock < 0).length;
    
    console.log('\n🔍 Data Quality Check:');
    console.log(`   Zero Stock Items: ${zeroStock}/${products.length} (${Math.round(zeroStock/products.length*100)}%)`);
    console.log(`   High Stock Items (>10k): ${highStock}`);
    console.log(`   Negative Stock Items: ${negativeStock}`);
    
    if (zeroStock === products.length) {
      console.log('⚠️  ALL products have zero stock - field mapping issue likely');
    } else if (highStock > 0) {
      console.log('✅ Some high stock items found - suggests real data');
    }
    
    return {
      totalProducts: products.length,
      matches,
      stockMatches,
      totalValue,
      avgStock,
      syncQuality: matches > 0 ? Math.round(stockMatches/matches*100) : 0
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Live Inventory Database Analysis\n');
  console.log('Checking what was synced vs your CIN7 dashboard values...\n');
  
  const results = await analyzeDatabaseInventory();
  
  if (results) {
    console.log(`\n🏁 Analysis Complete!`);
    console.log(`Sync Quality: ${results.syncQuality}% accurate`);
    console.log(`Total Inventory Value: $${results.totalValue.toLocaleString()}`);
    
    if (results.syncQuality >= 90) {
      console.log('🎉 Integration is working excellently!');
    } else if (results.syncQuality >= 70) {
      console.log('✅ Integration is working well with minor issues');
    } else if (results.syncQuality > 0) {
      console.log('⚠️ Integration needs field mapping adjustments');
    } else {
      console.log('❌ Integration needs troubleshooting');
    }
  }
}

main().catch(console.error);