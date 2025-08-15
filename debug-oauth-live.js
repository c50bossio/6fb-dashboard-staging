// Live OAuth Debugging Script
// Run this in the browser console when stuck on the callback page

console.log('🔍 LIVE OAUTH DEBUGGING');
console.log('========================\n');

// 1. Check URL parameters
const urlParams = new URLSearchParams(window.location.search);
console.log('📍 URL PARAMETERS:');
console.log('  Code:', urlParams.get('code') ? '✅ Present' : '❌ Missing');
console.log('  State:', urlParams.get('state') || 'none');
console.log('  Error:', urlParams.get('error') || 'none');
console.log('  Error Description:', urlParams.get('error_description') || 'none');

// 2. Check localStorage for Supabase auth
console.log('\n💾 LOCALSTORAGE SUPABASE KEYS:');
const localKeys = Object.keys(localStorage);
const supabaseKeys = localKeys.filter(key => key.includes('sb-') || key.includes('supabase'));
supabaseKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (parsed.access_token) {
        console.log(`  ${key}: ✅ Has access_token`);
      } else if (parsed.code_verifier) {
        console.log(`  ${key}: 🔑 Has PKCE verifier`);
      } else {
        console.log(`  ${key}: ${value.substring(0, 50)}...`);
      }
    } catch {
      console.log(`  ${key}: ${value.substring(0, 50)}...`);
    }
  }
});

// 3. Check sessionStorage for plan data
console.log('\n📦 SESSIONSTORAGE:');
const sessionKeys = Object.keys(sessionStorage);
sessionKeys.forEach(key => {
  const value = sessionStorage.getItem(key);
  console.log(`  ${key}:`, value ? JSON.parse(value) : 'empty');
});

// 4. Try to manually create Supabase client and check
console.log('\n🔐 TESTING SUPABASE CLIENT:');
if (window.supabase) {
  console.log('  ✅ Global Supabase client exists');
} else {
  console.log('  ❌ No global Supabase client');
}

// 5. Check for PKCE flow requirements
console.log('\n🔑 PKCE FLOW CHECK:');
const pkceKey = 'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier';
const verifier = localStorage.getItem(pkceKey);
if (verifier) {
  console.log('  ✅ PKCE code verifier found:', verifier.substring(0, 20) + '...');
} else {
  console.log('  ❌ PKCE code verifier MISSING - this is why exchange fails!');
}

// 6. Check all storage for auth-related data
console.log('\n🔍 ALL AUTH-RELATED STORAGE:');
[...localKeys, ...sessionKeys].forEach(key => {
  if (key.includes('auth') || key.includes('oauth') || key.includes('pkce') || key.includes('verifier')) {
    const localValue = localStorage.getItem(key);
    const sessionValue = sessionStorage.getItem(key);
    if (localValue) console.log(`  localStorage.${key}:`, localValue.substring(0, 50) + '...');
    if (sessionValue) console.log(`  sessionStorage.${key}:`, sessionValue.substring(0, 50) + '...');
  }
});

// 7. Analysis
console.log('\n📊 ANALYSIS:');
const hasCode = urlParams.get('code');
const hasVerifier = !!verifier;

if (!hasCode) {
  console.log('❌ No authorization code - OAuth provider redirect failed');
  console.log('   → Check Supabase redirect URL configuration');
} else if (!hasVerifier) {
  console.log('❌ Code present but NO PKCE verifier!');
  console.log('   → This means the OAuth was initiated incorrectly');
  console.log('   → The browser lost the PKCE verifier during redirect');
  console.log('   → Possible causes:');
  console.log('     • Browser privacy settings blocking localStorage');
  console.log('     • Different origin between initiation and callback');
  console.log('     • Supabase client not storing verifier properly');
} else {
  console.log('⚠️ Both code and verifier present - exchange should work');
  console.log('   → Check browser console for exchange errors');
  console.log('   → May be a timing issue with Supabase client initialization');
}

console.log('\n💡 QUICK FIX ATTEMPTS:');
console.log('1. Clear everything and retry:');
console.log('   localStorage.clear(); sessionStorage.clear(); location.href="/register"');
console.log('2. Check if different browser works (Safari vs Chrome)');
console.log('3. Disable browser extensions that might block storage');