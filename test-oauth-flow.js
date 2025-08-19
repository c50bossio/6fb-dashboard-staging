#!/usr/bin/env node

const https = require('https');

console.log('OAuth Flow Test Script');
console.log('======================\n');

// Test the login page
console.log('1. Testing login page availability...');
https.get('https://bookedbarber.com/login', (res) => {
  console.log(`   Status: ${res.statusCode}`);
  console.log(`   Headers:`, res.headers['set-cookie'] ? 'Cookies are being set' : 'No cookies set');
  
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    if (body.includes('Continue with Google')) {
      console.log('   ✅ Google OAuth button found\n');
    } else {
      console.log('   ⚠️ Google OAuth button not found\n');
    }
    
    // Extract the OAuth URL
    const oauthMatch = body.match(/href="(https:\/\/dfhqjdoydihajmjxniee\.supabase\.co\/auth\/v1\/authorize[^"]+)"/);
    if (oauthMatch) {
      const oauthUrl = oauthMatch[1].replace(/&amp;/g, '&');
      console.log('2. OAuth URL found:');
      console.log('   ' + oauthUrl.substring(0, 100) + '...\n');
      
      // Parse OAuth parameters
      const url = new URL(oauthUrl);
      console.log('3. OAuth Parameters:');
      console.log('   Provider:', url.searchParams.get('provider'));
      console.log('   Redirect To:', url.searchParams.get('redirect_to'));
      console.log('   Response Type:', url.searchParams.get('response_type'));
      console.log('   Flow Type:', url.searchParams.get('flow_type'));
      console.log('   Has Code Challenge:', url.searchParams.has('code_challenge') ? 'Yes (PKCE enabled)' : 'No');
      console.log('   Code Challenge Method:', url.searchParams.get('code_challenge_method') || 'N/A');
      
      console.log('\n4. Expected OAuth Flow:');
      console.log('   a. User clicks "Continue with Google"');
      console.log('   b. Redirects to Supabase OAuth URL (above)');
      console.log('   c. Supabase redirects to Google consent screen');
      console.log('   d. Google redirects back to: https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback');
      console.log('   e. Supabase redirects to: https://bookedbarber.com/auth/callback?code=...');
      console.log('   f. App exchanges code for session and redirects to dashboard');
      
      console.log('\n5. Current Issue:');
      console.log('   Step (e) is failing - exchangeCodeForSession returns an error');
      console.log('   This is likely because the PKCE code_verifier cookie is not persisting');
      
      console.log('\n6. To Test Manually:');
      console.log('   1. Open https://bookedbarber.com/login in an incognito window');
      console.log('   2. Open Developer Tools > Network tab');
      console.log('   3. Click "Continue with Google"');
      console.log('   4. Complete OAuth flow');
      console.log('   5. Check console for "OAuth Callback Debug" message');
      console.log('   6. Look for "hasCodeVerifier" in the debug output');
      
    } else {
      console.log('   ⚠️ OAuth URL not found in page\n');
    }
  });
}).on('error', (err) => {
  console.error('Error testing login page:', err.message);
});