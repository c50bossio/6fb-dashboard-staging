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

  // Listen for API responses  
  const apiResponses = [];
  page.on('response', async (response) => {
    if (response.url().includes('/api/stripe') || 
        response.url().includes('orchestrateSetup') ||
        response.url().includes('onboarding-link') ||
        response.url().includes('/api/payments')) {
      console.log('📡 Stripe API Response:', response.status(), response.url());
      
      try {
        const body = await response.text();
        console.log('📄 Response body:', body.substring(0, 500));
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          body: body
        });
      } catch (e) {
        console.log('Could not read response body:', e.message);
      }
    }
  });

  try {
    console.log('🚀 Starting authenticated payment setup test...');

    // Step 1: Login first
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:9999/login', {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'auth-01-login-page.png', fullPage: true });

    // Fill in login credentials
    console.log('2. Logging in with demo user...');
    await page.fill('input[placeholder="Email address"]', 'demo@bookedbarber.com');
    await page.fill('input[placeholder*="Password"]', 'Demo123!@#');
    
    // Click sign in button
    const signInButton = page.locator('button[type="submit"]').first();
    if (await signInButton.isVisible()) {
      console.log('Found sign in button, clicking...');
      await signInButton.click();
    } else {
      console.log('Sign in button not found, trying form submit...');
      await page.keyboard.press('Enter');
    }

    // Wait for redirect after login
    console.log('3. Waiting for login to complete...');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    
    if (currentUrl.includes('/auth/')) {
      console.log('❌ Still on auth page - login might have failed');
      await page.screenshot({ path: 'auth-02-login-failed.png', fullPage: true });
      
      // Check for error messages
      const errorMsg = page.locator('text=/error|invalid|incorrect/i').first();
      if (await errorMsg.isVisible()) {
        const errText = await errorMsg.textContent();
        console.log('Error message:', errText);
      }
      
      return;
    } else {
      console.log('✅ Login successful, redirected to:', currentUrl);
      await page.screenshot({ path: 'auth-03-login-success.png', fullPage: true });
    }

    // Step 2: Navigate to payment setup
    console.log('4. Navigating to payment setup page...');
    await page.goto('http://localhost:9999/shop/settings/payment-setup?onboarding=true&step=financial&from=dashboard', {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'payment-01-initial.png', fullPage: true });

    // Step 3: Check if we're in the banking section
    console.log('5. Looking for banking section...');
    
    // Check what section we're currently in
    const currentSection = await page.evaluate(() => {
      // Look for active section indicators
      const activeButton = document.querySelector('button[class*="bg-olive"], button[class*="border-olive"]');
      if (activeButton) return activeButton.textContent;
      
      // Check for visible content
      const content = document.body.textContent.toLowerCase();
      if (content.includes('connect bank account')) return 'banking section found';
      if (content.includes('payment setup')) return 'payment section';
      if (content.includes('mobile payment')) return 'mobile section';
      
      return 'unknown section';
    });
    
    console.log('Current section:', currentSection);

    // Navigate to banking section if needed
    if (!currentSection.includes('banking')) {
      console.log('6. Navigating to banking section...');
      const bankingButton = page.locator('button').filter({ hasText: /bank|banking/i }).first();
      if (await bankingButton.isVisible()) {
        await bankingButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Step 4: Look for Connect Bank Account button
    console.log('7. Looking for Connect Bank Account button...');
    await page.screenshot({ path: 'payment-02-banking-section.png', fullPage: true });

    const connectButton = page.locator('button').filter({ hasText: /connect bank account/i }).first();
    
    if (await connectButton.isVisible()) {
      console.log('✅ Found Connect Bank Account button!');
      
      // Step 5: Click the button and monitor API calls
      console.log('8. Clicking Connect Bank Account button...');
      
      const apiResponsePromise = new Promise((resolve) => {
        const timeout = setTimeout(() => resolve({ type: 'timeout' }), 10000);
        
        const responseHandler = async (response) => {
          if (response.url().includes('/api/stripe') || 
              response.url().includes('orchestrateSetup') ||
              response.url().includes('onboarding-link')) {
            console.log('🎯 Target API response captured:', response.url());
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
      
      // Wait for API response
      console.log('9. Waiting for API response...');
      const apiResult = await apiResponsePromise;
      
      if (apiResult.type === 'timeout') {
        console.log('⚠️  No API response within 10 seconds');
      } else {
        console.log('✅ API Response Details:');
        console.log('   URL:', apiResult.url);
        console.log('   Status:', apiResult.status);
        console.log('   Body:', apiResult.body.substring(0, 1000));
        
        // Parse response to understand the issue
        if (apiResult.body) {
          try {
            const parsed = JSON.parse(apiResult.body);
            console.log('\n🔍 Parsed Response Analysis:');
            
            if (parsed.setup_url) {
              console.log('   ✅ setup_url found:', parsed.setup_url);
            } else {
              console.log('   ❌ setup_url MISSING');
              
              if (parsed.current_status) {
                console.log('   📊 current_status:', JSON.stringify(parsed.current_status, null, 2));
              }
              
              if (parsed.error) {
                console.log('   ❌ Error:', parsed.error);
              }
            }
          } catch (e) {
            console.log('   📄 Response is not JSON:', apiResult.body.substring(0, 200));
          }
        }
      }

      // Wait and check for UI changes
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'payment-03-after-click.png', fullPage: true });

      // Check for success/error messages
      const successMsg = page.locator('text=/payment.*setup.*initiated|payment.*created|redirecting/i').first();
      const errorMsg = page.locator('text=/error|failed/i').first();

      if (await successMsg.isVisible()) {
        const msg = await successMsg.textContent();
        console.log('✅ Success message found:', msg);
      }
      if (await errorMsg.isVisible()) {
        const msg = await errorMsg.textContent();
        console.log('❌ Error message found:', msg);
      }

      // Check if URL changed (redirect happened)
      const finalUrl = page.url();
      console.log('Final URL:', finalUrl);
      
      if (finalUrl.includes('stripe.com')) {
        console.log('🎉 SUCCESS: Redirected to Stripe!');
      } else if (finalUrl === currentUrl) {
        console.log('⚠️  NO REDIRECT: Still on same page');
      } else {
        console.log('🔄 Redirected to different page:', finalUrl);
      }

    } else {
      console.log('❌ Connect Bank Account button not found!');
      
      // Debug: show available buttons
      const buttons = await page.locator('button').all();
      console.log('\nAvailable buttons on page:');
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].textContent();
        console.log(`  ${i + 1}. "${text.trim()}"`);
      }
      
      // Check page content
      const pageContent = await page.textContent('body');
      console.log('\nPage content check:');
      console.log('  Contains "connect":', pageContent.toLowerCase().includes('connect'));
      console.log('  Contains "bank":', pageContent.toLowerCase().includes('bank'));
      console.log('  Contains "stripe":', pageContent.toLowerCase().includes('stripe'));
      console.log('  Contains "payment":', pageContent.toLowerCase().includes('payment'));
    }

    console.log('\n=== SUMMARY ===');
    console.log('Total API responses captured:', apiResponses.length);
    apiResponses.forEach((resp, i) => {
      console.log(`  ${i + 1}. ${resp.status} ${resp.url}`);
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  }

  // Keep browser open for inspection
  console.log('\nTest complete. Browser will remain open for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();