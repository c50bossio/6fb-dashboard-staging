const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting complete OAuth flow test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Keep browser visible to see the actual flow
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages from the page
  page.on('console', msg => {
    console.log('🖥️  PAGE LOG:', msg.text());
  });
  
  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('oauth') || request.url().includes('auth') || request.url().includes('stripe')) {
      console.log('🌐 REQUEST:', request.method(), request.url());
    }
  });
  
  // Listen for responses
  page.on('response', response => {
    if (response.url().includes('oauth') || response.url().includes('auth') || response.url().includes('stripe')) {
      console.log('📡 RESPONSE:', response.status(), response.url());
    }
  });
  
  try {
    console.log('📍 Step 1: Navigating to subscribe page...');
    await page.goto('http://localhost:9999/subscribe', { waitUntil: 'networkidle0' });
    
    console.log('📍 Step 2: Taking screenshot of subscribe page...');
    await page.screenshot({ path: 'step1-subscribe-page.png', fullPage: true });
    
    console.log('📍 Step 3: Looking for Shop plan section...');
    await page.waitForSelector('[data-plan="shop"]', { timeout: 10000 });
    
    console.log('📍 Step 4: Clicking "Start as Shop Owner" button...');
    const shopButton = await page.$('[data-plan="shop"] button');
    if (shopButton) {
      await shopButton.click();
      console.log('✅ Shop button clicked');
    } else {
      throw new Error('Shop button not found');
    }
    
    console.log('📍 Step 5: Waiting for redirect or Google OAuth page...');
    await page.waitForTimeout(3000); // Wait for redirect
    
    const currentUrl = page.url();
    console.log('📍 Current URL after button click:', currentUrl);
    
    await page.screenshot({ path: 'step2-after-button-click.png', fullPage: true });
    
    if (currentUrl.includes('google.com') || currentUrl.includes('accounts.google.com')) {
      console.log('🎉 Successfully redirected to Google OAuth!');
      console.log('📍 Step 6: Google OAuth page detected');
      
      // At this point, the flow requires manual interaction with Google OAuth
      console.log('⏸️  MANUAL STEP REQUIRED: Please sign in with your Google account in the browser');
      console.log('⏸️  After signing in, the test will continue monitoring the callback...');
      
      // Wait for redirect back to our app
      console.log('📍 Step 7: Waiting for redirect back to our app...');
      await page.waitForFunction(
        () => window.location.hostname === 'localhost' && window.location.port === '9999',
        { timeout: 120000 } // 2 minutes timeout for manual OAuth
      );
      
      const finalUrl = page.url();
      console.log('📍 Step 8: Back in our app! Final URL:', finalUrl);
      
      await page.screenshot({ path: 'step3-after-oauth-return.png', fullPage: true });
      
      // Check if we're on the oauth-complete page
      if (finalUrl.includes('oauth-complete')) {
        console.log('✅ Successfully reached oauth-complete page!');
        
        // Wait a bit for any redirects to Stripe
        await page.waitForTimeout(5000);
        
        const stripeUrl = page.url();
        console.log('📍 Step 9: Current URL after oauth-complete:', stripeUrl);
        
        if (stripeUrl.includes('stripe.com') || stripeUrl.includes('checkout.stripe.com')) {
          console.log('🎉 Successfully redirected to Stripe Checkout!');
          await page.screenshot({ path: 'step4-stripe-checkout.png', fullPage: true });
        } else {
          console.log('❓ Not redirected to Stripe yet, current page:');
          await page.screenshot({ path: 'step4-final-page.png', fullPage: true });
        }
      } else {
        console.log('❓ Redirected to unexpected page:', finalUrl);
        await page.screenshot({ path: 'step3-unexpected-page.png', fullPage: true });
      }
      
    } else {
      console.log('❌ Not redirected to Google OAuth. Current URL:', currentUrl);
      console.log('📍 Page content:');
      const content = await page.content();
      console.log(content.substring(0, 500) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }
  
  console.log('⏸️  Test paused. Browser will remain open for manual inspection.');
  console.log('⏸️  Press Ctrl+C to close when done.');
  
  // Keep browser open for manual inspection
  await new Promise(resolve => {
    process.on('SIGINT', () => {
      console.log('👋 Closing browser...');
      browser.close();
      resolve();
    });
  });
})();