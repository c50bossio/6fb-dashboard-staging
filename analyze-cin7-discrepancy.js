// @ts-nocheck
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

    // 1. Load and parse CIN7 CSV data
    
    const csvContent = readFileSync('/Users/bossio/Downloads/AvailabilityReport_2025-08-15.csv', 'utf8');
    const cin7Data = parseCSV(csvContent);

    // 2. Get current database products
    
    const { data: dbProducts, error } = await supabase
      .from('products')
      .select('id, name, sku, current_stock, retail_price, cin7_product_id, cin7_sku');
    
    if (error) {
      console.error('❌ Error loading database products:', error.message);
      return;
    }

    // 3. Analyze key discrepancies

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

    if (discrepancies.length > 0) {
      
      discrepancies
        .sort((a, b) => Math.abs(b.stockDiff) - Math.abs(a.stockDiff))
        .slice(0, 10)
        .forEach((item, index) => {
          }...`);

          }`);
          
        });
    }
    
    if (unmatched.length > 0) {
      :');
      unmatched.slice(0, 5).forEach((product, index) => {
        `);
      });
    }
    
    // 5. Suggest fixes

    const majorStockDiscrepancies = discrepancies.filter(d => Math.abs(d.stockDiff) > 10);
    if (majorStockDiscrepancies.length > 0) {
      `);
      
    }
    
    const priceDiscrepancies = discrepancies.filter(d => Math.abs(d.priceDiff) > 1);
    if (priceDiscrepancies.length > 0) {
      `);
      
    }
    
    if (unmatched.length > 0) {

    }
    
    // 6. Show correct data examples
    
    const examples = cin7Data.slice(0, 3);
    examples.forEach((item, index) => {

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

  const results = await analyzeCin7Discrepancy();
  
  if (results) {

    ');

  }
}

main().catch(console.error);