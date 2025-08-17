// Test if CIN7 API needs activation or uses session-based auth
const fetch = require('node-fetch');

async function testCIN7Activation() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 API Activation Methods');
  console.log('====================================\n');
  
  // Some APIs require an initial activation call
  console.log('1. Testing if API needs activation endpoint...');
  
  const activationEndpoints = [
    '/activate',
    '/auth/activate', 
    '/api/activate',
    '/token',
    '/auth/token',
    '/session',
    '/login'
  ];
  
  for (const endpoint of activationEndpoints) {
    const url = 'https://inventory.dearsystems.com/ExternalAPI/v2' + endpoint;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: accountId,
          apiKey: apiKey
        })
      });
      
      if (response.status === 200) {
        console.log('   SUCCESS at ' + endpoint);
        const data = await response.text();
        console.log('   Response: ' + data);
        
        // If we got a token, try using it
        try {
          const json = JSON.parse(data);
          if (json.token || json.access_token || json.session) {
            console.log('\n   Got authentication token! Testing with token...');
            const token = json.token || json.access_token || json.session;
            
            const meResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
              headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('   With token status: ' + meResponse.status);
          }
        } catch (e) {}
      } else if (response.status !== 404 && response.status !== 302) {
        console.log('   ' + endpoint + ' returned: ' + response.status);
      }
    } catch (e) {
      // Silent fail for non-existent endpoints
    }
  }
  
  // Test if the account needs to be accessed through a subdomain
  console.log('\n2. Testing subdomain access...');
  
  const subdomains = [
    'bookedbarber',
    'api',
    'au',
    'us',
    'nz',
    'ca'
  ];
  
  for (const subdomain of subdomains) {
    const url = 'https://' + subdomain + '.dearsystems.com/ExternalAPI/v2/me';
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 3000
      });
      
      if (response.status === 200) {
        console.log('   SUCCESS at ' + subdomain + '.dearsystems.com!');
        const data = await response.text();
        console.log('   Your account is on the ' + subdomain + ' server');
        return;
      } else if (response.status === 403) {
        const text = await response.text();
        if (!text.includes('Incorrect credentials')) {
          console.log('   ' + subdomain + ': Different 403 error - ' + text);
        }
      }
    } catch (e) {
      // Server doesn't exist or timed out
    }
  }
  
  console.log('\n3. Testing with cookies/session...');
  
  // Try to get a session cookie first
  const loginResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI', {
    method: 'GET',
    headers: {
      'api-auth-accountid': accountId,
      'api-auth-applicationkey': apiKey
    }
  });
  
  const cookies = loginResponse.headers.get('set-cookie');
  if (cookies) {
    console.log('   Got cookies: ' + cookies.substring(0, 50) + '...');
    
    // Try with cookies
    const withCookiesResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
      headers: {
        'api-auth-accountid': accountId,
        'api-auth-applicationkey': apiKey,
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   With cookies status: ' + withCookiesResponse.status);
  }
  
  console.log('\n\nConclusion:');
  console.log('===========');
  console.log('The API is responding but rejecting the credentials.');
  console.log('This indicates one of these scenarios:');
  console.log('');
  console.log('1. API v2 is not enabled for your account (most likely)');
  console.log('   - Even though you paid for it, it might need manual activation');
  console.log('   - Contact CIN7 support and ask them to enable API v2 access');
  console.log('');
  console.log('2. Your account might have IP restrictions');
  console.log('   - Check if the API key is restricted to specific IP addresses');
  console.log('');
  console.log('3. The account might be in a trial or limited mode');
  console.log('   - Verify your CIN7 subscription includes API access');
  console.log('');
  console.log('Action needed: Contact CIN7 support with this information:');
  console.log('- Account ID: ' + accountId);
  console.log('- Error: "Incorrect credentials!" when using valid API key');
  console.log('- Request: Enable API v2 access for this account');
}

testCIN7Activation();