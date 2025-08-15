// Deep debugging script for OAuth redirect issue
// Run in browser console while stuck on callback page

console.log('🔍 OAUTH REDIRECT DEBUGGING');
console.log('===========================\n');

// 1. Check current URL
console.log('1️⃣ CURRENT URL STATE');
console.log('   Path:', window.location.pathname);
console.log('   Query:', window.location.search);
console.log('   Full URL:', window.location.href);

// 2. Check for OAuth code
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
const state = params.get('state');
console.log('\n2️⃣ OAUTH PARAMETERS');
console.log('   Code:', code ? `Present (${code.substring(0, 20)}...)` : 'MISSING');
console.log('   State:', state ? `Present (${state.substring(0, 20)}...)` : 'None');

// 3. Check PKCE verifier
console.log('\n3️⃣ PKCE VERIFIER STATUS');
const pkceKey = 'sb-dfhqjdoydihajmjxniee-auth-token-code-verifier';
const verifier = localStorage.getItem(pkceKey);
console.log('   Verifier:', verifier ? `Found (${verifier.substring(0, 30)}...)` : 'MISSING');

// 4. Check session storage for plan data
console.log('\n4️⃣ SESSION STORAGE DATA');
const planData = sessionStorage.getItem('oauth_plan_data');
console.log('   Plan Data:', planData ? JSON.parse(planData) : 'None');

// 5. Check Supabase session
console.log('\n5️⃣ SUPABASE SESSION');
const authKeys = Object.keys(localStorage).filter(k => k.includes('sb-') && k.includes('auth-token'));
authKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value && !key.includes('verifier')) {
    try {
      const parsed = JSON.parse(value);
      console.log('   Session found:', {
        key: key,
        hasAccessToken: !!parsed.access_token,
        hasUser: !!parsed.user,
        userEmail: parsed.user?.email || 'N/A'
      });
    } catch (e) {
      console.log('   Session data (non-JSON):', key);
    }
  }
});

// 6. Check React Router state
console.log('\n6️⃣ NEXT.JS ROUTER STATE');
console.log('   Check if router.push is being called...');
console.log('   (Look for console logs starting with 💳, 🚀, or 🏠)');

// 7. Check for JavaScript errors
console.log('\n7️⃣ JAVASCRIPT ERRORS');
console.log('   Check Console tab for any red error messages');
console.log('   Common issues:');
console.log('   - Cannot read property of undefined');
console.log('   - Network request failed');
console.log('   - CORS errors');

// 8. Manual redirect test
console.log('\n8️⃣ MANUAL REDIRECT TEST');
console.log('   Try running this command manually:');
console.log('   window.location.href = "/subscribe?source=oauth_success"');

// 9. Check if page is frozen
console.log('\n9️⃣ PAGE RESPONSIVENESS');
const testButton = document.createElement('button');
testButton.textContent = 'Test Click';
testButton.onclick = () => alert('Page is responsive!');
document.body.appendChild(testButton);
console.log('   Added test button to page - try clicking it');

// 10. Network activity
console.log('\n🔟 NETWORK ACTIVITY');
console.log('   Check Network tab for:');
console.log('   - Any failed requests (red)');
console.log('   - Pending requests that never complete');
console.log('   - CORS errors in red');

console.log('\n📊 ANALYSIS COMPLETE');
console.log('====================');
console.log('Look for issues above and in Console/Network tabs');