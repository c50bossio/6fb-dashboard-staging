#!/usr/bin/env node

/**
 * Debug OAuth configuration mismatch
 * Check what Supabase thinks vs what Google expects
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://dfhqjdoydihajmjxniee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI';

async function debugOAuthMismatch() {
  console.log('🕵️  Debugging OAuth Configuration Mismatch\n');
  console.log('='.repeat(70));
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test 1: Get the full OAuth URL that Supabase generates
  console.log('\n1️⃣ Analyzing Supabase OAuth URL Generation...');
  
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://bookedbarber.com/auth/callback',
        skipBrowserRedirect: true
      }
    });
    
    if (error) {
      console.log('   ❌ OAuth Error:', error.message);
      return;
    }
    
    if (data?.url) {
      console.log('   ✅ OAuth URL generated');
      
      const oauthUrl = new URL(data.url);
      console.log('\n2️⃣ OAuth URL Analysis:');
      console.log('   Full URL:', data.url);
      console.log('\n   URL Parameters:');
      
      // Extract all parameters
      const params = {};
      for (const [key, value] of oauthUrl.searchParams.entries()) {
        params[key] = value;
        console.log(`   • ${key}: ${value}`);
      }
      
      // Critical checks
      console.log('\n3️⃣ Critical Configuration Checks:');
      
      const clientId = params.client_id;
      if (clientId) {
        console.log(`   ✅ Client ID found: ${clientId}`);
        
        // Check if this matches your Google Cloud Console
        const expectedClientId = '106401305925-sbsnlgs8i87bclfoi38pqr8os519v913.apps.googleusercontent.com';
        if (clientId === expectedClientId) {
          console.log('   ✅ Client ID MATCHES Google Cloud Console');
        } else {
          console.log('   ❌ Client ID MISMATCH!');
          console.log(`   Expected: ${expectedClientId}`);
          console.log(`   Supabase: ${clientId}`);
        }
      } else {
        console.log('   ❌ No client_id in OAuth URL - credentials not configured in Supabase');
      }
      
      const redirectUri = params.redirect_uri;
      if (redirectUri) {
        console.log(`   ✅ Redirect URI: ${redirectUri}`);
        
        const expectedRedirectUri = 'https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback';
        if (redirectUri === expectedRedirectUri) {
          console.log('   ✅ Redirect URI is correct');
        } else {
          console.log('   ⚠️  Redirect URI might not match Google Cloud Console');
        }
      }
      
      const responseType = params.response_type;
      const scope = params.scope;
      
      console.log(`   • Response Type: ${responseType}`);
      console.log(`   • Scope: ${scope}`);
      
      // Test 4: Try to access the OAuth URL to see what Google says
      console.log('\n4️⃣ Testing OAuth URL with Google...');
      
      const urlToTest = data.url.split('&')[0] + '&' + data.url.split('&').slice(1, 3).join('&');
      console.log('   Testing URL (truncated):', urlToTest + '...');
      
      // Make a request to see what Google responds with
      https.get(data.url, (res) => {
        console.log(`   → Google Response Status: ${res.statusCode}`);
        console.log(`   → Response Headers:`, Object.keys(res.headers));
        
        if (res.statusCode === 302 || res.statusCode === 200) {
          console.log('   ✅ Google accepted the OAuth request');
        } else {
          console.log('   ❌ Google rejected the OAuth request');
        }
        
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          if (responseData.includes('error')) {
            console.log('   ❌ Google returned an error in response');
            console.log('   Error details:', responseData.substring(0, 200) + '...');
          }
        });
      }).on('error', (err) => {
        console.log('   ❌ Could not test with Google:', err.message);
      });
      
    }
  } catch (err) {
    console.log('   ❌ Unexpected error:', err.message);
  }
  
  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n' + '='.repeat(70));
  console.log('📋 DIAGNOSIS:\n');
  
  console.log('If Client ID matches and OAuth URL is generated:');
  console.log('• The issue might be in Google Cloud Console configuration');
  console.log('• Check if OAuth consent screen is properly configured');
  console.log('• Verify all redirect URIs are exactly correct');
  console.log('• Ensure the OAuth client is not in testing mode only');
  
  console.log('\nIf Client ID is missing or mismatched:');
  console.log('• Supabase doesn\'t have the right Google credentials');
  console.log('• Double-check the Client ID and Secret in Supabase dashboard');
  
  process.exit(0);
}

debugOAuthMismatch().catch(err => {
  console.error('Debug failed:', err);
  process.exit(1);
});