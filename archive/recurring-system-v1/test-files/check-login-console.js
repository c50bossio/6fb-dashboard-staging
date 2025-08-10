const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Slow down for observation
  });
  const page = await browser.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('🔥 ULTRA DEBUG LOGIN PAGE:') || text.includes('🔥')) {
      console.log(`CONSOLE: ${text}`);
    }
  });
  
  // Capture errors
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });
  
  console.log('🔍 Navigating to login page...');
  await page.goto('http://localhost:9999/login');
  
  // Wait for the page to load completely
  console.log('⏳ Waiting for page to load...');
  await page.waitForLoadState('networkidle');
  
  // Wait a bit more for dynamic imports
  await page.waitForTimeout(3000);
  
  console.log('📷 Taking screenshot...');
  await page.screenshot({ path: 'login-page-test.png', fullPage: true });
  
  // Check if login button exists and get its text
  try {
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.waitFor({ timeout: 5000 });
    
    const buttonText = await loginButton.textContent();
    const isDisabled = await loginButton.isDisabled();
    
    console.log('🔥 BUTTON STATE:');
    console.log(`   Text: "${buttonText}"`);
    console.log(`   Disabled: ${isDisabled}`);
    
    // Try to evaluate debug values from window
    try {
      const debugInfo = await page.evaluate(() => {
        return {
          hasAuthContext: window.authLoading !== undefined,
          authLoading: window.authLoading,
          isLoading: window.isLoading,  
          isFormDisabled: window.isFormDisabled
        };
      });
      console.log('🔥 DEBUG INFO:', debugInfo);
    } catch (e) {
      console.log('Debug values not available on window object');
    }
    
    // Check what the fix should show
    const isFixed = !isDisabled && buttonText && buttonText.includes('Sign in') && !buttonText.includes('Signing in...');
    console.log('');
    console.log('='.repeat(50));
    console.log('🚨 FIX STATUS:', isFixed ? '✅ FIXED' : '❌ STILL BROKEN');
    console.log('='.repeat(50));
    
    if (isFixed) {
      console.log('✅ Dynamic import fix is working correctly!');
      console.log('   - Button shows "Sign in" (not "Signing in...")');
      console.log('   - Button is enabled (not disabled)');
      console.log('   - SupabaseAuthProvider loaded properly');
    } else {
      console.log('❌ Still issues with the login button:');
      console.log(`   - Button text: "${buttonText}"`);
      console.log(`   - Button disabled: ${isDisabled}`);
      console.log('   - Check console logs above for authLoading state');
    }
    
  } catch (error) {
    console.log('❌ Could not find login button:', error.message);
  }
  
  // Show relevant console logs
  console.log('\n📋 All Console Logs:');
  consoleLogs.forEach(log => {
    if (log.includes('🔥') || log.includes('loading') || log.includes('auth')) {
      console.log(`   ${log}`);
    }
  });
  
  console.log('\n✨ Test complete. Check login-page-test.png for visual confirmation.');
  
  await browser.close();
})();