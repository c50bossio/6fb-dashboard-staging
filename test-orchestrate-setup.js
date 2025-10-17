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
    console.log(`Browser [${msg.type()}]:`, msg.text());
  });

  // Listen for Stripe API responses  
  page.on('response', async (response) => {
    if (response.url().includes('/api/stripe') || 
        response.url().includes('orchestrateSetup') ||
        response.url().includes('onboarding-link')) {
      console.log('🎯 Stripe API Response:', response.status(), response.url());
      
      try {
        const body = await response.text();
        console.log('📄 Response details:');
        
        if (body.length < 2000) {
          console.log(body);
        } else {
          console.log(body.substring(0, 1000) + '\n... [truncated]');
        }

        // Try to parse as JSON for better analysis
        try {
          const parsed = JSON.parse(body);
          console.log('\n🔍 Parsed Analysis:');
          
          if (parsed.setup_url) {
            console.log('   ✅ setup_url found:', parsed.setup_url);
          } else {
            console.log('   ❌ setup_url MISSING');
          }
          
          if (parsed.current_status) {
            console.log('   📊 Connect account status:');
            const connectStatus = parsed.current_status.connect_account;
            if (connectStatus) {
              console.log(`     - exists: ${connectStatus.exists}`);
              console.log(`     - onboarding_completed: ${connectStatus.onboarding_completed}`);
              console.log(`     - charges_enabled: ${connectStatus.charges_enabled}`);
              console.log(`     - payouts_enabled: ${connectStatus.payouts_enabled}`);
              console.log(`     - details_submitted: ${connectStatus.details_submitted}`);
            }
          }
          
          if (parsed.next_action) {
            console.log('   🎯 next_action:', parsed.next_action);
          }
          
          if (parsed.error) {
            console.log('   ❌ Error:', parsed.error);
          }
        } catch (e) {
          // Not JSON, that's fine
        }
      } catch (e) {
        console.log('Could not read response body');
      }
    }
  });

  try {
    console.log('🚀 Testing Connect Bank Account button after fix...');

    // Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:9999/login');
    await page.waitForTimeout(2000);

    await page.fill('input[placeholder="Email address"]', 'demo@bookedbarber.com');
    await page.fill('input[placeholder*="Password"]', 'Demo123!@#');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    if (!page.url().includes('/dashboard')) {
      console.log('❌ Login failed');
      return;
    }
    console.log('✅ Login successful');

    // Navigate to payment setup
    console.log('2. Navigating to payment setup...');
    await page.goto('http://localhost:9999/shop/settings/payment-setup?onboarding=true&step=financial&from=dashboard');
    await page.waitForTimeout(3000);

    // Look for Connect Bank Account button
    console.log('3. Looking for Connect Bank Account button...');
    const connectButton = page.locator('button').filter({ hasText: /connect bank account/i }).first();
    
    if (await connectButton.isVisible()) {
      console.log('✅ Found Connect Bank Account button!');
      console.log('4. Clicking button and monitoring API calls...');

      // Set up promise to capture API response
      const apiResponsePromise = new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ type: 'timeout' }), 15000);
        
        const responseHandler = async (response) => {
          if (response.url().includes('/api/stripe') && 
              (response.url().includes('orchestrateSetup') || 
               response.url().includes('onboarding-link'))) {
            console.log('🎯 Captured target API response!');
            clearTimeout(timeout);
            
            try {
              const body = await response.text();
              resolve({
                type: 'api_response',
                url: response.url(),
                status: response.status(),
                body: body
              });
            } catch (e) {
              resolve({
                type: 'api_response',
                url: response.url(),
                status: response.status(),
                body: 'Could not read body'
              });
            }
            
            page.off('response', responseHandler);
          }
        };
        
        page.on('response', responseHandler);
      });

      // Click the button
      await connectButton.click();
      
      // Wait for response
      const result = await apiResponsePromise;
      
      if (result.type === 'timeout') {
        console.log('⚠️  No specific API response captured within 15 seconds');
      } else {
        console.log('✅ Captured API response successfully!');
      }

      // Wait a moment and check for redirect or UI changes
      await page.waitForTimeout(5000);
      
      const finalUrl = page.url();
      console.log('Final URL:', finalUrl);
      
      if (finalUrl.includes('stripe.com')) {
        console.log('🎉 SUCCESS: Button now redirects to Stripe!');
      } else if (finalUrl !== 'http://localhost:9999/shop/settings/payment-setup?onboarding=true&step=financial&from=dashboard') {
        console.log('🔄 Redirected to:', finalUrl);
      } else {
        console.log('⚠️  Still on same page - checking for success messages');
        
        // Check for success/error messages
        const successMsg = page.locator('text=/payment.*setup.*initiated|redirecting|stripe/i').first();
        const errorMsg = page.locator('text=/error|failed/i').first();

        if (await successMsg.isVisible()) {
          const msg = await successMsg.textContent();
          console.log('Success message:', msg);
        }
        if (await errorMsg.isVisible()) {
          const msg = await errorMsg.textContent();
          console.log('Error message:', msg);
        }
      }

    } else {
      console.log('❌ Connect Bank Account button still not found');
      
      // Check page state
      const pageText = await page.textContent('body');
      console.log('Page contains:');
      console.log('  - "connect":', pageText.toLowerCase().includes('connect'));
      console.log('  - "bank":', pageText.toLowerCase().includes('bank'));
      console.log('  - "stripe":', pageText.toLowerCase().includes('stripe'));
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }

  // Keep browser open
  console.log('\nTest complete. Browser will remain open...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();