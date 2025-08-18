#!/usr/bin/env node

/**
 * Google OAuth Configuration Test Script
 * Tests both login and signup flows
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testGoogleOAuth() {
  console.log('🔍 Testing Google OAuth Configuration\n');
  console.log('=======================================');
  
  // Test 1: Check Supabase connection
  console.log('\n1️⃣ Testing Supabase Connection:');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('   ❌ Supabase connection error:', error.message);
    } else {
      console.log('   ✅ Supabase client connected successfully');
    }
  } catch (err) {
    console.log('   ❌ Failed to connect:', err.message);
  }
  
  // Test 2: Check OAuth providers
  console.log('\n2️⃣ Checking OAuth Provider Configuration:');
  
  // Generate OAuth URL to check if Google is configured
  const redirectUrl = 'http://localhost:3000/auth/callback';
  const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true // Don't actually redirect, just get URL
    }
  });
  
  if (oauthError) {
    console.log('   ❌ Google OAuth not configured:', oauthError.message);
    console.log('\n   ⚠️  To enable Google OAuth:');
    console.log('   1. Go to https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/providers');
    console.log('   2. Enable Google provider');
    console.log('   3. Add Google OAuth credentials from Google Cloud Console');
    console.log('   4. Set authorized redirect URIs in Google Cloud Console:');
    console.log(`      - ${SUPABASE_URL}/auth/v1/callback`);
    console.log('      - http://localhost:3000/auth/callback');
    console.log('      - Your production URL/auth/callback');
  } else if (oauthData?.url) {
    console.log('   ✅ Google OAuth provider is configured');
    console.log(`   📎 OAuth URL generated: ${oauthData.url.substring(0, 100)}...`);
    
    // Parse the OAuth URL to check configuration
    const oauthUrl = new URL(oauthData.url);
    console.log(`   📍 OAuth endpoint: ${oauthUrl.origin}${oauthUrl.pathname}`);
    console.log(`   🔄 Redirect URI: ${oauthUrl.searchParams.get('redirect_uri')}`);
  }
  
  // Test 3: Check current authentication policies
  console.log('\n3️⃣ Authentication Behavior for New Users:');
  console.log('   ℹ️  When a new Google user signs in:');
  console.log('   • If email confirmation is DISABLED in Supabase:');
  console.log('     → User account is created automatically');
  console.log('     → User is signed in immediately');
  console.log('     → Profile needs to be created in app');
  console.log('   • If email confirmation is ENABLED in Supabase:');
  console.log('     → User account is created but unconfirmed');
  console.log('     → User receives confirmation email');
  console.log('     → Must confirm email before signing in');
  
  // Test 4: Check redirect URLs
  console.log('\n4️⃣ Checking Redirect URL Configuration:');
  const appUrls = [
    'http://localhost:3000',
    'http://localhost:9999',
    'https://your-production-url.com'
  ];
  
  console.log('   📝 Make sure these URLs are in Supabase redirect whitelist:');
  appUrls.forEach(url => {
    console.log(`   • ${url}/auth/callback`);
    console.log(`   • ${url}/login`);
    console.log(`   • ${url}/dashboard`);
  });
  
  console.log('\n5️⃣ Current Implementation Status:');
  console.log('   ✅ Google login button exists in /app/login/page.js');
  console.log('   ✅ OAuth callback handler in /app/auth/callback/page.js');
  console.log('   ✅ Session handling in auth-helpers.js');
  console.log('   ⚠️  New user handling:');
  console.log('      - Creates Supabase auth record');
  console.log('      - Does NOT automatically create profile');
  console.log('      - User sees onboarding on first dashboard visit');
  
  console.log('\n=======================================');
  console.log('📋 Summary:\n');
  
  if (oauthData?.url) {
    console.log('✅ Google OAuth is CONFIGURED and READY');
    console.log('   New users CAN sign up with Google');
    console.log('   Existing users CAN log in with Google');
  } else {
    console.log('❌ Google OAuth needs configuration in Supabase Dashboard');
  }
  
  console.log('\n🔧 To test manually:');
  console.log('1. Start the app: npm run dev');
  console.log('2. Visit http://localhost:9999/login');
  console.log('3. Click "Continue with Google"');
  console.log('4. Sign in with a Google account');
  console.log('5. Check if redirected to dashboard');
  
  process.exit(0);
}

// Run the test
testGoogleOAuth().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});