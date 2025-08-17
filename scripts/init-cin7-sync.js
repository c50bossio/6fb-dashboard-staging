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
  console.log('\n🚀 CIN7 Integration Setup\n');
  console.log('This script will help you connect your CIN7 account and sync your products.\n');

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables!');
    console.log('\nPlease ensure these are set in your .env.local file:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get CIN7 credentials
    console.log('📋 Enter your CIN7 API credentials:\n');
    console.log('You can find these in your CIN7 account:');
    console.log('1. Log into inventory.dearsystems.com');
    console.log('2. Go to Settings > Integrations & API > API v2');
    console.log('3. Note your Account ID and create an API key\n');

    const accountId = await question('CIN7 Account ID: ');
    const apiKey = await question('CIN7 API Key: ');
    
    if (!accountId || !apiKey) {
      console.error('\n❌ Both Account ID and API Key are required!');
      process.exit(1);
    }

    // Test the credentials
    console.log('\n🔄 Testing CIN7 connection...');
    
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
      console.log('Please check your credentials and try again.');
      console.log(`Error: ${testResponse.status} ${testResponse.statusText}`);
      process.exit(1);
    }

    const companyInfo = await testResponse.json();
    console.log(`\n✅ Successfully connected to CIN7!`);
    console.log(`Company: ${companyInfo.Company || 'Unknown'}`);

    // Ask which barbershop to connect
    console.log('\n🏪 Which barbershop should we connect to CIN7?');
    
    const { data: barbershops, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .order('name');

    if (shopError || !barbershops?.length) {
      console.error('\n❌ No barbershops found in the database!');
      console.log('Please create a barbershop first.');
      process.exit(1);
    }

    console.log('\nAvailable barbershops:');
    barbershops.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.name} (ID: ${shop.id})`);
    });

    const shopChoice = await question('\nEnter the number of the barbershop: ');
    const selectedShop = barbershops[parseInt(shopChoice) - 1];

    if (!selectedShop) {
      console.error('\n❌ Invalid selection!');
      process.exit(1);
    }

    console.log(`\n📝 Saving credentials for ${selectedShop.name}...`);

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

    console.log('✅ Credentials saved successfully!');

    // Ask if they want to sync now
    const syncNow = await question('\n🔄 Would you like to sync products now? (y/n): ');
    
    if (syncNow.toLowerCase() === 'y') {
      console.log('\n📦 Fetching products from CIN7...');
      
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
        
        console.log(`\nFound ${products.length} products in CIN7`);
        
        if (products.length > 0) {
          console.log('\nSample products:');
          products.slice(0, 5).forEach(product => {
            console.log(`- ${product.Name} (SKU: ${product.SKU || 'N/A'})`);
          });
        }
        
        console.log('\n✨ Setup complete!');
        console.log('\nNext steps:');
        console.log('1. Log into your app');
        console.log('2. Navigate to /shop/products or /dashboard/inventory');
        console.log('3. Click "Sync Now" to import all products');
        console.log('\nYour CIN7 integration is ready to use!');
      } else {
        console.log('\n⚠️  Could not fetch products, but credentials are saved.');
        console.log('You can sync products from the web interface.');
      }
    } else {
      console.log('\n✨ Setup complete!');
      console.log('\nTo sync products:');
      console.log('1. Log into your app');
      console.log('2. Navigate to /shop/products');
      console.log('3. Click "Refresh Inventory" button');
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
