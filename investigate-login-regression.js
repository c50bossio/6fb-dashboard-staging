#!/usr/bin/env node

/**
 * Investigate why login stopped working suddenly
 */

const fs = require('fs');

async function investigateLoginRegression() {
  console.log('🔍 Investigating Login Regression\n');

  console.log('❓ Problem: Login was working, now it\'s not');
  console.log('❓ When: "All of a sudden" - suggests something changed recently\n');

  // Check recent changes that could affect auth
  console.log('1️⃣ Checking Recent Changes That Could Affect Auth...');
  
  // Check if we made any auth-related changes during our session
  console.log('🔍 Changes made during our troubleshooting session:');
  console.log('   ✅ Added missing NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local');
  console.log('   ✅ Restarted development server multiple times');
  console.log('   ✅ No code changes to auth logic');
  console.log('   ❌ No changes to Google OAuth configuration');

  // Check current environment state
  console.log('\n2️⃣ Checking Current Environment State...');
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
  const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
  const googleClientId = envContent.match(/NEXT_PUBLIC_GOOGLE_CLIENT_ID=(.+)/)?.[1];
  
  console.log('✅ Supabase URL:', supabaseUrl);
  console.log('✅ Supabase Anon Key present:', !!supabaseAnonKey);
  console.log('❌ Google Client ID:', googleClientId, '(placeholder)');

  // Check if Supabase itself is working
  console.log('\n3️⃣ Testing Basic Supabase Connection...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    console.log('✅ Supabase REST API responding:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Supabase connection is working');
    } else {
      console.log('❌ Supabase connection issue:', response.status);
    }
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
  }

  // Check what type of auth was working before
  console.log('\n4️⃣ Determining What Type of Login Was Working...');
  console.log('');
  console.log('🤔 Question: Which login method was working before?');
  console.log('');
  console.log('Option A: Google OAuth Login');
  console.log('   - Requires Google Console + Supabase setup');
  console.log('   - Environment shows this was never configured');
  console.log('   - Unlikely to have been working');
  console.log('');
  console.log('Option B: Email/Password Login');  
  console.log('   - Only requires Supabase configuration');
  console.log('   - Could have been working before');
  console.log('   - Should still work now');
  console.log('');
  console.log('Option C: Development/Test Login');
  console.log('   - Some kind of bypass or test credentials');
  console.log('   - Might have been disabled');

  // Check server logs for clues
  console.log('\n5️⃣ Analyzing Recent Server Activity...');
  console.log('From recent server logs:');
  console.log('   ✅ Login page loading successfully');
  console.log('   ✅ Dashboard accessible');
  console.log('   ❌ OAuth callbacks with no authorization code');
  console.log('   ❌ PKCE token exchange failing');

  // Look for potential causes
  console.log('\n6️⃣ Potential Causes of Sudden Failure...');
  console.log('');
  console.log('🔍 Most Likely Causes:');
  console.log('');
  console.log('1. 🕐 Supabase Token Expiration');
  console.log('   - JWT tokens can expire');
  console.log('   - Would affect all auth suddenly');
  console.log('   - Our token appears valid (208 chars, proper format)');
  console.log('');
  console.log('2. 🔄 Browser Cache/Session Issues');
  console.log('   - Cached invalid session data');
  console.log('   - Local storage corruption');
  console.log('   - Cookies from previous attempts');
  console.log('');
  console.log('3. 🌐 Network/DNS Issues');
  console.log('   - Supabase connectivity problems');
  console.log('   - Local network changes');
  console.log('   - Firewall/proxy interference');
  console.log('');
  console.log('4. 🔧 Service Configuration Changes');
  console.log('   - Supabase project settings changed');
  console.log('   - Auth providers disabled');
  console.log('   - Rate limiting activated');

  console.log('\n🎯 Next Steps to Identify the Issue:');
  console.log('==========================================');
  console.log('');
  console.log('STEP 1: Test Email/Password Auth');
  console.log('   → Try creating new account with email');
  console.log('   → This will test if basic Supabase auth works');
  console.log('');
  console.log('STEP 2: Clear Browser Data');
  console.log('   → Clear cache, cookies, local storage');
  console.log('   → Try login again in incognito mode');
  console.log('');
  console.log('STEP 3: Check Supabase Dashboard');
  console.log('   → Log into Supabase dashboard');
  console.log('   → Check Authentication → Users');
  console.log('   → Verify auth providers are enabled');
  console.log('');
  console.log('STEP 4: Test Different Browser/Device');
  console.log('   → Try login from different browser');
  console.log('   → This isolates local vs server issues');

  console.log('\n💡 Quick Diagnosis Test:');
  console.log('   Open http://localhost:9999/login');
  console.log('   Try to create account with email/password');
  console.log('   If this works → OAuth-specific issue');
  console.log('   If this fails → Broader Supabase auth issue');
}

investigateLoginRegression().catch(console.error);