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

  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('/api/') || request.url().includes('stripe')) {
      console.log('>> Request:', request.method(), request.url());
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/') || response.url().includes('stripe')) {
      console.log('<< Response:', response.status(), response.url());
    }
  });

  try {
    console.log('Navigating to payment setup page...');
    await page.goto('http://localhost:9999/shop/settings/payment-setup?onboarding=true&step=financial&from=dashboard', {
      waitUntil: 'networkidle'
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Take screenshot before clicking
    await page.screenshot({ path: 'before-click.png', fullPage: true });

    // Look for the Connect Bank Account button
    const connectButton = await page.locator('button:has-text("Connect Bank Account")').first();
    
    if (await connectButton.isVisible()) {
      console.log('Found Connect Bank Account button, clicking...');
      
      // Click and wait for any network activity
      const [response] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/'), { timeout: 10000 }).catch(() => null),
        connectButton.click()
      ]);

      if (response) {
        console.log('API Response received:', response.url(), response.status());
        const body = await response.text();
        console.log('Response body:', body);
      }

      // Wait a bit to see what happens
      await page.waitForTimeout(5000);

      // Take screenshot after clicking
      await page.screenshot({ path: 'after-click.png', fullPage: true });

      // Check for any success/error messages
      const successMsg = await page.locator('text=/Payment.*created|redirecting/i').first();
      const errorMsg = await page.locator('text=/error|failed/i').first();

      if (await successMsg.isVisible()) {
        console.log('Success message found:', await successMsg.textContent());
      }
      if (await errorMsg.isVisible()) {
        console.log('Error message found:', await errorMsg.textContent());
      }

      // Check current URL
      console.log('Current URL after click:', page.url());

    } else {
      console.log('Connect Bank Account button not found!');
      
      // Try to find what's on the page
      const pageContent = await page.content();
      console.log('Page content sample:', pageContent.substring(0, 500));
    }

  } catch (error) {
    console.error('Test error:', error);
  }

  // Keep browser open for inspection
  console.log('Test complete. Browser will remain open for inspection.');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();