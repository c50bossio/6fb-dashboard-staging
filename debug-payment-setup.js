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

  // Catch any errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  // Listen for all network requests
  const apiResponses = [];
  page.on('response', response => {
    if (response.url().includes('/api/') || response.url().includes('stripe')) {
      console.log('<< Response:', response.status(), response.url());
      // Store response for later analysis
      apiResponses.push({
        url: response.url(),
        status: response.status()
      });
    }
  });

  try {
    console.log('Navigating to payment setup page...');
    await page.goto('http://localhost:9999/shop/settings/payment-setup?onboarding=true&step=financial&from=dashboard', {
      waitUntil: 'networkidle'
    });

    // Wait for page to load completely
    await page.waitForTimeout(3000);

    // Take initial screenshot
    await page.screenshot({ path: 'debug-initial.png', fullPage: true });

    // First, try to navigate to banking section if not already there
    console.log('Checking current section and navigating to banking...');
    
    // Look for banking tab/button first
    const bankingTab = page.locator('button').filter({ hasText: /bank account|banking/i }).first();
    if (await bankingTab.isVisible({ timeout: 5000 })) {
      console.log('Found banking tab, clicking...');
      await bankingTab.click();
      await page.waitForTimeout(1000);
    }

    // Now look for the Connect Bank Account button with more specific selector
    console.log('Looking for Connect Bank Account button...');
    
    // Try multiple selectors
    const selectors = [
      'button:has-text("Connect Bank Account")',
      'button[onClick*="createStripeConnectAccount"]',
      'button:has(.text:contains("Connect Bank Account"))',
      'button:has(span:text("Connect Bank Account"))'
    ];

    let connectButton = null;
    for (const selector of selectors) {
      try {
        connectButton = page.locator(selector).first();
        if (await connectButton.isVisible({ timeout: 2000 })) {
          console.log(`Found button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`Selector ${selector} failed:`, e.message);
      }
    }

    if (!connectButton || !await connectButton.isVisible()) {
      console.log('Connect Bank Account button not found with any selector!');
      
      // Debug: show all buttons on page
      const allButtons = await page.locator('button').all();
      console.log('All buttons on page:');
      for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
        const text = await allButtons[i].textContent();
        console.log(`  Button ${i}: "${text}"`);
      }
      
      // Debug: check if we're in the right section
      const pageText = await page.textContent('body');
      console.log('Page contains "banking":', pageText.toLowerCase().includes('banking'));
      console.log('Page contains "stripe":', pageText.toLowerCase().includes('stripe'));
      console.log('Page contains "connect":', pageText.toLowerCase().includes('connect'));
      
      await page.screenshot({ path: 'debug-no-button.png', fullPage: true });
      return;
    }

    console.log('Found Connect Bank Account button, clicking...');
    
    // Set up a more comprehensive response listener
    const setupPromise = new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ type: 'timeout' }), 15000);
      
      page.on('response', async (response) => {
        if (response.url().includes('orchestrateSetup') || 
            response.url().includes('onboarding-link') ||
            response.url().includes('stripe')) {
          console.log('Stripe API Response:', response.status(), response.url());
          
          try {
            const body = await response.text();
            console.log('Response body:', body);
            clearTimeout(timeout);
            resolve({
              type: 'api_response',
              url: response.url(),
              status: response.status(),
              body: body
            });
          } catch (e) {
            console.log('Could not read response body:', e.message);
          }
        }
      });
    });

    // Click the button
    await connectButton.click();
    
    // Wait for API response or timeout
    console.log('Waiting for API response...');
    const result = await setupPromise;
    
    if (result.type === 'timeout') {
      console.log('⚠️  No API response received within 15 seconds');
    } else {
      console.log('✅ API response received:', result);
    }

    // Wait to see what happens
    await page.waitForTimeout(3000);

    // Take screenshot after clicking
    await page.screenshot({ path: 'debug-after-click.png', fullPage: true });

    // Check for success/error messages
    const successMsg = page.locator('text=/Payment.*created|Payment.*initiated|redirecting/i').first();
    const errorMsg = page.locator('text=/error|failed/i').first();

    if (await successMsg.isVisible({ timeout: 2000 })) {
      const msg = await successMsg.textContent();
      console.log('✅ Success message found:', msg);
    }
    if (await errorMsg.isVisible({ timeout: 2000 })) {
      const msg = await errorMsg.textContent();
      console.log('❌ Error message found:', msg);
    }

    // Check current URL
    console.log('Current URL after click:', page.url());
    
    console.log('\n=== SUMMARY ===');
    console.log('API responses captured:', apiResponses.length);
    apiResponses.forEach((resp, i) => {
      console.log(`  ${i + 1}. ${resp.status} ${resp.url}`);
    });

  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  }

  // Keep browser open for inspection
  console.log('\nTest complete. Browser will remain open for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();