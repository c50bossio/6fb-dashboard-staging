#!/usr/bin/env node

/**
 * Test Saved Cin7 Credentials
 * This checks if the credentials saved in the database can connect to Cin7
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
);

// Decrypt function (matches the API)
function decrypt(encryptedObj) {
  const algorithm = 'aes-256-gcm';
  const salt = process.env.ENCRYPTION_SALT || 'UNCONFIGURED-SALT-REPLACE-IN-PRODUCTION';
  const key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY || 'development-only-key-not-for-production',
    salt,
    32
  );

  const { encrypted, iv, authTag } = encryptedObj;
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

async function testDirectCin7Connection(accountId, apiKey) {
  console.log('🧪 Testing direct Cin7 API connection...');
  
  try {
    // Test the products endpoint
    const response = await fetch('https://inventory.dearsystems.com/externalapi/products?limit=1', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return {
        success: false,
        error: `${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    console.log('✅ Response structure keys:', Object.keys(data));
    
    const products = data?.ProductList || data?.Products || [];
    const totalProducts = data?.Total || products.length;
    
    console.log('📦 Products in response:', products.length);
    console.log('🔢 Total products reported:', totalProducts);
    
    if (products.length > 0) {
      console.log('📋 First product sample:', {
        name: products[0].Name,
        sku: products[0].SKU,
        price: products[0].SalePrice
      });
    }

    return {
      success: true,
      productCount: totalProducts,
      sampleProducts: products.slice(0, 3),
      message: `Successfully connected! Found ${totalProducts} total products.`
    };
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testSavedCredentials() {
  console.log('🔍 TESTING SAVED CIN7 CREDENTIALS');
  console.log('=' + '='.repeat(50));
  
  const barbershopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b';
  
  try {
    // Get saved credentials
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
    console.log('   Last Tested:', credentials.last_tested);
    console.log('   Created:', credentials.created_at);
    
    // Try to decrypt credentials
    console.log('\n🔓 Step 2: Decrypting credentials...');
    
    let accountId, apiKey;
    try {
      const encryptedAccountId = JSON.parse(credentials.encrypted_account_id);
      const encryptedApiKey = JSON.parse(credentials.encrypted_api_key);
      
      console.log('✅ Encrypted data parsed successfully');
      
      accountId = decrypt(encryptedAccountId);
      apiKey = decrypt(encryptedApiKey);
      
      console.log('✅ Credentials decrypted successfully');
      console.log('   Account ID length:', accountId.length);
      console.log('   API Key length:', apiKey.length);
      console.log('   Account ID preview:', accountId.substring(0, 8) + '...');
      
    } catch (decryptError) {
      console.error('❌ Decryption failed:', decryptError.message);
      console.error('   This might be due to wrong encryption keys in environment');
      return;
    }
    
    // Test direct connection
    console.log('\n🌐 Step 3: Testing direct API connection...');
    const testResult = await testDirectCin7Connection(accountId, apiKey);
    
    if (testResult.success) {
      console.log('🎉 SUCCESS! Credentials work perfectly!');
      console.log('   Total products available:', testResult.productCount);
      
      if (testResult.productCount >= 200) {
        console.log('✅ This confirms 200+ products should sync!');
      }
      
      if (testResult.sampleProducts && testResult.sampleProducts.length > 0) {
        console.log('\n📦 Sample products from API:');
        testResult.sampleProducts.forEach(p => {
          console.log(`   - ${p.Name} (SKU: ${p.SKU}) - $${p.SalePrice}`);
        });
      }
      
      // Update the credentials to active since they work
      console.log('\n💾 Step 4: Marking credentials as active...');
      await supabase
        .from('cin7_credentials')
        .update({
          is_active: true,
          last_tested: new Date().toISOString()
        })
        .eq('barbershop_id', barbershopId);
        
      console.log('✅ Credentials marked as active in database');
      
    } else {
      console.log('❌ Connection failed:', testResult.error);
      
      if (testResult.error.includes('403') || testResult.error.includes('Forbidden')) {
        console.log('\n🔍 Troubleshooting 403 Forbidden:');
        console.log('   1. Check if API key has proper permissions');
        console.log('   2. Verify Account ID is correct');
        console.log('   3. Make sure API access is enabled in Cin7 settings');
        console.log('   4. Try logging into Cin7 web interface to confirm account');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSavedCredentials();