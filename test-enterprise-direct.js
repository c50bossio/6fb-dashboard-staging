const { chromium } = require('playwright');

async function testEnterpriseFlow() {
  console.log('🚀 Starting Direct Enterprise Onboarding Flow Test');
  console.log('==================================================');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    slowMo: 1000     // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Enable detailed logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔥 BROWSER ERROR:', msg.text());
    } else if (msg.text().includes('profile') || msg.text().includes('onboarding') || msg.text().includes('enterprise')) {
      console.log('📊 RELEVANT LOG:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.error('💥 PAGE ERROR:', error.message);
  });
  
  try {
    // Step 1: Navigate to homepage
    console.log('\n📍 Step 1: Navigating to localhost:9999');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: './test-results/enterprise-01-initial-load.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot saved: enterprise-01-initial-load.png');
    
    // Wait and observe the page behavior
    await page.waitForTimeout(3000);
    
    // Check what's visible on the page
    const pageTitle = await page.title();
    const url = page.url();
    console.log(`📄 Page Title: "${pageTitle}"`);
    console.log(`🔗 Current URL: ${url}`);
    
    // Look for login elements
    const loginElements = [
      'text=Sign in',
      'text=Log in',
      'text=Login',
      '[data-testid="login-form"]',
      'input[type="email"]',
      'input[type="password"]'
    ];
    
    let loginFound = false;
    for (const selector of loginElements) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ Login element found: ${selector}`);
          loginFound = true;
          break;
        }
      } catch (e) {
        // Continue checking other selectors
      }
    }
    
    if (loginFound) {
      console.log('🔐 Login page detected - dev auth override properly disabled');
    } else {
      console.log('⚠️ No obvious login elements found - checking for other auth states');
    }
    
    // Step 2: Look for onboarding modal or enterprise elements
    console.log('\n📍 Step 2: Checking for onboarding/enterprise elements');
    
    const onboardingSelectors = [
      'text=Welcome to BookedBarber',
      'text=Welcome to BookedBarber Enterprise',
      'text=🏢 Enterprise Account',
      '[data-testid="onboarding-modal"]',
      '.onboarding-modal',
      'text=Get Started',
      'text=Complete Setup'
    ];
    
    let onboardingFound = false;
    for (const selector of onboardingSelectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 })) {
          console.log(`✅ Onboarding element found: ${selector}`);
          onboardingFound = true;
          
          // Take screenshot when onboarding is found
          await page.screenshot({ 
            path: './test-results/enterprise-02-onboarding-detected.png', 
            fullPage: true 
          });
          console.log('✅ Screenshot saved: enterprise-02-onboarding-detected.png');
          
          break;
        }
      } catch (e) {
        // Continue checking
      }
    }
    
    if (!onboardingFound) {
      console.log('ℹ️ No onboarding modal detected - taking screenshot of current state');
      await page.screenshot({ 
        path: './test-results/enterprise-02-no-onboarding.png', 
        fullPage: true 
      });
      console.log('✅ Screenshot saved: enterprise-02-no-onboarding.png');
    }
    
    // Step 3: Check for enterprise branding anywhere on page
    console.log('\n📍 Step 3: Scanning for enterprise branding');
    
    const enterpriseTerms = ['enterprise', 'Enterprise', 'ENTERPRISE', 'Multi-Location', 'multi-location'];
    const pageContent = await page.textContent('body');
    
    let enterpriseFound = false;
    for (const term of enterpriseTerms) {
      if (pageContent.includes(term)) {
        console.log(`✅ Enterprise term found: "${term}"`);
        enterpriseFound = true;
      }
    }
    
    if (!enterpriseFound) {
      console.log('ℹ️ No enterprise branding detected in page content');
    }
    
    // Step 4: Try to interact with any visible buttons/links
    console.log('\n📍 Step 4: Looking for interactive elements');
    
    const buttons = await page.locator('button:visible').all();
    const links = await page.locator('a:visible').all();
    
    console.log(`🔘 Found ${buttons.length} visible buttons`);
    console.log(`🔗 Found ${links.length} visible links`);
    
    // Get text of first few buttons/links
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      try {
        const text = await buttons[i].textContent();
        console.log(`  Button ${i + 1}: "${text}"`);
      } catch (e) {
        console.log(`  Button ${i + 1}: [Unable to get text]`);
      }
    }
    
    for (let i = 0; i < Math.min(links.length, 5); i++) {
      try {
        const text = await links[i].textContent();
        const href = await links[i].getAttribute('href');
        console.log(`  Link ${i + 1}: "${text}" → ${href}`);
      } catch (e) {
        console.log(`  Link ${i + 1}: [Unable to get text/href]`);
      }
    }
    
    // Step 5: Final state screenshot and summary
    console.log('\n📍 Step 5: Final state analysis');
    
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: './test-results/enterprise-03-final-state.png', 
      fullPage: true 
    });
    console.log('✅ Screenshot saved: enterprise-03-final-state.png');
    
    // Test Summary
    console.log('\n🎯 ENTERPRISE ONBOARDING TEST SUMMARY');
    console.log('=====================================');
    console.log(`📄 Page Title: "${pageTitle}"`);
    console.log(`🔗 Final URL: ${page.url()}`);
    console.log(`🔐 Login Detection: ${loginFound ? '✅ Found (dev override disabled)' : '❌ Not found'}`);
    console.log(`🚀 Onboarding Detection: ${onboardingFound ? '✅ Found' : '❌ Not found'}`);
    console.log(`🏢 Enterprise Branding: ${enterpriseFound ? '✅ Found' : '❌ Not found'}`);
    console.log(`🔘 Interactive Elements: ${buttons.length} buttons, ${links.length} links`);
    
    console.log('\n📸 Screenshots captured:');
    console.log('  - enterprise-01-initial-load.png');
    console.log('  - enterprise-02-onboarding-detected.png (or no-onboarding.png)');
    console.log('  - enterprise-03-final-state.png');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: './test-results/enterprise-ERROR-state.png', 
      fullPage: true 
    });
    console.log('✅ Error screenshot saved: enterprise-ERROR-state.png');
  } finally {
    console.log('\n🏁 Closing browser...');
    await browser.close();
    console.log('✅ Test completed');
  }
}

// Run the test
testEnterpriseFlow().catch(console.error);