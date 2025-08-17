// Test CIN7 API using the exact format shown in API Explorer
const fetch = require('node-fetch');

async function testExplorerFormat() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 API with Explorer Format');
  console.log('======================================\n');
  console.log('Your API Explorer shows SUCCESS with v2/me endpoint');
  console.log('Let\'s test if the API key might need a different format...\n');
  
  // The API Explorer might be using a different key format
  const keyVariations = [
    {
      name: 'Original key',
      key: apiKey
    },
    {
      name: 'Key without dashes',
      key: apiKey.replace(/-/g, '')
    },
    {
      name: 'Uppercase key',
      key: apiKey.toUpperCase()
    },
    {
      name: 'Lowercase key',
      key: apiKey.toLowerCase()
    }
  ];
  
  for (const variation of keyVariations) {
    console.log('Testing with: ' + variation.name);
    
    const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': variation.key,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const text = await response.text();
    console.log('  Status: ' + response.status);
    
    if (response.status === 200) {
      console.log('  SUCCESS! This key format works!');
      console.log('  Response:', text);
      return;
    } else {
      console.log('  Response: ' + text);
    }
    console.log('');
  }
  
  // Test if there's a session endpoint we need to hit first
  console.log('\nTesting if we need to establish a session first...');
  
  // Try to get a session like the web interface does
  const sessionResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI', {
    method: 'GET',
    headers: {
      'api-auth-accountid': accountId,
      'api-auth-applicationkey': apiKey
    }
  });
  
  console.log('Session endpoint status: ' + sessionResponse.status);
  
  // Check if we got any session cookies
  const cookies = sessionResponse.headers.raw()['set-cookie'];
  if (cookies) {
    console.log('Got session cookies, trying with them...');
    
    const cookieString = cookies.map(c => c.split(';')[0]).join('; ');
    
    const withSessionResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      method: 'GET',
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Cookie': cookieString,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('With session status: ' + withSessionResponse.status);
    const sessionText = await withSessionResponse.text();
    console.log('Response: ' + sessionText);
  }
  
  console.log('\n\nIMPORTANT FINDING:');
  console.log('==================');
  console.log('Your API Explorer shows SUCCESSFUL calls to v2/me');
  console.log('This proves:');
  console.log('1. Your account HAS API v2 access enabled');
  console.log('2. The endpoint IS working');
  console.log('');
  console.log('The issue must be:');
  console.log('1. The API Application Key is different from what the Explorer uses');
  console.log('2. The Explorer uses session auth (logged in) not API key auth');
  console.log('');
  console.log('SOLUTION:');
  console.log('In CIN7, go to Integrations > API and create a NEW API Application');
  console.log('The current API key might be for a different application or expired');
}
testExplorerFormat();
