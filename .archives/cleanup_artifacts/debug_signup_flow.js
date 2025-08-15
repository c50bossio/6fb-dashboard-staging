const { chromium } = require('playwright');

async function debugSignupFlow() {
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for better observation
  });
  
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  
  try {
    console.log('📍 STEP 1: Navigating to home page');
    await page.goto('http://localhost:9999');
    await page.waitForLoadState('networkidle');
    console.log('✅ Home page loaded');
    
    await page.screenshot({ path: 'debug_1_homepage.png' });
    console.log('📸 Home page screenshot saved');
    
    console.log('\n📍 STEP 2: Analyzing Sign Up buttons');
    
    const signupSelectors = [
      'a[href="/register"]',
      'text="Sign Up"',
      'text="Start Building Your Brand"',
      'text="Get Started"'
    ];
    
    let foundButtons = [];
    for (const selector of signupSelectors) {
      const buttons = await page.locator(selector).all();
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const text = await button.textContent();
        const href = await button.getAttribute('href');
        const isVisible = await button.isVisible();
        foundButtons.push({
          selector,
          text: text?.trim(),
          href,
          isVisible,
          index: i
        });
      }
    }
    
    console.log('🔍 Found signup buttons:');
    foundButtons.forEach((btn, i) => {
      console.log(`  ${i + 1}. "${btn.text}" -> ${btn.href} (visible: ${btn.isVisible})`);
    });
    
    console.log('\n📍 STEP 3: Clicking header "Sign Up" button');
    const headerSignupButton = page.locator('a[href="/register"]').first();
    
    if (await headerSignupButton.isVisible()) {
      await headerSignupButton.click();
      console.log('✅ Clicked header Sign Up button');
      
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigation completed');
      
      const currentUrl = page.url();
      console.log('📍 Current URL:', currentUrl);
      
      await page.screenshot({ path: 'debug_2_register_page.png' });
      console.log('📸 Register page screenshot saved');
      
      console.log('\n📍 STEP 4: Analyzing register page');
      
      const googleButton = page.locator('button:has-text("Sign up with Google")');
      const googleButtonExists = await googleButton.count() > 0;
      const googleButtonVisible = googleButtonExists ? await googleButton.isVisible() : false;
      
      console.log('🔍 Google OAuth button:', {
        exists: googleButtonExists,
        visible: googleButtonVisible
      });
      
      const formFields = [
        'input[name="firstName"]',
        'input[name="lastName"]', 
        'input[name="email"]',
        'input[name="password"]'
      ];
      
      console.log('🔍 Form fields analysis:');
      for (const field of formFields) {
        const exists = await page.locator(field).count() > 0;
        const visible = exists ? await page.locator(field).isVisible() : false;
        console.log(`  ${field}: exists=${exists}, visible=${visible}`);
      }
      
      console.log('\n📍 STEP 5: Testing Google OAuth flow');
      
      if (googleButtonVisible) {
        console.log('🔐 Clicking Google Sign Up button...');
        
        let redirects = [];
        page.on('response', response => {
          if (response.status() >= 300 && response.status() < 400) {
            redirects.push({
              from: response.url(),
              to: response.headers()['location'] || 'unknown',
              status: response.status()
            });
          }
        });
        
        await googleButton.click();
        console.log('✅ Google OAuth button clicked');
        
        try {
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          
          const finalUrl = page.url();
          console.log('📍 Final URL after OAuth click:', finalUrl);
          
          await page.screenshot({ path: 'debug_3_oauth_flow.png' });
          console.log('📸 OAuth flow screenshot saved');
          
          if (finalUrl.includes('accounts.google.com') || finalUrl.includes('supabase')) {
            console.log('✅ Successfully redirected to OAuth provider');
            console.log('🔄 OAuth URL:', finalUrl);
            
            console.log('⏸️  Stopping here to avoid actual OAuth login');
            
          } else if (finalUrl.includes('/subscribe')) {
            console.log('✅ Redirected to subscription page');
            
            const planButtons = await page.locator('button:has-text("Start as")').all();
            console.log(`🔍 Found ${planButtons.length} pricing plan buttons`);
            
          } else {
            console.log('⚠️  Unexpected redirect destination:', finalUrl);
          }
          
        } catch (timeoutError) {
          console.log('⏱️  Timeout waiting for OAuth redirect - checking current state');
          const currentUrl = page.url();
          console.log('📍 Current URL after timeout:', currentUrl);
          
          const errorMessages = await page.locator('[class*="error"], [class*="Error"], .text-red-600').all();
          if (errorMessages.length > 0) {
            console.log('❌ Found error messages:');
            for (const error of errorMessages) {
              const text = await error.textContent();
              console.log(`  - ${text}`);
            }
          }
        }
        
        console.log('\n🔄 Redirects tracked:');
        redirects.forEach((redirect, i) => {
          console.log(`  ${i + 1}. ${redirect.status}: ${redirect.from} -> ${redirect.to}`);
        });
        
      } else {
        console.log('❌ Google OAuth button not found or not visible');
      }
      
    } else {
      console.log('❌ Header Sign Up button not found or not visible');
    }
    
    console.log('\n📍 STEP 6: Testing manual registration form');
    
    if (page.url().includes('/register')) {
      console.log('📝 Filling out registration form...');
      
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', 'testuser@example.com');
      await page.fill('input[name="password"]', 'TestPassword123');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123');
      
      console.log('✅ Form filled with test data');
      
      await page.screenshot({ path: 'debug_4_filled_form.png' });
      console.log('📸 Filled form screenshot saved');
      
      const nextButton = page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        console.log('🔍 Found Next button - this is a multi-step form');
        await nextButton.click();
        
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        console.log('📍 After Next click, URL:', currentUrl);
        
        await page.screenshot({ path: 'debug_5_step2.png' });
        console.log('📸 Step 2 screenshot saved');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during signup flow test:', error);
    
    await page.screenshot({ path: 'debug_error.png' });
    console.log('📸 Error screenshot saved');
  }
  
  console.log('📁 Screenshots saved:');
  
  console.log('\n🔍 Browser kept open for manual inspection...');
  console.log('Press Ctrl+C to close when done.');
  
  await new Promise(() => {});
}

debugSignupFlow().catch(console.error);