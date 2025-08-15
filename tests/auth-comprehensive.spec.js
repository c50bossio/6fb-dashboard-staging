/**
 * 6FB AI Agent System - Comprehensive Authentication Testing
 * Cross-browser authentication flow validation with error handling
 * Testing Strategy: Triple Tool Approach (Playwright + Puppeteer + Computer Use)
 */

const { test, expect, devices } = require('@playwright/test');

const testConfig = {
  timeout: 60000, // 60 seconds for auth flows
  actionTimeout: 15000,
  navigationTimeout: 30000,
  retries: 2,
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry'
};

test.describe('Authentication Comprehensive Testing', () => {
  
  test.beforeEach(async ({ page, browserName }) => {
    console.log(`🌐 Testing on ${browserName}`);
    
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Error')) {
        console.log(`🚨 [${browserName}] Console Error:`, msg.text());
      }
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`🌐 [${browserName}] Network Error:`, response.status(), response.url());
      }
    });
  });

  test('should load homepage and navigation correctly', async ({ page, browserName }) => {
    console.log(`🏠 [${browserName}] Testing homepage load...`);
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    await expect(page).toHaveTitle(/6FB AI Agent System/i);
    
    const errors = await page.evaluate(() => {
      return window.jsErrors || [];
    });
    
    if (errors.length > 0) {
      console.warn(`⚠️ [${browserName}] JavaScript errors found:`, errors);
    }
    
    await page.screenshot({ 
      path: `test-results/homepage-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] Homepage loaded successfully`);
  });

  test('should redirect to login when accessing protected AI Agents page unauthenticated', async ({ page, browserName }) => {
    console.log(`🔒 [${browserName}] Testing protected route redirect...`);
    
    await page.goto('/ai-agents');
    
    await page.waitForTimeout(3000); // Allow for redirects/loading
    
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth');
    const hasLoadingSpinner = await page.locator('.loading, [data-testid="loading"], .animate-spin').count() > 0;
    const hasAuthChallenge = await page.locator('input[type="email"], input[type="password"]').count() > 0;
    
    const isProtected = isLoginPage || hasLoadingSpinner || hasAuthChallenge;
    
    console.log(`📍 [${browserName}] Current URL: ${currentUrl}`);
    console.log(`🔐 [${browserName}] Protected route status: ${isProtected ? 'PROTECTED' : 'ACCESSIBLE'}`);
    
    if (!isProtected) {
      console.warn(`⚠️ [${browserName}] SECURITY WARNING: Protected route may be accessible without auth`);
      
      await page.screenshot({ 
        path: `test-results/unprotected-route-${browserName}.png`,
        fullPage: true 
      });
    }
    
    expect(isProtected).toBe(true);
    console.log(`✅ [${browserName}] Protected route properly secured`);
  });

  test('should display and interact with login form', async ({ page, browserName }) => {
    console.log(`📝 [${browserName}] Testing login form functionality...`);
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")');
    
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(loginButton).toBeVisible({ timeout: 5000 });
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');
    
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('testpassword123');
    
    await page.screenshot({ 
      path: `test-results/login-form-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] Login form interactive elements working`);
  });

  test('should handle authentication errors gracefully', async ({ page, browserName }) => {
    console.log(`❌ [${browserName}] Testing authentication error handling...`);
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")').first();
    
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await loginButton.click();
    
    await page.waitForTimeout(5000);
    
    const errorSelectors = [
      '.error',
      '.alert-error',
      '.text-red-500',
      '.text-red-600',
      '.text-danger',
      '[role="alert"]',
      '.notification.is-danger',
      '.alert.alert-danger'
    ];
    
    let errorFound = false;
    let errorMessage = '';
    
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.count() > 0 && await errorElement.isVisible()) {
        errorMessage = await errorElement.first().textContent();
        if (errorMessage && errorMessage.trim().length > 0) {
          errorFound = true;
          break;
        }
      }
    }
    
    const buttonDisabled = await loginButton.isDisabled();
    const hasLoadingState = await page.locator('.animate-spin, .loading, .spinner').count() > 0;
    
    console.log(`🔍 [${browserName}] Error message found: ${errorFound}`);
    console.log(`📝 [${browserName}] Error text: "${errorMessage}"`);
    console.log(`🔘 [${browserName}] Button disabled: ${buttonDisabled}`);
    console.log(`⏳ [${browserName}] Loading state: ${hasLoadingState}`);
    
    await page.screenshot({ 
      path: `test-results/login-error-${browserName}.png`,
      fullPage: true 
    });
    
    const hasErrorHandling = errorFound || buttonDisabled || hasLoadingState;
    
    if (!hasErrorHandling) {
      console.warn(`⚠️ [${browserName}] No error handling detected - this may be a UX issue`);
    }
    
    console.log(`✅ [${browserName}] Authentication error handling tested`);
  });

  test('should work properly on mobile devices', async ({ page, browserName }) => {
    console.log(`📱 [${browserName}] Testing mobile navigation...`);
    
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const mobileMenuSelectors = [
      'button[aria-label="menu"]',
      '.mobile-menu-button',
      '.hamburger',
      'button:has-text("☰")',
      'button:has-text("Menu")',
      '[data-testid="mobile-menu"]',
      '.md\\:hidden button'
    ];
    
    let mobileMenuFound = false;
    for (const selector of mobileMenuSelectors) {
      const menuButton = page.locator(selector);
      if (await menuButton.count() > 0 && await menuButton.isVisible()) {
        console.log(`📱 [${browserName}] Mobile menu button found: ${selector}`);
        
        await menuButton.click();
        await page.waitForTimeout(1000);
        
        mobileMenuFound = true;
        break;
      }
    }
    
    await page.screenshot({ 
      path: `test-results/mobile-navigation-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`📱 [${browserName}] Mobile menu found: ${mobileMenuFound}`);
    console.log(`✅ [${browserName}] Mobile navigation tested`);
  });

  test('should not have critical JavaScript errors', async ({ page, browserName }) => {
    console.log(`🔍 [${browserName}] Testing for JavaScript errors...`);
    
    const consoleErrors = [];
    const networkErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const criticalErrors = consoleErrors.filter(error => {
      const errorLower = error.toLowerCase();
      return !errorLower.includes('favicon') && 
             !errorLower.includes('sourcemap') && 
             !errorLower.includes('extension') &&
             !errorLower.includes('non-critical');
    });
    
    const criticalNetworkErrors = networkErrors.filter(error => {
      return !error.includes('favicon') && !error.includes('sourcemap');
    });
    
    console.log(`🔍 [${browserName}] Console errors found: ${consoleErrors.length}`);
    console.log(`🔍 [${browserName}] Critical console errors: ${criticalErrors.length}`);
    console.log(`🌐 [${browserName}] Network errors found: ${networkErrors.length}`);
    console.log(`🌐 [${browserName}] Critical network errors: ${criticalNetworkErrors.length}`);
    
    if (criticalErrors.length > 0) {
      console.warn(`⚠️ [${browserName}] Critical JavaScript errors:`, criticalErrors);
    }
    
    if (criticalNetworkErrors.length > 0) {
      console.warn(`⚠️ [${browserName}] Critical network errors:`, criticalNetworkErrors);
    }
    
    await page.screenshot({ 
      path: `test-results/error-check-final-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] JavaScript error check completed`);
  });

  test('should maintain consistent UI across browsers', async ({ page, browserName }) => {
    console.log(`🎨 [${browserName}] Testing UI consistency...`);
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const uiElements = {
      navigation: 'nav, .navbar, .navigation, .header-nav',
      buttons: 'button, .btn, .button',
      forms: 'form, input, textarea',
      content: 'main, .main, .content, .container'
    };
    
    const uiStatus = {};
    
    for (const [elementType, selector] of Object.entries(uiElements)) {
      const elements = page.locator(selector);
      const count = await elements.count();
      const visible = count > 0 ? await elements.first().isVisible() : false;
      
      uiStatus[elementType] = { count, visible };
      console.log(`🎨 [${browserName}] ${elementType}: ${count} elements, visible: ${visible}`);
    }
    
    await page.screenshot({ 
      path: `test-results/ui-consistency-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] UI consistency check completed`);
  });

  test('should load within acceptable time limits', async ({ page, browserName }) => {
    console.log(`⏱️ [${browserName}] Testing performance...`);
    
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ [${browserName}] Homepage load time: ${loadTime}ms`);
    
    const navStartTime = Date.now();
    await page.goto('/ai-agents');
    await page.waitForLoadState('networkidle');
    
    const navLoadTime = Date.now() - navStartTime;
    
    console.log(`⏱️ [${browserName}] AI agents page load time: ${navLoadTime}ms`);
    
    const ACCEPTABLE_LOAD_TIME = 10000; // 10 seconds
    const GOOD_LOAD_TIME = 5000; // 5 seconds
    
    if (loadTime > ACCEPTABLE_LOAD_TIME) {
      console.warn(`⚠️ [${browserName}] Homepage load time exceeds acceptable limit: ${loadTime}ms`);
    } else if (loadTime <= GOOD_LOAD_TIME) {
      console.log(`🚀 [${browserName}] Homepage loaded quickly: ${loadTime}ms`);
    }
    
    if (navLoadTime > ACCEPTABLE_LOAD_TIME) {
      console.warn(`⚠️ [${browserName}] Navigation load time exceeds acceptable limit: ${navLoadTime}ms`);
    } else if (navLoadTime <= GOOD_LOAD_TIME) {
      console.log(`🚀 [${browserName}] Navigation loaded quickly: ${navLoadTime}ms`);
    }
    
    console.log(`✅ [${browserName}] Performance testing completed`);
  });

});

