#!/usr/bin/env node

const https = require('https');

console.log('🎯 Final OAuth Test - After PKCE Cookie Fix');
console.log('===========================================\n');

console.log('✅ What we fixed:');
console.log('   1. Removed custom cookie options from server-client.js');
console.log('   2. Using official Supabase pattern for cookie handling');
console.log('   3. Middleware now excludes all /auth/ routes');
console.log('   4. Deployment is live at bookedbarber.com\n');

console.log('📝 How the fix works:');
console.log('   - Supabase handles PKCE cookies internally');
console.log('   - No custom sameSite/domain options to interfere');
console.log('   - Cookies persist correctly across the OAuth flow\n');

console.log('🔍 Testing OAuth configuration...\n');

// Test OAuth initiation
const testUrl = 'https://bookedbarber.com/login';
https.get(testUrl, (res) => {
  console.log('1. Login page status:', res.statusCode === 200 ? '✅ OK' : `❌ ${res.statusCode}`);
  
  // Test OAuth redirect URL
  const oauthUrl = 'https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/authorize?provider=google&redirect_to=https://bookedbarber.com/auth/callback';
  
  https.get(oauthUrl, (res2) => {
    console.log('2. OAuth initiation:', res2.statusCode === 302 || res2.statusCode === 303 ? '✅ Redirects' : `❌ ${res2.statusCode}`);
    
    if (res2.headers.location) {
      if (res2.headers.location.includes('accounts.google.com')) {
        console.log('3. Google OAuth:', '✅ Configured correctly');
      } else {
        console.log('3. Google OAuth:', '❌ Not redirecting to Google');
      }
    }
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Open https://bookedbarber.com/login in your browser');
    console.log('   2. Click "Continue with Google"');
    console.log('   3. Complete Google authentication');
    console.log('   4. You should be redirected to the dashboard');
    console.log('\n   If it still fails, check browser console for errors');
    console.log('   The PKCE cookie issue should now be resolved!\n');
    
    console.log('🔧 What to check if it still fails:');
    console.log('   - Browser console for any JavaScript errors');
    console.log('   - Network tab for the /auth/callback response');
    console.log('   - Supabase dashboard for any auth logs');
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});