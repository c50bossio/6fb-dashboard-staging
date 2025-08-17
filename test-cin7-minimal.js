/**
 * MINIMAL CIN7 API TEST
 * Starting from absolute scratch with the simplest possible API call
 */

const ACCOUNT_ID = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
const API_KEY = '2fa20439-73b3-e86b-b7b2-1bd765e45743';

// Test 1: Using fetch (Node 18+)
async function testWithFetch() {
  console.log('\n=== TEST 1: Using fetch ===');
  
  try {
    const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': ACCOUNT_ID,
        'api-auth-applicationkey': API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
    
    if (response.ok) {
      console.log('✅ SUCCESS!');
      const data = JSON.parse(text);
      console.log('Data:', data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test 2: Using https module (native Node.js)
async function testWithHttps() {
  console.log('\n=== TEST 2: Using https module ===');
  
  const https = require('https');
  
  const options = {
    hostname: 'inventory.dearsystems.com',
    path: '/ExternalApi/Me',
    method: 'GET',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        
        if (res.statusCode === 200) {
          console.log('✅ SUCCESS!');
          try {
            const parsed = JSON.parse(data);
            console.log('Data:', parsed);
          } catch (e) {
            console.log('Parse error:', e.message);
          }
        }
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('Error:', error.message);
      resolve();
    });
    
    req.end();
  });
}

// Test 3: Using axios (if available)
async function testWithAxios() {
  console.log('\n=== TEST 3: Using axios ===');
  
  try {
    const axios = require('axios');
    
    const response = await axios.get('https://inventory.dearsystems.com/ExternalApi/Me', {
      headers: {
        'api-auth-accountid': ACCOUNT_ID,
        'api-auth-applicationkey': API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    console.log('✅ SUCCESS!');
  } catch (error) {
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
    
    // Try to load axios if not available
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('(axios not installed, skipping this test)');
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('='.repeat(50));
  console.log('CIN7 MINIMAL API TEST');
  console.log('='.repeat(50));
  console.log('Account ID:', ACCOUNT_ID);
  console.log('API Key:', API_KEY);
  console.log('='.repeat(50));
  
  await testWithFetch();
  await testWithHttps();
  await testWithAxios();
  
  console.log('\n' + '='.repeat(50));
  console.log('TEST COMPLETE');
  console.log('='.repeat(50));
}

runAllTests().catch(console.error);