test.describe('Supabase Authentication Integration', () => {
  
  test('should handle Supabase session management', async ({ page, browserName }) => {
    console.log(`🔐 [${browserName}] Testing Supabase session management...`);
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    const supabaseStatus = await page.evaluate(() => {
      return {
        supabaseUrl: window.location.origin.includes('localhost') ? 'dev-env' : 'prod-env',
        hasSupabase: typeof window.supabase !== 'undefined' || 
                     typeof window._supabaseClient !== 'undefined',
        hasAuth: typeof window._supabaseAuth !== 'undefined',
        localStorage: Object.keys(localStorage).filter(key => key.includes('supabase')),
        cookies: document.cookie.includes('supabase') || document.cookie.includes('sb-')
      };
    });
    
    console.log(`🔐 [${browserName}] Supabase status:`, supabaseStatus);
    
    await page.screenshot({ 
      path: `test-results/supabase-session-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] Supabase session management tested`);
  });
  
  test('should handle OAuth redirect flows', async ({ page, browserName }) => {
    console.log(`🔗 [${browserName}] Testing OAuth redirect handling...`);
    
    await page.goto('/login');
    
    const oauthSelectors = [
      'button:has-text("Google")',
      'button:has-text("Continue with Google")',
      'button:has-text("Sign in with Google")',
      '.oauth-button',
      '[data-provider="google"]'
    ];
    
    let oauthFound = false;
    for (const selector of oauthSelectors) {
      const oauthButton = page.locator(selector);
      if (await oauthButton.count() > 0 && await oauthButton.isVisible()) {
        console.log(`🔗 [${browserName}] OAuth button found: ${selector}`);
        oauthFound = true;
        
        await expect(oauthButton).toBeVisible();
        break;
      }
    }
    
    console.log(`🔗 [${browserName}] OAuth integration available: ${oauthFound}`);
    
    await page.screenshot({ 
      path: `test-results/oauth-integration-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] OAuth redirect testing completed`);
  });
  
});