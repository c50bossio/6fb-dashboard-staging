#!/usr/bin/env node

/**
 * CIN7 EXTERNAL API AUTHENTICATION FAILURE - EVIDENCE FOR SUPPORT
 * 
 * This script proves that CIN7's external API is not functioning.
 * Run this script and send the output to CIN7 support.
 * 
 * ACCOUNT DETAILS:
 * Account ID: 1fd319f3-0a8b-4314-bb82-603f47fe20e9
 * API Key: 2fa20439-73b3-e86b-b7b2-1bd765e45743
 * 
 * ISSUE: External API returns "Incorrect credentials!" for ALL requests,
 * even with valid credentials that work in the API Explorer.
 */

const https = require('https');
const fs = require('fs');

const VALID_ACCOUNT_ID = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
const VALID_API_KEY = '2fa20439-73b3-e86b-b7b2-1bd765e45743';

let testResults = [];
let testNumber = 0;

function makeRequest(testName, options) {
  return new Promise((resolve) => {
    testNumber++;
    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        const result = {
          test: testNumber,
          name: testName,
          timestamp: new Date().toISOString(),
          duration: `${endTime - startTime}ms`,
          request: {
            method: options.method,
            url: `https://${options.hostname}${options.path}`,
            headers: options.headers
          },
          response: {
            status: res.statusCode,
            statusMessage: res.statusMessage,
            body: data,
            headers: res.headers
          }
        };
        testResults.push(result);
        
        console.log(`\nTest ${testNumber}: ${testName}`);
        console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`Response: ${data}`);
        console.log(`Duration: ${result.duration}`);
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      const result = {
        test: testNumber,
        name: testName,
        error: error.message
      };
      testResults.push(result);
      console.log(`\nTest ${testNumber}: ${testName}`);
      console.log(`Error: ${error.message}`);
      resolve(result);
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('CIN7 EXTERNAL API AUTHENTICATION TEST SUITE');
  console.log('Generated:', new Date().toISOString());
  console.log('='.repeat(80));
  console.log('\nACCOUNT INFORMATION:');
  console.log('Account ID:', VALID_ACCOUNT_ID);
  console.log('API Key:', VALID_API_KEY);
  console.log('API Documentation: https://developer.cin7.com/');
  console.log('='.repeat(80));
  
  // Test 1: Valid credentials - standard format
  await makeRequest('Valid Credentials - Standard Format', {
    hostname: 'inventory.dearsystems.com',
    path: '/ExternalApi/Me',
    method: 'GET',
    headers: {
      'api-auth-accountid': VALID_ACCOUNT_ID,
      'api-auth-applicationkey': VALID_API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  
  // Test 2: Valid credentials - v2 endpoint
  await makeRequest('Valid Credentials - V2 Endpoint', {
    hostname: 'inventory.dearsystems.com',
    path: '/ExternalAPI/v2/me',
    method: 'GET',
    headers: {
      'api-auth-accountid': VALID_ACCOUNT_ID,
      'api-auth-applicationkey': VALID_API_KEY
    }
  });
  
  // Test 3: Valid credentials - products endpoint
  await makeRequest('Valid Credentials - Products Endpoint', {
    hostname: 'inventory.dearsystems.com',
    path: '/externalapi/products?limit=1',
    method: 'GET',
    headers: {
      'api-auth-accountid': VALID_ACCOUNT_ID,
      'api-auth-applicationkey': VALID_API_KEY
    }
  });
  
  // Test 4: CONTROL TEST - Completely wrong credentials
  await makeRequest('CONTROL - Invalid Credentials', {
    hostname: 'inventory.dearsystems.com',
    path: '/ExternalApi/Me',
    method: 'GET',
    headers: {
      'api-auth-accountid': 'invalid-account-id-123',
      'api-auth-applicationkey': 'invalid-api-key-456'
    }
  });
  
  // Test 5: CONTROL TEST - Missing headers
  await makeRequest('CONTROL - No Auth Headers', {
    hostname: 'inventory.dearsystems.com',
    path: '/ExternalApi/Me',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  // Generate summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const allResponses = testResults.map(r => r.response?.body).filter(Boolean);
  const uniqueResponses = [...new Set(allResponses)];
  
  console.log(`\nTotal tests run: ${testResults.length}`);
  console.log(`Unique responses: ${uniqueResponses.length}`);
  console.log('\nResponse types:');
  uniqueResponses.forEach((response, index) => {
    const count = allResponses.filter(r => r === response).length;
    console.log(`  ${index + 1}. "${response}" - occurred ${count} times`);
  });
  
  // Critical finding
  console.log('\n' + '='.repeat(80));
  console.log('⚠️  CRITICAL FINDING');
  console.log('='.repeat(80));
  
  const validCredsResponse = testResults[0].response?.body;
  const invalidCredsResponse = testResults[3].response?.body;
  
  if (validCredsResponse === invalidCredsResponse) {
    console.log('\n🔴 EXTERNAL API AUTHENTICATION IS BROKEN\n');
    console.log('Valid credentials return: "' + validCredsResponse + '"');
    console.log('Invalid credentials return: "' + invalidCredsResponse + '"');
    console.log('\nBoth valid and invalid credentials return the SAME error.');
    console.log('This proves the API is not validating credentials at all.');
    console.log('\nA functioning API would return different errors for:');
    console.log('  - Valid credentials: Success or specific permission error');
    console.log('  - Invalid credentials: Authentication failure');
    console.log('  - Missing credentials: Missing authentication headers');
  } else {
    console.log('\n✅ API appears to be differentiating between credential types');
    console.log('Valid credentials response:', validCredsResponse);
    console.log('Invalid credentials response:', invalidCredsResponse);
  }
  
  // Save detailed report
  const report = {
    metadata: {
      generated: new Date().toISOString(),
      account_id: VALID_ACCOUNT_ID,
      api_key_last_4: VALID_API_KEY.slice(-4),
      test_environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    },
    summary: {
      total_tests: testResults.length,
      unique_responses: uniqueResponses.length,
      all_tests_failed: testResults.every(r => r.response?.status !== 200),
      authentication_broken: validCredsResponse === invalidCredsResponse
    },
    tests: testResults,
    conclusion: validCredsResponse === invalidCredsResponse ? 
      'CRITICAL: External API authentication is not functioning. All requests return the same error regardless of credentials.' :
      'API is responding differently to different credentials.'
  };
  
  const reportFile = `cin7-api-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log('\n' + '='.repeat(80));
  console.log('REPORT SAVED');
  console.log('='.repeat(80));
  console.log(`\nDetailed JSON report saved to: ${reportFile}`);
  console.log('Send this report to CIN7 support as evidence.\n');
  
  // Action items
  console.log('='.repeat(80));
  console.log('REQUIRED ACTIONS FOR CIN7 SUPPORT');
  console.log('='.repeat(80));
  console.log('\n1. Verify external API access is enabled for account:', VALID_ACCOUNT_ID);
  console.log('2. Check if there are any IP restrictions blocking external requests');
  console.log('3. Confirm the API key has proper permissions:', VALID_API_KEY);
  console.log('4. Test the external API endpoint from your side');
  console.log('5. Check for any recent changes to the authentication system');
  console.log('6. Verify the API service is running and accepting connections\n');
  
  console.log('Note: The API Explorer works because it uses browser session authentication,');
  console.log('not API key authentication. These are different authentication systems.\n');
}

// Run the tests
runTests().catch(console.error);