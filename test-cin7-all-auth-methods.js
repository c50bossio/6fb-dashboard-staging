/**
 * COMPREHENSIVE CIN7 AUTHENTICATION TEST
 * Testing ALL possible authentication methods including Base64, Bearer tokens, etc.
 */

const ACCOUNT_ID = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
const API_KEY = '2fa20439-73b3-e86b-b7b2-1bd765e45743';
const OLD_API_KEY = '4c9ed612-b13e-5c36-8d71-98e196068b54';

// Test 1: Standard headers (current implementation)
async function test1_StandardHeaders() {
  console.log('\n=== Test 1: Standard Headers ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': API_KEY
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 2: Base64 encoded credentials
async function test2_Base64Auth() {
  console.log('\n=== Test 2: Base64 Encoded Auth ===');
  
  const credentials = Buffer.from(`${ACCOUNT_ID}:${API_KEY}`).toString('base64');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credentials}`
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 3: Bearer token format
async function test3_BearerToken() {
  console.log('\n=== Test 3: Bearer Token ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'X-Account-Id': ACCOUNT_ID
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 4: Query parameters
async function test4_QueryParams() {
  console.log('\n=== Test 4: Query Parameters ===');
  
  const params = new URLSearchParams({
    accountId: ACCOUNT_ID,
    apiKey: API_KEY
  });
  
  const response = await fetch(`https://inventory.dearsystems.com/ExternalApi/Me?${params}`, {
    method: 'GET'
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 5: X-API headers format
async function test5_XAPIHeaders() {
  console.log('\n=== Test 5: X-API Headers ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'X-API-AccountID': ACCOUNT_ID,
      'X-API-Key': API_KEY
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 6: Combined Authorization header
async function test6_CombinedAuth() {
  console.log('\n=== Test 6: Combined Authorization ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'Authorization': `AccountID=${ACCOUNT_ID} ApplicationKey=${API_KEY}`
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 7: API Key only (maybe account ID from key)
async function test7_APIKeyOnly() {
  console.log('\n=== Test 7: API Key Only ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'api-auth-applicationkey': API_KEY
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 8: Old API key (should give same error if API is broken)
async function test8_OldAPIKey() {
  console.log('\n=== Test 8: Old API Key (Should fail) ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'api-auth-accountid': ACCOUNT_ID,
      'api-auth-applicationkey': OLD_API_KEY
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 9: Completely wrong credentials (control test)
async function test9_WrongCredentials() {
  console.log('\n=== Test 9: Wrong Credentials (Control) ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'api-auth-accountid': 'wrong-account-id',
      'api-auth-applicationkey': 'wrong-api-key'
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 10: Cookie-based auth (from browser session)
async function test10_CookieAuth() {
  console.log('\n=== Test 10: Cookie Auth (Browser Session) ===');
  
  // This would need actual cookies from a browser session
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'Cookie': 'DEARSession=fake-session-cookie'
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 11: URL with account subdomain
async function test11_AccountSubdomain() {
  console.log('\n=== Test 11: Account Subdomain ===');
  
  // Some systems use account-specific subdomains
  const response = await fetch('https://1fd319f3-0a8b-4314-bb82-603f47fe20e9.inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'api-auth-applicationkey': API_KEY
    }
  }).catch(err => {
    console.log('DNS Error (expected):', err.message);
    return { status: 'DNS_ERROR', text: () => err.message };
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

// Test 12: OAuth2 style
async function test12_OAuth2Style() {
  console.log('\n=== Test 12: OAuth2 Style ===');
  
  const response = await fetch('https://inventory.dearsystems.com/ExternalApi/Me', {
    method: 'GET',
    headers: {
      'Authorization': `OAuth ${API_KEY}`,
      'X-OAuth-Account': ACCOUNT_ID
    }
  });
  
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text.substring(0, 100));
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('CIN7 COMPREHENSIVE AUTHENTICATION TEST');
  console.log('Testing ALL possible authentication methods');
  console.log('='.repeat(60));
  console.log('Account ID:', ACCOUNT_ID);
  console.log('Current API Key:', API_KEY);
  console.log('Old API Key:', OLD_API_KEY);
  console.log('='.repeat(60));
  
  await test1_StandardHeaders();
  await test2_Base64Auth();
  await test3_BearerToken();
  await test4_QueryParams();
  await test5_XAPIHeaders();
  await test6_CombinedAuth();
  await test7_APIKeyOnly();
  await test8_OldAPIKey();
  await test9_WrongCredentials();
  await test10_CookieAuth();
  await test11_AccountSubdomain();
  await test12_OAuth2Style();
  
  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS:');
  console.log('If ALL tests return the same "Incorrect credentials!" error,');
  console.log('then the CIN7 external API is not functioning properly.');
  console.log('This is a CIN7 service issue, not a code issue.');
  console.log('='.repeat(60));
}

runAllTests().catch(console.error);