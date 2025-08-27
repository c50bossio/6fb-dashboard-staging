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

      resolve(result);
    });
    
    req.end();
  });
}

async function runTests() {
  );
  
  .toISOString());
  );

  );
  
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
  );
  
  );
  
  const allResponses = testResults.map(r => r.response?.body).filter(Boolean);
  const uniqueResponses = [...new Set(allResponses)];

  uniqueResponses.forEach((response, index) => {
    const count = allResponses.filter(r => r === response).length;
    
  });
  
  // Critical finding
  );
  
  );
  
  const validCredsResponse = testResults[0].response?.body;
  const invalidCredsResponse = testResults[3].response?.body;
  
  if (validCredsResponse === invalidCredsResponse) {

  } else {

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
  
  );
  
  );

  // Action items
  );
  
  );

}

// Run the tests
runTests().catch(console.error);