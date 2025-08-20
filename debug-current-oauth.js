#!/usr/bin/env node

/**
 * Debug the current OAuth state - is it working or not?
 */

const fs = require('fs');

async function debugCurrentOAuth() {
  console.log('🔍 Current OAuth Status Debug\n');

  // First, let's check what the user is experiencing
  console.log('❓ User Report: "it was just working"');
  console.log('❌ But still seeing: 401 PKCE token error');
  console.log('❌ Server logs show: "OAuth callback - Code present: false"\n');

  // Check if environment variables were updated
  console.log('1️⃣ Checking if Google OAuth was actually configured...');
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  const googleClientId = envContent.match(/NEXT_PUBLIC_GOOGLE_CLIENT_ID=(.+)/)?.[1];
  const googleClientSecret = envContent.match(/GOOGLE_CLIENT_SECRET=(.+)/)?.[1];
  
  const isConfigured = !googleClientId?.includes('your-google') && !googleClientSecret?.includes('your-google');
  
  console.log('✅ Google Client ID updated:', !googleClientId?.includes('your-google'));
  console.log('✅ Google Client Secret updated:', !googleClientSecret?.includes('your-google'));
  console.log('✅ OAuth appears configured:', isConfigured);
  
  if (!isConfigured) {
    console.log('❌ ISSUE: Environment variables still contain placeholders');
    console.log('   Current Client ID:', googleClientId);
  }

  // Test what's actually happening in the OAuth flow
  console.log('\n2️⃣ Testing OAuth Flow Behavior...');
  
  console.log('🔍 From server logs, here\'s what\'s happening:');
  console.log('   1. User clicks "Continue with Google"');
  console.log('   2. Browser redirects to Google');
  console.log('   3. Google should redirect back with code');
  console.log('   4. BUT: "OAuth callback - Code present: false"');
  console.log('   5. This means Google isn\'t sending back an auth code');

  console.log('\n3️⃣ Diagnosing Why No Code is Received...');
  console.log('');
  console.log('Possible causes:');
  console.log('❌ Google Console redirect URL incorrect');
  console.log('❌ Supabase Google provider not enabled');
  console.log('❌ Client ID/Secret mismatch');
  console.log('❌ Environment variables not reloaded');

  console.log('\n🎯 Current Actual Status:');
  console.log('==========================================');
  
  if (isConfigured) {
    console.log('✅ Environment variables appear configured');
    console.log('❌ BUT: OAuth flow still failing');
    console.log('❌ No authorization code received from Google');
    console.log('❌ 401 PKCE errors still occurring');
    console.log('');
    console.log('🔧 NEXT STEP: Verify Supabase Dashboard configuration');
    console.log('   → Go to Supabase Dashboard');
    console.log('   → Authentication → Providers → Google');
    console.log('   → Make sure it\'s ENABLED and has correct credentials');
  } else {
    console.log('❌ Environment variables still have placeholder values');
    console.log('❌ Google OAuth not actually configured yet');
    console.log('');
    console.log('🔧 NEXT STEP: Complete Google OAuth setup');
    console.log('   1. Set up OAuth in Google Cloud Console');
    console.log('   2. Configure in Supabase Dashboard'); 
    console.log('   3. Update .env.local with real credentials');
    console.log('   4. Restart development server');
  }

  console.log('\n🧪 Quick Test Instructions:');
  console.log('1. Open browser to: http://localhost:9999/login');
  console.log('2. Click "Continue with Google"');
  console.log('3. If it redirects to Google login → OAuth initiation works');
  console.log('4. If it redirects back without login → callback fails');
  console.log('5. Check browser console for exact error messages');
}

debugCurrentOAuth().catch(console.error);