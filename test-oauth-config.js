#!/usr/bin/env node

const https = require('https');

console.log('OAuth Configuration Test');
console.log('========================\n');

const SUPABASE_URL = 'https://dfhqjdoydihajmjxniee.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI';

// Test 1: Check Supabase Auth Settings
console.log('1. Checking Supabase Auth Settings...');
const authSettingsUrl = `${SUPABASE_URL}/auth/v1/settings`;

https.get(authSettingsUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const settings = JSON.parse(data);
      console.log('   Site URL:', settings.site_url || 'Not set');
      console.log('   External providers enabled:', Object.keys(settings.external || {}).filter(k => settings.external[k]).join(', '));
      console.log('   Redirect URLs configured:', settings.redirect_urls ? 'Yes' : 'No');
      
      if (settings.external && settings.external.google) {
        console.log('   ✅ Google OAuth is enabled\n');
      } else {
        console.log('   ❌ Google OAuth is NOT enabled\n');
      }
    } catch (e) {
      console.log('   Error parsing settings:', e.message);
    }
    
    // Test 2: Generate OAuth URL
    console.log('2. Generating OAuth URL...');
    const oauthUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    oauthUrl.searchParams.set('provider', 'google');
    oauthUrl.searchParams.set('redirect_to', 'https://bookedbarber.com/auth/callback');
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('client_id', 'dfhqjdoydihajmjxniee');
    oauthUrl.searchParams.set('flow_type', 'pkce');
    
    console.log('   OAuth URL:', oauthUrl.toString().substring(0, 150) + '...\n');
    
    // Test 3: Check if URL is allowed
    console.log('3. Testing redirect URL validation...');
    const testRedirectUrl = 'https://bookedbarber.com/auth/callback';
    console.log('   Testing URL:', testRedirectUrl);
    
    // Make a request with the redirect URL
    const testUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
    testUrl.searchParams.set('provider', 'google');
    testUrl.searchParams.set('redirect_to', testRedirectUrl);
    
    https.get(testUrl.toString(), (res) => {
      if (res.statusCode === 302 || res.statusCode === 303) {
        console.log('   ✅ Redirect URL appears to be allowed (status:', res.statusCode + ')');
      } else if (res.statusCode === 400) {
        console.log('   ❌ Redirect URL might not be in allow list (status:', res.statusCode + ')');
      } else {
        console.log('   Status:', res.statusCode);
      }
      console.log('   Location header:', res.headers.location ? res.headers.location.substring(0, 100) + '...' : 'Not set');
      
      console.log('\n4. Configuration Checklist:');
      console.log('   [ ] Supabase Site URL set to: https://bookedbarber.com');
      console.log('   [ ] Redirect URLs include: https://bookedbarber.com/**');
      console.log('   [ ] Google OAuth Client ID configured in Supabase');
      console.log('   [ ] Google OAuth Client Secret configured in Supabase');
      console.log('   [ ] Google Cloud Console has: https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback');
      console.log('\n5. Common Issues:');
      console.log('   - If Site URL doesn\'t match production domain, exchangeCodeForSession fails');
      console.log('   - If redirect URL not in allow list, OAuth initiation fails');
      console.log('   - If Google credentials wrong, Google OAuth fails');
      console.log('   - If PKCE cookies blocked, code exchange fails');
    });
  });
}).on('error', (err) => {
  console.error('Error checking auth settings:', err.message);
});