// COMPREHENSIVE OAUTH PLAN DATA DEBUG TEST
// Run this in browser console on /register?plan=shop&billing=monthly

console.log('🔍 OAUTH PLAN DATA FLOW DEBUG');
console.log('===============================\n');

// Step 1: Check current URL and parameters
console.log('📍 STEP 1: Current URL Analysis');
const currentUrl = new URL(window.location.href);
console.log('Current URL:', currentUrl.href);
console.log('Plan parameter:', currentUrl.searchParams.get('plan'));
console.log('Billing parameter:', currentUrl.searchParams.get('billing'));

// Step 2: Check if plan data is detected by registration page
console.log('\n📋 STEP 2: Plan Detection Test');
const urlParams = new URLSearchParams(window.location.search);
const planId = urlParams.get('plan') || urlParams.get('planId');
const billingPeriod = urlParams.get('billing') || urlParams.get('billingPeriod');

if (planId && billingPeriod) {
  console.log('✅ Plan data should be detected:', { planId, billingPeriod });
  console.log('✅ Expected: Green "Plan selected" badge should be visible');
  console.log('✅ Expected: OAuth should call signInWithGoogle(planId, billingPeriod)');
} else {
  console.log('❌ Plan data NOT detected');
  console.log('Check if URL has: ?plan=shop&billing=monthly');
}

// Step 3: Check if there's a plan badge visible
console.log('\n🎯 STEP 3: Visual Plan Badge Check');
const planBadge = document.querySelector('[class*="Plan selected"]') || 
                  document.querySelector('*:contains("Plan selected")') ||
                  Array.from(document.querySelectorAll('*')).find(el => 
                    el.textContent && el.textContent.includes('Plan selected')
                  );

if (planBadge) {
  console.log('✅ Plan badge found:', planBadge.textContent);
} else {
  console.log('❌ Plan badge NOT visible - this indicates the registration page isn\'t detecting plan data');
}

// Step 4: Check sessionStorage for OAuth plan data
console.log('\n💾 STEP 4: SessionStorage Check');
try {
  const storedPlanData = window.sessionStorage.getItem('oauth_plan_data');
  if (storedPlanData) {
    console.log('✅ OAuth plan data found in sessionStorage:', JSON.parse(storedPlanData));
  } else {
    console.log('❌ NO oauth_plan_data in sessionStorage');
    console.log('This means the Google OAuth button hasn\'t been clicked yet, or data wasn\'t stored');
  }
} catch (e) {
  console.log('❌ Error reading sessionStorage:', e.message);
}

// Step 5: Test manual plan data storage (simulate what should happen)
console.log('\n🧪 STEP 5: Manual Test - Storing Plan Data');
if (planId && billingPeriod) {
  const testPlanData = {
    planId,
    billingPeriod,
    timestamp: Date.now(),
    source: 'manual_test'
  };
  
  window.sessionStorage.setItem('oauth_plan_data', JSON.stringify(testPlanData));
  console.log('✅ Manually stored plan data for testing:', testPlanData);
  
  // Verify storage worked
  const verification = window.sessionStorage.getItem('oauth_plan_data');
  console.log('✅ Verification - data stored:', !!verification);
} else {
  console.log('❌ Cannot store plan data - no plan parameters in URL');
}

// Step 6: Instructions for next steps
console.log('\n📝 STEP 6: What to Do Next');
console.log('1. If plan badge is NOT visible:');
console.log('   → The registration page isn\'t reading URL parameters correctly');
console.log('   → Check the useEffect in /app/register/page.js');

console.log('\n2. If plan badge IS visible but OAuth still shows "Sign In":');
console.log('   → Click the Google OAuth button');
console.log('   → Check if oauth_plan_data gets stored in sessionStorage');
console.log('   → The OAuth callback should detect this data');

console.log('\n3. Run this in OAuth callback page (/auth/callback):');
console.log('   const planData = window.sessionStorage.getItem("oauth_plan_data");');
console.log('   console.log("Plan data in callback:", planData);');

// Step 7: Check for any JavaScript errors
console.log('\n🚨 STEP 7: Error Check');
if (window.console && window.console.error) {
  console.log('Check browser console for any JavaScript errors that might prevent plan detection');
}

console.log('\n🎯 SUMMARY:');
console.log('URL has plan data:', !!(planId && billingPeriod));
console.log('Plan badge visible:', !!planBadge);
console.log('SessionStorage ready:', !!window.sessionStorage);
console.log('\nIf all above are true, the OAuth flow should work correctly.');