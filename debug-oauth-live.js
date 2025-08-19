#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

console.log('🔍 OAuth Debugging Script - Live Test');
console.log('=====================================\n');

// Test the actual OAuth flow
async function testOAuthFlow() {
  console.log('1. Testing OAuth Initiation from bookedbarber.com...');
  
  // Simulate what the browser does
  const oauthUrl = new URL('https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/authorize');
  oauthUrl.searchParams.set('provider', 'google');
  oauthUrl.searchParams.set('redirect_to', 'https://bookedbarber.com/auth/callback');
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('client_id', 'dfhqjdoydihajmjxniee');
  oauthUrl.searchParams.set('flow_type', 'pkce');
  oauthUrl.searchParams.set('code_challenge_method', 'S256');
  
  console.log('   OAuth URL:', oauthUrl.toString().substring(0, 150) + '...');
  
  // Test if Supabase accepts the redirect URL
  await new Promise((resolve) => {
    https.get(oauthUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    }, (res) => {
      console.log('   Response Status:', res.statusCode);
      console.log('   Location Header:', res.headers.location ? res.headers.location.substring(0, 100) + '...' : 'None');
      
      if (res.statusCode === 302 || res.statusCode === 303) {
        const location = res.headers.location || '';
        if (location.includes('accounts.google.com')) {
          console.log('   ✅ OAuth initiation successful - redirects to Google');
        } else if (location.includes('error')) {
          console.log('   ❌ OAuth initiation failed - contains error');
        }
      } else {
        console.log('   ⚠️ Unexpected status code');
      }
      resolve();
    }).on('error', (err) => {
      console.error('   Error:', err.message);
      resolve();
    });
  });
  
  console.log('\n2. Checking Supabase Project Settings...');
  
  // Get auth settings
  await new Promise((resolve) => {
    https.get('https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/settings', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const settings = JSON.parse(data);
          console.log('   Site URL:', settings.site_url || 'NOT SET');
          console.log('   External Providers:', Object.keys(settings.external || {}).filter(k => settings.external[k]).join(', ') || 'NONE');
          
          if (settings.site_url !== 'https://bookedbarber.com') {
            console.log('   ❌ CRITICAL: Site URL does not match bookedbarber.com');
            console.log('      This is why exchangeCodeForSession fails!');
          } else {
            console.log('   ✅ Site URL matches bookedbarber.com');
          }
          
          if (settings.external && settings.external.google) {
            console.log('   ✅ Google OAuth is enabled');
          } else {
            console.log('   ❌ Google OAuth is NOT enabled');
          }
        } catch (e) {
          console.log('   Error parsing settings:', e.message);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('   Error:', err.message);
      resolve();
    });
  });
  
  console.log('\n3. Testing Cookie Domain Issues...');
  console.log('   When OAuth redirects from Google → Supabase → bookedbarber.com:');
  console.log('   - Cookies set on dfhqjdoydihajmjxniee.supabase.co won\'t be accessible on bookedbarber.com');
  console.log('   - PKCE code_verifier must persist across this redirect chain');
  console.log('   - If Site URL doesn\'t match, Supabase rejects the code exchange');
  
  console.log('\n4. Required Supabase Dashboard Settings:');
  console.log('   📍 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/settings/api');
  console.log('   ✅ Site URL must be: https://bookedbarber.com');
  console.log('   ');
  console.log('   📍 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/url-configuration');
  console.log('   ✅ Redirect URLs must include:');
  console.log('      - https://bookedbarber.com/**');
  console.log('      - https://www.bookedbarber.com/**');
  console.log('   ');
  console.log('   📍 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/providers');
  console.log('   ✅ Google provider must have:');
  console.log('      - Client ID from Google Cloud Console');
  console.log('      - Client Secret from Google Cloud Console');
  console.log('      - Enabled status');
  
  console.log('\n5. Google Cloud Console Settings:');
  console.log('   📍 Go to: https://console.cloud.google.com/apis/credentials');
  console.log('   ✅ Authorized JavaScript origins must include:');
  console.log('      - https://bookedbarber.com');
  console.log('      - https://www.bookedbarber.com');
  console.log('   ✅ Authorized redirect URIs must have EXACTLY:');
  console.log('      - https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback');
  
  console.log('\n6. Quick Fix Checklist:');
  console.log('   [ ] Update Site URL in Supabase to https://bookedbarber.com');
  console.log('   [ ] Add redirect URLs to allow list');
  console.log('   [ ] Verify Google OAuth credentials are set');
  console.log('   [ ] Clear browser cookies and try again');
}

testOAuthFlow().catch(console.error);