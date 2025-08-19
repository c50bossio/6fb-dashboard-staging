#!/usr/bin/env node

/**
 * Test if Google OAuth is configured in Supabase
 * This will attempt to generate an OAuth URL to see if the provider is enabled
 */

const { createClient } = require('@supabase/supabase-js');

// Production Supabase credentials
const SUPABASE_URL = 'https://dfhqjdoydihajmjxniee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI';

async function testOAuthConfig() {
  console.log('🔍 Testing Google OAuth Configuration Status\n');
  console.log('='.repeat(60));
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test 1: Try to generate OAuth URL
  console.log('\n1️⃣ Testing OAuth URL Generation...');
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://bookedbarber.com/auth/callback',
        skipBrowserRedirect: true
      }
    });
    
    if (error) {
      console.log('   ❌ Error:', error.message);
      if (error.message.includes('not enabled')) {
        console.log('   → Google OAuth is NOT enabled in Supabase');
        console.log('   → Need to enable it at: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/providers');
      }
    } else if (data?.url) {
      console.log('   ✅ OAuth URL generated successfully!');
      console.log('   → Google OAuth IS enabled in Supabase\n');
      
      // Parse the OAuth URL to extract configuration details
      const oauthUrl = new URL(data.url);
      console.log('2️⃣ OAuth Configuration Details:');
      console.log('   OAuth Provider:', oauthUrl.hostname);
      
      // Check for client_id in the URL
      const clientId = oauthUrl.searchParams.get('client_id');
      if (clientId) {
        console.log('   Client ID found:', clientId.substring(0, 30) + '...');
        console.log('   ✅ Google OAuth appears to be FULLY configured');
      } else {
        console.log('   ⚠️  No client_id found in OAuth URL');
        console.log('   → Google OAuth is enabled but may not have credentials');
      }
      
      // Check redirect URI
      const redirectUri = oauthUrl.searchParams.get('redirect_uri');
      if (redirectUri) {
        console.log('   Redirect URI:', redirectUri);
        if (redirectUri.includes('supabase.co/auth/v1/callback')) {
          console.log('   ✅ Correct Supabase callback URL');
        }
      }
      
      // Full OAuth URL (truncated for security)
      console.log('\n3️⃣ Full OAuth URL (for debugging):');
      console.log('   ' + data.url.substring(0, 150) + '...');
    }
  } catch (err) {
    console.log('   ❌ Unexpected error:', err.message);
  }
  
  // Test 2: Check if we can reach the auth endpoint
  console.log('\n4️⃣ Testing Supabase Auth Endpoint...');
  
  const https = require('https');
  const authUrl = `${SUPABASE_URL}/auth/v1/providers`;
  
  https.get(authUrl, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const providers = JSON.parse(data);
        console.log('   ✅ Auth endpoint accessible');
        
        // Check if Google is in the list of providers
        if (providers && Array.isArray(providers)) {
          const googleProvider = providers.find(p => p === 'google');
          if (googleProvider) {
            console.log('   ✅ Google is listed as an available provider');
          } else {
            console.log('   ⚠️  Google not found in provider list');
          }
        }
      } catch (e) {
        console.log('   ℹ️  Could not parse provider list');
      }
    });
  }).on('error', (err) => {
    console.log('   ⚠️  Could not reach auth endpoint:', err.message);
  });
  
  // Wait for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 CONFIGURATION STATUS SUMMARY:\n');
  
  console.log('To complete Google OAuth setup, you need to:');
  console.log('1. ✅ Supabase project is accessible');
  console.log('2. ❓ Enable Google OAuth in Supabase (checking above)');
  console.log('3. ❓ Add Google Client ID & Secret to Supabase');
  console.log('4. ❓ Configure redirect URIs in Google Cloud Console');
  
  console.log('\n🔗 Quick Links:');
  console.log('• Supabase Providers: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/providers');
  console.log('• Google Cloud Console: https://console.cloud.google.com/apis/credentials');
  
  process.exit(0);
}

// Run the test
testOAuthConfig().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});