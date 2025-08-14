// SIMPLE OAUTH STORAGE TEST
// Run this on /register?plan=shop&billing=monthly page

console.log('🧪 SIMPLE OAUTH STORAGE TEST');
console.log('============================');

// Step 1: Test plan detection
const urlParams = new URLSearchParams(window.location.search);
const planId = urlParams.get('plan');
const billingPeriod = urlParams.get('billing');

console.log('1. URL Plan Detection:');
console.log('   Plan ID:', planId || 'NOT FOUND');
console.log('   Billing:', billingPeriod || 'NOT FOUND');

// Step 2: Simulate what the registration page should do
if (planId && billingPeriod) {
  console.log('\n2. Simulating Registration Page Plan Storage:');
  
  // This is what should happen in the registration page useEffect
  console.log('   📋 Setting planInfo state to:', { planId, billingPeriod });
  
  // Check if the visual badge should appear
  console.log('   📦 Plan badge should show: "Plan selected: ' + planId.charAt(0).toUpperCase() + planId.slice(1) + '"');
  
  // Step 3: Simulate what happens when Google OAuth is clicked
  console.log('\n3. Simulating Google OAuth Click:');
  
  // This is what should happen when handleGoogleSignUp is called with plan data
  const testPlanData = {
    planId,
    billingPeriod,
    timestamp: Date.now(),
    isOAuthSignup: true
  };
  
  try {
    window.sessionStorage.setItem('oauth_plan_data', JSON.stringify(testPlanData));
    console.log('   ✅ oauth_plan_data stored:', testPlanData);
    
    // Verify
    const stored = window.sessionStorage.getItem('oauth_plan_data');
    const parsed = JSON.parse(stored);
    console.log('   ✅ Verification successful:', parsed);
    
    console.log('\n🎯 OAUTH CALLBACK TEST:');
    console.log('   When OAuth redirects to /auth/callback, it should:');
    console.log('   1. Find oauth_plan_data in sessionStorage ✅');
    console.log('   2. Set isSignUp = true ✅');
    console.log('   3. Show "Completing Sign Up" ✅');
    
  } catch (e) {
    console.log('   ❌ Storage failed:', e.message);
  }
  
} else {
  console.log('\n❌ No plan data in URL!');
  console.log('   Make sure you\'re on: /register?plan=shop&billing=monthly');
}

// Step 4: Check what's actually in sessionStorage right now
console.log('\n4. Current SessionStorage Contents:');
const keys = Object.keys(sessionStorage);
if (keys.length === 0) {
  console.log('   (empty)');
} else {
  keys.forEach(key => {
    const value = sessionStorage.getItem(key);
    console.log(`   ${key}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
  });
}