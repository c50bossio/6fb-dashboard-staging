const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testEnterpriseLoginFlow() {
  console.log('🏢 Enterprise Customer Login Flow Test');
  console.log('====================================\n');
  
  const screenshotsDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100 // Slow down for better visibility
  });

  const page = await browser.newPage();

  // Set up console monitoring
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('🚨 Console Error:', msg.text());
    }
  });

  try {
    console.log('🌐 Step 1: Navigating to login page...');
    await page.goto('http://localhost:9999/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'enterprise-01-login-page.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot 1: Login page captured');

    console.log('\n📧 Step 2: Filling in enterprise test credentials...');
    
    // Fill in the email field
    const emailInput = await page.$('input[type="email"], input[placeholder*="email" i]');
    if (emailInput) {
      await emailInput.type('c50bossio@gmail.com', {delay: 50});
      console.log('✅ Email field filled');
    } else {
      console.log('❌ Could not find email field');
    }

    // Fill in password field (if present)
    const passwordInput = await page.$('input[type="password"], input[placeholder*="password" i]');
    if (passwordInput) {
      await passwordInput.type('testpassword123', {delay: 50});
      console.log('✅ Password field filled');
    } else {
      console.log('ℹ️ No password field found (might be magic link login)');
    }

    await page.screenshot({ 
      path: path.join(screenshotsDir, 'enterprise-02-credentials-filled.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot 2: Credentials filled');

    console.log('\n🔐 Step 3: Attempting to sign in...');
    
    // Look for sign in button
    const signInButton = await page.$('button[type="submit"]');
    if (!signInButton) {
      // Try alternative selectors
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const buttonText = await button.evaluate(el => el.textContent.trim().toLowerCase());
        if (buttonText.includes('sign in') || buttonText.includes('login') || buttonText.includes('continue')) {
          await button.click();
          console.log(`✅ Clicked button: "${buttonText}"`);
          break;
        }
      }
    } else {
      await signInButton.click();
      console.log('✅ Clicked sign in button');
    }

    // Wait for potential navigation/loading
    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.screenshot({ 
      path: path.join(screenshotsDir, 'enterprise-03-after-signin.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot 3: After sign in attempt');

    console.log('\n🎯 Step 4: Looking for onboarding flow...');
    
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Check page content for onboarding elements
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`📝 Page contains ${bodyText.length} characters`);
    
    // Look for enterprise onboarding indicators
    const enterpriseOnboardingTerms = [
      '🏢 Enterprise Account',
      'Multi-Location Management',
      'Welcome to BookedBarber Enterprise',
      'Set up your multi-location business system',
      'OnboardingOrchestrator',
      'Enterprise Account',
      'Multi-Location',
      'Business Setup',
      'Get Started',
      'Complete Setup',
      'Onboarding'
    ];
    
    const foundOnboardingTerms = [];
    enterpriseOnboardingTerms.forEach(term => {
      if (bodyText.includes(term)) {
        foundOnboardingTerms.push(term);
      }
    });
    
    console.log(`🎯 Found onboarding terms: ${foundOnboardingTerms.length}/11`);
    if (foundOnboardingTerms.length > 0) {
      console.log('✅ ONBOARDING ELEMENTS DETECTED:');
      foundOnboardingTerms.forEach(term => {
        console.log(`  - ${term}`);
      });
    } else {
      console.log('❌ No onboarding elements detected');
      console.log('First 500 chars of page:', bodyText.substring(0, 500));
    }

    console.log('\n🔍 Step 5: Looking for interactive elements...');
    
    // Look for buttons and interactive elements
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(btn => ({
        text: btn.textContent.trim(),
        disabled: btn.disabled,
        className: btn.className
      })).filter(btn => btn.text.length > 0 && btn.text.length < 100)
    );
    
    console.log(`🔘 Found ${buttons.length} buttons:`);
    buttons.slice(0, 10).forEach((btn, i) => {
      console.log(`  ${i+1}. "${btn.text}" ${btn.disabled ? '(disabled)' : '(active)'}`);
    });

    // Look for input fields
    const inputs = await page.$$eval('input', inputs => 
      inputs.map(input => ({
        type: input.type,
        placeholder: input.placeholder,
        name: input.name
      })).filter(input => input.type || input.placeholder || input.name)
    );
    
    if (inputs.length > 0) {
      console.log(`📝 Found ${inputs.length} input fields:`);
      inputs.slice(0, 5).forEach((input, i) => {
        console.log(`  ${i+1}. Type: ${input.type}, Placeholder: "${input.placeholder}", Name: "${input.name}"`);
      });
    }

    await page.screenshot({ 
      path: path.join(screenshotsDir, 'enterprise-04-onboarding-elements.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot 4: Onboarding elements captured');

    console.log('\n🎬 Step 6: Testing onboarding interaction...');
    
    // Try to find and click a "Get Started" or similar button
    const startButtons = buttons.filter(btn => 
      btn.text.toLowerCase().includes('get started') ||
      btn.text.toLowerCase().includes('start setup') ||
      btn.text.toLowerCase().includes('begin') ||
      btn.text.toLowerCase().includes('continue') ||
      btn.text.toLowerCase().includes('next')
    );
    
    if (startButtons.length > 0) {
      console.log(`✅ Found ${startButtons.length} potential start buttons`);
      
      // Try clicking the first one
      const startButtonText = startButtons[0].text;
      const startButton = null; // Skip this selector approach
      if (!startButton) {
        // Alternative approach - find by text content
        const buttons = await page.$$('button');
        for (const button of buttons) {
          const buttonText = await button.evaluate(el => el.textContent.trim());
          if (buttonText === startButtonText) {
            await button.click();
            console.log(`✅ Clicked "${startButtonText}" button`);
            break;
          }
        }
      } else {
        await startButton.click();
        console.log(`✅ Clicked "${startButtonText}" button`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'enterprise-05-after-start-click.png'),
        fullPage: true 
      });
      console.log('📸 Screenshot 5: After start button click');
    }

    console.log('\n🏁 Step 7: Final state analysis...');
    
    const finalUrl = page.url();
    const finalBodyText = await page.evaluate(() => document.body.innerText);
    
    // Check if we're in an onboarding flow
    const finalOnboardingCheck = [
      'business name',
      'services',
      'scheduling',
      'setup',
      'complete',
      'step',
      'next',
      'finish'
    ];
    
    const foundFinalTerms = [];
    finalOnboardingCheck.forEach(term => {
      if (finalBodyText.toLowerCase().includes(term)) {
        foundFinalTerms.push(term);
      }
    });

    await page.screenshot({ 
      path: path.join(screenshotsDir, 'enterprise-06-final-state.png'),
      fullPage: true 
    });
    console.log('📸 Screenshot 6: Final state captured');

    // Generate comprehensive report
    console.log('\n📊 ENTERPRISE LOGIN FLOW TEST REPORT');
    console.log('=====================================');
    console.log(`👤 Test Account: c50bossio@gmail.com`);
    console.log(`🌐 Login URL: http://localhost:9999/login`);
    console.log(`📍 Final URL: ${finalUrl}`);
    console.log(`🎯 Onboarding Elements: ${foundOnboardingTerms.length}/11`);
    console.log(`🔘 Interactive Buttons: ${buttons.length}`);
    console.log(`📝 Input Fields: ${inputs.length}`);
    console.log(`🎬 Final Flow Elements: ${foundFinalTerms.length}`);
    console.log(`🚨 Console Errors: ${consoleErrors.length}`);
    console.log(`📸 Screenshots: 6 captured in ${screenshotsDir}`);

    if (foundOnboardingTerms.length > 0) {
      console.log('\n✅ ONBOARDING ELEMENTS FOUND:');
      foundOnboardingTerms.forEach(term => console.log(`  - ${term}`));
    }

    if (foundFinalTerms.length > 0) {
      console.log('\n🎬 ONBOARDING FLOW ELEMENTS:');
      foundFinalTerms.forEach(term => console.log(`  - ${term}`));
    }

    if (consoleErrors.length > 0) {
      console.log('\n🚨 CONSOLE ERRORS:');
      consoleErrors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Assessment
    const hasOnboarding = foundOnboardingTerms.length > 0 || foundFinalTerms.length > 3;
    const hasInteractivity = buttons.length > 0 || inputs.length > 0;
    const lowErrors = consoleErrors.length < 10;
    
    console.log('\n🎯 ASSESSMENT:');
    console.log(`  Login Flow: ${finalUrl !== 'http://localhost:9999/login' ? '✅ SUCCESS' : '❌ STUCK'}`);
    console.log(`  Onboarding Detected: ${hasOnboarding ? '✅ YES' : '❌ NO'}`);
    console.log(`  Interactive Elements: ${hasInteractivity ? '✅ YES' : '❌ NO'}`);
    console.log(`  Error Level: ${lowErrors ? '✅ ACCEPTABLE' : '❌ TOO MANY'}`);
    
    const overallSuccess = hasOnboarding && hasInteractivity && lowErrors;
    console.log(`  Overall Result: ${overallSuccess ? '✅ ONBOARDING SYSTEM WORKING' : '❌ NEEDS ATTENTION'}`);

    console.log('\n✨ Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    try {
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'enterprise-error-state.png'),
        fullPage: true 
      });
      console.log('📸 Error screenshot captured');
    } catch (e) {
      console.log('Could not capture error screenshot');
    }
  } finally {
    await browser.close();
  }
}

testEnterpriseLoginFlow().catch(console.error);