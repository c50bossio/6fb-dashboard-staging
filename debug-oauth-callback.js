// DEBUG: OAuth Callback Analysis
// Run this in the browser console on the stuck callback page

console.log('🔍 DEBUGGING OAUTH CALLBACK ISSUE');
console.log('====================================\n');

// 1. Check URL parameters
const urlParams = new URLSearchParams(window.location.search);
console.log('📍 URL Parameters:');
console.log('  Code:', urlParams.get('code'));
console.log('  State:', urlParams.get('state'));
console.log('  Error:', urlParams.get('error'));
console.log('  Error Description:', urlParams.get('error_description'));

// 2. Check localStorage for Supabase session
console.log('\n💾 LocalStorage Check:');
const storageKeys = Object.keys(localStorage);
const supabaseKeys = storageKeys.filter(key => key.includes('sb-') || key.includes('supabase'));
console.log('Supabase keys in localStorage:', supabaseKeys);

supabaseKeys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`  ${key}:`, value ? value.substring(0, 100) + '...' : 'empty');
});

// 3. Check for PKCE code verifier
console.log('\n🔑 PKCE Check:');
const pkceKeys = storageKeys.filter(key => key.includes('pkce') || key.includes('verifier'));
console.log('PKCE-related keys:', pkceKeys);

// 4. Check sessionStorage
console.log('\n📦 SessionStorage Check:');
const sessionKeys = Object.keys(sessionStorage);
const authKeys = sessionKeys.filter(key => key.includes('auth') || key.includes('oauth'));
console.log('Auth-related keys in sessionStorage:', authKeys);

authKeys.forEach(key => {
  const value = sessionStorage.getItem(key);
  console.log(`  ${key}:`, value ? JSON.parse(value) : 'empty');
});

// 5. Try to manually get Supabase client and check session
console.log('\n🔐 Supabase Session Check:');
if (window.supabase) {
  console.log('Supabase client found in window');
} else {
  console.log('No Supabase client in window object');
}

// 6. Check for any errors in console
console.log('\n❌ Check browser console for any red errors above');

// 7. Analysis
console.log('\n📊 ANALYSIS:');
if (!urlParams.get('code')) {
  console.log('❌ No authorization code in URL - OAuth provider did not redirect properly');
} else if (!supabaseKeys.length) {
  console.log('❌ No Supabase session data in localStorage - session not being created');
} else {
  console.log('⚠️ Code present but session not established - likely a callback URL mismatch');
}

console.log('\n💡 COMMON ISSUES:');
console.log('1. Callback URL mismatch - check Supabase dashboard');
console.log('2. PKCE code verifier missing - OAuth flow interrupted');
console.log('3. Client not detecting URL - initialization timing issue');
console.log('4. Session storage blocked - browser privacy settings');