const { chromium } = require('playwright');

async function testCompleteOAuthFlow() {
  console.log('🔧 Starting comprehensive OAuth flow test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down actions for better observation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  // Enable console logging
  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`🌐 CONSOLE [${msg.type()}]:`, msg.text());
    }
  });
  
  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('/api/') || request.url().includes('oauth') || request.url().includes('stripe')) {
      console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/') || response.url().includes('oauth') || response.url().includes('stripe')) {
      console.log(`📨 RESPONSE: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    // Step 1: Navigate to subscription page
    console.log('\n📍 Step 1: Navigating to subscription page...');
    await page.goto('http://localhost:9999/subscribe');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'step1-subscribe-page.png' });
    
    // Step 2: Select Shop plan and click Start as Shop Owner
    console.log('\n📍 Step 2: Selecting Shop plan ($99/month)...');
    
    // Look for the Shop plan pricing card
    const shopPlan = page.locator('text=Shop').first();
    await shopPlan.waitFor({ timeout: 5000 });
    console.log('✅ Shop plan found');
    
    // Find and click the "Start as Shop Owner" button
    const startButton = page.locator('text=Start as Shop Owner').first();
    await startButton.waitFor({ timeout: 5000 });
    console.log('✅ Start button found');
    
    await page.screenshot({ path: 'step2-before-click.png' });
    
    console.log('🖱️ Clicking "Start as Shop Owner" button...');
    await startButton.click();
    
    // Step 3: Monitor for redirect to Google OAuth
    console.log('\n📍 Step 3: Waiting for Google OAuth redirect...');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`🔗 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('accounts.google.com')) {
      console.log('✅ Successfully redirected to Google OAuth');
      await page.screenshot({ path: 'step3-google-oauth.png' });
      
      // Note: In a real test, we would handle Google OAuth here
      // For this test, we'll simulate what happens after OAuth success
      console.log('⚠️ Note: Google OAuth requires manual interaction in this test');
      console.log('🔄 Simulating OAuth success by navigating to callback...');
      
      // Simulate OAuth callback with proper parameters
      const callbackUrl = 'http://localhost:9999/auth/callback?code=mock_auth_code&state=mock_state';
      await page.goto(callbackUrl);
      
    } else if (currentUrl.includes('/register') || currentUrl.includes('/signup')) {
      console.log('✅ Redirected to registration page');
      await page.screenshot({ path: 'step3-register-page.png' });
      
      // Look for Google sign-up button
      const googleButton = page.locator('button:has-text("Google"), [data-testid="google-signup"]').first();
      if (await googleButton.isVisible()) {
        console.log('🖱️ Clicking Google sign-up button...');
        await googleButton.click();
        await page.waitForTimeout(2000);
        
        const newUrl = page.url();
        console.log(`🔗 After Google button click: ${newUrl}`);
        
        if (newUrl.includes('accounts.google.com')) {
          console.log('✅ Successfully redirected to Google OAuth');
          await page.screenshot({ path: 'step3-google-oauth.png' });
          
          // Simulate OAuth callback
          const callbackUrl = 'http://localhost:9999/auth/callback?code=mock_auth_code&state=mock_state';
          console.log('🔄 Simulating OAuth callback...');
          await page.goto(callbackUrl);
        }
      }
    } else {
      console.log(`⚠️ Unexpected redirect to: ${currentUrl}`);
      await page.screenshot({ path: 'step3-unexpected-redirect.png' });
    }
    
    // Step 4: Monitor callback processing
    console.log('\n📍 Step 4: Monitoring OAuth callback processing...');
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    console.log(`🔗 Final URL after callback: ${finalUrl}`);
    await page.screenshot({ path: 'step4-after-callback.png' });
    
    // Step 5: Check for client-side processing
    console.log('\n📍 Step 5: Checking for client-side OAuth processing...');
    
    // Check sessionStorage for plan data
    const sessionData = await page.evaluate(() => {
      return {
        planData: sessionStorage.getItem('pendingPlan'),
        stripeData: sessionStorage.getItem('stripeCheckoutData'),
        authState: sessionStorage.getItem('authState'),
        allKeys: Object.keys(sessionStorage)
      };
    });
    
    console.log('💾 Session Storage Data:');
    console.log('  Plan Data:', sessionData.planData);
    console.log('  Stripe Data:', sessionData.stripeData);
    console.log('  Auth State:', sessionData.authState);
    console.log('  All Keys:', sessionData.allKeys);
    
    // Step 6: Check if redirected to oauth-complete
    if (finalUrl.includes('/subscribe/oauth-complete')) {
      console.log('✅ Successfully reached oauth-complete page');
      
      // Wait for any processing on the oauth-complete page
      await page.waitForTimeout(3000);
      
      // Check if there's a redirect to Stripe
      const stripeRedirect = await page.waitForURL('**/checkout.stripe.com/**', { 
        timeout: 10000,
        waitUntil: 'networkidle'
      }).catch(() => null);
      
      if (stripeRedirect) {
        console.log('✅ Successfully redirected to Stripe checkout!');
        await page.screenshot({ path: 'step6-stripe-checkout.png' });
      } else {
        console.log('⚠️ Did not redirect to Stripe checkout');
        const currentPageUrl = page.url();
        console.log(`🔗 Current page: ${currentPageUrl}`);
        await page.screenshot({ path: 'step6-no-stripe-redirect.png' });
      }
    } else if (finalUrl.includes('/dashboard')) {
      console.log('⚠️ Redirected to dashboard instead of completing subscription flow');
      await page.screenshot({ path: 'step6-dashboard-redirect.png' });
    } else {
      console.log(`⚠️ Unexpected final destination: ${finalUrl}`);
      await page.screenshot({ path: 'step6-unexpected-destination.png' });
    }
    
    // Step 7: Final analysis
    console.log('\n📊 FLOW ANALYSIS:');
    console.log('================');
    console.log(`Final URL: ${page.url()}`);
    
    // Check for specific elements that indicate success
    const hasStripeElements = await page.locator('[data-testid*="stripe"], .stripe-checkout').count();
    const hasErrorMessages = await page.locator('.error, [role="alert"]').count();
    const hasPlanInfo = sessionData.planData !== null;
    
    console.log(`Stripe elements found: ${hasStripeElements}`);
    console.log(`Error messages found: ${hasErrorMessages}`);
    console.log(`Plan data in session: ${hasPlanInfo}`);
    
    if (page.url().includes('stripe.com') && hasStripeElements > 0) {
      console.log('🎉 SUCCESS: OAuth flow completed and reached Stripe checkout!');
    } else if (hasPlanInfo && !hasErrorMessages) {
      console.log('⚠️ PARTIAL SUCCESS: Plan data preserved but Stripe redirect may have failed');
    } else {
      console.log('❌ FAILURE: OAuth flow did not complete successfully');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    console.log('\n🏁 Test completed. Check screenshots for visual verification.');
    await browser.close();
  }
}

testCompleteOAuthFlow();