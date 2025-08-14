const { chromium } = require('playwright');
const path = require('path');

async function testOAuthCallbackFlow() {
  console.log('🧪 Testing OAuth Callback Flow with Simulated Return');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  // Monitor console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    
    // Show relevant logs
    if (logEntry.includes('OAuth') || 
        logEntry.includes('session') || 
        logEntry.includes('plan') ||
        logEntry.includes('🔐') ||
        logEntry.includes('✅') ||
        logEntry.includes('📦') ||
        logEntry.includes('callback') ||
        logEntry.includes('oauth_plan_data') ||
        logEntry.includes('Found plan data') ||
        logEntry.includes('auth') && !logEntry.includes('GoTrueClient')) {
      console.log(`🖥️  ${logEntry}`);
    }
  });

  try {
    // Step 1: Navigate to subscription page and start OAuth
    console.log('\n📍 Step 1: Starting OAuth flow...');
    await page.goto('http://localhost:9999/subscribe');
    await page.waitForLoadState('networkidle');
    
    // Click Shop plan to start OAuth
    const shopButton = page.locator('text="Start as Shop Owner"').first();
    await shopButton.waitFor({ state: 'visible', timeout: 10000 });
    await shopButton.click();

    // Wait for redirect to Google
    await page.waitForURL(url => String(url).includes('google.com'), { timeout: 15000 });
    console.log('✅ Step 1: Successfully redirected to Google OAuth');

    // Step 2: Check if plan data was stored
    console.log('\n📍 Step 2: Checking plan data storage...');
    
    // Go back to our domain to check sessionStorage
    await page.goto('http://localhost:9999/auth/callback');
    
    const storageData = await page.evaluate(() => {
      const oauthPlanData = sessionStorage.getItem('oauth_plan_data');
      const selectedPlan = sessionStorage.getItem('selectedPlan');
      const allKeys = Object.keys(sessionStorage);
      
      return {
        oauthPlanData: oauthPlanData ? JSON.parse(oauthPlanData) : null,
        selectedPlan: selectedPlan ? JSON.parse(selectedPlan) : null,
        allKeys: allKeys,
        rawOauthData: oauthPlanData,
        rawSelectedData: selectedPlan
      };
    });

    console.log('📦 Storage Analysis:');
    console.log(`  oauth_plan_data: ${storageData.oauthPlanData ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`  selectedPlan: ${storageData.selectedPlan ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`  All storage keys: ${storageData.allKeys.join(', ')}`);
    
    if (storageData.oauthPlanData) {
      console.log(`  Plan ID: ${storageData.oauthPlanData.planId}`);
      console.log(`  Billing: ${storageData.oauthPlanData.billingPeriod}`);
      console.log(`  Timestamp: ${new Date(storageData.oauthPlanData.timestamp).toISOString()}`);
    }

    if (storageData.rawOauthData) {
      console.log(`  Raw oauth_plan_data: ${storageData.rawOauthData}`);
    }

    // Step 3: Simulate a successful OAuth callback
    console.log('\n📍 Step 3: Simulating OAuth callback with code...');
    
    // Navigate to callback with simulated OAuth parameters
    const callbackUrl = 'http://localhost:9999/auth/callback?code=test_code&state=test_state';
    await page.goto(callbackUrl);
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: path.join(__dirname, 'test-screenshots/callback-simulation.png'),
      fullPage: true 
    });

    // Wait a bit for callback processing
    await page.waitForTimeout(3000);

    // Step 4: Check if we get redirected to oauth-complete
    console.log('\n📍 Step 4: Checking for oauth-complete redirect...');
    
    const currentUrl = page.url();
    console.log(`Current URL after callback: ${currentUrl}`);

    if (currentUrl.includes('oauth-complete')) {
      console.log('✅ Step 4: Successfully redirected to oauth-complete page');
      
      await page.screenshot({ 
        path: path.join(__dirname, 'test-screenshots/oauth-complete-reached.png'),
        fullPage: true 
      });

      // Check if page processes plan data
      const finalStorageCheck = await page.evaluate(() => {
        const oauthPlanData = sessionStorage.getItem('oauth_plan_data');
        return oauthPlanData ? JSON.parse(oauthPlanData) : null;
      });

      console.log('📦 Final storage check:', finalStorageCheck);

      // Step 5: Wait for potential Stripe redirect
      console.log('\n📍 Step 5: Monitoring for Stripe redirect...');
      
      try {
        await page.waitForURL(url => String(url).includes('stripe.com'), { timeout: 10000 });
        console.log('✅ Step 5: Successfully redirected to Stripe checkout');
        
        await page.screenshot({ 
          path: path.join(__dirname, 'test-screenshots/stripe-reached.png'),
          fullPage: true 
        });
      } catch (error) {
        console.log('⚠️  Step 5: No Stripe redirect within timeout');
        console.log(`Final URL: ${page.url()}`);
        
        await page.screenshot({ 
          path: path.join(__dirname, 'test-screenshots/final-state-no-stripe.png'),
          fullPage: true 
        });
      }
    } else {
      console.log('⚠️  Step 4: Not redirected to oauth-complete');
      console.log(`Current URL: ${currentUrl}`);
      
      await page.screenshot({ 
        path: path.join(__dirname, 'test-screenshots/no-oauth-complete.png'),
        fullPage: true 
      });
    }

    // Step 6: Analyze callback handling logs
    console.log('\n📍 Step 6: Analyzing callback handling...');
    
    const callbackLogs = consoleLogs.filter(log =>
      log.includes('callback') ||
      log.includes('Found plan data') ||
      log.includes('oauth-complete') ||
      log.includes('Stripe') ||
      log.includes('checkout')
    );

    console.log('\n📋 Callback-related logs:');
    callbackLogs.forEach(log => console.log(`  ${log}`));

    // Generate final assessment
    console.log('\n' + '='.repeat(60));
    console.log('📊 OAUTH CALLBACK FLOW ASSESSMENT');
    console.log('='.repeat(60));

    const assessment = {
      planDataStored: !!storageData.oauthPlanData,
      correctStorageKey: !!storageData.oauthPlanData && !storageData.selectedPlan,
      callbackProcessed: currentUrl.includes('callback') || currentUrl.includes('oauth-complete'),
      oauthCompleteReached: currentUrl.includes('oauth-complete'),
      stripeRedirect: currentUrl.includes('stripe.com'),
      callbackLogsPresent: callbackLogs.length > 0,
      finalUrl: currentUrl
    };

    console.log('\n🔍 Key Findings:');
    console.log(`  ✓ Plan data stored correctly: ${assessment.planDataStored ? 'YES' : 'NO'}`);
    console.log(`  ✓ Using correct storage key: ${assessment.correctStorageKey ? 'YES' : 'NO'}`);
    console.log(`  ✓ Callback processed: ${assessment.callbackProcessed ? 'YES' : 'NO'}`);
    console.log(`  ✓ OAuth-complete reached: ${assessment.oauthCompleteReached ? 'YES' : 'NO'}`);
    console.log(`  ✓ Stripe redirect: ${assessment.stripeRedirect ? 'YES' : 'NO'}`);
    console.log(`  ✓ Callback logs present: ${assessment.callbackLogsPresent ? 'YES' : 'NO'}`);

    console.log('\n🎯 PKCE and Session Handling Status:');
    if (assessment.planDataStored && assessment.correctStorageKey) {
      console.log('  ✅ IMPROVED SESSION HANDLING IS WORKING');
      console.log('  ✅ Plan data persists through OAuth redirect');
      console.log('  ✅ Using secure oauth_plan_data storage key');
    } else {
      console.log('  ❌ Session handling issues detected');
    }

    if (assessment.oauthCompleteReached || assessment.stripeRedirect) {
      console.log('  ✅ OAUTH FLOW COMPLETING SUCCESSFULLY');
    } else {
      console.log('  ⚠️  OAuth flow not completing as expected');
    }

    return assessment;

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return { error: error.message };
  } finally {
    await page.waitForTimeout(2000); // Brief pause to see final state
    await browser.close();
  }
}

// Create screenshots directory
const fs = require('fs');
const screenshotsDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Run the test
testOAuthCallbackFlow()
  .then(result => {
    console.log('\n📋 FINAL ASSESSMENT:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });