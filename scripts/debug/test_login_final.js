const { chromium } = require('playwright');

async function testLoginFunctionality() {
  let browser;
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('http://localhost:9999/login');
    const loginFormExists = await page.locator('form').count() > 0;

    if (!loginFormExists) {
      throw new Error('Login form not found');
    }

    await page.fill('input[name="email"]', 'demo@barbershop.com');
    await page.fill('input[name="password"]', 'demo123');
    
    const emailValue = await page.inputValue('input[name="email"]');
    const passwordValue = await page.inputValue('input[name="password"]');

    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    const loadingText = await page.locator('button[type="submit"]').textContent();
    const showsLoading = loadingText.includes('Signing in...');

    let redirectSuccess = false;
    try {
      await page.waitForURL('**/dashboard', { timeout: 8000 });
      redirectSuccess = true;
    } catch (e) {
      
    }
    
    const finalUrl = page.url();
    const isDashboard = finalUrl.includes('/dashboard');

    if (isDashboard) {
      
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        const hasDashboardTitle = await page.locator('text=Dashboard').count() > 0;
        const hasContent = await page.locator('main, .dashboard, [data-testid*="dashboard"]').count() > 0;

      } catch (e) {
        
      }
    }

    try {
      await page.goto('http://localhost:9999/dashboard/settings');
      await page.waitForLoadState('networkidle', { timeout: 3000 });
      const settingsAccessible = !page.url().includes('/login');
      
    } catch (e) {
      
    }
    
    const overallSuccess = isDashboard && redirectSuccess;

    return {
      success: overallSuccess,
      details: {
        formLoaded: loginFormExists,
        credentialsFilled: emailValue === 'demo@barbershop.com',
        loadingStateShown: showsLoading,
        redirectedToDashboard: isDashboard,
        finalUrl
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

if (require.main === module) {
  testLoginFunctionality().then(result => {
    if (result.success) {

    } else {

    }
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { testLoginFunctionality };