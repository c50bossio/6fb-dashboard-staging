const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  const page = await browser.newPage();
  
  console.log('🔍 Testing button interaction...');
  await page.goto('http://localhost:9999/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // Take screenshot before interaction
  await page.screenshot({ path: 'before-click.png', fullPage: true });
  
  // Fill in some test data
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword');
  
  console.log('🔥 Testing login button click...');
  const loginButton = page.locator('button[type="submit"]');
  
  // Check initial state
  const initialText = await loginButton.textContent();
  console.log(`   Initial button text: "${initialText}"`);
  
  // Click the button
  await loginButton.click();
  
  // Wait a moment and check if button state changes
  await page.waitForTimeout(1000);
  
  const afterClickText = await loginButton.textContent();
  const isDisabled = await loginButton.isDisabled();
  
  console.log(`   After click text: "${afterClickText}"`);
  console.log(`   After click disabled: ${isDisabled}`);
  
  // Take screenshot after click
  await page.screenshot({ path: 'after-click.png', fullPage: true });
  
  // Check if it shows loading state
  const showsLoading = afterClickText.includes('Signing in...');
  const isInteractive = initialText !== afterClickText || isDisabled;
  
  console.log('');
  console.log('='.repeat(50));
  console.log('🔥 BUTTON INTERACTION TEST:');
  console.log(`   Shows loading state: ${showsLoading ? '✅ Yes' : '❌ No'}`);
  console.log(`   Button is interactive: ${isInteractive ? '✅ Yes' : '❌ No'}`);
  console.log('='.repeat(50));
  
  if (isInteractive) {
    console.log('✅ Button interaction is working correctly!');
    console.log('   - Button responds to clicks');
    console.log('   - Shows appropriate loading/disabled states');
  }
  
  await browser.close();
})();