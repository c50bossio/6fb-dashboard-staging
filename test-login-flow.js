const { chromium } = require('playwright');

async function testLoginAndOnboardingFlow() {
  console.log('🚀 Testing Enterprise Login & Onboarding Flow');
  console.log('===============================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1500
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enhanced logging
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('profile') || text.includes('onboarding') || text.includes('enterprise') || text.includes('auth')) {
      console.log('📊 RELEVANT LOG:', text);
    }
  });
  
  try {
    // Step 1: Load homepage and verify login page
    console.log('\n📍 Step 1: Loading homepage and checking login state');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle' });
    
    const pageTitle = await page.title();
    console.log(`📄 Page Title: "${pageTitle}"`);
    
    // Take initial screenshot
    await page.screenshot({ path: './test-results/login-01-homepage.png', fullPage: true });
    console.log('✅ Screenshot: login-01-homepage.png');
    
    // Check for sign in link/button
    const signInLink = page.locator('a[href="/login"]').or(page.locator('text=Sign In')).or(page.locator('text=Sign in'));
    const signInVisible = await signInLink.first().isVisible({ timeout: 5000 });
    console.log(`🔐 Sign In link visible: ${signInVisible ? '✅ YES' : '❌ NO'}`);
    
    if (signInVisible) {
      console.log('\n📍 Step 2: Clicking Sign In to navigate to login page');
      await signInLink.first().click();
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: './test-results/login-02-login-page.png', fullPage: true });
      console.log('✅ Screenshot: login-02-login-page.png');
      
      // Check current URL
      const currentUrl = page.url();
      console.log(`🔗 Current URL: ${currentUrl}`);
      
      // Look for login form elements
      const loginForm = await page.locator('form, [data-testid="login-form"], input[type="email"]').isVisible({ timeout: 5000 });
      console.log(`📝 Login form visible: ${loginForm ? '✅ YES' : '❌ NO'}`);
      
      // Check for Supabase auth UI specifically
      const supabaseAuth = await page.locator('[data-supabase-auth-ui], .supabase-auth-ui').isVisible({ timeout: 3000 });
      console.log(`🔑 Supabase Auth UI: ${supabaseAuth ? '✅ FOUND' : '❌ NOT FOUND'}`);
      
      if (loginForm || supabaseAuth) {
        console.log('\n📍 Step 3: Login form detected - attempting to simulate enterprise login');
        
        // Instead of real login, let's simulate the post-login state
        await page.evaluate(() => {
          // Create enterprise user data
          const enterpriseUser = {
            id: 'enterprise-test-user-123',
            email: 'c50bossio@gmail.com',
            role: 'ENTERPRISE_OWNER',
            subscription_tier: 'enterprise',
            onboarding_completed: false,
            user_metadata: {
              full_name: 'Enterprise Test User',
              role: 'ENTERPRISE_OWNER'
            },
            created_at: new Date().toISOString()
          };
          
          // Simulate Supabase session
          const mockSession = {
            access_token: 'mock-enterprise-token',
            refresh_token: 'mock-refresh-token',
            user: enterpriseUser
          };
          
          // Store in localStorage as Supabase would
          localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
          
          // Dispatch auth state change event
          window.dispatchEvent(new CustomEvent('supabase:auth-state-change', {
            detail: { event: 'SIGNED_IN', session: mockSession }
          }));
          
          console.log('🧪 Enterprise user session simulated:', enterpriseUser);
        });
        
        // Reload to trigger auth state detection
        console.log('🔄 Reloading to trigger enterprise authentication...');
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: './test-results/login-03-post-auth.png', fullPage: true });
        console.log('✅ Screenshot: login-03-post-auth.png');
        
        // Step 4: Look for enterprise onboarding
        console.log('\n📍 Step 4: Checking for enterprise onboarding activation');
        
        // Look for onboarding modal
        const onboardingModal = page.locator(
          'text=Welcome to BookedBarber Enterprise, ' +
          'text=🏢 Enterprise Account, ' +
          'text=Multi-Location Management, ' +
          '[data-testid="onboarding-modal"], ' +
          '.onboarding-modal'
        );
        
        const modalFound = await onboardingModal.first().isVisible({ timeout: 10000 });
        console.log(`🚀 Enterprise Onboarding Modal: ${modalFound ? '✅ FOUND' : '❌ NOT FOUND'}`);
        
        if (modalFound) {
          await page.screenshot({ path: './test-results/login-04-enterprise-onboarding.png', fullPage: true });
          console.log('✅ Screenshot: login-04-enterprise-onboarding.png');
        }
        
        // Check for "Activating Enterprise Features" text
        const activatingFeatures = await page.locator('text=Activating Enterprise Features').isVisible({ timeout: 5000 });
        console.log(`⚡ Activating Enterprise Features: ${activatingFeatures ? '✅ FOUND' : '❌ NOT FOUND'}`);
        
        // Check page content for enterprise keywords
        const pageContent = await page.textContent('body');
        const enterpriseKeywords = [
          'Enterprise',
          'Multi-Location',
          'Enterprise Account',
          'Welcome to BookedBarber Enterprise'
        ];
        
        const foundKeywords = enterpriseKeywords.filter(keyword => pageContent.includes(keyword));
        console.log(`🏢 Enterprise keywords found: ${foundKeywords.length}/4`);
        foundKeywords.forEach(keyword => console.log(`  ✅ "${keyword}"`));
        
        // Final state screenshot
        await page.screenshot({ path: './test-results/login-05-final-state.png', fullPage: true });
        console.log('✅ Screenshot: login-05-final-state.png');
        
      } else {
        console.log('⚠️ No login form found on login page');
      }
      
    } else {
      console.log('⚠️ Sign In link not found - checking if already authenticated');
      
      // Check if we're already in an authenticated state
      const authState = await page.evaluate(() => {
        return {
          hasToken: localStorage.getItem('supabase.auth.token') !== null,
          currentUrl: window.location.href
        };
      });
      
      console.log(`🔍 Auth State Check:`, authState);
    }
    
    // Final Summary
    console.log('\n🎯 LOGIN FLOW TEST SUMMARY');
    console.log('==========================');
    console.log(`📄 Final Page Title: "${await page.title()}"`);
    console.log(`🔗 Final URL: ${page.url()}`);
    console.log(`🔐 Sign In Available: ${signInVisible ? '✅' : '❌'}`);
    console.log('\n📸 Screenshots captured:');
    console.log('  1. login-01-homepage.png - Initial homepage');
    console.log('  2. login-02-login-page.png - Login page (if found)');
    console.log('  3. login-03-post-auth.png - After simulated auth');
    console.log('  4. login-04-enterprise-onboarding.png - Enterprise onboarding (if found)');
    console.log('  5. login-05-final-state.png - Final state');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    await page.screenshot({ path: './test-results/login-ERROR.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\n✅ Login flow test completed');
  }
}

// Run the test
testLoginAndOnboardingFlow().catch(console.error);