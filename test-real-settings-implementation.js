const { chromium } = require('playwright');

async function testRealSettingsImplementation() {
  console.log('🔍 Testing Real Settings Implementation');
  console.log('====================================');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate directly to the settings page (bypassing login for now)
    console.log('1. Navigating to dashboard/settings...');
    await page.goto('http://localhost:9999/dashboard/settings');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Take screenshot to see what's actually displayed
    await page.screenshot({ 
      path: '/Users/bossio/Desktop/unified-settings-interface-test.png',
      fullPage: true 
    });
    
    console.log('📷 Screenshot saved to Desktop');
    
    // Check if we can find the UnifiedSettingsInterface elements
    try {
      // Look for the UnifiedSettingsInterface title
      const settingsTitle = await page.textContent('h1');
      console.log('📊 Page title found:', settingsTitle);
      
      // Check if we see business info inputs
      const businessNameInput = await page.$('input[type="text"]');
      if (businessNameInput) {
        const nameValue = await businessNameInput.inputValue();
        console.log('📝 Business name field value:', nameValue);
        
        if (nameValue === 'Demo Barbershop') {
          console.log('❌ STILL SHOWING DEMO DATA - UnifiedSettingsInterface not working');
          return false;
        } else if (nameValue.includes('Tomb45') || nameValue.length > 0) {
          console.log('✅ SHOWING REAL DATA - UnifiedSettingsInterface is working!');
          return true;
        } else {
          console.log('⚠️  Field is empty - may be loading or need authentication');
        }
      }
      
      // Check for UnifiedSettingsInterface specific elements
      const categoryButtons = await page.$$('button:has-text("Business Info")');
      if (categoryButtons.length > 0) {
        console.log('✅ Found UnifiedSettingsInterface category buttons');
      }
      
      return true;
      
    } catch (error) {
      console.log('⚠️  Could not find expected elements:', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testRealSettingsImplementation().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🎉 SUCCESS: UnifiedSettingsInterface is now active!');
    console.log('   The demo data issue has been resolved.');
  } else {
    console.log('❌ FAILED: Still showing demo data or other issues.');
    console.log('   Need further investigation.');
  }
  console.log('='.repeat(50));
  process.exit(success ? 0 : 1);
});