#!/usr/bin/env node

/**
 * Test OAuth flow configuration and identify issues
 */

const fs = require('fs');

async function testOAuthConfiguration() {
  console.log('🔍 Testing OAuth Configuration\n');

  // Test 1: Check environment variables
  console.log('1️⃣ Checking Google OAuth Environment Variables...');
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  const googleClientId = envContent.match(/NEXT_PUBLIC_GOOGLE_CLIENT_ID=(.+)/)?.[1];
  const googleClientSecret = envContent.match(/GOOGLE_CLIENT_SECRET=(.+)/)?.[1];
  
  console.log('✅ Google Client ID configured:', !!googleClientId && !googleClientId.includes('your-google'));
  console.log('✅ Google Client Secret configured:', !!googleClientSecret && !googleClientSecret.includes('your-google'));
  
  if (!googleClientId || googleClientId.includes('your-google')) {
    console.log('❌ ISSUE FOUND: Google OAuth Client ID is not properly configured');
    console.log('   Current value:', googleClientId);
  }

  // Test 2: Check Supabase configuration
  console.log('\n2️⃣ Checking Supabase Configuration...');
  const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
  const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
  
  console.log('✅ Supabase URL configured:', !!supabaseUrl);
  console.log('✅ Supabase Anon Key configured:', !!supabaseAnonKey);

  // Test 3: Check auth callback route exists
  console.log('\n3️⃣ Checking Auth Callback Configuration...');
  const callbackExists = fs.existsSync('./app/auth/callback/route.js');
  console.log('✅ Auth callback route exists:', callbackExists);
  
  if (callbackExists) {
    const callbackContent = fs.readFileSync('./app/auth/callback/route.js', 'utf8');
    const hasExchangeCode = callbackContent.includes('exchangeCodeForSession');
    const hasErrorHandling = callbackContent.includes('error') && callbackContent.includes('redirect');
    console.log('✅ Has code exchange logic:', hasExchangeCode);
    console.log('✅ Has error handling:', hasErrorHandling);
  }

  // Test 4: Check expected redirect URLs
  console.log('\n4️⃣ Checking Redirect URL Configuration...');
  console.log('Expected callback URL for Supabase: http://localhost:9999/auth/callback');
  console.log('Expected redirect after login: http://localhost:9999/dashboard');
  
  // Test 5: Check login page configuration
  console.log('\n5️⃣ Checking Login Page OAuth Setup...');
  try {
    const response = await fetch('http://localhost:9999/login');
    const html = await response.text();
    
    const hasGoogleButton = html.includes('Continue with Google');
    const hasRedirectTo = html.includes('redirectTo');
    
    console.log('✅ Google login button present:', hasGoogleButton);
    console.log('✅ Redirect configuration present:', hasRedirectTo);
  } catch (error) {
    console.log('❌ Could not test login page:', error.message);
  }

  console.log('\n📊 OAuth Flow Analysis:');
  console.log('==========================================');
  
  if (!googleClientId || googleClientId.includes('your-google')) {
    console.log('🚨 PRIMARY ISSUE: Google OAuth not configured in Supabase');
    console.log('');
    console.log('📝 To Fix This Issue:');
    console.log('1. Go to Supabase Dashboard → Authentication → Providers');
    console.log('2. Enable Google provider');
    console.log('3. Add authorized redirect URL: http://localhost:9999/auth/callback');
    console.log('4. Get Client ID and Secret from Google Console');
    console.log('5. Update .env.local with real values');
    console.log('');
    console.log('🔗 Google Console Setup:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create OAuth 2.0 credentials');
    console.log('3. Add authorized redirect URI: http://localhost:9999/auth/callback');
    console.log('4. Copy Client ID to Supabase and .env.local');
  } else {
    console.log('✅ Google OAuth appears to be configured');
    console.log('🔍 If login still fails, check Supabase logs for more details');
  }

  console.log('\n🚀 Next Steps:');
  console.log('   1. Configure Google OAuth in Supabase Dashboard');
  console.log('   2. Update environment variables with real credentials');
  console.log('   3. Test login flow again');
  console.log('   4. Check browser developer tools for errors');
}

testOAuthConfiguration().catch(console.error);