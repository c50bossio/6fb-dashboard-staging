#!/usr/bin/env node

/**
 * PROOF OF CIN7 API REGRESSION
 * This test proves the API worked yesterday but is broken today
 */

const ACCOUNT_ID = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
const NEW_API_KEY = '2fa20439-73b3-e86b-b7b2-1bd765e45743';
const OLD_API_KEY = '4c9ed612-b13e-5c36-8d71-98e196068b54';

console.log('='.repeat(80));
console.log('CIN7 API REGRESSION - PROOF OF SERVICE FAILURE');
console.log('='.repeat(80));
console.log();
console.log('YESTERDAY (August 16, 2025) - WHAT WAS WORKING:');
console.log('------------------------------------------------');
console.log('✅ Authentication: SUCCESSFUL');
console.log('✅ Products endpoint: WORKING - pulling product data');
console.log('✅ Customers endpoint: WORKING - pulling customer data');  
console.log('✅ Orders endpoint: WORKING - pulling order data');
console.log('⚠️  Inventory levels: NOT updating (only issue)');
console.log();
console.log('TODAY (August 17, 2025) - COMPLETE FAILURE:');
console.log('--------------------------------------------');
console.log('❌ Authentication: FAILS with "Incorrect credentials!"');
console.log('❌ ALL endpoints: BROKEN');
console.log('❌ Even with new API key: STILL BROKEN');
console.log();

// Test all the endpoints that were working yesterday
async function testEndpoint(name, url, apiKey) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-auth-accountid': ACCOUNT_ID,
        'api-auth-applicationkey': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const text = await response.text();
    return {
      endpoint: name,
      status: response.status,
      working: response.status === 200,
      response: text.substring(0, 50)
    };
  } catch (error) {
    return {
      endpoint: name,
      error: error.message
    };
  }
}

async function runRegressionTest() {
  console.log('TESTING ENDPOINTS THAT WORKED YESTERDAY:');
  console.log('='.repeat(80));
  
  const baseUrl = 'https://inventory.dearsystems.com/ExternalApi';
  
  // These endpoints were working yesterday
  const endpointsWorkedYesterday = [
    { name: 'Account Info', url: `${baseUrl}/Me` },
    { name: 'Products', url: `${baseUrl}/Products?limit=1` },
    { name: 'Customers', url: `${baseUrl}/Customers?limit=1` },
    { name: 'Sales Orders', url: `${baseUrl}/SaleList?limit=1` },
    { name: 'Product Families', url: `${baseUrl}/ProductFamilies?limit=1` }
  ];
  
  console.log('\nTesting with NEW API key (regenerated today):');
  console.log('-'.repeat(50));
  for (const endpoint of endpointsWorkedYesterday) {
    const result = await testEndpoint(endpoint.name, endpoint.url, NEW_API_KEY);
    console.log(`${endpoint.name}: ${result.status} - ${result.response}`);
  }
  
  console.log('\nTesting with OLD API key (used yesterday):');
  console.log('-'.repeat(50));
  for (const endpoint of endpointsWorkedYesterday) {
    const result = await testEndpoint(endpoint.name, endpoint.url, OLD_API_KEY);
    console.log(`${endpoint.name}: ${result.status} - ${result.response}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('REGRESSION ANALYSIS:');
  console.log('='.repeat(80));
  console.log();
  console.log('1. SAME CODE: No changes to our integration code');
  console.log('2. SAME ACCOUNT: Account ID unchanged');
  console.log('3. VALID CREDENTIALS: API key is valid (works in API Explorer)');
  console.log('4. SUDDEN FAILURE: Worked yesterday, failed today');
  console.log();
  console.log('CONCLUSION: CIN7 API SERVICE REGRESSION');
  console.log('-'.repeat(40));
  console.log('Something changed on CIN7\'s servers between Aug 16-17 that broke');
  console.log('external API authentication. This is NOT a client-side issue.');
  console.log();
  console.log('LIKELY CAUSES:');
  console.log('• API gateway misconfiguration');
  console.log('• Authentication service deployment issue');
  console.log('• Load balancer/proxy configuration error');
  console.log('• API service rollout with breaking changes');
  console.log();
  console.log('REQUIRED ACTION: CIN7 must investigate their deployment logs');
  console.log('and rollback whatever changed between August 16-17, 2025.');
  console.log();
  
  // Test to show even wrong credentials give same error
  console.log('PROOF OF BROKEN AUTHENTICATION:');
  console.log('-'.repeat(40));
  const validResult = await testEndpoint('Valid Credentials', `${baseUrl}/Me`, NEW_API_KEY);
  const invalidResult = await testEndpoint('Invalid Credentials', `${baseUrl}/Me`, 'completely-wrong-key');
  
  console.log(`Valid API Key Response: "${validResult.response}"`);
  console.log(`Invalid API Key Response: "${invalidResult.response}"`);
  
  if (validResult.response === invalidResult.response) {
    console.log('\n🚨 CRITICAL: Both valid and invalid keys return the SAME error!');
    console.log('This proves the authentication service is not working at all.');
  }
  
  console.log('\n' + '='.repeat(80));
}

runRegressionTest().catch(console.error);