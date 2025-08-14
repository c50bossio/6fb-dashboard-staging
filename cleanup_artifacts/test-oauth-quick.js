const { chromium } = require('playwright');
const path = require('path');

async function testOAuthFlowQuick() {
  console.log('🧪 Quick OAuth Flow Test - PKCE Issue Analysis');
  console.log('=' .repeat(50));

  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1500
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
    
    // Only show relevant logs
    if (logEntry.includes('OAuth') || 
        logEntry.includes('session') || 
        logEntry.includes('plan') ||
        logEntry.includes('🔐') ||
        logEntry.includes('✅') ||
        logEntry.includes('📦') ||
        logEntry.includes('PKCE') ||
        logEntry.includes('signInWithGoogle')) {
      console.log(`🖥️  ${logEntry}`);
    }
  });

  try {
    // Step 1: Navigate to subscription page
    console.log('\n📍 Step 1: Loading subscription page...');
    await page.goto('http://localhost:9999/subscribe');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ 
      path: path.join(__dirname, 'test-screenshots/quick-01-subscribe.png'),
      fullPage: true 
    });

    // Step 2: Click Shop plan
    console.log('\n📍 Step 2: Clicking Shop plan...');
    const shopButton = page.locator('text="Start as Shop Owner"').first();
    await shopButton.waitFor({ state: 'visible', timeout: 10000 });
    await shopButton.click();

    // Wait a moment for any immediate changes
    await page.waitForTimeout(2000);

    // Step 3: Check if we get to Google OAuth
    console.log('\n📍 Step 3: Checking OAuth redirect...');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('google.com')) {
      console.log('✅ Successfully redirected to Google OAuth');
      
      await page.screenshot({ 
        path: path.join(__dirname, 'test-screenshots/quick-02-google-oauth.png'),
        fullPage: true 
      });
    } else {
      console.log('⚠️  No Google OAuth redirect detected');
      
      await page.screenshot({ 
        path: path.join(__dirname, 'test-screenshots/quick-02-no-redirect.png'),
        fullPage: true 
      });
    }

    // Step 4: Analyze session storage
    console.log('\n📍 Step 4: Checking sessionStorage...');
    const sessionData = await page.evaluate(() => {
      const planData = sessionStorage.getItem('selectedPlan');
      return {
        planData: planData ? JSON.parse(planData) : null,
        allKeys: Object.keys(sessionStorage)
      };
    });

    console.log(`📦 Plan data in storage: ${sessionData.planData ? 'YES' : 'NO'}`);
    if (sessionData.planData) {
      console.log(`   Plan: ${JSON.stringify(sessionData.planData)}`);
    }

    // Step 5: Check for specific logs
    console.log('\n📍 Step 5: Analyzing logs...');
    
    const pkceLogsFound = consoleLogs.filter(log => 
      log.includes('code_challenge') || log.includes('PKCE')
    );
    
    const sessionLogsFound = consoleLogs.filter(log =>
      log.includes('🔐 Waiting for Supabase') ||
      log.includes('✅ OAuth session established') ||
      log.includes('📦 Found plan data')
    );

    const googleSignInLogs = consoleLogs.filter(log =>
      log.includes('signInWithGoogle')
    );

    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('='.repeat(30));
    console.log(`✓ Page loaded: YES`);
    console.log(`✓ Button clicked: YES`);
    console.log(`✓ Google redirect: ${currentUrl.includes('google.com') ? 'YES' : 'NO'}`);
    console.log(`✓ PKCE logs found: ${pkceLogsFound.length} logs`);
    console.log(`✓ Session handling logs: ${sessionLogsFound.length} logs`);
    console.log(`✓ Google sign-in logs: ${googleSignInLogs.length} logs`);
    console.log(`✓ Plan data stored: ${sessionData.planData ? 'YES' : 'NO'}`);

    // Show specific important logs
    if (pkceLogsFound.length > 0) {
      console.log('\n🔐 PKCE-related logs:');
      pkceLogsFound.forEach(log => console.log(`  ${log}`));
    }

    if (sessionLogsFound.length > 0) {
      console.log('\n🔧 Session handling logs:');
      sessionLogsFound.forEach(log => console.log(`  ${log}`));
    }

    if (googleSignInLogs.length > 0) {
      console.log('\n🔗 Google sign-in logs:');
      googleSignInLogs.forEach(log => console.log(`  ${log}`));
    }

    // PKCE Fix Assessment
    console.log('\n🎯 PKCE FIX ASSESSMENT:');
    console.log('='.repeat(30));
    
    if (currentUrl.includes('google.com') && pkceLogsFound.length > 0) {
      console.log('✅ PKCE PARAMETERS ARE BEING GENERATED');
      console.log('✅ OAuth redirect is working');
    } else if (!currentUrl.includes('google.com')) {
      console.log('❌ OAuth redirect failed - no Google page reached');
    } else {
      console.log('⚠️  OAuth redirect worked but no PKCE logs detected');
    }

    if (sessionLogsFound.length > 0) {
      console.log('✅ NEW SESSION HANDLING CODE IS ACTIVE');
    } else {
      console.log('⚠️  Expected session handling improvements not detected');
    }

    return {
      redirectWorked: currentUrl.includes('google.com'),
      pkceLogsFound: pkceLogsFound.length,
      sessionLogsFound: sessionLogsFound.length,
      planDataStored: !!sessionData.planData,
      finalUrl: currentUrl
    };

  } catch (error) {
    console.error('❌ Test error:', error.message);
    return { error: error.message };
  } finally {
    await page.waitForTimeout(3000); // Brief pause to see final state
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
testOAuthFlowQuick()
  .then(result => {
    console.log('\n📋 FINAL RESULT:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });