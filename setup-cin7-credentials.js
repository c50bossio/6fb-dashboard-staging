#!/usr/bin/env node

/**
 * Setup script for Cin7 credentials
 * This saves credentials to the database for sync to work
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://dfhqjdoydihajmjxniee.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
);

// Simple encryption functions (matching the API)
const algorithm = 'aes-256-gcm';
const salt = process.env.ENCRYPTION_SALT || 'UNCONFIGURED-SALT-REPLACE-IN-PRODUCTION';

function encrypt(text) {
  const key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY || 'development-only-key-not-for-production', 
    salt, 
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

async function testCin7Connection(accountId, apiKey) {

  try {
    // Test the correct endpoint we identified
    const response = await fetch('https://inventory.dearsystems.com/externalapi/products?limit=1', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `${response.status}: ${errorText}`
      };
    }

    const data = await response.json();
    const products = data?.ProductList || data?.Products || [];
    const totalProducts = data?.Total || products.length;
    
    return { 
      success: true, 
      productCount: totalProducts,
      message: `Found ${totalProducts} products in account`
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function setupCredentials() {
  
  );
  
  // You need to provide your actual credentials here
  const ACCOUNT_ID = 'YOUR_ACCOUNT_ID_HERE'; // Replace with your Cin7 Account ID
  const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your Cin7 API Key
  const ACCOUNT_NAME = 'Tomb45 income review'; // Your account name

  if (ACCOUNT_ID === 'YOUR_ACCOUNT_ID_HERE' || API_KEY === 'YOUR_API_KEY_HERE') {

    ');

    return;
  }

  const testResult = await testCin7Connection(ACCOUNT_ID, API_KEY);
  
  if (!testResult.success) {
    console.error('❌ Connection test failed:', testResult.error);
    console.error('');
    console.error('💡 Common issues:');
    console.error('   - Wrong Account ID or API Key');
    console.error('   - API access not enabled in Cin7 settings');
    console.error('   - Using Cin7 Omni instead of Cin7 Core');
    return;
  }

  const barbershopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'; // Tomb45 Channelside
  
  try {
    // Encrypt credentials
    const encryptedApiKey = encrypt(API_KEY);
    const encryptedAccountId = encrypt(ACCOUNT_ID);
    
    // Save to database
    const { data, error } = await supabase
      .from('cin7_credentials')
      .upsert({
        barbershop_id: barbershopId,
        encrypted_api_key: JSON.stringify(encryptedApiKey),
        encrypted_account_id: JSON.stringify(encryptedAccountId),
        account_name: ACCOUNT_NAME,
        api_version: 'v1',
        is_active: true,
        last_tested: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'barbershop_id'
      })
      .select();
    
    if (error) {
      console.error('❌ Database save failed:', error.message);
      return;
    }

    // Test the sync endpoint
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
    
    const syncResult = await syncResponse.json();
    
    if (syncResult.success) {

    } else {
      console.error('❌ Sync failed:', syncResult.error);
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Run the setup
setupCredentials();