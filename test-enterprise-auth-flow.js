const { chromium } = require('playwright');

async function testEnterpriseAuthFlow() {
  console.log('🚀 Starting Enterprise Authentication + Onboarding Flow Test');
  console.log('=========================================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 2000,
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enhanced logging for auth flow
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error')) {
      console.log('🔥 ERROR:', text);
    } else if (text.includes('profile') || text.includes('onboarding') || text.includes('enterprise') || text.includes('auth')) {
      console.log('📊 AUTH/PROFILE LOG:', text);
    } else if (text.includes('supabase') || text.includes('session')) {
      console.log('🔐 SUPABASE LOG:', text);
    }
  });
  
  try {
    // Step 1: Load the homepage (should show login)
    console.log('\n📍 Step 1: Loading homepage - expecting login page');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle', timeout: 30000 });
    
    await page.screenshot({ path: './test-results/auth-01-homepage-login.png', fullPage: true });
    console.log('✅ Screenshot: auth-01-homepage-login.png');
    
    // Verify we see the login page (dev auth override disabled)
    const signInButton = await page.locator('text=Sign in').isVisible();
    console.log(`🔐 Login page detected: ${signInButton ? '✅ YES' : '❌ NO'}`);
    
    // Step 2: Click "Get Started" or similar to trigger auth flow
    console.log('\n📍 Step 2: Attempting to trigger authentication flow');
    
    const getStartedButton = page.locator('text=Get Started');
    if (await getStartedButton.isVisible()) {
      console.log('🚀 Clicking "Get Started" button');
      await getStartedButton.click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: './test-results/auth-02-after-get-started.png', fullPage: true });
      console.log('✅ Screenshot: auth-02-after-get-started.png');
    }
    
    // Look for Supabase auth UI or login form
    const authSelectors = [
      '[data-supabase-auth-ui]',
      'input[type="email"]',
      'text=Email',
      'text=Password', 
      'text=Continue with Google',
      'text=Sign up',
      '.auth-widget'
    ];
    
    let authUIFound = false;
    for (const selector of authSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 3000 })) {
          console.log(`✅ Auth UI element found: ${selector}`);
          authUIFound = true;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (authUIFound) {
      console.log('🔐 Authentication UI detected');
      await page.screenshot({ path: './test-results/auth-03-auth-ui-detected.png', fullPage: true });
      console.log('✅ Screenshot: auth-03-auth-ui-detected.png');
      
      // Step 3: Try to simulate login (we'll use a mock approach)
      console.log('\n📍 Step 3: Simulating enterprise user authentication');
      
      // Instead of actual login, let's simulate the post-auth state by injecting session data
      await page.evaluate(() => {
        // Simulate enterprise user profile
        const mockEnterpriseUser = {
          id: 'test-enterprise-user-123',
          email: 'c50bossio@gmail.com',
          role: 'ENTERPRISE_OWNER',
          subscription_tier: 'enterprise',
          onboarding_completed: false,
          created_at: new Date().toISOString()
        };
        
        // Store in localStorage as if Supabase auth completed
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          user: mockEnterpriseUser,
          session: { access_token: 'mock-token' }
        }));
        
        // Trigger a custom event to simulate auth state change
        window.dispatchEvent(new CustomEvent('mock-auth-complete', { 
          detail: { user: mockEnterpriseUser }
        }));
        
        console.log('🧪 Mock enterprise authentication injected');
      });
      
      // Reload page to trigger auth state detection
      console.log('🔄 Reloading page to trigger auth state detection...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: './test-results/auth-04-after-mock-auth.png', fullPage: true });
      console.log('✅ Screenshot: auth-04-after-mock-auth.png');
      
    } else {
      console.log('⚠️ No authentication UI found - taking current state screenshot');
      await page.screenshot({ path: './test-results/auth-03-no-auth-ui.png', fullPage: true });
    }
    
    // Step 4: Look for onboarding modal after auth
    console.log('\n📍 Step 4: Checking for enterprise onboarding modal');
    
    const onboardingSelectors = [
      'text=Welcome to BookedBarber Enterprise',
      'text=🏢 Enterprise Account',
      'text=Multi-Location Management Available',
      '[data-testid="onboarding-modal"]',
      '.onboarding-modal',
      'text=Complete Your Enterprise Setup'
    ];
    
    let enterpriseOnboardingFound = false;
    for (const selector of onboardingSelectors) {
      try {
        if (await page.locator(selector).isVisible({ timeout: 5000 })) {
          console.log(`✅ Enterprise onboarding element found: ${selector}`);
          enterpriseOnboardingFound = true;
          
          await page.screenshot({ path: './test-results/auth-05-enterprise-onboarding.png', fullPage: true });
          console.log('✅ Screenshot: auth-05-enterprise-onboarding.png');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!enterpriseOnboardingFound) {
      console.log('ℹ️ Enterprise onboarding modal not detected yet');
    }
    
    // Step 5: Check current page state and content
    console.log('\n📍 Step 5: Analyzing current page state for enterprise features');
    
    const pageContent = await page.textContent('body');
    const enterpriseKeywords = [
      'Enterprise',
      'Multi-Location',
      'Enterprise Account',
      'Activating Enterprise Features',
      'Business Management'
    ];
    
    const foundKeywords = enterpriseKeywords.filter(keyword => 
      pageContent.includes(keyword)
    );
    
    console.log(`🏢 Enterprise keywords found: ${foundKeywords.length}/5`);
    foundKeywords.forEach(keyword => console.log(`  ✅ "${keyword}"`));
    
    // Final screenshot
    await page.screenshot({ path: './test-results/auth-06-final-state.png', fullPage: true });
    console.log('✅ Screenshot: auth-06-final-state.png');
    
    // Test Summary
    console.log('\n🎯 ENTERPRISE AUTHENTICATION FLOW TEST SUMMARY');
    console.log('==============================================');
    console.log(`🔐 Login Page Detection: ${signInButton ? '✅ Found' : '❌ Not found'}`);
    console.log(`🔑 Auth UI Detection: ${authUIFound ? '✅ Found' : '❌ Not found'}`);
    console.log(`🏢 Enterprise Onboarding: ${enterpriseOnboardingFound ? '✅ Found' : '❌ Not found'}`);
    console.log(`📊 Enterprise Keywords: ${foundKeywords.length}/5 found`);
    console.log(`📄 Page Title: "${await page.title()}"`);
    console.log(`🔗 Final URL: ${page.url()}`);
    
    // Key Success Indicators
    console.log('\n🎉 SUCCESS INDICATORS:');
    if (signInButton) console.log('✅ Dev auth override successfully disabled');
    if (authUIFound) console.log('✅ Authentication flow properly triggered');
    if (foundKeywords.length >= 3) console.log('✅ Enterprise branding detected');
    if (enterpriseOnboardingFound) console.log('✅ Enterprise onboarding modal triggered');
    
    console.log('\n📸 Screenshots captured:');
    console.log('  1. auth-01-homepage-login.png - Initial login page');
    console.log('  2. auth-02-after-get-started.png - After clicking Get Started');
    console.log('  3. auth-03-auth-ui-detected.png - Authentication UI');
    console.log('  4. auth-04-after-mock-auth.png - After mock authentication');
    console.log('  5. auth-05-enterprise-onboarding.png - Enterprise onboarding (if found)');
    console.log('  6. auth-06-final-state.png - Final application state');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    await page.screenshot({ path: './test-results/auth-ERROR.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✅ Enterprise authentication flow test completed');
  }
}

// Run the test
testEnterpriseAuthFlow().catch(console.error);