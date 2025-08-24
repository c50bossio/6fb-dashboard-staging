#!/usr/bin/env node

/**
 * Test Verified Cin7 Credentials
 * Quick test to verify your credentials work with the integration
 */

// You'll need to update these with your verified credentials:
const ACCOUNT_ID = 'YOUR_VERIFIED_ACCOUNT_ID';  // Replace with your verified Account ID
const API_KEY = 'YOUR_VERIFIED_API_KEY';        // Replace with your verified API Key

console.log('🧪 TESTING VERIFIED CIN7 CREDENTIALS');
console.log('=' + '='.repeat(50));

if (ACCOUNT_ID === 'YOUR_VERIFIED_ACCOUNT_ID' || API_KEY === 'YOUR_VERIFIED_API_KEY') {
  console.log('❌ PLEASE UPDATE THE CREDENTIALS IN THIS FILE');
  console.log('   1. Edit test-verified-credentials.js');
  console.log('   2. Replace YOUR_VERIFIED_ACCOUNT_ID with your Account ID');
  console.log('   3. Replace YOUR_VERIFIED_API_KEY with your API Key');
  console.log('   4. Run this script again');
  console.log('');
  console.log('Or better yet, use the web UI:');
  console.log('   1. Go to http://localhost:9999');
  console.log('   2. Find the Cin7 Setup form');
  console.log('   3. Enter your verified credentials');
  console.log('   4. Click Save and then Sync');
  process.exit(1);
}

async function testVerifiedCredentials() {
  try {
    console.log('🔧 Step 1: Testing Setup with verified credentials...');
    
    const setupResponse = await fetch('http://localhost:9999/api/cin7/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-bypass': 'true'
      },
      body: JSON.stringify({
        accountId: ACCOUNT_ID,
        apiKey: API_KEY,
        accountName: 'Tomb45 income review'
      })
    });
    
    const setupResult = await setupResponse.json();
    console.log('📊 Setup result:', setupResult);
    
    if (setupResult.success && setupResult.connectionTested) {
      console.log('✅ SETUP SUCCESS! Credentials work!');
      console.log('   Account Name:', setupResult.accountName);
      console.log('   Connection Test: PASSED');
      
      console.log('\n🔄 Step 2: Testing Sync...');
      
      const syncResponse = await fetch('http://localhost:9999/api/cin7/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dev-bypass': 'true'
        },
        body: JSON.stringify({
          barbershop_id: '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
        })
      });
      
      const syncResult = await syncResponse.json();
      
      if (syncResult.success) {
        console.log('🎉 SYNC SUCCESS!');
        console.log('   Products synced:', syncResult.count);
        console.log('   Total fetched:', syncResult.totalFetched || syncResult.count);
        
        if (syncResult.count >= 200) {
          console.log('✅ SUCCESS! Got all 200+ products as expected!');
        } else if (syncResult.count > 1) {
          console.log('🎯 Good! More than 1 product - pagination working!');
        }
        
        if (syncResult.sampleProducts) {
          console.log('\n📦 Sample synced products:');
          syncResult.sampleProducts.forEach(p => {
            console.log(`   - ${p.name} ($${p.retail_price}) - Stock: ${p.current_stock}`);
          });
        }
      } else {
        console.log('❌ Sync failed:', syncResult.error);
      }
      
    } else {
      console.log('❌ Setup failed:', setupResult.error || 'Connection test failed');
      if (setupResult.connectionError) {
        console.log('   Connection error:', setupResult.connectionError);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Make sure the development server is running on port 9999');
  }
}

testVerifiedCredentials();