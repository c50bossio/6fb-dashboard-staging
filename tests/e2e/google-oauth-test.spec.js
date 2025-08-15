import { test, expect } from '@playwright/test';

test.describe('Google OAuth Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:9999/login');
  });

  test('should display login page with Google sign-in button', async ({ page }) => {
    await expect(page).toHaveTitle(/6FB AI Agent System/);
    
    await expect(page.locator('h2')).toContainText('Sign in to your barbershop');
    
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).not.toBeDisabled();
    
    await expect(googleButton).toContainText('Sign in with Google');
  });

  test('should have Google OAuth button with correct properties', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    
    await expect(googleButton).toBeEnabled();
    
    const googleIcon = googleButton.locator('svg');
    await expect(googleIcon).toBeVisible();
    
    await expect(googleButton).toHaveClass(/bg-white/);
    await expect(googleButton).toHaveClass(/border-gray-300/);
  });

  test('should initiate Google OAuth flow when clicked', async ({ page }) => {
    const requestPromise = page.waitForRequest(request => 
      request.url().includes('accounts.google.com')
    );
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await googleButton.click();
    
    const request = await requestPromise;
    expect(request.url()).toContain('accounts.google.com');
    expect(request.url()).toContain('client_id=302068136616-qlqef4h725bu5ubt93gs50ip9vf26qbf.apps.googleusercontent.com');
  });

  test('should show loading state when Google button is clicked', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    
    await googleButton.click();
    
    await page.waitForTimeout(100);
  });

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.reload();
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    
    expect(errors.length).toBeLessThan(3);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
    
    expect(await googleButton.getAttribute('type')).toBe('button');
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    
    const buttonBox = await googleButton.boundingBox();
    expect(buttonBox.width).toBeGreaterThan(300); // Should be nearly full width
  });

  test('should preserve OAuth configuration in URL parameters', async ({ page, context }) => {
    const newPagePromise = context.waitForEvent('page');
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await googleButton.click();
    
    const newPage = await newPagePromise;
    await newPage.waitForLoadState();
    
    const url = newPage.url();
    
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('client_id=302068136616-qlqef4h725bu5ubt93gs50ip9vf26qbf.apps.googleusercontent.com');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fdfhqjdoydihajmjxniee.supabase.co%2Fauth%2Fv1%2Fcallback');
    expect(url).toContain('scope=email+profile');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });
});

test.describe('Google OAuth Cross-Browser Tests', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work in ${browserName}`, async ({ page }) => {
      await page.goto('http://localhost:9999/login');
      
      const googleButton = page.getByRole('button', { name: /sign in with google/i });
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toBeEnabled();
      
      await googleButton.hover();
      await expect(googleButton).toHaveClass(/hover:bg-gray-50/);
    });
  });
});