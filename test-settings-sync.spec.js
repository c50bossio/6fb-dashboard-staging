const { test, expect } = require('@playwright/test');

test.describe('Settings Data Consistency Test', () => {
  test('Shop name should be identical in general settings and shop settings', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:9999/login');
    
    // Use test credentials or environment variables
    const testEmail = process.env.TEST_EMAIL || 'c50bossio@gmail.com';
    const testPassword = process.env.TEST_PASSWORD || 'testpassword123';
    
    // Fill login form
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard**');
    
    // Navigate to general settings (bottom left navigation)
    await page.click('a[href="/dashboard/settings"]');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of general settings
    await page.screenshot({ 
      path: '/Users/bossio/Desktop/general-settings-test.png',
      fullPage: true 
    });
    
    // Extract business name from general settings
    const generalSettingsName = await page.$eval(
      'input[type="text"]:first-child', 
      el => el.value
    ).catch(() => '');
    
    console.log('General Settings Business Name:', generalSettingsName);
    
    // Navigate to shop settings  
    await page.click('a[href*="/shop/settings"]');
    await page.waitForLoadState('networkidle');
    
    // Navigate to general section within shop settings
    await page.click('a[href*="/shop/settings/general"]');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of shop settings
    await page.screenshot({ 
      path: '/Users/bossio/Desktop/shop-settings-test.png',
      fullPage: true 
    });
    
    // Extract business name from shop settings
    const shopSettingsName = await page.$eval(
      'input[type="text"]:first-child', 
      el => el.value
    ).catch(() => '');
    
    console.log('Shop Settings Business Name:', shopSettingsName);
    
    // Test data consistency
    expect(generalSettingsName).toBe(shopSettingsName);
    
    // Test phone and email consistency as well
    const generalEmail = await page.$eval(
      'input[type="email"]', 
      el => el.value
    ).catch(() => '');
    
    // Go back to general settings to get email
    await page.click('a[href="/dashboard/settings"]');
    await page.waitForLoadState('networkidle');
    
    const shopEmail = await page.$eval(
      'input[type="email"]', 
      el => el.value  
    ).catch(() => '');
    
    console.log('General Settings Email:', shopEmail);
    console.log('Shop Settings Email:', generalEmail);
    
    // Verify email consistency
    expect(shopEmail).toBe(generalEmail);
    
    // Log final comparison
    console.log('\n=== SETTINGS CONSISTENCY TEST RESULTS ===');
    console.log('Business Name Match:', generalSettingsName === shopSettingsName ? '✅ PASS' : '❌ FAIL');
    console.log('Email Match:', shopEmail === generalEmail ? '✅ PASS' : '❌ FAIL');
    console.log('General Settings Name:', generalSettingsName);
    console.log('Shop Settings Name:', shopSettingsName);
  });
  
  test('Settings should sync when changed in one interface', async ({ page }) => {
    // Login
    await page.goto('http://localhost:9999/login');
    
    const testEmail = process.env.TEST_EMAIL || 'c50bossio@gmail.com';
    const testPassword = process.env.TEST_PASSWORD || 'testpassword123';
    
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    
    // Go to general settings
    await page.click('a[href="/dashboard/settings"]');
    await page.waitForLoadState('networkidle');
    
    // Change business name
    const testName = 'Test Sync ' + Date.now();
    await page.fill('input[type="text"]:first-child', testName);
    
    // Save changes
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000); // Wait for save to complete
    
    // Navigate to shop settings
    await page.click('a[href*="/shop/settings/general"]');
    await page.waitForLoadState('networkidle');
    
    // Verify the name updated in shop settings
    const updatedName = await page.$eval(
      'input[type="text"]:first-child', 
      el => el.value
    );
    
    expect(updatedName).toBe(testName);
    
    console.log('✅ Settings sync test passed:', updatedName);
  });
});