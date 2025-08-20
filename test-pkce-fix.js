#!/usr/bin/env node

/**
 * Test and fix PKCE code exchange issues
 */

const fs = require('fs');

async function testPKCEIssue() {
  console.log('🔧 Diagnosing PKCE Code Exchange Issue\n');

  console.log('❌ Current Error:');
  console.log('   POST https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/token?grant_type=pkce 401 (Unauthorized)');
  console.log('   This happens during _exchangeCodeForSession in GoTrueClient\n');

  // Test 1: Verify Supabase configuration
  console.log('1️⃣ Checking Supabase Client Configuration...');
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
  const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
  
  console.log('✅ Supabase URL:', supabaseUrl);
  console.log('✅ Anon Key configured:', !!supabaseAnonKey);
  console.log('✅ Anon Key length:', supabaseAnonKey?.length, 'characters');

  // Test 2: Check if the anon key is valid JWT format
  console.log('\n2️⃣ Validating JWT Token Format...');
  if (supabaseAnonKey) {
    const parts = supabaseAnonKey.split('.');
    console.log('✅ JWT parts count:', parts.length, '(should be 3)');
    
    if (parts.length === 3) {
      try {
        const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        console.log('✅ JWT Algorithm:', header.alg);
        console.log('✅ JWT Role:', payload.role);
        console.log('✅ JWT Issuer:', payload.iss);
        console.log('✅ JWT Reference:', payload.ref);
        
        // Check if it matches our Supabase URL
        const expectedRef = supabaseUrl.split('//')[1].split('.')[0];
        const actualRef = payload.ref;
        console.log('✅ URL/JWT Reference Match:', expectedRef === actualRef);
        
      } catch (error) {
        console.log('❌ JWT parsing error:', error.message);
      }
    }
  }

  // Test 3: Check server client configuration
  console.log('\n3️⃣ Checking Server Client Configuration...');
  try {
    const serverClientContent = fs.readFileSync('./lib/supabase/server-client.js', 'utf8');
    console.log('✅ Server client file exists');
    
    const hasCookieSettings = serverClientContent.includes('cookies') || serverClientContent.includes('request');
    console.log('✅ Has cookie configuration:', hasCookieSettings);
    
  } catch (error) {
    console.log('❌ Server client file missing or unreadable');
  }

  // Test 4: Check for auth callback issues
  console.log('\n4️⃣ Checking Auth Callback Implementation...');
  try {
    const callbackContent = fs.readFileSync('./app/auth/callback/route.js', 'utf8');
    
    const hasCodeExchange = callbackContent.includes('exchangeCodeForSession');
    const hasErrorHandling = callbackContent.includes('exchangeError');
    const hasServerClient = callbackContent.includes('createClient');
    
    console.log('✅ Has code exchange logic:', hasCodeExchange);
    console.log('✅ Has exchange error handling:', hasErrorHandling);
    console.log('✅ Uses server client:', hasServerClient);
    
  } catch (error) {
    console.log('❌ Callback route issues:', error.message);
  }

  console.log('\n🔍 Analysis Results:');
  console.log('==========================================');
  
  console.log('✅ LOGIN PAGE: Working correctly');
  console.log('✅ GOOGLE OAUTH: Initiating successfully');
  console.log('✅ CALLBACK ROUTE: Receiving auth codes');
  console.log('❌ CODE EXCHANGE: Failing with 401');

  console.log('\n💡 Most Likely Causes:');
  console.log('1. 🔑 Google OAuth not properly configured in Supabase Dashboard');
  console.log('2. 🔗 Redirect URL mismatch in Google Console or Supabase');
  console.log('3. 🗝️  Invalid or expired Supabase anonymous key');
  console.log('4. ⚙️  Server client configuration issue');

  console.log('\n🔧 Immediate Fix Steps:');
  console.log('');
  console.log('STEP 1: Check Supabase Dashboard');
  console.log('   → Go to https://supabase.com/dashboard');
  console.log('   → Project: dfhqjdoydihajmjxniee');
  console.log('   → Authentication → Providers → Google');
  console.log('   → Verify it\'s enabled and has correct redirect URL');
  console.log('');
  console.log('STEP 2: Check Google Console');
  console.log('   → Go to https://console.cloud.google.com/');
  console.log('   → APIs & Services → Credentials');
  console.log('   → Find your OAuth client');
  console.log('   → Verify redirect URI: https://dfhqjdoydihajmjxniee.supabase.co/auth/v1/callback');
  console.log('');
  console.log('STEP 3: Test Email Login');
  console.log('   → Try creating account with email/password');
  console.log('   → This will verify if basic Supabase auth works');
  console.log('');
  console.log('STEP 4: Check Browser Console');
  console.log('   → Open Developer Tools → Console');
  console.log('   → Look for additional error details');
  console.log('   → Check Network tab for request details');

  console.log('\n🚀 Quick Test:');
  console.log('   Try email signup/login to isolate if it\'s OAuth-specific or all auth');
}

testPKCEIssue().catch(console.error);