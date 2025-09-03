import { chromium } from 'playwright';

async function testStripeConnectDebugging() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visibility
  });
  
  const page = await browser.newPage();
  
  // Capture all console logs
  const consoleLogs = [];
  const networkRequests = [];
  const errors = [];
  
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      timestamp: new Date().toISOString()
    };
    consoleLogs.push(logEntry);
    console.log(`[${logEntry.timestamp}] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('/api/stripe')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
      console.log(`📤 API REQUEST: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/stripe')) {
      console.log(`📥 API RESPONSE: ${response.status()} ${response.url()}`);
    }
  });
  
  // Capture JavaScript errors
  page.on('pageerror', error => {
    errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    console.log(`💥 PAGE ERROR: ${error.message}`);
  });
  
  try {
    console.log('🚀 Starting Stripe Connect debugging test...');
    
    // Navigate to the application
    console.log('📍 Navigating to localhost:9999...');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle' });
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'stripe-test-01-initial.png', fullPage: true });
    
    // Check if we need to login first
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('🔐 Login page detected - need to authenticate first');
      
      // Look for login form elements
      const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        console.log('📝 Filling login form...');
        await emailInput.fill('test@example.com'); // Using test credentials
        await passwordInput.fill('testpassword123');
        await page.screenshot({ path: 'stripe-test-02-login-form.png' });
        
        console.log('🔐 Submitting login...');
        await submitButton.click();
        await page.waitForTimeout(3000); // Wait for login to process
      } else {
        console.log('❌ Could not find login form elements');
      }
    }
    
    // Navigate to finance page directly
    console.log('📍 Navigating directly to finance page...');
    await page.goto('http://localhost:9999/finance', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait longer for finance page to fully load
    
    console.log('📊 Checking page content...');
    
    // Check what's actually rendered on the page
    const pageTitle = await page.locator('h1, h2, h3').first().textContent().catch(() => 'No title found');
    console.log('📄 Page title/heading:', pageTitle);
    
    // Check for UnifiedFinanceHub indicators
    const financeHubIndicators = [
      'Set Up Payments',
      'StreamlinedOnboarding',
      'Connect Bank Account',
      'Stripe Connect',
      'Finance Center',
      'Payment Setup'
    ];
    
    for (const indicator of financeHubIndicators) {
      const exists = await page.locator(`text=${indicator}`).count() > 0;
      console.log(`🔍 "${indicator}" found: ${exists}`);
    }
    
    // Check console for UnifiedFinanceHub logs
    console.log('💬 Looking for finance-related console logs...');
    
    await page.screenshot({ path: 'stripe-test-03-finance-page.png', fullPage: true });
    
    // Look for the Connect Bank Account button
    console.log('🔍 Looking for Connect Bank Account button...');
    
    const connectButtonSelectors = [
      'button:has-text("Connect Bank Account")',
      'button:has-text("Connect bank account")',
      'button:has-text("Setup Payments")',
      'button:has-text("Quick Connect")',
      '[data-testid="stripe-connect-button"]',
      '.stripe-connect-button',
      'button[class*="connect"]',
      'button[class*="stripe"]'
    ];
    
    let connectButton = null;
    
    for (const selector of connectButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          connectButton = button;
          console.log(`✅ Found connect button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!connectButton) {
      console.log('🔍 Connect button not immediately visible, taking screenshot and waiting...');
      await page.screenshot({ path: 'stripe-test-04-no-button-found.png', fullPage: true });
      
      // Wait a bit more and try again
      await page.waitForTimeout(3000);
      
      for (const selector of connectButtonSelectors) {
        try {
          const button = page.locator(selector).first();
          if (await button.isVisible({ timeout: 2000 })) {
            connectButton = button;
            console.log(`✅ Found connect button after wait with selector: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }
    
    if (connectButton) {
      console.log('🎯 Found Connect Bank Account button!');
      
      // Take screenshot before clicking
      await page.screenshot({ path: 'stripe-test-05-before-click.png', fullPage: true });
      
      // Clear console logs for cleaner debugging
      consoleLogs.length = 0;
      
      console.log('🖱️ Clicking Connect Bank Account button...');
      await connectButton.click();
      
      // Wait for processing and capture logs
      console.log('⏳ Waiting for processing...');
      await page.waitForTimeout(5000);
      
      // Take screenshot after clicking
      await page.screenshot({ path: 'stripe-test-06-after-click.png', fullPage: true });
      
    } else {
      console.log('❌ Could not find Connect Bank Account button');
      
      // Let's see what buttons are available
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons on page:`);
      
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        try {
          const buttonText = await allButtons[i].textContent();
          const buttonClass = await allButtons[i].getAttribute('class');
          console.log(`  Button ${i + 1}: "${buttonText?.trim()}" (class: ${buttonClass})`);
        } catch (e) {
          console.log(`  Button ${i + 1}: Could not read`);
        }
      }
    }
    
    // Wait for any async operations to complete
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('💥 Test error:', error);
    await page.screenshot({ path: 'stripe-test-ERROR.png', fullPage: true });
  } finally {
    console.log('\n📊 TEST SUMMARY:');
    console.log(`Console logs captured: ${consoleLogs.length}`);
    console.log(`Network requests captured: ${networkRequests.length}`);
    console.log(`JavaScript errors: ${errors.length}`);
    
    // Print key debugging information
    if (consoleLogs.length > 0) {
      console.log('\n🔍 RELEVANT CONSOLE LOGS:');
      consoleLogs
        .filter(log => log.text.includes('STRIPE') || log.text.includes('connect') || log.text.includes('error'))
        .forEach(log => {
          console.log(`  ${log.type.padEnd(8)} | ${log.text}`);
        });
    }
    
    if (networkRequests.length > 0) {
      console.log('\n🌐 NETWORK REQUESTS:');
      networkRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url}`);
      });
    }
    
    if (errors.length > 0) {
      console.log('\n💥 JAVASCRIPT ERRORS:');
      errors.forEach(error => {
        console.log(`  ${error.message}`);
        if (error.stack) console.log(`    Stack: ${error.stack.split('\n')[0]}`);
      });
    }
    
    await page.waitForTimeout(2000); // Keep browser open briefly
    await browser.close();
    
    console.log('\n✅ Test completed! Check the generated screenshots for visual debugging.');
  }
}

// Run the test
testStripeConnectDebugging().catch(console.error);