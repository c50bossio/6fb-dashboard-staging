#!/usr/bin/env node

/**
 * Complete Cin7 Integration Test
 * Tests the full setup → sync workflow with real credentials
 * 
 * INSTRUCTIONS:
 * 1. Update REAL_API_KEY below with your actual Cin7 API Key
 * 2. Run: node test-cin7-complete-workflow.js
 * 3. Should see all 200+ products from "Tomb45 income review" account
 */

const REAL_ACCOUNT_ID = '509db449-eafc-66bd-ac73-f02c7392426a'; // From your console logs
const REAL_API_KEY = 'YOUR_REAL_API_KEY_HERE'; // ⚠️ UPDATE THIS WITH YOUR REAL API KEY
const ACCOUNT_NAME = 'Tomb45 income review';
const BARBERSHOP_ID = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b';

if (REAL_API_KEY === 'YOUR_REAL_API_KEY_HERE') {
  console.log('❌ PLEASE UPDATE THE REAL_API_KEY IN THIS FILE');
  console.log('   1. Edit test-cin7-complete-workflow.js');  
  console.log('   2. Replace YOUR_REAL_API_KEY_HERE with your actual API key');
  console.log('   3. Run this script again');
  process.exit(1);
}

async function testCompleteWorkflow() {
  console.log('🧪 TESTING COMPLETE CIN7 INTEGRATION WORKFLOW');
  console.log('=' + '='.repeat(60));
  console.log('');
  
  try {
    console.log('🔧 Step 1: Testing Setup Endpoint...');
    
    // Test setup with real credentials
    const setupResponse = await fetch('http://localhost:9999/api/cin7/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-bypass': 'true'
      },
      body: JSON.stringify({
        accountId: REAL_ACCOUNT_ID,
        apiKey: REAL_API_KEY,
        accountName: ACCOUNT_NAME
      })
    });
    
    const setupResult = await setupResponse.json();
    
    if (setupResult.success) {
      console.log('✅ Setup successful!');
      console.log('   Account Name:', setupResult.accountName);
      console.log('   Credentials Saved:', setupResult.credentialsSaved);
      console.log('   Connection Tested:', setupResult.connectionTested);
      
      if (setupResult.connectionTested) {
        console.log('✅ Connection test PASSED - real credentials work!');
      } else {
        console.log('⚠️  Connection test failed, but credentials saved');
        console.log('   Error:', setupResult.connectionError);
      }
    } else {
      console.log('❌ Setup failed:', setupResult.error);
      console.log('   Message:', setupResult.message);
      return;
    }
    
    console.log('\\n🔄 Step 2: Testing Sync Endpoint...');
    
    // Test sync with saved credentials
    const syncResponse = await fetch('http://localhost:9999/api/cin7/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-bypass': 'true'
      },
      body: JSON.stringify({
        barbershop_id: BARBERSHOP_ID
      })
    });
    
    const syncResult = await syncResponse.json();
    
    if (syncResult.error) {
      console.log('❌ Sync failed:', syncResult.error);
      if (syncResult.error.includes('403') || syncResult.error.includes('Forbidden')) {
        console.log('   This might be an API key or permissions issue');
      }
    } else if (syncResult.success) {
      console.log('✅ SYNC SUCCESSFUL!');
      console.log('   Products synced:', syncResult.count);
      console.log('   Total fetched:', syncResult.totalFetched || syncResult.count);
      console.log('   Low stock items:', syncResult.lowStockCount || 0);
      console.log('   Out of stock items:', syncResult.outOfStockCount || 0);
      
      if (syncResult.count >= 200) {
        console.log('🎉 SUCCESS! Synced 200+ products as expected!');
      } else if (syncResult.count > 100) {
        console.log('✅ Good progress! Many products synced');
      } else if (syncResult.count > 0) {
        console.log('⚠️  Some products synced, but less than expected');
      }
      
      console.log('\\n📦 Sample products:');
      if (syncResult.sampleProducts) {
        syncResult.sampleProducts.forEach(p => {
          console.log('   -', p.name, `($${p.retail_price}) - Stock: ${p.current_stock}`);
        });
      }
    } else {
      console.log('❌ Unexpected sync response:', syncResult);
    }
    
    console.log('\\n🎯 FINAL VERDICT:');
    if (setupResult.success && syncResult.success && syncResult.count >= 200) {
      console.log('🎉 COMPLETE SUCCESS! Cin7 integration fully working!');
      console.log('   ✅ Setup saves credentials properly');
      console.log('   ✅ Sync fetches all 200+ products');
      console.log('   ✅ Products saved to database');
    } else if (setupResult.success && syncResult.success) {
      console.log('✅ Integration working, but may need to check product count');
    } else if (setupResult.success) {
      console.log('⚠️  Setup works, but sync needs debugging');
    } else {
      console.log('❌ Integration needs more work');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Make sure the development server is running on port 9999');
  }
}

// Run the test
testCompleteWorkflow();