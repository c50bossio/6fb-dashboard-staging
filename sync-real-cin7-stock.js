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

async function updateExistingProductsWithRealStock() {
  try {
    console.log('🔄 Updating Existing Products with Real CIN7 Stock Levels\n');
    
    // 1. Load CSV data
    console.log('📂 Loading CIN7 availability report...');
    const csvContent = readFileSync('/Users/bossio/Downloads/AvailabilityReport_2025-08-15.csv', 'utf8');
    const csvData = parseCSV(csvContent);
    console.log(`✅ Loaded ${csvData.length} items from CIN7 report`);
    
    // 2. Get current database products
    console.log('\n📊 Loading current database products...');
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('id, name, sku, current_stock, retail_price');

    if (error) {
      throw new Error(`Failed to load products: ${error.message}`);
    }
    
    console.log(`✅ Found ${dbProducts.length} products in database`);
    
    // 3. Match and update products
    console.log('\n🔍 Matching products with CIN7 data...');
    
    let updatedCount = 0;
    let matchedCount = 0;
    let skippedCount = 0;
    
    const updateResults = [];
    
    for (const dbProduct of dbProducts) {
      // Find matching CIN7 item by name (since that's what we have)
      const cin7Item = csvData.find(item => 
        item.ProductName && 
        (item.ProductName === dbProduct.name ||
         item.ProductName.includes(dbProduct.name.substring(0, 30)) ||
         dbProduct.name.includes(item.ProductName.substring(0, 30)))
      );
      
      if (cin7Item) {
        matchedCount++;
        
        const cin7Stock = parseInt(parseFloat(cin7Item.Available || 0));
        const cin7Price = parseFloat(cin7Item.PriceTier1 || 0);
        const currentStock = parseInt(dbProduct.current_stock || 0);
        const currentPrice = parseFloat(dbProduct.retail_price || 0);
        
        // Only update if there's a significant difference
        const stockDiff = Math.abs(cin7Stock - currentStock);
        const priceDiff = Math.abs(cin7Price - currentPrice);
        
        if (stockDiff > 0 || priceDiff > 0.01) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              current_stock: cin7Stock,
              retail_price: cin7Price > 0 ? cin7Price : currentPrice, // Keep existing price if CIN7 has 0
              updated_at: new Date().toISOString()
            })
            .eq('id', dbProduct.id);
          
          if (updateError) {
            console.error(`❌ Failed to update ${dbProduct.name}:`, updateError.message);
          } else {
            updatedCount++;
            updateResults.push({
              name: dbProduct.name,
              sku: cin7Item.SKU,
              oldStock: currentStock,
              newStock: cin7Stock,
              stockChange: cin7Stock - currentStock,
              oldPrice: currentPrice,
              newPrice: cin7Price
            });
            
            console.log(`✅ ${dbProduct.name.substring(0, 40)}...`);
            console.log(`   Stock: ${currentStock} → ${cin7Stock} (${cin7Stock - currentStock > 0 ? '+' : ''}${cin7Stock - currentStock})`);
            if (priceDiff > 0.01) {
              console.log(`   Price: $${currentPrice} → $${cin7Price}`);
            }
          }
        } else {
          skippedCount++;
        }
      }
    }
    
    // 4. Show top changes
    console.log('\n📊 Update Summary:');
    console.log(`   🔍 Products matched: ${matchedCount}/${dbProducts.length}`);
    console.log(`   ✅ Products updated: ${updatedCount}`);
    console.log(`   ⏭️  Products skipped (no changes): ${skippedCount}`);
    console.log(`   ❌ Products not matched: ${dbProducts.length - matchedCount}`);
    
    if (updateResults.length > 0) {
      console.log('\n📈 Biggest Stock Changes:');
      updateResults
        .sort((a, b) => Math.abs(b.stockChange) - Math.abs(a.stockChange))
        .slice(0, 5)
        .forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.name.substring(0, 40)}...`);
          console.log(`      Stock: ${result.oldStock} → ${result.newStock} (${result.stockChange > 0 ? '+' : ''}${result.stockChange})`);
          console.log(`      SKU: ${result.sku}`);
        });
    }
    
    // 5. Calculate new metrics
    console.log('\n📊 Calculating updated inventory metrics...');
    const { data: updatedProducts } = await supabase
      .from('products')
      .select('current_stock, retail_price, min_stock_level');

    if (updatedProducts) {
      const metrics = {
        totalProducts: updatedProducts.length,
        totalValue: updatedProducts.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0),
        lowStock: updatedProducts.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length,
        outOfStock: updatedProducts.filter(p => p.current_stock === 0).length,
        avgStock: Math.round(updatedProducts.reduce((sum, p) => sum + p.current_stock, 0) / updatedProducts.length),
        stockRange: {
          min: Math.min(...updatedProducts.map(p => p.current_stock)),
          max: Math.max(...updatedProducts.map(p => p.current_stock))
        }
      };
      
      console.log('\n📈 Updated Inventory Metrics:');
      console.log(`   📦 Total Products: ${metrics.totalProducts}`);
      console.log(`   💰 Inventory Value: $${metrics.totalValue.toLocaleString()}`);
      console.log(`   📊 Average Stock: ${metrics.avgStock} units`);
      console.log(`   📉 Stock Range: ${metrics.stockRange.min} - ${metrics.stockRange.max} units`);
      console.log(`   ⚠️  Low Stock Items: ${metrics.lowStock}`);
      console.log(`   ❌ Out of Stock: ${metrics.outOfStock}`);
      
      // Show improvement
      if (metrics.outOfStock === 0) {
        console.log('\n🎉 Excellent! No out-of-stock items after sync!');
      } else if (metrics.outOfStock < 10) {
        console.log('\n✅ Good! Minimal out-of-stock items after sync.');
      }
    }
    
    console.log('\n🎉 Real CIN7 stock levels applied to existing products!');
    console.log('\n🔗 Next Steps:');
    console.log('1. Refresh your products page to see real inventory levels');
    console.log('2. Test the CIN7 credentials saving functionality');
    console.log('3. Set up live API sync for ongoing updates');
    console.log('4. Configure automatic periodic sync');
    
    return {
      success: true,
      matched: matchedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: dbProducts.length
    };
    
  } catch (error) {
    console.error('💥 Update failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 CIN7 Real Stock Level Sync\n');
  console.log('This will:');
  console.log('• Match existing products with CIN7 data');
  console.log('• Update stock levels from CSV baseline');  
  console.log('• Update prices where available');
  console.log('• Show real inventory metrics\n');
  
  const results = await updateExistingProductsWithRealStock();
  
  if (results.success) {
    console.log(`\n✅ Sync completed: ${results.updated}/${results.total} products updated`);
    console.log(`📊 Match rate: ${Math.round(results.matched/results.total*100)}%`);
  } else {
    console.log('\n❌ Sync failed:', results.error);
  }
}

main().catch(console.error);