#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function fixProductStockLevels() {
  try {
    console.log('🔧 Fixing product stock levels...\n');
    
    // Get all products with 0 stock
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, category, retail_price, current_stock')
      .eq('current_stock', 0);

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }

    if (!products || products.length === 0) {
      console.log('✅ No products with 0 stock found!');
      return;
    }

    console.log(`📦 Found ${products.length} products with 0 stock`);
    console.log('🔄 Setting realistic stock levels...\n');

    // Define realistic stock levels by category
    const getStockByCategory = (category, price) => {
      const baseStock = Math.floor(Math.random() * 20) + 5; // 5-25 base stock
      
      switch(category) {
        case 'hair_care':
          return price > 50 ? baseStock : baseStock + 10; // 5-35 for hair care
        case 'beard_care': 
          return baseStock + 5; // 10-30 for beard care
        case 'tools':
          return price > 100 ? Math.min(baseStock, 10) : baseStock; // Lower stock for expensive tools
        case 'accessories':
          return baseStock + 15; // 20-40 for accessories
        default:
          return baseStock;
      }
    };

    let updatedCount = 0;
    
    for (const product of products) {
      const newStock = getStockByCategory(product.category, product.retail_price);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Failed to update ${product.name}:`, updateError.message);
      } else {
        console.log(`✅ ${product.name}: 0 → ${newStock} units`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount}/${products.length} products`);
    
    // Show updated metrics
    const { data: updatedProducts } = await supabase
      .from('products')
      .select('current_stock, retail_price, min_stock_level');

    if (updatedProducts) {
      const metrics = {
        totalProducts: updatedProducts.length,
        totalValue: updatedProducts.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0),
        lowStock: updatedProducts.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length,
        outOfStock: updatedProducts.filter(p => p.current_stock === 0).length
      };

      console.log('\n📊 Updated Inventory Metrics:');
      console.log(`   📦 Total Products: ${metrics.totalProducts}`);
      console.log(`   💰 Inventory Value: $${metrics.totalValue.toLocaleString()}`);
      console.log(`   ⚠️  Low Stock Items: ${metrics.lowStock}`);
      console.log(`   ❌ Out of Stock: ${metrics.outOfStock}`);
    }

  } catch (error) {
    console.error('💥 Error fixing stock levels:', error);
  }
}

async function main() {
  console.log('🚀 Product Stock Level Fixer\n');
  console.log('This script will set realistic stock levels for products that currently have 0 stock.\n');
  
  await fixProductStockLevels();
  
  console.log('\n🔗 Next steps:');
  console.log('1. Refresh your products page: http://localhost:9999/shop/products');
  console.log('2. You should see products with realistic stock levels');
  console.log('3. Set up your CIN7 credentials to sync real inventory data');
}

main().catch(console.error);