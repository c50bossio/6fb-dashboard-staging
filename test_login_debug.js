const { chromium } = require('playwright');
const fs = require('fs');

async function debugLogin() {
  console.log('🚀 Starting login debug session...');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    devtools: true   // Open devtools automatically
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Set up console logging
  page.on('console', msg => {
    console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
  });
  
  // Set up error logging
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });
  
  // Set up network monitoring
  const networkLogs = [];
  page.on('request', request => {
    networkLogs.push({
      type: 'request',
      url: request.url(),
      method: request.method(),
      timestamp: new Date().toISOString()
    });
  });
  
  page.on('response', response => {
    networkLogs.push({
      type: 'response',
      url: response.url(),
      status: response.status(),
      ok: response.ok(),
      timestamp: new Date().toISOString()
    });
  });
  
  try {
    console.log('📍 Navigating to login page...');
    await page.goto('http://localhost:9999/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for the page to load completely
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Page loaded');
    
    // Take initial screenshot
    await page.screenshot({ path: 'login_initial.png' });
    console.log('📸 Initial screenshot saved');
    
    // Check if form elements exist
    const emailInput = await page.locator('input[name="email"]');
    const passwordInput = await page.locator('input[name="password"]');
    const submitButton = await page.locator('button[type="submit"]');
    
    const elementsExist = {
      email: await emailInput.count() > 0,
      password: await passwordInput.count() > 0,
      submit: await submitButton.count() > 0
    };
    
    console.log('🔍 Form elements found:', elementsExist);
    
    if (!elementsExist.email || !elementsExist.password || !elementsExist.submit) {
      console.error('❌ Required form elements missing');
      await browser.close();
      return;
    }
    
    // Fill in the form
    console.log('📝 Filling in demo credentials...');
    await emailInput.fill('demo@barbershop.com');
    await passwordInput.fill('demo123');
    
    // Take screenshot after filling form
    await page.screenshot({ path: 'login_fields_filled.png' });
    console.log('📸 Form filled screenshot saved');
    
    // Get initial button state
    const initialButtonText = await submitButton.textContent();
    const initialButtonDisabled = await submitButton.isDisabled();
    
    console.log('📊 Initial button state:', {
      text: initialButtonText,
      disabled: initialButtonDisabled
    });
    
    // Click submit and monitor
    console.log('🚀 Clicking submit button...');
    await submitButton.click();
    
    // Take screenshot immediately after click
    await page.screenshot({ path: 'login_after_click.png' });
    console.log('📸 After click screenshot saved');
    
    // Monitor for changes over 15 seconds
    let previousUrl = page.url();
    let previousButtonText = await submitButton.textContent();
    
    for (let i = 1; i <= 15; i++) {
      await page.waitForTimeout(1000); // Wait 1 second
      
      const currentUrl = page.url();
      const currentButtonText = await submitButton.textContent();
      const currentButtonDisabled = await submitButton.isDisabled();
      
      console.log(`⏱️ Check ${i}:`, {
        url: currentUrl,
        buttonText: currentButtonText.trim(),
        buttonDisabled: currentButtonDisabled,
        urlChanged: currentUrl !== previousUrl,
        buttonTextChanged: currentButtonText !== previousButtonText
      });
      
      // If URL changed (redirect happened), break
      if (currentUrl !== previousUrl) {
        console.log('✅ Redirect detected!');
        break;
      }
      
      previousButtonText = currentButtonText;
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'login_final_state.png' });
    console.log('📸 Final state screenshot saved');
    
    // Get console errors from the page
    const consoleLogs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
    // Create debug report
    const debugReport = {
      timestamp: new Date().toISOString(),
      finalUrl: page.url(),
      networkLogs: networkLogs,
      elementsFound: elementsExist,
      initialButtonState: {
        text: initialButtonText,
        disabled: initialButtonDisabled
      },
      finalButtonState: {
        text: await submitButton.textContent(),
        disabled: await submitButton.isDisabled()
      }
    };
    
    // Save debug report
    fs.writeFileSync('login_debug_report.json', JSON.stringify(debugReport, null, 2));
    console.log('💾 Debug report saved to login_debug_report.json');
    
    // Check for specific Supabase errors
    const supabaseCheck = await page.evaluate(() => {
      try {
        // Check if Supabase client is available
        return {
          supabaseLoaded: typeof window.supabase !== 'undefined',
          createClientAvailable: typeof window.createClient !== 'undefined',
          authErrors: window.console._authErrors || []
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    console.log('🔐 Supabase state check:', supabaseCheck);
    
  } catch (error) {
    console.error('❌ Error during login debug:', error.message);
    await page.screenshot({ path: 'login_error.png' });
    console.log('📸 Error screenshot saved');
  } finally {
    console.log('🏁 Debug session complete. Browser will stay open for manual inspection.');
    console.log('💡 Check the following files:');
    console.log('  - login_initial.png');
    console.log('  - login_fields_filled.png');  
    console.log('  - login_after_click.png');
    console.log('  - login_final_state.png');
    console.log('  - login_debug_report.json');
    
    // Don't close browser automatically so user can inspect
    // await browser.close();
  }
}

debugLogin().catch(console.error);