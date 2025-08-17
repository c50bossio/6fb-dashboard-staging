#!/usr/bin/env node

/**
 * Playwright test for payment setup functionality
 */

const { chromium } = require('playwright');

async function testPaymentSetup() {
  console.log('\n🎭 Testing Payment Setup with Playwright');
  console.log('=' .repeat(50));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500  // Slow down for visibility
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Step 1: Navigate to dashboard
    console.log('\n📍 Step 1: Navigating to dashboard...');
    await page.goto('http://localhost:9999/dashboard');
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to login
    if (page.url().includes('/login')) {
      console.log('📝 Redirected to login - attempting login...');
      
      // Try to login with dev credentials
      await page.fill('input[type="email"]', 'dev@localhost.com');
      await page.fill('input[type="password"]', 'devpassword123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle' });
    }
    
    // Step 2: Check if onboarding modal is visible
    console.log('\n📍 Step 2: Checking for onboarding modal...');
    const onboardingModal = await page.locator('text="Welcome to Your Dashboard"').isVisible();
    
    if (!onboardingModal) {
      console.log('❌ Onboarding modal not visible');
      console.log('   Trying to launch it from header...');
      
      // Click profile dropdown
      await page.click('button:has-text("Dev User")');
      await page.waitForTimeout(500);
      
      // Click Launch Onboarding
      await page.click('text="Launch Onboarding"');
      await page.waitForTimeout(1000);
    }
    
    // Step 3: Navigate to Payment Processing step
    console.log('\n📍 Step 3: Navigating to Payment Processing step...');
    
    // Check current step
    const currentStep = await page.locator('text="Step 5 of 7: Payment Processing"').isVisible();
    
    if (!currentStep) {
      console.log('   Not on payment step, navigating...');
      // Click through steps to get to payment
      for (let i = 0; i < 5; i++) {
        const nextButton = await page.locator('button:has-text("Next")');
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Check if we're on payment step
        if (await page.locator('text="Bank Account Setup"').isVisible()) {
          break;
        }
      }
    }
    
    // Step 4: Test payment setup button
    console.log('\n📍 Step 4: Testing payment setup button...');
    
    // Look for the setup button
    const setupButton = await page.locator('button:has-text("Start Setup")');
    
    if (await setupButton.isVisible()) {
      console.log('✅ Found "Start Setup" button');
      
      // Click the button
      console.log('   Clicking button...');
      await setupButton.click();
      
      // Wait for loading state
      await page.waitForTimeout(1000);
      
      // Check if button shows loading
      const loadingButton = await page.locator('button:has-text("Setting up...")').isVisible();
      
      if (loadingButton) {
        console.log('⏳ Button shows loading state');
        
        // Wait for completion (max 10 seconds)
        try {
          await page.waitForFunction(
            () => !document.querySelector('button:has-text("Setting up...")'),
            { timeout: 10000 }
          );
          console.log('✅ Loading completed');
        } catch (e) {
          console.log('❌ Button stuck on loading after 10 seconds');
        }
      }
      
      // Check for errors
      const errorMessage = await page.locator('.text-red-700').first();
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        console.log('❌ Error displayed:', errorText);
      }
      
      // Check if Stripe onboarding opened
      const pages = context.pages();
      if (pages.length > 1) {
        console.log('✅ New tab opened (likely Stripe onboarding)');
      }
      
    } else {
      console.log('❌ "Start Setup" button not found');
      
      // Try alternative button text
      const altButton = await page.locator('button:has-text("Payment")');
      if (await altButton.isVisible()) {
        console.log('   Found alternative payment button');
      }
    }
    
    // Step 5: Check console for errors
    console.log('\n📍 Step 5: Checking for console errors...');
    
    // Capture console logs
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('   Console error:', msg.text());
      }
    });
    
    // Wait a bit to catch any errors
    await page.waitForTimeout(2000);
    
    // Take screenshot for debugging
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ 
      path: 'payment-setup-test.png',
      fullPage: true
    });
    console.log('   Screenshot saved to: payment-setup-test.png');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    console.log('\n🏁 Test complete');
    console.log('=' .repeat(50));
    await browser.close();
  }
}

// Run the test
testPaymentSetup().catch(console.error);