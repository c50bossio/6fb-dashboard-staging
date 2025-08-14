const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 OAuth Callback Debug Test');
  console.log('============================\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🔄') || text.includes('🔑') || text.includes('🔍') || text.includes('📦') || text.includes('Session check') || text.includes('oauth') || text.includes('OAuth')) {
      console.log('🖥️ BROWSER LOG:', text);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log('❌ PAGE ERROR:', error.message);
  });
  
  try {
    console.log('📍 Testing direct OAuth callback page access...');
    
    // Test 1: Direct access to OAuth callback page (should show the UI)
    await page.goto('http://localhost:9999/auth/callback?code=test-code-123', { 
      waitUntil: 'networkidle0' 
    });
    
    console.log('✅ OAuth callback page loaded');
    
    // Check if our page is showing
    const pageTitle = await page.title();
    console.log('📄 Page title:', pageTitle);
    
    const pageText = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    console.log('📝 Page content preview:', pageText.substring(0, 200) + '...');
    
    // Check for our specific UI elements
    const hasCompletingText = pageText.includes('Completing');
    const hasSignInText = pageText.includes('Sign In');
    const hasSignUpText = pageText.includes('Sign Up');
    
    console.log('🔍 UI Elements Check:');
    console.log('  - Has "Completing" text:', hasCompletingText);
    console.log('  - Has "Sign In" text:', hasSignInText);
    console.log('  - Has "Sign Up" text:', hasSignUpText);
    
    // Take a screenshot
    await page.screenshot({ path: 'oauth-callback-debug.png', fullPage: true });
    console.log('📸 Screenshot saved: oauth-callback-debug.png');
    
    // Wait a few seconds to see console logs
    console.log('⏳ Waiting 5 seconds to capture console logs...');
    await page.waitForTimeout(5000);
    
    console.log('\n🎯 Test completed! Check browser and screenshot for details.');
    
  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'oauth-callback-debug-error.png', fullPage: true });
  }
  
  // Keep browser open
  console.log('\n⏸️ Browser remains open for manual inspection.');
  console.log('⏸️ Press Ctrl+C to close when done.');
  
  await new Promise(resolve => {
    process.on('SIGINT', () => {
      console.log('👋 Closing browser...');
      browser.close();
      resolve();
    });
  });
})();