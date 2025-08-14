const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Testing OAuth + Subscription Flow (v2)');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Enable detailed console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`🔍 Browser Console [${type}]:`, text);
  });
  
  // Enable request/response logging for localhost only
  page.on('request', request => {
    if (request.url().includes('localhost')) {
      console.log('📤 Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('localhost') && !response.url().includes('.js') && !response.url().includes('.css')) {
      console.log('📥 Response:', response.status(), response.url());
    }
  });
  
  try {
    console.log('1️⃣ Navigating to subscription page...');
    await page.goto('http://localhost:9999/subscribe', { waitUntil: 'networkidle0', timeout: 15000 });
    
    console.log('2️⃣ Taking screenshot of subscription page...');
    await page.screenshot({ path: 'subscription-page.png', fullPage: true });
    
    console.log('3️⃣ Waiting for pricing cards to load...');
    await page.waitForSelector('.pricing-card', { timeout: 10000 });
    
    // Check what plans are available
    const plans = await page.evaluate(() => {
      const planElements = document.querySelectorAll('.pricing-card');
      return Array.from(planElements).map(el => ({
        planName: el.getAttribute('data-plan-name'),
        title: el.querySelector('h3')?.textContent,
        button: el.querySelector('button')?.textContent,
        buttonDisabled: el.querySelector('button')?.disabled
      }));
    });
    
    console.log('📋 Found plans:', plans);
    
    console.log('4️⃣ Looking for "Barbershop" plan (shop tier)...');
    
    // Find and click the shop plan button
    const shopButtonClicked = await page.evaluate(() => {
      const shopCard = document.querySelector('[data-plan-name="shop"]');
      if (shopCard) {
        const button = shopCard.querySelector('button');
        if (button && !button.disabled) {
          console.log('Found shop button:', button.textContent);
          button.click();
          return true;
        }
      }
      return false;
    });
    
    if (shopButtonClicked) {
      console.log('5️⃣ Successfully clicked "Start as Shop Owner" button');
      
      console.log('6️⃣ Waiting for state changes...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Use timeout instead of waitForTimeout
      
      const currentUrl = page.url();
      console.log('🌐 Current URL after click:', currentUrl);
      
      // Check for error messages
      const errorInfo = await page.evaluate(() => {
        const errorElement = document.querySelector('.bg-red-50, .text-red-700');
        return errorElement ? errorElement.textContent.trim() : null;
      });
      
      if (errorInfo) {
        console.log('❌ Error message found:', errorInfo);
      }
      
      // Check for loading states
      const loadingInfo = await page.evaluate(() => {
        const loadingElements = document.querySelectorAll('.animate-spin');
        const buttonText = document.querySelector('[data-plan-name="shop"] button')?.textContent;
        return {
          hasLoadingSpinner: loadingElements.length > 0,
          buttonText: buttonText
        };
      });
      
      console.log('🔄 Loading info:', loadingInfo);
      
      // Check if we're on OAuth page or if there's any error
      if (currentUrl.includes('supabase') || currentUrl.includes('oauth') || currentUrl.includes('auth')) {
        console.log('✅ Successfully redirected to OAuth flow');
        await page.screenshot({ path: 'oauth-redirect.png', fullPage: true });
        
        // Wait a bit more to see if OAuth completes
        console.log('7️⃣ Waiting for OAuth process...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        const finalUrl = page.url();
        console.log('🏁 Final URL:', finalUrl);
        await page.screenshot({ path: 'oauth-final.png', fullPage: true });
        
      } else if (currentUrl === 'http://localhost:9999/subscribe') {
        console.log('⚠️ Still on subscribe page');
        await page.screenshot({ path: 'still-on-subscribe.png', fullPage: true });
        
      } else {
        console.log('🔄 Redirected to unexpected URL:', currentUrl);
        await page.screenshot({ path: 'unexpected-redirect.png', fullPage: true });
      }
      
    } else {
      console.log('❌ Could not find or click shop plan button');
      
      // Debug: Check button states
      const buttonStates = await page.evaluate(() => {
        const buttons = document.querySelectorAll('.pricing-card button');
        return Array.from(buttons).map(btn => ({
          text: btn.textContent,
          disabled: btn.disabled,
          className: btn.className
        }));
      });
      
      console.log('🔍 Button states:', buttonStates);
    }
    
    console.log('8️⃣ Test completed');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }
  
  // Keep browser open for manual inspection
  console.log('🔍 Browser will stay open for 15 seconds for manual inspection...');
  await new Promise(resolve => setTimeout(resolve, 15000));
  
  await browser.close();
})();
