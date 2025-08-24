const { chromium } = require('playwright');

async function verifySettingsConsistency() {
  console.log('🔍 Starting Settings Consistency Verification');
  console.log('============================================');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to login
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:9999/login');
    
    // Step 2: Login (using test credentials)
    console.log('2. Logging in...');
    
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
      console.log('✅ Successfully logged in and reached dashboard');
    } catch (navError) {
      console.log('⚠️ Dashboard navigation failed, checking current page...');
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // Take final screenshot to debug
      await page.screenshot({ 
        path: '/Users/bossio/Desktop/navigation-failed-debug.png',
        fullPage: true 
      });
      
      // If we're already on dashboard, continue
      if (currentUrl.includes('dashboard')) {
        console.log('✅ Already on dashboard page, continuing...');
      } else {
        throw navError;
      }
    }
    
    // Step 3: Navigate to general settings
    console.log('3. Navigating to general settings...');
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
    
    console.log('📊 General Settings Data:');
    console.log('   Business Name:', generalSettingsData.name);
    console.log('   Email:', generalSettingsData.email);
    
    // Step 4: Navigate to shop settings
    console.log('4. Navigating to shop settings...');
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
    
    console.log('📊 Shop Settings Data:');
    console.log('   Business Name:', shopSettingsData.name);
    console.log('   Email:', shopSettingsData.email);
    
    // Step 5: Compare and verify consistency
    console.log('\n🔍 CONSISTENCY VERIFICATION RESULTS:');
    console.log('=====================================');
    
    const nameMatch = generalSettingsData.name === shopSettingsData.name;
    const emailMatch = generalSettingsData.email === shopSettingsData.email;
    
    console.log('Business Name Consistency:', nameMatch ? '✅ PASS' : '❌ FAIL');
    console.log('  General Settings:', generalSettingsData.name);
    console.log('  Shop Settings:   ', shopSettingsData.name);
    console.log('');
    console.log('Email Consistency:', emailMatch ? '✅ PASS' : '❌ FAIL');
    console.log('  General Settings:', generalSettingsData.email);
    console.log('  Shop Settings:   ', shopSettingsData.email);
    console.log('');
    
    const overallPass = nameMatch && emailMatch;
    console.log('🎯 OVERALL RESULT:', overallPass ? '✅ SETTINGS ARE CONSISTENT' : '❌ SETTINGS ARE INCONSISTENT');
    
    if (!overallPass) {
      console.log('\n⚠️  DATA CONSISTENCY ISSUE DETECTED:');
      console.log('   The user challenge was correct - settings show different values!');
      console.log('   This is exactly the "DemoBarberShop vs Tool45ChannelSide" problem mentioned.');
    } else {
      console.log('\n🎉 SUCCESS: Settings deduplication is working correctly!');
      console.log('   Both interfaces show identical data from the barbershops table.');
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