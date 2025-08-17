// Test CIN7 API with READ-ONLY operations (GET requests only)
const fetch = require('node-fetch');

async function testReadOnlyAccess() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 API - READ-ONLY Access');
  console.log('====================================\n');
  console.log('Your subscription may only allow READ operations (GET requests)');
  console.log('Let\'s test read-only endpoints that should work:\n');
  
  // Test GET endpoints only (no POST/PUT/DELETE)
  const readOnlyEndpoints = [
    '/Me',  // Account info
    '/Products?limit=1',  // Products list
    '/Customers?limit=1',  // Customers list
    '/Stock?limit=1',  // Stock levels
    '/SaleList?limit=1',  // Sales list
    '/PurchaseList?limit=1'  // Purchases list
  ];
  
  let successCount = 0;
  
  for (const endpoint of readOnlyEndpoints) {
    console.log(`Testing GET ${endpoint}`);
    
    try {
      const response = await fetch(`https://inventory.dearsystems.com/ExternalAPI/v2${endpoint}`, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.status === 200) {
        successCount++;
        console.log('  ✅ SUCCESS! This endpoint works with your subscription');
        const data = await response.json();
        
        // Show what data we got
        if (data.Total !== undefined) {
          console.log(`  Found ${data.Total} items`);
        } else if (data.Company) {
          console.log(`  Account: ${data.Company}`);
        }
      } else if (response.status === 403) {
        const text = await response.text();
        if (text.includes('subscription')) {
          console.log('  ❌ Subscription limitation: ' + text);
        } else {
          console.log('  ❌ Access denied: ' + text);
        }
      } else {
        const text = await response.text();
        console.log('  ❌ Error: ' + text);
      }
    } catch (error) {
      console.log('  ❌ Network error: ' + error.message);
    }
    console.log('');
  }
  
  console.log('\n===========================================');
  console.log(`Results: ${successCount} out of ${readOnlyEndpoints.length} endpoints worked`);
  console.log('===========================================\n');
  
  if (successCount > 0) {
    console.log('✅ GOOD NEWS: Some READ operations work!');
    console.log('Your subscription allows basic API read access.');
    console.log('');
    console.log('SOLUTION for full integration:');
    console.log('1. You can use READ-ONLY sync (pull inventory data)');
    console.log('2. For full bidirectional sync, upgrade your CIN7 subscription to include:');
    console.log('   - Automation module (for webhooks)');
    console.log('   - API write access (for updating stock)');
  } else {
    console.log('❌ No endpoints worked - the API key itself may be invalid');
    console.log('Or your subscription may not include ANY API access');
  }
}

testReadOnlyAccess();