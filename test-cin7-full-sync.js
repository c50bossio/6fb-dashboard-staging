#!/usr/bin/env node

/**
 * Test script to verify Cin7 sync pulls all 200+ products
 * Run this after the fix to confirm it's working
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
);

async function testFullSync() {
  console.log('🧪 TESTING CIN7 FULL SYNC - EXPECTING 200+ PRODUCTS');
  console.log('=' * 60);
  
  try {
    // Step 1: Get user's barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id, shop_id')
      .eq('email', 'c50bossio@gmail.com')
      .single();
    
    const barbershopId = profile?.barbershop_id || profile?.shop_id;
    
    if (!barbershopId) {
      console.error('❌ No barbershop found for user');
      return;
    }
    
    console.log('✅ Found barbershop:', barbershopId);
    
    // Step 2: Check Cin7 credentials
    const { data: credentials } = await supabase
      .from('cin7_credentials')
      .select('account_name, is_active, last_sync')
      .eq('barbershop_id', barbershopId)
      .single();
    
    if (credentials) {
      console.log('✅ Cin7 credentials found:');
      console.log('   Account:', credentials.account_name);
      console.log('   Active:', credentials.is_active);
      console.log('   Last Sync:', credentials.last_sync || 'Never');
    } else {
      console.error('❌ No Cin7 credentials found');
      return;
    }
    
    // Step 3: Check current product count BEFORE sync
    const { data: beforeProducts, count: beforeCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', barbershopId);
    
    console.log(`\n📦 Products BEFORE sync: ${beforeCount || 0}`);
    
    // Step 4: Trigger sync via API
    console.log('\n🔄 Triggering Cin7 sync...');
    console.log('   This should fetch ALL products from your Cin7 account');
    console.log('   Expected: 200+ products from "Tomb45 income review"\n');
    
    const response = await fetch('http://localhost:9999/api/cin7/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-bypass': 'true' // For local testing
      },
      body: JSON.stringify({
        barbershop_id: barbershopId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ SYNC SUCCESSFUL!');
      console.log(`   Products synced: ${result.count}`);
      console.log(`   Total fetched from Cin7: ${result.totalFetched || result.count}`);
      console.log(`   Low stock items: ${result.lowStockCount || 0}`);
      console.log(`   Out of stock items: ${result.outOfStockCount || 0}`);
      
      // Step 5: Verify product count AFTER sync
      const { data: afterProducts, count: afterCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId);
      
      console.log(`\n📦 Products AFTER sync: ${afterCount || 0}`);
      console.log(`📈 Products added: ${(afterCount || 0) - (beforeCount || 0)}`);
      
      // Step 6: Show sample of products
      const { data: sampleProducts } = await supabase
        .from('products')
        .select('name, sku, retail_price, current_stock')
        .eq('barbershop_id', barbershopId)
        .limit(5);
      
      if (sampleProducts && sampleProducts.length > 0) {
        console.log('\n📋 Sample products:');
        sampleProducts.forEach(p => {
          console.log(`   - ${p.name} (SKU: ${p.sku || 'N/A'}) - $${p.retail_price} - Stock: ${p.current_stock}`);
        });
      }
      
      // Step 7: Final verdict
      console.log('\n🎯 SYNC VERIFICATION:');
      if (afterCount >= 200) {
        console.log('   ✅✅✅ SUCCESS! All 200+ products synced!');
      } else if (afterCount > 100) {
        console.log('   ✅ Good progress! Many products synced, but might need another page');
      } else if (afterCount > beforeCount) {
        console.log('   ⚠️  Some products synced, but less than expected');
      } else {
        console.log('   ❌ No new products synced - check the logs');
      }
      
    } else {
      console.error('❌ Sync failed:', result.error || result.message);
      console.error('   Debug info:', result.debug);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Make sure the development server is running on port 9999');
  }
}

// Run the test
testFullSync();