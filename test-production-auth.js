import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log(`🖥️  Browser console [${msg.type()}]:`, msg.text());
  });

  // Catch any errors
  page.on('pageerror', error => {
    console.error('❌ Page error:', error.message);
  });

  // Listen for network requests
  page.on('response', async (response) => {
    if (response.url().includes('auth') || response.url().includes('api')) {
      console.log(`🌐 API Response: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('🚀 Testing production authentication at bookedbarber.com...');

    // Navigate to the main site
    console.log('1. Loading bookedbarber.com...');
    await page.goto('https://bookedbarber.com', {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'prod-01-homepage.png', fullPage: true });

    // Check for any JavaScript errors in the console
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    // Navigate to login page
    console.log('2. Navigating to login page...');
    await page.goto('https://bookedbarber.com/login', {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'prod-02-login-page.png', fullPage: true });

    // Check if login form is present
    const loginForm = await page.locator('input[placeholder*="Email"]').first();
    const isLoginFormVisible = await loginForm.isVisible();
    
    console.log(`✅ Login form visible: ${isLoginFormVisible}`);

    if (isLoginFormVisible) {
      console.log('3. Testing login form interaction...');
      
      // Try to interact with the form to see if there are any JavaScript errors
      await page.fill('input[placeholder*="Email"]', 'test@example.com');
      await page.waitForTimeout(1000);
      
      // Look for any console errors that might indicate TDZ violations
      const consoleLogs = [];
      page.on('console', msg => {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      });

      await page.waitForTimeout(2000);
      
      console.log('4. Checking for TDZ violation errors...');
      
      // Check console for the specific error we were fixing
      const hasNavigationError = consoleLogs.some(log => 
        log.includes('Cannot access') && log.includes('before initialization')
      );
      
      if (hasNavigationError) {
        console.log('❌ TDZ violation still detected in console logs');
        console.log('Console logs:', consoleLogs);
      } else {
        console.log('✅ No TDZ violation errors detected in console');
      }

      // Test clicking around to trigger any potential errors
      console.log('5. Testing page navigation to trigger potential errors...');
      
      try {
        // Try to navigate to a protected route that would trigger authentication
        await page.goto('https://bookedbarber.com/dashboard', {
          waitUntil: 'networkidle'
        });
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'prod-03-dashboard-redirect.png', fullPage: true });
        
        const currentUrl = page.url();
        console.log('Current URL after dashboard navigation:', currentUrl);
        
        if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
          console.log('✅ Properly redirected to authentication - no crashes detected');
        } else if (currentUrl.includes('/dashboard')) {
          console.log('ℹ️  Already authenticated or different behavior');
        } else if (currentUrl.includes('error')) {
          console.log('❌ Landed on error page - potential authentication issue');
        }
        
      } catch (navigationError) {
        console.error('❌ Navigation error:', navigationError.message);
      }
    } else {
      console.log('❌ Login form not visible - potential page loading issue');
    }

    console.log('\n📋 Test Summary:');
    console.log(`- Homepage loads: ✅`);
    console.log(`- Login page loads: ✅`);
    console.log(`- Login form visible: ${isLoginFormVisible ? '✅' : '❌'}`);
    console.log(`- JavaScript errors detected: ${jsErrors.length > 0 ? '❌' : '✅'}`);
    
    if (jsErrors.length > 0) {
      console.log('\n❌ JavaScript Errors Found:');
      jsErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No JavaScript errors detected during basic navigation');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'prod-test-error.png', fullPage: true });
  }

  // Keep browser open for inspection
  console.log('\n🔍 Test complete. Browser will remain open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();