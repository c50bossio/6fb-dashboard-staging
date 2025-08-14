const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting CORRECTED OAuth flow test...');
  
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
    if (request.url().includes('oauth') || request.url().includes('auth') || request.url().includes('stripe') || request.url().includes('google')) {
      console.log('🌐 REQUEST:', request.method(), request.url());
    }
  });
  
  // Listen for responses
  page.on('response', response => {
    if (response.url().includes('oauth') || response.url().includes('auth') || response.url().includes('stripe') || response.url().includes('google')) {
      console.log('📡 RESPONSE:', response.status(), response.url());
    }
  });
  
  try {
    console.log('📍 Step 1: Navigating to subscribe page...');
    await page.goto('http://localhost:9999/subscribe', { waitUntil: 'networkidle0' });
    
    console.log('📍 Step 2: Taking screenshot of subscribe page...');
    await page.screenshot({ path: 'step1-subscribe-page-corrected.png', fullPage: true });
    
    console.log('📍 Step 3: Looking for Shop plan section with correct selector...');
    // Use the correct selector from the code
    await page.waitForSelector('[data-plan-name="shop"]', { timeout: 10000 });
    console.log('✅ Found shop plan card');
    
    console.log('📍 Step 4: Looking for "Start as Shop Owner" button...');
    const shopButton = await page.$('[data-plan-name="shop"] [data-cta="select-plan-shop"]');
    
    if (shopButton) {
      console.log('✅ Found Shop Owner button');
      
      // Scroll button into view if needed
      await shopButton.scrollIntoView();
      
      console.log('📍 Step 5: Clicking "Start as Shop Owner" button...');
      await shopButton.click();
      console.log('✅ Shop button clicked');
      
      console.log('📍 Step 6: Waiting for redirect or page change...');
      await page.waitForTimeout(3000); // Wait for redirect
      
      let currentUrl = page.url();
      console.log('📍 Current URL after button click:', currentUrl);
      
      await page.screenshot({ path: 'step2-after-button-click-corrected.png', fullPage: true });
      
      // Check if we're redirected to Google OAuth
      if (currentUrl.includes('google.com') || currentUrl.includes('accounts.google.com')) {
        console.log('🎉 Successfully redirected to Google OAuth!');
        console.log('📍 Step 7: Google OAuth page detected');
        
        // Take a screenshot of the Google OAuth page
        await page.screenshot({ path: 'step3-google-oauth-page.png', fullPage: true });
        
        console.log('⏸️  MANUAL STEP REQUIRED: Please sign in with your Google account in the browser');
        console.log('⏸️  I will monitor for the callback...');
        
        // Wait for redirect back to our app with a longer timeout
        console.log('📍 Step 8: Waiting for redirect back to our app (up to 3 minutes)...');
        
        let redirectDetected = false;
        let attempts = 0;
        const maxAttempts = 36; // 3 minutes with 5-second intervals
        
        while (!redirectDetected && attempts < maxAttempts) {
          await page.waitForTimeout(5000); // Check every 5 seconds
          currentUrl = page.url();
          console.log(`📋 Check ${attempts + 1}: Current URL:`, currentUrl);
          
          if (currentUrl.includes('localhost:9999')) {
            redirectDetected = true;
            console.log('✅ Detected redirect back to our app!');
            break;
          }
          
          attempts++;
        }
        
        if (redirectDetected) {
          const finalUrl = page.url();
          console.log('📍 Step 9: Back in our app! Final URL:', finalUrl);
          
          await page.screenshot({ path: 'step4-after-oauth-return.png', fullPage: true });
          
          // Check if we're on the oauth-complete page
          if (finalUrl.includes('oauth-complete')) {
            console.log('✅ Successfully reached oauth-complete page!');
            
            // Wait a bit for any automatic redirects to Stripe
            console.log('📍 Step 10: Waiting for potential Stripe redirect...');
            
            let stripeRedirectDetected = false;
            let stripeAttempts = 0;
            const maxStripeAttempts = 10; // 50 seconds
            
            while (!stripeRedirectDetected && stripeAttempts < maxStripeAttempts) {
              await page.waitForTimeout(5000);
              const currentStripeUrl = page.url();
              console.log(`💳 Stripe check ${stripeAttempts + 1}: Current URL:`, currentStripeUrl);
              
              if (currentStripeUrl.includes('stripe.com') || currentStripeUrl.includes('checkout.stripe.com')) {
                stripeRedirectDetected = true;
                console.log('🎉 Successfully redirected to Stripe Checkout!');
                await page.screenshot({ path: 'step5-stripe-checkout.png', fullPage: true });
                break;
              }
              
              stripeAttempts++;
            }
            
            if (!stripeRedirectDetected) {
              console.log('⚠️  No automatic Stripe redirect detected. Final page:');
              await page.screenshot({ path: 'step5-final-page-no-stripe.png', fullPage: true });
              
              // Check page content for clues
              const pageTitle = await page.title();
              console.log('📄 Page title:', pageTitle);
              
              const pageContent = await page.evaluate(() => {
                return document.body.innerText.substring(0, 500);
              });
              console.log('📄 Page content preview:', pageContent);
            }
            
          } else if (finalUrl.includes('stripe.com') || finalUrl.includes('checkout.stripe.com')) {
            console.log('🎉 Directly redirected to Stripe Checkout!');
            await page.screenshot({ path: 'step4-direct-stripe-checkout.png', fullPage: true });
          } else {
            console.log('❓ Redirected to unexpected page:', finalUrl);
            await page.screenshot({ path: 'step4-unexpected-page.png', fullPage: true });
          }
          
        } else {
          console.log('⏰ Timeout: No redirect detected within 3 minutes');
          console.log('📍 Final URL:', page.url());
          await page.screenshot({ path: 'timeout-no-redirect.png', fullPage: true });
        }
        
      } else {
        console.log('❌ Not redirected to Google OAuth. Current URL:', currentUrl);
        console.log('📍 Checking page content for clues...');
        
        const pageContent = await page.content();
        const hasError = pageContent.includes('error') || pageContent.includes('Error');
        const hasRedirect = pageContent.includes('redirect') || pageContent.includes('oauth');
        
        console.log('🔍 Page analysis:');
        console.log('  - Has error content:', hasError);
        console.log('  - Has redirect/oauth content:', hasRedirect);
        
        if (hasError) {
          // Look for error messages
          const errorElements = await page.$$eval('[class*="error"], [class*="Error"], .text-red-500, .text-red-600, .text-red-700', 
            elements => elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
          );
          console.log('🚨 Error messages found:', errorElements);
        }
      }
      
    } else {
      throw new Error('Shop Owner button not found with selector [data-plan-name="shop"] [data-cta="select-plan-shop"]');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await page.screenshot({ path: 'error-screenshot-corrected.png', fullPage: true });
  }
  
  console.log('⏸️  Test completed. Browser will remain open for manual inspection.');
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