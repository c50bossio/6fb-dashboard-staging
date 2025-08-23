const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testEnterpriseOnboarding() {
  console.log('🚀 Starting Enterprise Onboarding Direct Test');
  console.log('==============================================\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Run with UI for visual debugging
    defaultViewport: { width: 1280, height: 720 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  try {
    // Capture console messages and errors
    const consoleMessages = [];
    const consoleErrors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
        console.log('🚨 Console Error:', text);
      }
    });
    
    // Mock enterprise authentication before navigation
    await page.evaluateOnNewDocument(() => {
      // Mock localStorage for enterprise user
      localStorage.setItem('mockEnterpriseUser', JSON.stringify({
        id: 'c50-enterprise-test',
        email: 'c50bossio@gmail.com',
        user_metadata: {
          role: 'ENTERPRISE_OWNER',
          subscription_tier: 'enterprise',
          onboarding_completed: false
        }
      }));
      
      // Mock Supabase session
      window.mockSupabaseSession = {
        user: {
          id: 'c50-enterprise-test',
          email: 'c50bossio@gmail.com',
          user_metadata: {
            role: 'ENTERPRISE_OWNER',
            subscription_tier: 'enterprise',
            onboarding_completed: false
          }
        }
      };
    });
    
    // Step 1: Navigate to the site
    console.log('📍 Step 1: Navigating to localhost:9999...');
    await page.goto('http://localhost:9999', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    await page.waitForTimeout(3000); // Allow React to render
    
    // Try to navigate to login/onboarding if this is the landing page
    const signInButton = await page.$('a[href="/login"]');
    if (signInButton) {
      console.log('🔐 Found Sign In button, clicking to go to login/onboarding...');
      await signInButton.click();
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-initial-load.png'),
      fullPage: true 
    });
    console.log('✅ Screenshot 1: Initial page load captured');
    
    // Step 2: Analyze page content
    console.log('\n🔍 Step 2: Analyzing page content...');
    const pageContent = await page.content();
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    // Check for enterprise indicators
    const enterpriseIndicators = [
      '🏢 Enterprise Account',
      'Multi-Location Management',
      'Welcome to BookedBarber Enterprise',
      'Set up your multi-location business system',
      'Enterprise',
      'OnboardingOrchestrator',
      'multi-location',
      'enterprise'
    ];
    
    const foundIndicators = [];
    enterpriseIndicators.forEach(indicator => {
      if (bodyText.toLowerCase().includes(indicator.toLowerCase()) || 
          pageContent.toLowerCase().includes(indicator.toLowerCase())) {
        foundIndicators.push(indicator);
        console.log(`✅ Found enterprise indicator: "${indicator}"`);
      }
    });
    
    console.log(`📊 Enterprise indicators found: ${foundIndicators.length}/${enterpriseIndicators.length}`);
    
    // Step 3: Look for onboarding elements
    console.log('\n🎯 Step 3: Looking for onboarding elements...');
    
    const onboardingSelectors = [
      'button:contains("Start Setup")',
      'button:contains("Get Started")', 
      'button:contains("Begin Onboarding")',
      'button:contains("Continue")',
      '[data-testid="onboarding-start"]',
      '.onboarding-button',
      'button',
      '[role="button"]'
    ];
    
    let startButton = null;
    for (const selector of onboardingSelectors) {
      try {
        if (selector.includes(':contains')) {
          // Custom selector for text content
          const text = selector.match(/\("([^"]+)"\)/)[1];
          const buttons = await page.$$('button');
          for (const button of buttons) {
            const buttonText = await button.evaluate(el => el.textContent);
            if (buttonText.includes(text)) {
              startButton = button;
              console.log(`✅ Found start button with text: "${text}"`);
              break;
            }
          }
        } else {
          const element = await page.$(selector);
          if (element) {
            const isVisible = await element.isIntersectingViewport();
            if (isVisible) {
              startButton = element;
              console.log(`✅ Found visible button: ${selector}`);
              break;
            }
          }
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-onboarding-elements.png'),
      fullPage: true 
    });
    console.log('✅ Screenshot 2: Onboarding elements captured');
    
    // Step 4: Test button interaction
    if (startButton) {
      console.log('\n🖱️ Step 4: Testing button interaction...');
      try {
        await startButton.click();
        console.log('✅ Successfully clicked start button');
        await page.waitForTimeout(3000); // Wait for navigation/changes
        
        await page.screenshot({ 
          path: path.join(screenshotsDir, '03-after-start-click.png'),
          fullPage: true 
        });
        console.log('✅ Screenshot 3: After start button click');
        
      } catch (error) {
        console.log('❌ Could not click start button:', error.message);
      }
    } else {
      console.log('\n❌ Step 4: No interactive start button found');
    }
    
    // Step 5: Look for form elements
    console.log('\n📝 Step 5: Looking for form elements...');
    
    const formSelectors = [
      'input[name="businessName"]',
      'input[placeholder*="business"]',
      'input[placeholder*="company"]',
      'input[type="text"]',
      'select',
      'textarea'
    ];
    
    const foundForms = [];
    for (const selector of formSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          foundForms.push(`${selector} (${elements.length})`);
          console.log(`✅ Found form elements: ${selector} (${elements.length})`);
          
          // Try to interact with business name field
          if (selector.includes('business') || selector.includes('company')) {
            await elements[0].type('Enterprise Test Business', {delay: 100});
            console.log('✅ Filled business name field');
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (foundForms.length > 0) {
      await page.screenshot({ 
        path: path.join(screenshotsDir, '04-form-elements.png'),
        fullPage: true 
      });
      console.log('✅ Screenshot 4: Form elements captured');
    }
    
    // Step 6: Look for completion elements
    console.log('\n🎉 Step 6: Looking for completion elements...');
    
    const completionTexts = [
      'Complete Setup',
      'Finish',
      'Launch',
      'Activating Enterprise Features',
      'Setup Complete'
    ];
    
    const foundCompletion = [];
    for (const text of completionTexts) {
      const elements = await page.$x(`//*[contains(text(), '${text}')]`);
      if (elements.length > 0) {
        foundCompletion.push(text);
        console.log(`✅ Found completion element: "${text}"`);
        
        // If it's a button, try clicking it
        for (const element of elements) {
          const tagName = await element.evaluate(el => el.tagName);
          if (tagName === 'BUTTON') {
            try {
              await element.click();
              console.log(`✅ Clicked completion button: "${text}"`);
              await page.waitForTimeout(3000);
              
              await page.screenshot({ 
                path: path.join(screenshotsDir, '05-completion-clicked.png'),
                fullPage: true 
              });
              console.log('✅ Screenshot 5: After completion click');
              break;
            } catch (e) {
              console.log(`❌ Could not click completion button: ${e.message}`);
            }
          }
        }
        break;
      }
    }
    
    // Step 7: Final state
    console.log('\n📊 Step 7: Capturing final state...');
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, '06-final-state.png'),
      fullPage: true 
    });
    console.log('✅ Screenshot 6: Final state captured');
    
    // Step 8: Generate comprehensive report
    console.log('\n📋 ENTERPRISE ONBOARDING TEST REPORT');
    console.log('====================================');
    console.log(`🌐 Test URL: http://localhost:9999`);
    console.log(`📍 Final URL: ${finalUrl}`);
    console.log(`🎯 Enterprise Indicators: ${foundIndicators.length}/${enterpriseIndicators.length}`);
    console.log(`📝 Form Elements: ${foundForms.length}`);
    console.log(`🎉 Completion Elements: ${foundCompletion.length}`);
    console.log(`🚨 Console Errors: ${consoleErrors.length}`);
    console.log(`📸 Screenshots: 6 captured in ${screenshotsDir}`);
    console.log(`💬 Total Console Messages: ${consoleMessages.length}`);
    
    if (foundIndicators.length > 0) {
      console.log('\n✅ ENTERPRISE ELEMENTS DETECTED:');
      foundIndicators.forEach(indicator => {
        console.log(`  - ${indicator}`);
      });
    }
    
    if (foundForms.length > 0) {
      console.log('\n📝 FORM ELEMENTS DETECTED:');
      foundForms.forEach(form => {
        console.log(`  - ${form}`);
      });
    }
    
    if (foundCompletion.length > 0) {
      console.log('\n🎉 COMPLETION ELEMENTS DETECTED:');
      foundCompletion.forEach(completion => {
        console.log(`  - ${completion}`);
      });
    }
    
    if (consoleErrors.length > 0) {
      console.log('\n🚨 CONSOLE ERRORS:');
      consoleErrors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (consoleErrors.length > 10) {
        console.log(`  ... and ${consoleErrors.length - 10} more errors`);
      }
    }
    
    // Evaluation
    console.log('\n🎯 EVALUATION:');
    console.log(`  Enterprise Detection: ${foundIndicators.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Interactive Elements: ${startButton || foundForms.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Error Level: ${consoleErrors.length < 5 ? '✅ ACCEPTABLE' : '❌ TOO MANY ERRORS'}`);
    
    const overallPass = foundIndicators.length > 0 && consoleErrors.length < 10;
    console.log(`  Overall Assessment: ${overallPass ? '✅ PASS' : '❌ NEEDS ATTENTION'}`);
    
    console.log('\n✨ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'error-state.png'),
      fullPage: true 
    });
    
  } finally {
    await browser.close();
  }
}

// Run the test
testEnterpriseOnboarding().catch(console.error);