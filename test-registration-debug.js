#!/usr/bin/env node

/**
 * Test Registration Form Debug Script
 * 
 * This script tests the registration form by simulating the user flow
 * and checking for potential issues with the form submission.
 */

const puppeteer = require('puppeteer');

async function debugRegistrationForm() {
  console.log('🔍 Starting registration form debug...');
  
  let browser;
  
  try {
    // Launch browser with console logs enabled
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      devtools: true,   // Open DevTools
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error') {
        console.log('❌ Browser Error:', msg.text());
      } else if (type === 'warn') {
        console.log('⚠️ Browser Warning:', msg.text());
      } else if (type === 'log') {
        console.log('📝 Browser Log:', msg.text());
      }
    });
    
    // Listen for network failures
    page.on('requestfailed', request => {
      console.log('🌐 Network Request Failed:', request.url(), request.failure().errorText);
    });
    
    // Listen for uncaught exceptions
    page.on('pageerror', error => {
      console.log('💥 Page Error:', error.message);
    });
    
    console.log('🌐 Navigating to registration page...');
    await page.goto('http://localhost:9999/register', { waitUntil: 'networkidle0' });
    
    console.log('✅ Page loaded, filling out Step 1...');
    
    // Fill Step 1 - Personal Info
    await page.type('input[name="firstName"]', 'John');
    await page.type('input[name="lastName"]', 'Doe');
    await page.type('input[name="email"]', 'john.doe.test@gmail.com'); // Use real email domain
    await page.type('input[name="phone"]', '(555) 123-4567');
    await page.type('input[name="password"]', 'TestPassword123');
    await page.type('input[name="confirmPassword"]', 'TestPassword123');
    
    console.log('📝 Step 1 filled, clicking Next...');
    await page.click('button[type="button"]:contains("Next")');
    await page.waitForTimeout(1000);
    
    console.log('✅ Moving to Step 2 - Business Info...');
    
    // Fill Step 2 - Business Info
    await page.type('input[name="businessName"]', 'Test Barbershop');
    await page.type('textarea[name="businessAddress"]', '123 Main Street, Test City, TS 12345');
    await page.type('input[name="businessPhone"]', '(555) 987-6543');
    
    console.log('📝 Step 2 filled, clicking Next...');
    const nextButton = await page.$('button:contains("Next")');
    if (nextButton) {
      await nextButton.click();
    } else {
      // Alternative selector
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const nextBtn = buttons.find(btn => btn.textContent.includes('Next'));
        if (nextBtn) nextBtn.click();
      });
    }
    
    await page.waitForTimeout(1000);
    
    console.log('✅ Moving to Step 3 - Plan Selection...');
    
    // Step 3 - Select Professional plan (should be selected by default)
    const professionalPlan = await page.$('[data-plan="professional"], .cursor-pointer:contains("Professional")');
    if (professionalPlan) {
      await professionalPlan.click();
      console.log('📝 Professional plan selected');
    } else {
      console.log('⚠️ Could not find Professional plan selector, using default');
    }
    
    await page.waitForTimeout(500);
    
    console.log('🚀 Attempting to submit form - clicking "Create account"...');
    
    // Click Create account button
    const createAccountButton = await page.$('button[type="submit"]:contains("Create account")');
    if (createAccountButton) {
      console.log('✅ Found Create account button, clicking...');
      await createAccountButton.click();
    } else {
      // Alternative approach
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
        const createBtn = buttons.find(btn => btn.textContent.includes('Create account'));
        if (createBtn) {
          console.log('Clicking Create account button via JavaScript');
          createBtn.click();
        } else {
          console.log('Could not find Create account button');
        }
      });
    }
    
    console.log('⏳ Waiting for form submission response...');
    await page.waitForTimeout(5000); // Wait 5 seconds to see what happens
    
    // Check current URL to see if redirect happened
    const currentUrl = page.url();
    console.log('📍 Current URL after submission:', currentUrl);
    
    // Check for any error messages on the page
    const errorMessages = await page.$$eval('.text-red-600, .bg-red-50', elements => 
      elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
    );
    
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:');
      errorMessages.forEach(msg => console.log('   -', msg));
    } else {
      console.log('✅ No error messages visible');
    }
    
    // Check for loading states
    const loadingElements = await page.$$eval('.animate-spin, .opacity-50', elements => 
      elements.map(el => el.textContent.trim()).filter(text => text.length > 0)
    );
    
    if (loadingElements.length > 0) {
      console.log('⏳ Loading states found:');
      loadingElements.forEach(msg => console.log('   -', msg));
    }
    
    console.log('🔍 Debug session complete. Check browser DevTools for more details.');
    
    // Keep browser open for manual inspection
    await page.waitForTimeout(30000); // Wait 30 seconds for manual inspection
    
  } catch (error) {
    console.error('💥 Debug script error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the debug function
debugRegistrationForm().catch(console.error);