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
    console.log(`Browser console [${msg.type()}]:`, msg.text());
  });

  // Listen for Stripe API responses  
  page.on('response', async (response) => {
    if (response.url().includes('/api/stripe') || 
        response.url().includes('orchestrateSetup') ||
        response.url().includes('onboarding-link')) {
      console.log('🎯 Stripe API Response:', response.status(), response.url());
      
      try {
        const body = await response.text();
        console.log('📄 Response body:', body.substring(0, 1000));
      } catch (e) {
        console.log('Could not read response body');
      }
    }
  });

  try {
    console.log('🚀 Testing banking section navigation...');

    // Login first
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:9999/login');
    await page.waitForTimeout(2000);

    await page.fill('input[placeholder="Email address"]', 'demo@bookedbarber.com');
    await page.fill('input[placeholder*="Password"]', 'Demo123!@#');
    await page.click('button[type="submit"]');
    
    console.log('2. Waiting for login...');
    await page.waitForTimeout(3000);
    
    if (page.url().includes('/dashboard')) {
      console.log('✅ Login successful');
    } else {
      console.log('❌ Login may have failed');
      return;
    }

    // Navigate to payment setup and try different approaches
    console.log('3. Testing different approaches to reach banking section...');
    
    // Try the direct payment setup URL
    await page.goto('http://localhost:9999/shop/settings/payment-setup?onboarding=true&step=financial&from=dashboard');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'banking-01-initial.png', fullPage: true });

    // Try clicking "Configure payments" button first
    console.log('4. Looking for Configure payments button...');
    const configureButton = page.locator('button').filter({ hasText: /configure payments/i }).first();
    if (await configureButton.isVisible()) {
      console.log('Found Configure payments button, clicking...');
      await configureButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'banking-02-configure-clicked.png', fullPage: true });
    }

    // Now look for navigation to banking section
    console.log('5. Looking for banking section navigation...');
    
    // Try different selectors for banking navigation
    const bankingSelectors = [
      'button:has-text("Bank Account")',
      'button:has-text("Banking")', 
      'button:has-text("banking")',
      '[data-section="banking"]',
      'button[class*="banking"]',
      'text=Bank Account',
      'text=Banking'
    ];

    let bankingNavButton = null;
    for (const selector of bankingSelectors) {
      try {
        bankingNavButton = page.locator(selector).first();
        if (await bankingNavButton.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found banking navigation with: ${selector}`);
          await bankingNavButton.click();
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Take screenshot after navigation attempts
    await page.screenshot({ path: 'banking-03-after-navigation.png', fullPage: true });

    // Check for Connect Bank Account button with multiple approaches
    console.log('6. Comprehensive search for Connect Bank Account button...');
    
    const connectSelectors = [
      'button:has-text("Connect Bank Account")',
      'button:has-text("Connect")',
      'button:has-text("Bank")',
      'button[onclick*="createStripeConnectAccount"]',
      'button[onclick*="StripeConnect"]',
      'text=Connect Bank Account',
      'text=Connect Bank',
      'text=Connect'
    ];

    let foundConnectButton = false;
    for (const selector of connectSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found Connect button with: ${selector}`);
          const buttonText = await button.textContent();
          console.log(`   Button text: "${buttonText}"`);
          foundConnectButton = true;
          
          // Try clicking it
          console.log('   Clicking the button...');
          await button.click();
          await page.waitForTimeout(3000);
          
          // Check for any changes
          const newUrl = page.url();
          console.log(`   URL after click: ${newUrl}`);
          
          if (newUrl.includes('stripe.com')) {
            console.log('🎉 SUCCESS: Redirected to Stripe!');
            return;
          }
          
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!foundConnectButton) {
      console.log('❌ No Connect Bank Account button found with any selector');
      
      // Debug: Get page content and analyze
      console.log('\n=== DEBUGGING PAGE STATE ===');
      
      // Get all visible text
      const pageText = await page.textContent('body');
      console.log('Page contains "connect":', pageText.toLowerCase().includes('connect'));
      console.log('Page contains "bank":', pageText.toLowerCase().includes('bank'));
      console.log('Page contains "stripe":', pageText.toLowerCase().includes('stripe'));
      console.log('Page contains "account":', pageText.toLowerCase().includes('account'));
      
      // Get all buttons
      const allButtons = await page.locator('button').all();
      console.log('\nAll buttons on page:');
      for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
        const text = await allButtons[i].textContent();
        const isVisible = await allButtons[i].isVisible();
        console.log(`  ${i + 1}. "${text.trim()}" (visible: ${isVisible})`);
      }
      
      // Check current URL and section
      console.log('\nCurrent URL:', page.url());
      
      // Check for section indicators
      const sectionText = await page.evaluate(() => {
        // Look for any section indicator
        const activeElement = document.querySelector('[class*="active"], [class*="selected"], [class*="current"]');
        if (activeElement) {
          return `Active element: ${activeElement.textContent?.trim()}`;
        }
        
        // Look for step indicators
        const stepElement = document.querySelector('[class*="step"], [data-step]');
        if (stepElement) {
          return `Step element: ${stepElement.textContent?.trim()}`;
        }
        
        // Check for h1, h2, h3 headings
        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).filter(Boolean);
        return `Headings: ${headings.join(', ')}`;
      });
      console.log('Section indicators:', sectionText);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'banking-error.png', fullPage: true });
  }

  // Keep browser open for inspection
  console.log('\nTest complete. Browser will remain open for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();