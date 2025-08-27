#!/usr/bin/env node

/**
 * CIN7 Sync Initialization Script
 * 
 * This script helps you set up and test your CIN7 integration
 * Run: node scripts/init-cin7-sync.js
 */

const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables!');

    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get CIN7 credentials

    const accountId = await question('CIN7 Account ID: ');
    const apiKey = await question('CIN7 API Key: ');
    
    if (!accountId || !apiKey) {
      console.error('\n❌ Both Account ID and API Key are required!');
      process.exit(1);
    }

    // Test the credentials

    const testResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId.trim(),
        'api-auth-applicationkey': apiKey.trim(),
        'Content-Type': 'application/json'
      }
    });

    if (!testResponse.ok) {
      console.error('\n❌ Failed to connect to CIN7!');

      process.exit(1);
    }

    const companyInfo = await testResponse.json();

    // Ask which barbershop to connect

    const { data: barbershops, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .order('name');

    if (shopError || !barbershops?.length) {
      console.error('\n❌ No barbershops found in the database!');
      
      process.exit(1);
    }

    barbershops.forEach((shop, index) => {
      `);
    });

    const shopChoice = await question('\nEnter the number of the barbershop: ');
    const selectedShop = barbershops[parseInt(shopChoice) - 1];

    if (!selectedShop) {
      console.error('\n❌ Invalid selection!');
      process.exit(1);
    }

    // Encrypt credentials (simple base64 for this script - your app uses proper encryption)
    const encryptedApiKey = JSON.stringify({
      encrypted: Buffer.from(apiKey.trim()).toString('base64'),
      iv: 'script-generated'
    });
    const encryptedAccountId = JSON.stringify({
      encrypted: Buffer.from(accountId.trim()).toString('base64'),
      iv: 'script-generated'
    });

    // Save credentials
    const { error: credError } = await supabase
      .from('cin7_credentials')
      .upsert({
        barbershop_id: selectedShop.id,
        encrypted_api_key: encryptedApiKey,
        encrypted_account_id: encryptedAccountId,
        api_version: 'v2',
        account_name: companyInfo.Company || 'Connected Account',
        last_tested: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'barbershop_id' });

    if (credError) {
      console.error('\n❌ Failed to save credentials:', credError.message);
      process.exit(1);
    }

    // Ask if they want to sync now
    const syncNow = await question('\n🔄 Would you like to sync products now? (y/n): ');
    
    if (syncNow.toLowerCase() === 'y') {

      // Fetch products
      const productsResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/products?limit=10', {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId.trim(),
          'api-auth-applicationkey': apiKey.trim(),
          'Content-Type': 'application/json'
        }
      });

      if (productsResponse.ok) {
        const data = await productsResponse.json();
        const products = data.ProductList || [];

        if (products.length > 0) {
          
          products.slice(0, 5).forEach(product => {
            `);
          });
        }

      } else {

      }
    } else {

    }

  } catch (error) {
    console.error('\n❌ An error occurred:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main().catch(console.error);
