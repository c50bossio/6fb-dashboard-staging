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

    // 1. Load CSV data
    
    const csvContent = readFileSync('/Users/bossio/Downloads/AvailabilityReport_2025-08-15.csv', 'utf8');
    const csvData = parseCSV(csvContent);

    // 2. Get current database products
    
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('id, name, sku, current_stock, retail_price');

    if (error) {
      throw new Error(`Failed to load products: ${error.message}`);
    }

    // 3. Match and update products

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
            
            }...`);
            `);
            if (priceDiff > 0.01) {
              
            }
          }
        } else {
          skippedCount++;
        }
      }
    }
    
    // 4. Show top changes

    : ${skippedCount}`);

    if (updateResults.length > 0) {
      
      updateResults
        .sort((a, b) => Math.abs(b.stockChange) - Math.abs(a.stockChange))
        .slice(0, 5)
        .forEach((result, index) => {
          }...`);
          `);
          
        });
    }
    
    // 5. Calculate new metrics
    
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

      }`);

      // Show improvement
      if (metrics.outOfStock === 0) {
        
      } else if (metrics.outOfStock < 10) {
        
      }
    }

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

  const results = await updateExistingProductsWithRealStock();
  
  if (results.success) {
    
    }%`);
  } else {
    
  }
}

main().catch(console.error);