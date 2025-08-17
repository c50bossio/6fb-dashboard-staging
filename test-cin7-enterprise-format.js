/**
 * Test CIN7 using exact enterprise integration patterns
 * Some enterprise APIs require very specific formatting
 */

const https = require('https');

const ACCOUNT_ID = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
const API_KEY = '2fa20439-73b3-e86b-b7b2-1bd765e45743';

// Test 1: Exact enterprise format with specific ordering
function test1_EnterpriseFormat() {
  return new Promise((resolve) => {
    const postData = '';
    
    const options = {
      hostname: 'inventory.dearsystems.com',
      port: 443,
      path: '/ExternalApi/Me',
      method: 'GET',
      headers: {
        'api-auth-accountid': ACCOUNT_ID,
        'api-auth-applicationkey': API_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('\n=== Test 1: Enterprise format with Content-Length ===');
    
    const req = https.request(options, (res) => {
      console.log('Status:', res.statusCode);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        console.log('Response:', rawData);
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

// Test 2: With explicit port and protocol
function test2_ExplicitPortProtocol() {
  return new Promise((resolve) => {
    const options = {
      protocol: 'https:',
      hostname: 'inventory.dearsystems.com',
      port: 443,
      path: '/ExternalApi/Me',
      method: 'GET',
      headers: {
        'Host': 'inventory.dearsystems.com',
        'api-auth-accountid': ACCOUNT_ID,
        'api-auth-applicationkey': API_KEY
      }
    };
    
    console.log('\n=== Test 2: With explicit Host header ===');
    
    const req = https.request(options, (res) => {
      console.log('Status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Response:', data);
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

// Test 3: Try v1 endpoint specifically
function test3_V1Endpoint() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'inventory.dearsystems.com',
      path: '/ExternalAPI/v1/Me',
      method: 'GET',
      headers: {
        'api-auth-accountid': ACCOUNT_ID,
        'api-auth-applicationkey': API_KEY
      }
    };
    
    console.log('\n=== Test 3: V1 endpoint ===');
    
    const req = https.request(options, (res) => {
      console.log('Status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Response:', data);
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

// Test 4: With connection keep-alive
function test4_KeepAlive() {
  return new Promise((resolve) => {
    const keepAliveAgent = new https.Agent({
      keepAlive: true,
      maxSockets: 1
    });
    
    const options = {
      hostname: 'inventory.dearsystems.com',
      path: '/ExternalApi/Me',
      method: 'GET',
      agent: keepAliveAgent,
      headers: {
        'api-auth-accountid': ACCOUNT_ID,
        'api-auth-applicationkey': API_KEY,
        'Connection': 'keep-alive'
      }
    };
    
    console.log('\n=== Test 4: With keep-alive connection ===');
    
    const req = https.request(options, (res) => {
      console.log('Status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Response:', data);
        keepAliveAgent.destroy();
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.error('Error:', e.message);
      keepAliveAgent.destroy();
      resolve();
    });
    
    req.end();
  });
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('CIN7 ENTERPRISE FORMAT TESTS');
  console.log('Testing with enterprise-specific patterns');
  console.log('='.repeat(60));
  console.log('Account ID:', ACCOUNT_ID);
  console.log('API Key:', API_KEY);
  console.log('='.repeat(60));
  
  await test1_EnterpriseFormat();
  await test2_ExplicitPortProtocol();
  await test3_V1Endpoint();
  await test4_KeepAlive();
  
  console.log('\n' + '='.repeat(60));
  console.log('COMPLETE');
  console.log('='.repeat(60));
}

runAllTests().catch(console.error);