#!/usr/bin/env node

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 OAuth Callback Diagnostic');
console.log('============================\n');

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

console.log('✅ Environment variables loaded\n');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('📋 Current Configuration:');
console.log('   Supabase URL:', supabaseUrl);
console.log('   Site URL expected: https://bookedbarber.com');
console.log('   Callback URL pattern: https://bookedbarber.com/auth/callback\n');

console.log('🔍 Testing OAuth redirect URL generation...\n');

// Test what URL Supabase generates for OAuth
async function testOAuthUrl() {
  try {
    // This doesn't actually initiate OAuth, just builds the URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://bookedbarber.com/auth/callback',
        skipBrowserRedirect: true
      }
    });
    
    if (data?.url) {
      const url = new URL(data.url);
      console.log('✅ OAuth URL generated successfully');
      console.log('   Full URL:', data.url.substring(0, 150) + '...');
      console.log('   Redirect param:', url.searchParams.get('redirect_to'));
      
      // Check if the redirect URL matches what Supabase expects
      const redirectTo = url.searchParams.get('redirect_to');
      if (redirectTo === 'https://bookedbarber.com/auth/callback') {
        console.log('   ✅ Redirect URL matches expected pattern');
      } else {
        console.log('   ❌ Redirect URL mismatch!');
        console.log('      Expected: https://bookedbarber.com/auth/callback');
        console.log('      Got:', redirectTo);
      }
    }
    
    if (error) {
      console.log('❌ Error generating OAuth URL:', error.message);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

console.log('🔍 Checking Supabase Auth Settings...\n');

// Check auth settings via API
https.get(`${supabaseUrl}/auth/v1/settings`, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const settings = JSON.parse(data);
      console.log('Supabase Auth Settings:');
      console.log('   Site URL:', settings.site_url || 'NOT SET');
      console.log('   External Providers:', Object.keys(settings.external || {}).filter(k => settings.external[k]).join(', ') || 'NONE');
      
      if (settings.site_url !== 'https://bookedbarber.com') {
        console.log('\n⚠️  CRITICAL ISSUE FOUND:');
        console.log('   Site URL in Supabase:', settings.site_url);
        console.log('   Expected:', 'https://bookedbarber.com');
        console.log('   This mismatch causes exchangeCodeForSession to fail!\n');
        console.log('   FIX: Update Site URL in Supabase Dashboard to https://bookedbarber.com');
      }
      
      console.log('\n');
      testOAuthUrl();
    } catch (e) {
      console.log('   Could not parse settings');
      testOAuthUrl();
    }
  });
}).on('error', (err) => {
  console.log('   Could not fetch settings:', err.message);
  testOAuthUrl();
});