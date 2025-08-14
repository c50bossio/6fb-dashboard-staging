const { chromium } = require('playwright');
const path = require('path');

async function testOAuthFlowWithPKCE() {
  console.log('🧪 Testing Improved OAuth Flow with PKCE and Session Handling');
  console.log('=' .repeat(70));

  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    permissions: ['clipboard-read', 'clipboard-write']
  });
  
  const page = await context.newPage();

  // Enable console monitoring
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    console.log(`🖥️  Console: ${logEntry}`);
  });

  // Monitor network requests
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('supabase') || request.url().includes('oauth') || request.url().includes('auth')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
      console.log(`🌐 Network: ${request.method()} ${request.url()}`);
    }
  });

  // Monitor page errors
  page.on('pageerror', error => {
    console.log(`❌ Page Error: ${error.message}`);
  });

  try {
    // Step 1: Navigate to subscription page
    console.log('\n📍 Step 1: Navigating to subscription page...');
    await page.goto('http://localhost:9999/subscribe');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ 
      path: path.join(__dirname, 'test-screenshots/01-subscription-page.png'),
      fullPage: true 
    });
    console.log('✅ Step 1: Subscription page loaded');

    // Step 2: Select Shop plan
    console.log('\n📍 Step 2: Selecting Shop plan ($99/month)...');
    
    // Wait for and click the Shop plan button
    const shopPlanButton = page.locator('text="Start as Shop Owner"').first();
    await shopPlanButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Take screenshot before clicking
    await page.screenshot({ 
      path: path.join(__dirname, 'test-screenshots/02-before-shop-plan-click.png'),
      fullPage: true 
    });
    
    await shopPlanButton.click();
    console.log('✅ Step 2: Shop plan button clicked');

    // Step 3: Monitor for OAuth redirect
    console.log('\n📍 Step 3: Monitoring for Google OAuth redirect...');
    
    // Wait for navigation to Google OAuth
    try {
      await page.waitForURL(url => url.includes('accounts.google.com'), { timeout: 15000 });
      console.log('✅ Step 3: Redirected to Google OAuth');
      
      await page.screenshot({ 
        path: path.join(__dirname, 'test-screenshots/03-google-oauth-page.png'),
        fullPage: true 
      });
    } catch (error) {
      console.log('⚠️  Step 3: No Google OAuth redirect detected. Checking current URL...');
      console.log(`Current URL: ${page.url()}`);
      
      await page.screenshot({ 
        path: path.join(__dirname, 'test-screenshots/03-no-oauth-redirect.png'),
        fullPage: true 
      });
    }

    // Step 4: Check for console logs about session handling
    console.log('\n📍 Step 4: Analyzing console logs for session handling...');
    
    const sessionLogs = consoleLogs.filter(log => 
      log.includes('OAuth') || 
      log.includes('session') || 
      log.includes('PKCE') ||
      log.includes('Supabase') ||
      log.includes('plan data') ||
      log.includes('🔐') ||
      log.includes('✅') ||
      log.includes('📦')
    );

    console.log('\n📋 Session-related console logs:');
    sessionLogs.forEach(log => console.log(`  ${log}`));

    // Step 5: Check sessionStorage for plan data
    console.log('\n📍 Step 5: Checking sessionStorage for plan data...');
    
    const sessionStorageData = await page.evaluate(() => {
      const planData = sessionStorage.getItem('selectedPlan');
      const authState = sessionStorage.getItem('supabase.auth.token');
      return {
        planData: planData ? JSON.parse(planData) : null,
        hasAuthState: !!authState,
        allKeys: Object.keys(sessionStorage)
      };
    });

    console.log('📦 SessionStorage Analysis:');
    console.log(`  Plan Data: ${JSON.stringify(sessionStorageData.planData, null, 2)}`);
    console.log(`  Has Auth State: ${sessionStorageData.hasAuthState}`);
    console.log(`  All Keys: ${sessionStorageData.allKeys.join(', ')}`);

    // Step 6: Check if we're on oauth-complete page
    console.log('\n📍 Step 6: Checking for oauth-complete redirect...');
    
    if (page.url().includes('oauth-complete')) {
      console.log('✅ Step 6: Successfully redirected to oauth-complete page');
      
      await page.screenshot({ 
        path: path.join(__dirname, 'test-screenshots/06-oauth-complete-page.png'),
        fullPage: true 
      });

      // Step 7: Check for Stripe redirect
      console.log('\n📍 Step 7: Monitoring for Stripe checkout redirect...');
      
      try {
        await page.waitForURL(url => url.includes('checkout.stripe.com'), { timeout: 10000 });
        console.log('✅ Step 7: Successfully redirected to Stripe checkout');
        
        await page.screenshot({ 
          path: path.join(__dirname, 'test-screenshots/07-stripe-checkout.png'),
          fullPage: true 
        });
      } catch (error) {
        console.log('⚠️  Step 7: No Stripe redirect detected within timeout');
        console.log(`Final URL: ${page.url()}`);
        
        await page.screenshot({ 
          path: path.join(__dirname, 'test-screenshots/07-final-state.png'),
          fullPage: true 
        });
      }
    } else {
      console.log(`⚠️  Step 6: Not on oauth-complete page. Current URL: ${page.url()}`);
      
      await page.screenshot({ 
        path: path.join(__dirname, 'test-screenshots/06-current-state.png'),
        fullPage: true 
      });
    }

    // Generate comprehensive report
    console.log('\n' + '='.repeat(70));
    console.log('📊 OAUTH FLOW TEST RESULTS');
    console.log('='.repeat(70));

    // Check for specific PKCE-related logs
    const pkceRelatedLogs = consoleLogs.filter(log => 
      log.includes('PKCE') || 
      log.includes('code_verifier') ||
      log.includes('code_challenge') ||
      log.includes('state parameter')
    );

    // Check for session handling logs
    const sessionHandlingLogs = consoleLogs.filter(log =>
      log.includes('🔐 Waiting for Supabase') ||
      log.includes('✅ OAuth session established') ||
      log.includes('📦 Found plan data')
    );

    // Network analysis
    const authRequests = networkRequests.filter(req => 
      req.url.includes('auth') || req.url.includes('oauth')
    );

    console.log('\n🔍 PKCE Issue Analysis:');
    console.log(`  PKCE-related logs found: ${pkceRelatedLogs.length}`);
    pkceRelatedLogs.forEach(log => console.log(`    ${log}`));

    console.log('\n🔧 Session Handling Analysis:');
    console.log(`  Session handling logs found: ${sessionHandlingLogs.length}`);
    sessionHandlingLogs.forEach(log => console.log(`    ${log}`));

    console.log('\n🌐 Authentication Requests:');
    console.log(`  Auth-related requests: ${authRequests.length}`);
    authRequests.forEach(req => console.log(`    ${req.method} ${req.url}`));

    console.log('\n📋 Flow Status Summary:');
    console.log(`  ✓ Subscription page loaded: YES`);
    console.log(`  ✓ Shop plan button clicked: YES`);
    console.log(`  ✓ Google OAuth redirect: ${page.url().includes('google.com') ? 'YES' : 'NO'}`);
    console.log(`  ✓ Session logs present: ${sessionHandlingLogs.length > 0 ? 'YES' : 'NO'}`);
    console.log(`  ✓ Plan data in storage: ${sessionStorageData.planData ? 'YES' : 'NO'}`);
    console.log(`  ✓ OAuth-complete redirect: ${page.url().includes('oauth-complete') ? 'YES' : 'NO'}`);
    console.log(`  ✓ Stripe checkout redirect: ${page.url().includes('stripe.com') ? 'YES' : 'NO'}`);

    console.log('\n🎯 PKCE Fix Status:');
    if (sessionHandlingLogs.length > 0) {
      console.log('  ✅ IMPROVED SESSION HANDLING DETECTED');
      console.log('  ✅ New OAuth flow logs are present');
    } else {
      console.log('  ⚠️  Expected session handling logs not found');
    }

    if (page.url().includes('oauth-complete') || page.url().includes('stripe.com')) {
      console.log('  ✅ OAUTH FLOW COMPLETED SUCCESSFULLY');
    } else {
      console.log('  ❌ OAuth flow did not complete as expected');
    }

    return {
      success: page.url().includes('oauth-complete') || page.url().includes('stripe.com'),
      sessionLogsPresent: sessionHandlingLogs.length > 0,
      planDataStored: !!sessionStorageData.planData,
      finalUrl: page.url(),
      consoleLogs: consoleLogs,
      networkRequests: authRequests
    };

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    await page.screenshot({ 
      path: path.join(__dirname, 'test-screenshots/error-state.png'),
      fullPage: true 
    });

    return {
      success: false,
      error: error.message,
      finalUrl: page.url(),
      consoleLogs: consoleLogs
    };
  } finally {
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser kept open for manual inspection...');
    console.log('📸 Screenshots saved to test-screenshots/ directory');
    console.log('⏸️  Press Enter to close browser and exit...');
    
    // Wait for user input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      browser.close();
      process.exit(0);
    });
  }
}

// Create screenshots directory
const fs = require('fs');
const screenshotsDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Run the test
testOAuthFlowWithPKCE().catch(console.error);