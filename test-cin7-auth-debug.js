#!/usr/bin/env node

/**
 * CIN7 Authentication Debug Script
 * This script tests various authentication methods and endpoints
 * to identify why the API credentials are being rejected
 */

const https = require('https');

const ACCOUNT_ID = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
const API_KEY = '4c9ed612-b13e-5c36-8d71-98e196068b54';

const tests = [
  {
    name: 'V1 API - Me endpoint (lowercase)',
    path: '/externalapi/me',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  },
  {
    name: 'V1 API - Me endpoint (CamelCase)', 
    path: '/ExternalApi/Me',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  },
  {
    name: 'V2 API - Me endpoint',
    path: '/ExternalAPI/v2/me',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  },
  {
    name: 'Products endpoint (working in logs)',
    path: '/externalapi/products?limit=1',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  },
  {
    name: 'With Content-Type header',
    path: '/externalapi/me',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY,
      'Content-Type': 'application/json'
    }
  },
  {
    name: 'With User-Agent header',
    path: '/externalapi/me',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY,
      'User-Agent': 'CIN7-Integration/1.0'
    }
  }
];

function testEndpoint(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'inventory.dearsystems.com',
      port: 443,
      path: test.path,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...test.headers
      }
    };

    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`   URL: https://${options.hostname}${test.path}`);
    console.log(`   Headers:`, JSON.stringify(test.headers, null, 2));

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data.substring(0, 100)}`);
        
        if (res.statusCode === 200) {
          console.log(`   ✅ SUCCESS!`);
          try {
            const parsed = JSON.parse(data);
            console.log(`   Data:`, JSON.stringify(parsed, null, 2).substring(0, 200));
          } catch (e) {
            console.log(`   Raw data:`, data.substring(0, 200));
          }
        } else if (res.statusCode === 403) {
          console.log(`   ❌ Authentication failed`);
        } else {
          console.log(`   ⚠️ Unexpected status`);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`   ❌ Error: ${error.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('CIN7 Authentication Debug');
  console.log('='.repeat(60));
  console.log(`Account ID: ${ACCOUNT_ID}`);
  console.log(`API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(-4)}`);
  console.log('='.repeat(60));

  for (const test of tests) {
    await testEndpoint(test);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log('\n' + '='.repeat(60));
  console.log('Debug Complete');
  console.log('='.repeat(60));
  
  // Additional diagnostic info
  console.log('\n📋 Diagnostic Information:');
  console.log('1. If all tests return "Incorrect credentials!", the issue is likely:');
  console.log('   - API keys need to be regenerated in CIN7');
  console.log('   - External API access needs additional configuration');
  console.log('   - IP whitelisting may be required');
  console.log('2. If some tests succeed, note which endpoints/headers work');
  console.log('3. Share these results with CIN7 support for assistance');
}

runTests().catch(console.error);