// Debug OAuth issue - run this in browser console during OAuth callback
console.log('🔍 DEBUGGING OAUTH CALLBACK ISSUE');
console.log('====================================');

// Check what page you're coming from
console.log('🌐 Current URL:', window.location.href);
console.log('🔗 Referrer (where you came from):', document.referrer);

// Check if plan data exists in sessionStorage
console.log('\n📦 CHECKING SESSIONSTORAGE:');
try {
  const planData = window.sessionStorage.getItem('oauth_plan_data');
  console.log('🎯 oauth_plan_data:', planData ? JSON.parse(planData) : 'NOT FOUND');
} catch (e) {
  console.log('❌ Error reading oauth_plan_data:', e.message);
}

// Check all sessionStorage keys
console.log('\n🔑 ALL SESSIONSTORAGE KEYS:');
for (let i = 0; i < window.sessionStorage.length; i++) {
  const key = window.sessionStorage.key(i);
  const value = window.sessionStorage.getItem(key);
  console.log(`  ${i + 1}. ${key}: ${value?.substring(0, 50)}${value?.length > 50 ? '...' : ''}`);
}

// Check URL parameters that were passed to /register
const url = new URL(document.referrer || window.location.href);
console.log('\n📋 URL PARAMETERS FROM REGISTER PAGE:');
console.log('  plan:', url.searchParams.get('plan'));
console.log('  billing:', url.searchParams.get('billing'));

// Expected behavior
console.log('\n🎯 EXPECTED BEHAVIOR:');
if (url.searchParams.get('plan')) {
  console.log('✅ Should show: "Completing Sign Up" (plan data detected)');
} else {
  console.log('✅ Should show: "Completing Sign In" (no plan data)');
}

// Check OAuth callback state
const currentUrl = new URL(window.location.href);
console.log('\n🔐 OAUTH CALLBACK INFO:');
console.log('  code:', currentUrl.searchParams.get('code'));
console.log('  state:', currentUrl.searchParams.get('state'));