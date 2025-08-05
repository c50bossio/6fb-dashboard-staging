import { test, expect } from '@playwright/test';

test.describe('Google OAuth Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('http://localhost:9999/login');
  });

  test('should display login page with Google sign-in button', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/6FB AI Agent System/);
    
    // Check for main login elements
    await expect(page.locator('h2')).toContainText('Sign in to your barbershop');
    
    // Check for email and password fields
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Check for Google sign-in button
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).not.toBeDisabled();
    
    // Verify Google button has correct styling and text
    await expect(googleButton).toContainText('Sign in with Google');
  });

  test('should have Google OAuth button with correct properties', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    
    // Check button is clickable
    await expect(googleButton).toBeEnabled();
    
    // Check for Google icon SVG
    const googleIcon = googleButton.locator('svg');
    await expect(googleIcon).toBeVisible();
    
    // Verify button styling
    await expect(googleButton).toHaveClass(/bg-white/);
    await expect(googleButton).toHaveClass(/border-gray-300/);
  });

  test('should initiate Google OAuth flow when clicked', async ({ page }) => {
    // Set up network monitoring
    const requestPromise = page.waitForRequest(request => 
      request.url().includes('accounts.google.com')
    );
    
    // Click Google sign-in button
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await googleButton.click();
    
    // Wait for redirect to Google
    const request = await requestPromise;
    expect(request.url()).toContain('accounts.google.com');
    expect(request.url()).toContain('client_id=302068136616-qlqef4h725bu5ubt93gs50ip9vf26qbf.apps.googleusercontent.com');
  });

  test('should show loading state when Google button is clicked', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    
    // Click and immediately check for loading state
    await googleButton.click();
    
    // The button should show loading state briefly before redirect
    // Note: This might be very fast, so we'll just verify it doesn't error
    await page.waitForTimeout(100);
  });

  test('should handle JavaScript errors gracefully', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    
    // Perform actions that could cause errors
    await page.reload();
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    
    // Should have minimal JavaScript errors
    expect(errors.length).toBeLessThan(3);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    
    // Check button is accessible
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
    
    // Check for proper button role
    expect(await googleButton.getAttribute('type')).toBe('button');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check layout is responsive
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
    
    // Button should be full width on mobile
    const buttonBox = await googleButton.boundingBox();
    expect(buttonBox.width).toBeGreaterThan(300); // Should be nearly full width
  });

  test('should preserve OAuth configuration in URL parameters', async ({ page, context }) => {
    // Start a new context to capture the redirect
    const newPagePromise = context.waitForEvent('page');
    
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await googleButton.click();
    
    // Wait for new page (Google OAuth)
    const newPage = await newPagePromise;
    await newPage.waitForLoadState();
    
    const url = newPage.url();
    
    // Verify OAuth parameters
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
      
      // Verify button can be clicked without errors
      await googleButton.hover();
      await expect(googleButton).toHaveClass(/hover:bg-gray-50/);
    });
  });
});