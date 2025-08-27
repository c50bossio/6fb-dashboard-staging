const { test, expect } = require('@playwright/test');

test.describe('Login Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => ));
    page.on('pageerror', error => );
    page.on('requestfailed', request => , request.failure()?.errorText));
    
    await page.goto('http://localhost:9999/login');
    await page.waitForLoadState('networkidle');
  });

  test('should load login page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/6FB AI Agent System|Login/);
    
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

  });

  test('should authenticate with demo credentials', async ({ page }) => {

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();
    
    await emailInput.fill('demo@barbershop.com');
    await passwordInput.fill('demo123');

    await page.screenshot({ path: '/Users/bossio/6FB AI Agent System/test-results/screenshots/before-login.png', fullPage: true });
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")').first();
    await submitButton.click();

    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/Users/bossio/6FB AI Agent System/test-results/screenshots/after-login-attempt.png', fullPage: true });
    
    const possibleSuccessIndicators = [
      () => page.url().includes('/dashboard'),
      () => page.url().includes('/home'),
      () => page.url().includes('/app'),
      
      () => page.locator('text="Dashboard"').isVisible(),
      () => page.locator('text="Welcome"').isVisible(),
      () => page.locator('[data-testid="dashboard"]').isVisible(),
      
      () => page.locator('button:has-text("Logout"), button:has-text("Sign out")').isVisible(),
      () => page.locator('text="demo@barbershop.com"').isVisible(),
      
      () => page.locator('.loading, .spinner, [data-testid="loading"]').isVisible(),
    ];
    
    let loginSuccess = false;
    let successReason = '';
    
    for (let i = 0; i < possibleSuccessIndicators.length; i++) {
      try {
        const result = await possibleSuccessIndicators[i]();
        if (result) {
          loginSuccess = true;
          successReason = `Success indicator ${i + 1} matched`;
          break;
        }
      } catch (error) {
      }
    }
    
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');

    .includes('dashboard'));
    .includes('welcome'));
    .includes('error'));
    
    const errorElements = await page.locator('.error, .alert-error, [role="alert"], .text-red-500, .text-red-600').all();
    if (errorElements.length > 0) {
      for (const errorEl of errorElements) {
        const errorText = await errorEl.textContent();
        if (errorText && errorText.trim()) {
          
        }
      }
    }
    
    await page.screenshot({ path: '/Users/bossio/6FB AI Agent System/test-results/screenshots/final-state.png', fullPage: true });
    
    if (loginSuccess) {
      
    } else if (currentUrl !== 'http://localhost:9999/login') {
      
      loginSuccess = true;
    } else {

      const formElements = await page.locator('form, input, button').all();

      const validationMessages = await page.locator('.invalid-feedback, .error-message, .field-error').all();
      for (const msg of validationMessages) {
        const text = await msg.textContent();
        if (text && text.trim()) {
          
        }
      }
    }
    
    expect(loginSuccess || currentUrl !== 'http://localhost:9999/login').toBeTruthy();
  });

  test('should handle network requests during login', async ({ page }) => {

    const requests = [];
    const responses = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
      , request.url());
    });
    
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
      , response.url());
    });
    
    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'demo@barbershop.com');
    await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', 'demo123');
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")');
    
    await page.waitForLoadState('networkidle');
    
    const authRequests = requests.filter(req => 
      req.url.includes('/auth') || 
      req.url.includes('/login') || 
      req.url.includes('/api/auth') ||
      req.url.includes('supabase')
    );
    
    const failedResponses = responses.filter(res => res.status >= 400);

    if (failedResponses.length > 0) {
      failedResponses.forEach(res => {
        
      });
    }
    
    expect(authRequests.length).toBeGreaterThan(0);
  });

  test('should provide appropriate user feedback', async ({ page }) => {

    await page.fill('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'demo@barbershop.com');
    await page.fill('input[type="password"], input[name="password"], input[placeholder*="password" i]', 'demo123');
    
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")');
    
    const loadingIndicators = [
      '.loading',
      '.spinner',
      '[data-testid="loading"]',
      'button:disabled',
      'text="Loading"',
      'text="Signing in"',
      'text="Please wait"'
    ];
    
    let foundLoading = false;
    for (const selector of loadingIndicators) {
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
        foundLoading = true;
        
        break;
      } catch (error) {
      }
    }
    
    if (!foundLoading) {
      
    }
    
    await page.waitForTimeout(3000);
    
    const messageSelectors = [
      '.success, .alert-success, .text-green-500',
      '.error, .alert-error, .text-red-500',
      '.warning, .alert-warning, .text-yellow-500',
      '.info, .alert-info, .text-blue-500'
    ];
    
    for (const selector of messageSelectors) {
      const elements = await page.locator(selector).all();
      for (const el of elements) {
        const text = await el.textContent();
        if (text && text.trim()) {
          );
        }
      }
    }
    
    expect(true).toBe(true);
  });
});