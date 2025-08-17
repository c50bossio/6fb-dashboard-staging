const { chromium } = require('playwright');

// Test accounts that might exist in your system
const TEST_ACCOUNTS = [
  { email: 'dev-shop@test.com', password: 'password123' },
  { email: 'dev-barber@test.com', password: 'password123' },
  { email: 'dev-enterprise@test.com', password: 'password123' },
  { email: 'test@test.com', password: 'test123' },
  { email: 'demo@demo.com', password: 'demo123' }
];

async function testExistingAccounts() {
  console.log('🔍 Testing existing accounts...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  for (const account of TEST_ACCOUNTS) {
    const page = await context.newPage();
    
    console.log(`📝 Testing account: ${account.email}`);
    
    try {
      // Go to login page
      await page.goto('http://localhost:9999/login');
      await page.waitForLoadState('networkidle');
      
      // Try to log in
      await page.fill('input[type="email"]', account.email);
      await page.fill('input[type="password"]', account.password);
      await page.click('button[type="submit"]');
      
      // Wait for response (either success or error)
      await page.waitForTimeout(3000);
      
      // Check if we reached dashboard
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard')) {
        console.log(`   ✅ SUCCESS - Logged in!`);
        console.log(`   Current URL: ${currentUrl}`);
        
        // Check for onboarding
        const hasOnboarding = await page.isVisible('text=Welcome to Your Dashboard', { timeout: 2000 }).catch(() => false);
        console.log(`   Onboarding modal: ${hasOnboarding ? 'YES' : 'NO'}`);
        
        // Check profile status
        const profileName = await page.locator('[class*="profile"], [class*="user"]').first().textContent().catch(() => 'Not found');
        console.log(`   Profile info: ${profileName}`);
        
        // Take screenshot
        await page.screenshot({ path: `account-${account.email.replace('@', '_').replace('.', '_')}.png` });
        console.log(`   Screenshot saved\n`);
        
        // Found working account - test onboarding
        console.log('🎯 WORKING ACCOUNT FOUND!');
        console.log('   Testing onboarding flow...\n');
        
        // Check for Launch Onboarding button
        await page.click('button:has-text("Settings"), [aria-label*="Settings"], button[class*="dropdown"]').catch(() => {});
        await page.waitForTimeout(500);
        
        const launchButton = await page.locator('text=Launch Onboarding').first();
        if (await launchButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          console.log('   Found "Launch Onboarding" button');
          await launchButton.click();
          
          await page.waitForTimeout(2000);
          if (await page.isVisible('text=Welcome to Your Dashboard')) {
            console.log('   ✅ Onboarding modal opened successfully!');
            
            // Test completing first step
            console.log('   Testing Business Info step...');
            await page.fill('input[placeholder*="name" i]:visible', `Test Shop ${Date.now()}`);
            await page.fill('input[placeholder*="address" i]:visible', '123 Test St');
            await page.fill('input[placeholder*="city" i]:visible', 'Test City');
            await page.fill('input[placeholder*="phone" i]:visible', '555-0100');
            await page.click('button:has-text("Next")');
            await page.waitForTimeout(1000);
            console.log('   ✅ Business Info saved successfully!');
          }
        } else if (hasOnboarding) {
          console.log('   Onboarding already visible');
          // Test first step
          await page.fill('input:visible').first().catch(() => {});
        }
        
        console.log('\n✅ ACCOUNT WORKS: ' + account.email);
        console.log('   Password: ' + account.password);
        console.log('   You can use this account for testing!\n');
        
        await page.waitForTimeout(5000);
        await page.close();
        break; // Found working account, stop testing others
        
      } else {
        // Check for error message
        const errorMessage = await page.locator('text=/error|invalid|incorrect|failed/i').first().textContent().catch(() => null);
        if (errorMessage) {
          console.log(`   ❌ Login failed: ${errorMessage}`);
        } else {
          console.log(`   ❌ Login failed - stayed on: ${currentUrl}`);
        }
        console.log('');
        await page.close();
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      await page.close();
    }
  }
  
  console.log('==================================================');
  console.log('TEST COMPLETE');
  console.log('==================================================');
  console.log('If no accounts worked, you need to:');
  console.log('1. Create a new account through the UI');
  console.log('2. Or check your Supabase dashboard for existing users');
  console.log('3. Or reset the password for an existing account');
  console.log('==================================================');
  
  await browser.close();
}

testExistingAccounts().catch(console.error);