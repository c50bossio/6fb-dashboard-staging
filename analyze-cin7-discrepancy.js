#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

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

async function analyzeCin7Discrepancy() {
  try {
    console.log('🔍 Analyzing CIN7 Data Discrepancy...\n');
    
    // 1. Load and parse CIN7 CSV data
    console.log('📂 Loading CIN7 availability report...');
    const csvContent = readFileSync('/Users/bossio/Downloads/AvailabilityReport_2025-08-15.csv', 'utf8');
    const cin7Data = parseCSV(csvContent);
    
    console.log(`✅ Loaded ${cin7Data.length} items from CIN7 report`);
    
    // 2. Get current database products
    console.log('\n📊 Loading current database products...');
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('id, name, sku, current_stock, retail_price, cin7_product_id, cin7_sku');
    
    if (error) {
      console.error('❌ Error loading database products:', error.message);
      return;
    }
    
    console.log(`✅ Loaded ${dbProducts.length} products from database`);
    
    // 3. Analyze key discrepancies
    console.log('\n🔍 Analyzing discrepancies...\n');
    
    const discrepancies = [];
    const matched = [];
    const unmatched = [];
    
    // Check each database product against CIN7 data
    dbProducts.forEach(dbProduct => {
      // Try to find matching CIN7 item by SKU or name
      const cin7Item = cin7Data.find(item => 
        item.SKU === dbProduct.sku || 
        item.SKU === dbProduct.cin7_sku ||
        item.ProductName === dbProduct.name
      );
      
      if (cin7Item) {
        const cin7Available = parseFloat(cin7Item.Available) || 0;
        const dbStock = parseInt(dbProduct.current_stock) || 0;
        const cin7Price = parseFloat(cin7Item.PriceTier1) || 0;
        const dbPrice = parseFloat(dbProduct.retail_price) || 0;
        
        matched.push({
          dbProduct,
          cin7Item,
          stockMatch: cin7Available === dbStock,
          priceMatch: Math.abs(cin7Price - dbPrice) < 0.01,
          stockDiff: dbStock - cin7Available,
          priceDiff: dbPrice - cin7Price
        });
        
        if (cin7Available !== dbStock || Math.abs(cin7Price - dbPrice) >= 0.01) {
          discrepancies.push({
            name: dbProduct.name,
            sku: dbProduct.sku,
            dbStock,
            cin7Stock: cin7Available,
            stockDiff: dbStock - cin7Available,
            dbPrice,
            cin7Price,
            priceDiff: dbPrice - cin7Price
          });
        }
      } else {
        unmatched.push(dbProduct);
      }
    });
    
    // 4. Report findings
    console.log('📊 Analysis Results:');
    console.log(`   ✅ Matched products: ${matched.length}`);
    console.log(`   ❌ Products with discrepancies: ${discrepancies.length}`);
    console.log(`   ⚠️  Unmatched products: ${unmatched.length}`);
    
    if (discrepancies.length > 0) {
      console.log('\n🚨 Top 10 Stock Discrepancies:');
      discrepancies
        .sort((a, b) => Math.abs(b.stockDiff) - Math.abs(a.stockDiff))
        .slice(0, 10)
        .forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.name.substring(0, 50)}...`);
          console.log(`      SKU: ${item.sku}`);
          console.log(`      DB Stock: ${item.dbStock} | CIN7 Stock: ${item.cin7Stock} | Diff: ${item.stockDiff > 0 ? '+' : ''}${item.stockDiff}`);
          console.log(`      DB Price: $${item.dbPrice} | CIN7 Price: $${item.cin7Price} | Diff: ${item.priceDiff > 0 ? '+' : ''}$${item.priceDiff.toFixed(2)}`);
          console.log('');
        });
    }
    
    if (unmatched.length > 0) {
      console.log('\n⚠️  Unmatched Products (first 5):');
      unmatched.slice(0, 5).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (SKU: ${product.sku})`);
      });
    }
    
    // 5. Suggest fixes
    console.log('\n💡 Recommendations:');
    
    const majorStockDiscrepancies = discrepancies.filter(d => Math.abs(d.stockDiff) > 10);
    if (majorStockDiscrepancies.length > 0) {
      console.log(`   🔄 ${majorStockDiscrepancies.length} products have major stock differences (>10 units)`);
      console.log('   📋 Action: Update sync logic to use "Available" field from CIN7');
    }
    
    const priceDiscrepancies = discrepancies.filter(d => Math.abs(d.priceDiff) > 1);
    if (priceDiscrepancies.length > 0) {
      console.log(`   💰 ${priceDiscrepancies.length} products have price differences (>$1)`);
      console.log('   📋 Action: Update prices from "PriceTier1" field');
    }
    
    if (unmatched.length > 0) {
      console.log(`   🔗 ${unmatched.length} products could not be matched to CIN7 data`);
      console.log('   📋 Action: Review SKU mapping or remove obsolete products');
    }
    
    // 6. Show correct data examples
    console.log('\n📝 Example of Correct CIN7 Data:');
    const examples = cin7Data.slice(0, 3);
    examples.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.ProductName}`);
      console.log(`      SKU: ${item.SKU}`);
      console.log(`      Available: ${item.Available} units`);
      console.log(`      OnHand: ${item.OnHand} units`);
      console.log(`      Price: $${item.PriceTier1}`);
      console.log(`      Category: ${item.Category}`);
      console.log('');
    });
    
    return {
      totalCin7Items: cin7Data.length,
      totalDbProducts: dbProducts.length,
      matched: matched.length,
      discrepancies: discrepancies.length,
      unmatched: unmatched.length,
      majorStockIssues: majorStockDiscrepancies.length,
      priceIssues: priceDiscrepancies.length
    };
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
    return null;
  }
}

async function main() {
  console.log('🚀 CIN7 Data Discrepancy Analysis\n');
  
  const results = await analyzeCin7Discrepancy();
  
  if (results) {
    console.log('\n📋 Summary:');
    console.log(`   📊 CIN7 has ${results.totalCin7Items} items`);
    console.log(`   💾 Database has ${results.totalDbProducts} products`);
    console.log(`   ✅ ${results.matched} products matched`);
    console.log(`   ❌ ${results.discrepancies} discrepancies found`);
    console.log(`   🚨 ${results.majorStockIssues} major stock issues`);
    console.log(`   💰 ${results.priceIssues} price issues`);
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Fix sync mapping to use CIN7 "Available" field');
    console.log('2. Update product matching logic (SKU-based)');
    console.log('3. Sync current inventory levels from CIN7');
    console.log('4. Set up real-time webhook updates');
  }
}

main().catch(console.error);