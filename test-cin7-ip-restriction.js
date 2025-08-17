// Test if CIN7 has IP restrictions or requires specific headers
const fetch = require('node-fetch');
const https = require('https');

async function testIPRestrictions() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 API - IP Restrictions and Header Requirements');
  console.log('===========================================================\n');
  
  // Test with different User-Agent headers (API Explorer might send a specific one)
  const userAgents = [
    {
      name: 'Browser-like User-Agent',
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    {
      name: 'CIN7 API Explorer',
      value: 'CIN7-API-Explorer/1.0'
    },
    {
      name: 'Application User-Agent',
      value: 'BookedBarber-Integration/1.0'
    }
  ];
  
  for (const ua of userAgents) {
    console.log('Testing with: ' + ua.name);
    
    try {
      const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'User-Agent': ua.value,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Origin': 'https://inventory.dearsystems.com',
          'Referer': 'https://inventory.dearsystems.com/ExternalApi'
        }
      });
      
      console.log('  Status: ' + response.status);
      
      if (response.status === 200) {
        console.log('  SUCCESS! This User-Agent works!');
        const data = await response.text();
        console.log('  Response:', data);
        return;
      } else if (response.status === 403) {
        const text = await response.text();
        console.log('  403: ' + text);
      }
    } catch (e) {
      console.log('  Error: ' + e.message);
    }
  }
  
  // Test if CORS/Origin matters
  console.log('\nTesting with CORS headers...');
  
  const corsHeaders = {
    'api-auth-accountid': accountId,
    'api-auth-applicationkey': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://inventory.dearsystems.com',
    'Referer': 'https://inventory.dearsystems.com/ExternalApi#Settings=-3c49fd4f-f992-4827-bcbb-5e532197608a',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
  };
  
  const corsResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
    method: 'GET',
    headers: corsHeaders
  });
  
  console.log('With CORS headers status: ' + corsResponse.status);
  const corsText = await corsResponse.text();
  console.log('Response: ' + corsText);
  
  // Test if the key needs URL encoding
  console.log('\nTesting with URL-encoded credentials in headers...');
  
  const encodedResponse = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
    method: 'GET',
    headers: {
      'api-auth-accountid': encodeURIComponent(accountId),
      'api-auth-applicationkey': encodeURIComponent(apiKey),
      'Content-Type': 'application/json'
    }
  });
  
  console.log('URL-encoded status: ' + encodedResponse.status);
  
  // Test as query parameters (some APIs accept both)
  console.log('\nTesting with credentials as query parameters...');
  
  const queryUrl = `https://inventory.dearsystems.com/ExternalAPI/v2/me?api-auth-accountid=${accountId}&api-auth-applicationkey=${apiKey}`;
  const queryResponse = await fetch(queryUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Query params status: ' + queryResponse.status);
  
  console.log('\n\nPOSSIBLE ISSUES:');
  console.log('================');
  console.log('Since you are PAYING for API access and it works in the Explorer:');
  console.log('');
  console.log('1. IP RESTRICTION: The API key might be restricted to specific IP addresses');
  console.log('   - Check in CIN7 API settings if there\'s an IP whitelist');
  console.log('   - The Explorer works because it\'s from CIN7\'s own servers');
  console.log('');
  console.log('2. API APPLICATION SETTINGS: The API application might have restrictions:');
  console.log('   - Check if "External Access" is enabled for the application');
  console.log('   - Some applications are "Internal Only" for the web interface');
  console.log('');
  console.log('3. RATE LIMITING: You might have hit a rate limit');
  console.log('   - The "Incorrect credentials" might be a misleading error for rate limiting');
  console.log('');
  console.log('ACTION NEEDED:');
  console.log('In CIN7, go to Settings → Integrations → API');
  console.log('Click on your API Application and check:');
  console.log('- Is "External Access" or "Remote Access" enabled?');
  console.log('- Are there IP restrictions configured?');
  console.log('- Is the application status "Active"?');
}

testIPRestrictions();