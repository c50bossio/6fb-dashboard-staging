// Test OAuth plan data storage persistence
console.log('🧪 Testing OAuth plan data storage...');

// Simulate the subscribe page storing plan data
const planData = {
  planId: 'shop',
  billingPeriod: 'monthly',
  timestamp: Date.now(),
  isOAuthSignup: true
};

console.log('📝 Storing plan data:', planData);
window.sessionStorage.setItem('oauth_plan_data', JSON.stringify(planData));

// Verify it was stored
const stored = window.sessionStorage.getItem('oauth_plan_data');
console.log('✅ Verification - Data stored:', !!stored);
console.log('📦 Stored data:', stored);

// Test retrieval (simulating OAuth callback)
console.log('\n🔍 Testing retrieval (simulating OAuth callback)...');
const retrieved = window.sessionStorage.getItem('oauth_plan_data');
if (retrieved) {
  const parsedData = JSON.parse(retrieved);
  console.log('✅ Plan data found during callback!');
  console.log('📊 Retrieved data:', parsedData);
  console.log('🎯 This should show "Completing Sign Up"');
} else {
  console.log('❌ No plan data found during callback');
  console.log('🎯 This explains why it shows "Completing Sign In"');
}

// Check all sessionStorage keys for debugging
console.log('\n🔑 All sessionStorage keys:');
for (let i = 0; i < window.sessionStorage.length; i++) {
  const key = window.sessionStorage.key(i);
  console.log(`  ${i + 1}. ${key}`);
}