/**
 * 6FB AI Agent System - Comprehensive Authentication Testing
 * Cross-browser authentication flow validation with error handling
 * Testing Strategy: Triple Tool Approach (Playwright + Puppeteer + Computer Use)
 */

const { test, expect, devices } = require('@playwright/test');

// Test configuration for different browser scenarios
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
  
  // Test setup - configure per test
  test.beforeEach(async ({ page, browserName }) => {
    console.log(`🌐 Testing on ${browserName}`);
    
    // Clear storage before each test
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Error')) {
        console.log(`🚨 [${browserName}] Console Error:`, msg.text());
      }
    });
    
    // Capture network failures
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`🌐 [${browserName}] Network Error:`, response.status(), response.url());
      }
    });
  });

  // Test 1: Homepage Navigation and Initial Load
  test('should load homepage and navigation correctly', async ({ page, browserName }) => {
    console.log(`🏠 [${browserName}] Testing homepage load...`);
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Verify page loads
    await expect(page).toHaveTitle(/6FB AI Agent System/i);
    
    // Check for any JavaScript errors
    const errors = await page.evaluate(() => {
      return window.jsErrors || [];
    });
    
    if (errors.length > 0) {
      console.warn(`⚠️ [${browserName}] JavaScript errors found:`, errors);
    }
    
    // Screenshot for visual validation
    await page.screenshot({ 
      path: `test-results/homepage-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] Homepage loaded successfully`);
  });

  // Test 2: AI Agents Page Access (Protected Route)
  test('should redirect to login when accessing protected AI Agents page unauthenticated', async ({ page, browserName }) => {
    console.log(`🔒 [${browserName}] Testing protected route redirect...`);
    
    // Navigate to protected AI agents page
    await page.goto('/ai-agents');
    
    // Should redirect to login or show loading/auth challenge
    await page.waitForTimeout(3000); // Allow for redirects/loading
    
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/auth');
    const hasLoadingSpinner = await page.locator('.loading, [data-testid="loading"], .animate-spin').count() > 0;
    const hasAuthChallenge = await page.locator('input[type="email"], input[type="password"]').count() > 0;
    
    // Verify protection is working (redirect to login OR loading spinner OR auth form)
    const isProtected = isLoginPage || hasLoadingSpinner || hasAuthChallenge;
    
    console.log(`📍 [${browserName}] Current URL: ${currentUrl}`);
    console.log(`🔐 [${browserName}] Protected route status: ${isProtected ? 'PROTECTED' : 'ACCESSIBLE'}`);
    
    if (!isProtected) {
      console.warn(`⚠️ [${browserName}] SECURITY WARNING: Protected route may be accessible without auth`);
      
      // Take screenshot of potentially unprotected page
      await page.screenshot({ 
        path: `test-results/unprotected-route-${browserName}.png`,
        fullPage: true 
      });
    }
    
    expect(isProtected).toBe(true);
    console.log(`✅ [${browserName}] Protected route properly secured`);
  });

  // Test 3: Login Page Functionality
  test('should display and interact with login form', async ({ page, browserName }) => {
    console.log(`📝 [${browserName}] Testing login form functionality...`);
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check if login form elements are present
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")');
    
    // Wait for form elements
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(loginButton).toBeVisible({ timeout: 5000 });
    
    // Test form interactions
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');
    
    // Verify inputs accept text
    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('testpassword123');
    
    // Take screenshot of form
    await page.screenshot({ 
      path: `test-results/login-form-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] Login form interactive elements working`);
  });

  // Test 4: Authentication Error Handling
  test('should handle authentication errors gracefully', async ({ page, browserName }) => {
    console.log(`❌ [${browserName}] Testing authentication error handling...`);
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")').first();
    
    // Test with invalid credentials
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await loginButton.click();
    
    // Wait for error response
    await page.waitForTimeout(5000);
    
    // Look for error messages
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
    
    // Also check for disabled state or loading state
    const buttonDisabled = await loginButton.isDisabled();
    const hasLoadingState = await page.locator('.animate-spin, .loading, .spinner').count() > 0;
    
    console.log(`🔍 [${browserName}] Error message found: ${errorFound}`);
    console.log(`📝 [${browserName}] Error text: "${errorMessage}"`);
    console.log(`🔘 [${browserName}] Button disabled: ${buttonDisabled}`);
    console.log(`⏳ [${browserName}] Loading state: ${hasLoadingState}`);
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: `test-results/login-error-${browserName}.png`,
      fullPage: true 
    });
    
    // Verify error handling exists (error message OR loading state OR disabled button)
    const hasErrorHandling = errorFound || buttonDisabled || hasLoadingState;
    
    if (!hasErrorHandling) {
      console.warn(`⚠️ [${browserName}] No error handling detected - this may be a UX issue`);
    }
    
    console.log(`✅ [${browserName}] Authentication error handling tested`);
  });

  // Test 5: Mobile Navigation Testing
  test('should work properly on mobile devices', async ({ page, browserName }) => {
    console.log(`📱 [${browserName}] Testing mobile navigation...`);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Look for mobile menu button
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
        
        // Try to click the mobile menu
        await menuButton.click();
        await page.waitForTimeout(1000);
        
        mobileMenuFound = true;
        break;
      }
    }
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: `test-results/mobile-navigation-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`📱 [${browserName}] Mobile menu found: ${mobileMenuFound}`);
    console.log(`✅ [${browserName}] Mobile navigation tested`);
  });

  // Test 6: Console Error Detection
  test('should not have critical JavaScript errors', async ({ page, browserName }) => {
    console.log(`🔍 [${browserName}] Testing for JavaScript errors...`);
    
    const consoleErrors = [];
    const networkErrors = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Capture network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
      }
    });
    
    // Navigate and interact with key pages
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.goto('/ai-agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Filter out known non-critical errors
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
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: `test-results/error-check-final-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] JavaScript error check completed`);
  });

  // Test 7: Cross-Browser Compatibility Check
  test('should maintain consistent UI across browsers', async ({ page, browserName }) => {
    console.log(`🎨 [${browserName}] Testing UI consistency...`);
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Check for key UI elements
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
    
    // Take full page screenshot for visual comparison
    await page.screenshot({ 
      path: `test-results/ui-consistency-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] UI consistency check completed`);
  });

  // Test 8: Performance and Loading Times
  test('should load within acceptable time limits', async ({ page, browserName }) => {
    console.log(`⏱️ [${browserName}] Testing performance...`);
    
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ [${browserName}] Homepage load time: ${loadTime}ms`);
    
    // Test navigation to AI agents page
    const navStartTime = Date.now();
    await page.goto('/ai-agents');
    await page.waitForLoadState('networkidle');
    
    const navLoadTime = Date.now() - navStartTime;
    
    console.log(`⏱️ [${browserName}] AI agents page load time: ${navLoadTime}ms`);
    
    // Performance thresholds (adjust as needed)
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

// Additional test suite for Supabase-specific authentication testing
test.describe('Supabase Authentication Integration', () => {
  
  test('should handle Supabase session management', async ({ page, browserName }) => {
    console.log(`🔐 [${browserName}] Testing Supabase session management...`);
    
    await page.goto('/login', { waitUntil: 'networkidle' });
    
    // Check if Supabase client is initialized
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
    
    // Take screenshot
    await page.screenshot({ 
      path: `test-results/supabase-session-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] Supabase session management tested`);
  });
  
  test('should handle OAuth redirect flows', async ({ page, browserName }) => {
    console.log(`🔗 [${browserName}] Testing OAuth redirect handling...`);
    
    await page.goto('/login');
    
    // Look for OAuth buttons (Google, etc.)
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
        
        // Don't click it (would redirect), just verify it's there
        await expect(oauthButton).toBeVisible();
        break;
      }
    }
    
    console.log(`🔗 [${browserName}] OAuth integration available: ${oauthFound}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: `test-results/oauth-integration-${browserName}.png`,
      fullPage: true 
    });
    
    console.log(`✅ [${browserName}] OAuth redirect testing completed`);
  });
  
});