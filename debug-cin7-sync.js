#!/usr/bin/env node

/**
 * Debug Cin7 Sync - Live API Response Analysis
 * This will show exactly what's happening when sync is called with real credentials
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
);

async function debugSyncWithRealCredentials() {
  console.log('🔍 DEBUGGING CIN7 SYNC WITH REAL CREDENTIALS');
  console.log('=' + '='.repeat(60));
  
  try {
    const barbershopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b';
    
    // Get the saved credentials  
    console.log('📋 Step 1: Fetching saved credentials...');
    const { data: credentials, error: credError } = await supabase
      .from('cin7_credentials')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (credError || !credentials) {
      console.error('❌ No credentials found:', credError?.message);
      return;
    }
    
    console.log('✅ Found credentials:');
    console.log('   Account Name:', credentials.account_name);
    console.log('   Is Active:', credentials.is_active);
    console.log('   Created:', credentials.created_at);
    
    // Decrypt credentials (simplified - normally we'd use the decrypt function)
    let accountId, apiKey;
    try {
      const encryptedAccountId = JSON.parse(credentials.encrypted_account_id);
      const encryptedApiKey = JSON.parse(credentials.encrypted_api_key);
      
      // For debugging, let's check if they're in the expected format
      console.log('✅ Encrypted data structure looks valid');
      console.log('   Account ID structure:', typeof encryptedAccountId, Object.keys(encryptedAccountId));
      console.log('   API Key structure:', typeof encryptedApiKey, Object.keys(encryptedApiKey));
      
      // We can't actually decrypt without the proper keys, but let's test the API call via the sync endpoint
      
    } catch (decryptError) {
      console.error('❌ Error with encrypted data:', decryptError.message);
      return;
    }
    
    console.log('\\n🔄 Step 2: Calling sync endpoint...');
    
    // Call the sync endpoint and capture detailed response
    const syncResponse = await fetch('http://localhost:9999/api/cin7/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-bypass': 'true'
      },
      body: JSON.stringify({
        barbershop_id: barbershopId
      })
    });
    
    const responseText = await syncResponse.text();
    console.log('📊 Raw sync response status:', syncResponse.status);
    console.log('📊 Raw sync response headers:', Object.fromEntries(syncResponse.headers));
    
    let syncResult;
    try {
      syncResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse sync response:', responseText);
      return;
    }
    
    console.log('\\n🎯 Step 3: Analyzing sync results...');
    
    if (syncResult.error) {
      console.log('❌ Sync error:', syncResult.error);
      
      // Check what type of error
      if (syncResult.error.includes('credentials')) {
        console.log('   → This is a credentials issue');
      } else if (syncResult.error.includes('403') || syncResult.error.includes('401')) {
        console.log('   → This is an authentication issue with Cin7 API');
      } else if (syncResult.error.includes('404')) {
        console.log('   → This might be an endpoint URL issue');  
      } else {
        console.log('   → Unexpected error type');
      }
    } else if (syncResult.success) {
      console.log('✅ Sync successful!');
      console.log('   Products synced:', syncResult.count);
      console.log('   Total fetched:', syncResult.totalFetched || 'Not reported');
      
      if (syncResult.count === 1) {
        console.log('\\n🚨 ISSUE IDENTIFIED: Only 1 product synced');
        console.log('   Expected: 200+ products from \"Tomb45 income review\" account');
        console.log('   Possible causes:');
        console.log('   1. API pagination not working correctly');
        console.log('   2. API response structure different than expected');
        console.log('   3. API endpoint returning limited results');
        console.log('   4. Credentials might be for different account');
      } else if (syncResult.count < 50) {
        console.log('⚠️  Low product count - might be pagination issue');
      } else if (syncResult.count >= 200) {
        console.log('🎉 SUCCESS! Got expected product count');
      }
      
      if (syncResult.sampleProducts) {
        console.log('\\n📦 Sample products synced:');
        syncResult.sampleProducts.forEach(p => {
          console.log('   -', p.name, '(SKU:', p.sku + ')');
        });
      }
    } else {
      console.log('❌ Unexpected sync result:', syncResult);
    }
    
    console.log('\\n🔧 Step 4: Checking products in database...');
    
    // Check how many products are actually in the database
    const { data: dbProducts, count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('barbershop_id', barbershopId);
    
    console.log('📊 Products in database:', productCount || 0);
    
    if ((productCount || 0) > 0) {
      // Get a sample of products
      const { data: sampleProducts } = await supabase
        .from('products')
        .select('name, sku, retail_price, current_stock')
        .eq('barbershop_id', barbershopId)
        .limit(5);
      
      console.log('\\n📋 Sample database products:');
      sampleProducts?.forEach(p => {
        console.log('   -', p.name, '(SKU:', p.sku + ') - $' + p.retail_price, '- Stock:', p.current_stock);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugSyncWithRealCredentials();