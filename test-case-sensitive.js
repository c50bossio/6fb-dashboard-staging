// Test case-sensitive endpoints
const fetch = require('node-fetch');

async function testCaseSensitive() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CASE-SENSITIVE endpoints');
  console.log('=================================\n');
  
  // Test different capitalizations
  const tests = [
    '/me',
    '/Me', 
    '/ME',
    '/products',
    '/Products',
    '/PRODUCTS'
  ];
  
  for (const endpoint of tests) {
    const url = 'https://inventory.dearsystems.com/ExternalAPI/v2' + endpoint;
    console.log('Testing: ' + url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('  Status: ' + response.status);
    
    if (response.status === 200) {
      const text = await response.text();
      if (text.includes('<!DOCTYPE')) {
        console.log('  Returns HTML (error page)');
      } else {
        try {
          const data = JSON.parse(text);
          console.log('  SUCCESS! Returns JSON');
          console.log('  Keys:', Object.keys(data).join(', '));
        } catch (e) {
          console.log('  Response:', text.substring(0, 100));
        }
      }
    }
    console.log('');
  }
}

testCaseSensitive();
