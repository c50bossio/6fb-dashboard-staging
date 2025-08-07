const { chromium } = require('playwright');

async function testLoginFix() {
  console.log('🧪 Testing login fix...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Monitor console for key events
  page.on('console', msg => {
    if (msg.text().includes('Sign in successful') || 
        msg.text().includes('Tenant loaded') ||
        msg.text().includes('error')) {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    }
  });
  
  try {
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:9999/login', { waitUntil: 'domcontentloaded' });
    
    // Fill credentials
    await page.fill('input[name="email"]', 'demo@barbershop.com');
    await page.fill('input[name="password"]', 'demo123');
    
    console.log('🚀 Clicking submit and monitoring button state...');
    
    // Get initial button text
    const initialText = await page.locator('button[type="submit"]').textContent();
    console.log('📊 Initial button text:', initialText);
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Monitor button text changes over 10 seconds
    let previousText = initialText;
    for (let i = 1; i <= 10; i++) {
      await page.waitForTimeout(1000);
      
      const currentText = await page.locator('button[type="submit"]').textContent();
      const currentUrl = page.url();
      
      if (currentText !== previousText || currentUrl.includes('/dashboard')) {
        console.log(`⏱️ Second ${i}: Button: "${currentText.trim()}" | URL: ${currentUrl}`);
        previousText = currentText;
        
        if (currentUrl.includes('/dashboard')) {
          console.log('✅ SUCCESS: Redirected to dashboard!');
          break;
        }
      }
    }
    
    const finalUrl = page.url();
    const finalButtonText = await page.locator('button[type="submit"]').textContent();
    
    console.log('\n📋 FINAL RESULTS:');
    console.log('Final URL:', finalUrl);
    console.log('Final button text:', finalButtonText.trim());
    console.log('Login successful:', finalUrl.includes('/dashboard'));
    console.log('Button stuck in loading:', finalButtonText.includes('Signing in'));
    
    if (finalUrl.includes('/dashboard') && !finalButtonText.includes('Signing in')) {
      console.log('🎉 FIX VERIFIED: Login works and UI state is correct!');
    } else if (finalUrl.includes('/dashboard')) {
      console.log('⚠️ PARTIAL SUCCESS: Login works but UI still stuck');
    } else {
      console.log('❌ ISSUE PERSISTS: Login not working');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testLoginFix().catch(console.error);