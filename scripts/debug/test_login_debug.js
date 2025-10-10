const { chromium } = require('playwright');
const fs = require('fs');

async function debugLogin() {
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for debugging
    devtools: true   // Open devtools automatically
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => {
    }: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    
  });
  
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
    
    await page.goto('http://localhost:9999/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForLoadState('domcontentloaded');

    await page.screenshot({ path: 'login_initial.png' });

    const emailInput = await page.locator('input[name="email"]');
    const passwordInput = await page.locator('input[name="password"]');
    const submitButton = await page.locator('button[type="submit"]');
    
    const elementsExist = {
      email: await emailInput.count() > 0,
      password: await passwordInput.count() > 0,
      submit: await submitButton.count() > 0
    };

    if (!elementsExist.email || !elementsExist.password || !elementsExist.submit) {
      console.error('❌ Required form elements missing');
      await browser.close();
      return;
    }

    await emailInput.fill('demo@barbershop.com');
    await passwordInput.fill('demo123');
    
    await page.screenshot({ path: 'login_fields_filled.png' });

    const initialButtonText = await submitButton.textContent();
    const initialButtonDisabled = await submitButton.isDisabled();

    await submitButton.click();
    
    await page.screenshot({ path: 'login_after_click.png' });

    let previousUrl = page.url();
    let previousButtonText = await submitButton.textContent();
    
    for (let i = 1; i <= 15; i++) {
      await page.waitForTimeout(1000); // Wait 1 second
      
      const currentUrl = page.url();
      const currentButtonText = await submitButton.textContent();
      const currentButtonDisabled = await submitButton.isDisabled();
      
      ,
        buttonDisabled: currentButtonDisabled,
        urlChanged: currentUrl !== previousUrl,
        buttonTextChanged: currentButtonText !== previousButtonText
      });
      
      if (currentUrl !== previousUrl) {
        
        break;
      }
      
      previousButtonText = currentButtonText;
    }
    
    await page.screenshot({ path: 'login_final_state.png' });

    const consoleLogs = await page.evaluate(() => {
      return window.console._logs || [];
    });
    
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
    
    fs.writeFileSync('login_debug_report.json', JSON.stringify(debugReport, null, 2));
    
    const supabaseCheck = await page.evaluate(() => {
      try {
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

  } catch (error) {
    console.error('❌ Error during login debug:', error.message);
    await page.screenshot({ path: 'login_error.png' });
    
  } finally {

  }
}

debugLogin().catch(console.error);