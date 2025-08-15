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

function mapCategoryForBarbershop(cin7Category) {
  const category = (cin7Category || '').toLowerCase();
  
  if (category.includes('clipper') || category.includes('trimmer') || category.includes('dryer')) {
    return 'tools';
  } else if (category.includes('wireless') || category.includes('charging') || category.includes('powerclip')) {
    return 'accessories';
  } else if (category.includes('beard') || category.includes('color') || category.includes('enhancement')) {
    return 'beard_care';
  } else if (category.includes('hair') || category.includes('shampoo') || category.includes('conditioner')) {
    return 'hair_care';
  } else {
    return 'accessories'; // Default for most Tomb45 products
  }
}

async function syncToCSVBaseline() {
  try {
    console.log('🔄 Syncing Database to CIN7 CSV Baseline\n');
    
    // 1. Load CSV data
    console.log('📂 Loading CIN7 availability report...');
    const csvContent = readFileSync('/Users/bossio/Downloads/AvailabilityReport_2025-08-15.csv', 'utf8');
    const csvData = parseCSV(csvContent);
    console.log(`✅ Loaded ${csvData.length} items from CIN7 report`);
    
    // 2. Filter active products with inventory
    const activeProducts = csvData.filter(item => 
      item.Status === 'ACTIVE' && 
      item.ProductName && 
      item.SKU &&
      parseFloat(item.Available || 0) >= 0 // Include 0 stock items
    );
    
    console.log(`📊 Found ${activeProducts.length} active products to sync`);
    
    // 3. Get current barbershop ID (using the main demo shop)
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000') // Elite Cuts demo shop
      .single();
    
    if (shopError || !barbershop) {
      throw new Error('Demo barbershop not found');
    }
    
    console.log(`🏪 Using barbershop: ${barbershop.id}`);
    
    // 4. Clear existing products for clean sync
    console.log('\n🧹 Clearing existing products for clean sync...');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('barbershop_id', barbershop.id);
    
    if (deleteError) {
      console.warn('⚠️ Warning clearing products:', deleteError.message);
    } else {
      console.log('✅ Existing products cleared');
    }
    
    // 5. Transform CSV data to database format
    console.log('\n🔄 Transforming CIN7 data to database format...');
    
    const transformedProducts = activeProducts.map(item => ({
      barbershop_id: barbershop.id,
      name: item.ProductName,
      description: `CIN7 Product: ${item.ProductName}${item.Family ? ` (${item.Family})` : ''}`,
      category: mapCategoryForBarbershop(item.Category),
      brand: item.Brand || 'Tomb45',
      sku: item.SKU,
      
      // Pricing from CSV
      cost_price: parseFloat(item.StockValue || 0) / Math.max(parseFloat(item.OnHand || 1), 1), // Calculate cost from stock value
      retail_price: parseFloat(item.PriceTier1 || 0),
      
      // Stock levels from CSV - THIS IS THE KEY FIX
      current_stock: parseInt(parseFloat(item.Available || 0)), // Use Available field
      min_stock_level: Math.max(parseInt(parseFloat(item.Available || 0) * 0.2), 5), // 20% of current stock, min 5
      max_stock_level: parseInt(parseFloat(item.Available || 0) * 2) + 50, // Double current stock + buffer
      
      // Enhanced fields
      supplier: 'CIN7 Integrated',
      unit_of_measure: item.Unit || 'EA',
      location: item.Location || '',
      
      // Status
      is_active: item.Status === 'ACTIVE',
      track_inventory: true,
      
      // CIN7 integration fields
      cin7_sku: item.SKU,
      cin7_last_sync: new Date().toISOString(),
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    console.log(`📦 Prepared ${transformedProducts.length} products for database`);
    
    // 6. Insert products in batches
    console.log('\n💾 Inserting products into database...');
    
    const batchSize = 50;
    let insertedCount = 0;
    let errors = 0;
    
    for (let i = 0; i < transformedProducts.length; i += batchSize) {
      const batch = transformedProducts.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('products')
        .insert(batch)
        .select('id, name, current_stock');
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        errors++;
      } else {
        insertedCount += data.length;
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} products inserted`);
      }
    }
    
    // 7. Verify results
    console.log('\n📊 Sync Results:');
    console.log(`   ✅ Products inserted: ${insertedCount}`);
    console.log(`   ❌ Batch errors: ${errors}`);
    
    // 8. Calculate new metrics
    const { data: products, error: metricsError } = await supabase
      .from('products')
      .select('current_stock, retail_price, min_stock_level')
      .eq('barbershop_id', barbershop.id);
    
    if (!metricsError && products) {
      const metrics = {
        totalProducts: products.length,
        totalValue: products.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0),
        lowStock: products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length,
        outOfStock: products.filter(p => p.current_stock === 0).length,
        avgStock: Math.round(products.reduce((sum, p) => sum + p.current_stock, 0) / products.length),
        stockRange: {
          min: Math.min(...products.map(p => p.current_stock)),
          max: Math.max(...products.map(p => p.current_stock))
        }
      };
      
      console.log('\n📈 New Inventory Metrics:');
      console.log(`   📦 Total Products: ${metrics.totalProducts}`);
      console.log(`   💰 Inventory Value: $${metrics.totalValue.toLocaleString()}`);
      console.log(`   📊 Average Stock: ${metrics.avgStock} units`);
      console.log(`   📉 Stock Range: ${metrics.stockRange.min} - ${metrics.stockRange.max} units`);
      console.log(`   ⚠️  Low Stock Items: ${metrics.lowStock}`);
      console.log(`   ❌ Out of Stock: ${metrics.outOfStock}`);
    }
    
    // 9. Show sample of high-stock items
    if (products) {
      const highStockItems = products
        .filter(p => p.current_stock > 100)
        .sort((a, b) => b.current_stock - a.current_stock)
        .slice(0, 5);
      
      if (highStockItems.length > 0) {
        console.log('\n📊 Top High-Stock Items (from CIN7):');
        const { data: highStockProducts } = await supabase
          .from('products')
          .select('name, sku, current_stock')
          .eq('barbershop_id', barbershop.id)
          .order('current_stock', { ascending: false })
          .limit(5);
        
        highStockProducts?.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name.substring(0, 50)}... (${product.current_stock} units)`);
        });
      }
    }
    
    console.log('\n🎉 Database successfully synced to CIN7 CSV baseline!');
    console.log('\n🔗 Next Steps:');
    console.log('1. Refresh your products page to see real CIN7 inventory levels');
    console.log('2. Set up live API sync for real-time updates');
    console.log('3. Configure webhooks for automatic inventory updates');
    console.log('4. Test the "Refresh Inventory" button with live API data');
    
    return {
      success: true,
      productsInserted: insertedCount,
      errors: errors,
      totalCin7Items: csvData.length,
      activeProducts: activeProducts.length
    };
    
  } catch (error) {
    console.error('💥 Sync failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 CIN7 CSV Baseline Sync\n');
  console.log('This will:');
  console.log('• Load your CIN7 availability report');
  console.log('• Clear existing demo inventory'); 
  console.log('• Sync real CIN7 stock levels to database');
  console.log('• Show accurate inventory metrics\n');
  
  const results = await syncToCSVBaseline();
  
  if (results.success) {
    console.log(`\n✅ Sync completed: ${results.productsInserted} products from ${results.totalCin7Items} CIN7 items`);
  } else {
    console.log('\n❌ Sync failed:', results.error);
  }
}

main().catch(console.error);