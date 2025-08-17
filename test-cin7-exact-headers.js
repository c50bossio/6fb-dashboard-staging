/**
 * Test with EXACT header formats from CIN7 documentation
 */

const ACCOUNT_ID = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
const API_KEY = '2fa20439-73b3-e86b-b7b2-1bd765e45743';

async function test1_ExactAsDocumented() {
  console.log('\n=== Test 1: Exact headers as documented ===');
  
  const https = require('https');
  const options = {
    hostname: 'inventory.dearsystems.com',
    path: '/ExternalApi/Me',
    method: 'GET',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
      // NO other headers - exactly as documented
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data.substring(0, 100));
        resolve();
      });
    });
    req.on('error', (e) => {
      console.error('Error:', e.message);
      resolve();
    });
    req.end();
  });
}

async function test2_WithContentType() {
  console.log('\n=== Test 2: With Content-Type ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text.substring(0, 100));
}

async function test3_WithAccept() {
  console.log('\n=== Test 3: With Accept ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text.substring(0, 100));
}

async function test4_CaseVariations() {
  console.log('\n=== Test 4: Header case variations ===');
  
  // Test with different case
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'Api-Auth-AccountId': ACCOUNT_ID,
      'Api-Auth-ApplicationKey': API_KEY
    }
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text.substring(0, 100));
}

async function test5_DifferentEndpoint() {
  console.log('\n=== Test 5: Different endpoint (products) ===');
  
  const response = await fetch('https://inventory.dearsystems.com/externalapi/products?limit=1', {
    method: 'GET',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text.substring(0, 100));
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('CIN7 EXACT HEADER TEST');
  console.log('Testing different header combinations');
  console.log('='.repeat(60));
  
  await test1_ExactAsDocumented();
  await test2_WithContentType();
  await test3_WithAccept();
  await test4_CaseVariations();
  await test5_DifferentEndpoint();
  
  console.log('\n' + '='.repeat(60));
  console.log('If ALL tests fail with "Incorrect credentials!", then:');
  console.log('1. The account does not have external API access enabled');
  console.log('2. There is IP whitelisting blocking our requests');
  console.log('3. The API application needs different permissions');
  console.log('='.repeat(60));
}

runAllTests().catch(console.error);