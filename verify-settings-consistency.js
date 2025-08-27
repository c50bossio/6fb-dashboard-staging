const { chromium } = require('playwright');

async function verifySettingsConsistency() {

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to login
    
    await page.goto('http://localhost:9999/login');
    
    // Step 2: Login (using test credentials)

    // Take screenshot of login page
    await page.screenshot({ 
      path: '/Users/bossio/Desktop/login-page-debug.png',
      fullPage: true 
    });
    
    await page.fill('input[type="email"]', 'c50bossio@gmail.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Take screenshot after clicking login
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: '/Users/bossio/Desktop/after-login-click-debug.png',
      fullPage: true 
    });
    
    // Try to wait for dashboard with longer timeout
    try {
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
      
    } catch (navError) {
      
      const currentUrl = page.url();

      // Take final screenshot to debug
      await page.screenshot({ 
        path: '/Users/bossio/Desktop/navigation-failed-debug.png',
        fullPage: true 
      });
      
      // If we're already on dashboard, continue
      if (currentUrl.includes('dashboard')) {
        
      } else {
        throw navError;
      }
    }
    
    // Step 3: Navigate to general settings
    
    await page.click('a[href="/dashboard/settings"]');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of general settings
    await page.screenshot({ 
      path: '/Users/bossio/Desktop/general-settings-verification.png',
      fullPage: true 
    });
    
    // Extract business data from general settings
    const generalSettingsData = await page.evaluate(() => {
      const nameInput = document.querySelector('input[type="text"]');
      const emailInput = document.querySelector('input[type="email"]');
      
      return {
        name: nameInput?.value || 'NOT_FOUND',
        email: emailInput?.value || 'NOT_FOUND'
      };
    });

    // Step 4: Navigate to shop settings
    
    await page.goto('http://localhost:9999/shop/settings/general');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of shop settings
    await page.screenshot({ 
      path: '/Users/bossio/Desktop/shop-settings-verification.png',
      fullPage: true 
    });
    
    // Extract business data from shop settings  
    const shopSettingsData = await page.evaluate(() => {
      const nameInput = document.querySelector('input[type="text"]');
      const emailInput = document.querySelector('input[type="email"]');
      
      return {
        name: nameInput?.value || 'NOT_FOUND',
        email: emailInput?.value || 'NOT_FOUND'
      };
    });

    // Step 5: Compare and verify consistency

    const nameMatch = generalSettingsData.name === shopSettingsData.name;
    const emailMatch = generalSettingsData.email === shopSettingsData.email;

    const overallPass = nameMatch && emailMatch;

    if (!overallPass) {

    } else {

    }
    
    return overallPass;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the verification
verifySettingsConsistency().then(success => {
  process.exit(success ? 0 : 1);
});