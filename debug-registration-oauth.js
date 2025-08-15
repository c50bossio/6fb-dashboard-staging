// DEBUG: Registration Page OAuth Button Issue
// Run this in browser console on /register?plan=shop&billing=monthly

console.log('🔍 DEBUGGING REGISTRATION PAGE OAUTH BUTTON');
console.log('===========================================\n');

// Step 1: Check if button exists
const googleButton = document.querySelector('button[data-track-click="oauth-google-signup"]');
if (googleButton) {
  console.log('✅ Google OAuth button found in DOM');
  console.log('Button properties:');
  console.log('  - Disabled:', googleButton.disabled);
  console.log('  - Class:', googleButton.className);
  console.log('  - onClick:', !!googleButton.onclick);
  console.log('  - Parent element:', googleButton.parentElement?.className);
  
  // Check computed styles
  const styles = window.getComputedStyle(googleButton);
  console.log('  - Display:', styles.display);
  console.log('  - Visibility:', styles.visibility);
  console.log('  - Pointer events:', styles.pointerEvents);
  console.log('  - Z-index:', styles.zIndex);
  console.log('  - Position:', styles.position);
  
  // Check if anything is overlaying the button
  const rect = googleButton.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const elementAtCenter = document.elementFromPoint(centerX, centerY);
  
  if (elementAtCenter === googleButton) {
    console.log('✅ Button is clickable (no overlay)');
  } else {
    console.log('❌ Button is blocked by:', elementAtCenter);
    console.log('  Blocking element classes:', elementAtCenter?.className);
  }
  
  // Try clicking programmatically
  console.log('\n🧪 Attempting programmatic click...');
  try {
    googleButton.click();
    console.log('✅ Click event triggered');
  } catch (e) {
    console.log('❌ Click failed:', e.message);
  }
  
} else {
  console.log('❌ Google OAuth button NOT found in DOM');
  console.log('Looking for any button with "Google" text...');
  
  const allButtons = Array.from(document.querySelectorAll('button'));
  const googleButtons = allButtons.filter(btn => 
    btn.textContent.includes('Google') || 
    btn.innerHTML.includes('Google')
  );
  
  if (googleButtons.length > 0) {
    console.log('Found', googleButtons.length, 'button(s) with "Google":');
    googleButtons.forEach((btn, i) => {
      console.log(`  ${i+1}. Text: "${btn.textContent.trim()}"`);
      console.log(`     Disabled: ${btn.disabled}`);
      console.log(`     Class: ${btn.className}`);
    });
  } else {
    console.log('No buttons with "Google" text found');
  }
}

// Step 2: Check React event handlers
console.log('\n📊 React Event Handler Check:');
const allClickableButtons = document.querySelectorAll('button[type="button"]');
console.log('Total clickable buttons found:', allClickableButtons.length);

allClickableButtons.forEach((btn, i) => {
  const reactProps = Object.keys(btn).filter(key => key.startsWith('__react'));
  if (reactProps.length > 0 && btn.textContent.includes('Google')) {
    console.log(`Button ${i+1} (Google) has React handlers:`, reactProps.length > 0);
  }
});

// Step 3: Check for JavaScript errors
console.log('\n🚨 Checking for JavaScript errors:');
if (window.console && window.console.error) {
  console.log('Check the Console tab for any red error messages');
}

// Step 4: Test plan data detection
console.log('\n📋 Plan Data Check:');
const urlParams = new URLSearchParams(window.location.search);
console.log('Plan from URL:', urlParams.get('plan'));
console.log('Billing from URL:', urlParams.get('billing'));

// Step 5: Check if Supabase auth is loaded
console.log('\n🔐 Supabase Auth Check:');
if (window.supabase) {
  console.log('✅ Supabase client is loaded');
} else {
  console.log('❌ Supabase client not found in window object');
}

console.log('\n💡 DIAGNOSIS COMPLETE');
console.log('If button is visible but not clickable, check:');
console.log('1. Is the button disabled? (check disabled property)');
console.log('2. Is something overlaying it? (check elementFromPoint)');
console.log('3. Are there JavaScript errors? (check Console tab)');
console.log('4. Is the onClick handler attached? (check React props)');