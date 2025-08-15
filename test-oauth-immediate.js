// IMMEDIATE TEST: Click Google OAuth Button
// Run this on /register?plan=shop&billing=monthly

console.log('🚀 FORCING GOOGLE OAUTH CLICK');

// Method 1: Find button and force enable it
const forceOAuthClick = () => {
  const buttons = Array.from(document.querySelectorAll('button'));
  const googleButton = buttons.find(btn => 
    btn.textContent.includes('Sign up with Google') || 
    btn.innerHTML.includes('Sign up with Google')
  );
  
  if (googleButton) {
    console.log('✅ Found Google button');
    
    // Force enable the button
    googleButton.disabled = false;
    googleButton.style.pointerEvents = 'auto';
    googleButton.style.cursor = 'pointer';
    
    // Remove disabled classes
    googleButton.className = googleButton.className.replace('opacity-50', '');
    googleButton.className = googleButton.className.replace('cursor-not-allowed', '');
    
    console.log('Button state after fix:');
    console.log('  Disabled:', googleButton.disabled);
    console.log('  Pointer events:', googleButton.style.pointerEvents);
    
    // Try to click it
    console.log('🖱️ Clicking button...');
    googleButton.click();
    
    return true;
  }
  return false;
};

// Method 2: Call the OAuth function directly if Method 1 fails
const directOAuth = () => {
  console.log('🔧 Attempting direct OAuth call...');
  
  // Get plan data from URL
  const urlParams = new URLSearchParams(window.location.search);
  const planId = urlParams.get('plan');
  const billingPeriod = urlParams.get('billing');
  
  console.log('Plan data:', { planId, billingPeriod });
  
  // Store plan data in sessionStorage (what the registration page should do)
  if (planId && billingPeriod) {
    const planData = {
      planId,
      billingPeriod,
      timestamp: Date.now(),
      isOAuthSignup: true
    };
    
    window.sessionStorage.setItem('oauth_plan_data', JSON.stringify(planData));
    console.log('✅ Plan data stored in sessionStorage');
  }
  
  // Try to trigger OAuth through React DevTools if available
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('React DevTools detected - OAuth should work after enabling button');
  }
};

// Execute methods
if (!forceOAuthClick()) {
  console.log('❌ Button not found, trying alternative method...');
  directOAuth();
  
  // Try clicking again after a short delay
  setTimeout(() => {
    console.log('🔄 Retrying after delay...');
    forceOAuthClick();
  }, 500);
}

console.log('\n📝 If OAuth still doesn\'t work:');
console.log('1. Check browser console for errors');
console.log('2. Try refreshing the page');
console.log('3. The button might need React event handlers reattached');