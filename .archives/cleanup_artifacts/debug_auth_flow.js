const { chromium } = require('playwright');

async function debugAuthStateFlow() {
  let browser;
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.addInitScript(() => {
      const originalLog = console.log;
      console.log = (...args) => {
        if (args.some(arg => typeof arg === 'string' && 
            (arg.includes('Sign in') || arg.includes('auth') || arg.includes('redirect')))) {
          originalLog('🔐 AUTH LOG:', ...args);
        }
        originalLog(...args);
      };
      
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(...args) {
        console.log('🧭 NAVIGATION: pushState called with', args[2]);
        return originalPushState.apply(this, args);
      };
      
      history.replaceState = function(...args) {
        console.log('🧭 NAVIGATION: replaceState called with', args[2]);
        return originalReplaceState.apply(this, args);
      };
      
      window.addEventListener('beforeunload', () => {
        console.log('🧭 NAVIGATION: Page unloading');
      });
    });
    
    
    await page.goto('http://localhost:9999/login');
    console.log('1. Navigated to login page');
    
    await page.fill('input[name="email"]', 'demo@barbershop.com');
    await page.fill('input[name="password"]', 'demo123');
    console.log('2. Filled credentials');
    
    page.on('console', msg => {
      console.log(`BROWSER: ${msg.text()}`);
    });
    
    await page.click('button[type="submit"]');
    console.log('3. Clicked submit button');
    
    let finalState = 'unknown';
    
    try {
      await Promise.race([
        page.waitForURL('**/dashboard', { timeout: 10000 }).then(() => {
          finalState = 'redirected';
        }),
        page.waitForTimeout(12000).then(() => {
          finalState = 'timeout';
        })
      ]);
    } catch (e) {
      finalState = 'error';
    }
    
    const url = page.url();
    const buttonText = await page.locator('button[type="submit"]').textContent();
    
    console.log('\n=== FINAL STATE ===');
    console.log(`URL: ${url}`);
    console.log(`Button text: "${buttonText}"`);
    console.log(`Final state: ${finalState}`);
    
    if (finalState === 'timeout') {
      console.log('\n🚨 ISSUE DETECTED: Login stuck, attempting manual navigation...');
      
      try {
        await page.goto('http://localhost:9999/dashboard');
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        const dashboardLoaded = await page.locator('text=Dashboard').count() > 0;
        console.log(`Manual dashboard access: ${dashboardLoaded ? 'SUCCESS' : 'FAILED'}`);
        
        if (dashboardLoaded) {
          console.log('✅ User IS authenticated, but automatic redirect failed');
        } else {
          console.log('❌ User is NOT authenticated properly');
        }
      } catch (e) {
        console.log('❌ Manual dashboard access failed:', e.message);
      }
    }
    
    await page.waitForTimeout(3000);
    
    return {
      finalUrl: page.url(),
      buttonText,
      finalState,
      success: finalState === 'redirected'
    };
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  debugAuthStateFlow().then(result => {
    console.log('\n=== ANALYSIS ===');
    if (result.success) {
      console.log('✅ Authentication and redirect working correctly');
    } else {
      console.log('❌ Authentication redirect is broken');
      console.log('   Possible causes:');
      console.log('   - Auth state change listener not firing');
      console.log('   - Next.js router.push() failing');
      console.log('   - Dashboard page not accessible');
      console.log('   - Race condition in state management');
    }
  }).catch(console.error);
}

module.exports = { debugAuthStateFlow };