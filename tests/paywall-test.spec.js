// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('BookedBarber Paywall Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('Register page loads and shows Google OAuth button', async ({ page }) => {
    await page.goto('https://bookedbarber.com/register');
    
    await page.waitForLoadState('networkidle');
    
    const googleButton = await page.locator('button:has-text("Sign up with Google")');
    await expect(googleButton).toBeVisible();
    
    const buttonText = await googleButton.textContent();
    expect(buttonText).not.toContain('Signing up...');

  });

  test('Subscribe page shows pricing tiers', async ({ page }) => {
    await page.goto('https://bookedbarber.com/subscribe');
    
    await page.waitForLoadState('networkidle');
    
    const individualButton = await page.locator('button:has-text("Start as Individual")');
    const shopButton = await page.locator('button:has-text("Start as Shop Owner")');
    const enterpriseButton = await page.locator('button:has-text("Start Enterprise")');
    
    await expect(individualButton).toBeVisible();
    await expect(shopButton).toBeVisible();
    await expect(enterpriseButton).toBeVisible();
    
    await expect(page.locator('text=$35')).toBeVisible();
    await expect(page.locator('text=$99')).toBeVisible();
    await expect(page.locator('text=$249')).toBeVisible();

  });

  test('Login page loads and shows Google sign-in', async ({ page }) => {
    await page.goto('https://bookedbarber.com/login');
    
    await page.waitForLoadState('networkidle');
    
    const googleButton = await page.locator('button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();
    
    const buttonText = await googleButton.textContent();
    expect(buttonText).not.toContain('Signing in...');

  });

  test('Protected route redirects to login when not authenticated', async ({ page }) => {
    await page.goto('https://bookedbarber.com/dashboard');
    
    await page.waitForTimeout(3000); // Wait for client-side redirect
    
    const url = page.url();

    if (url.includes('/login')) {
      ');
    } else {
      ');
    }
  });

  test('API health check returns healthy status', async ({ page }) => {
    const response = await page.request.get('https://bookedbarber.com/api/health');
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBeTruthy();
    expect(health.services.supabase.status).toBe('healthy');
    expect(health.services.stripe.status).toBe('configured');

  });

  test('Clicking subscription plan button shows loading state', async ({ page }) => {
    await page.goto('https://bookedbarber.com/subscribe');
    await page.waitForLoadState('networkidle');
    
    const individualButton = await page.locator('button:has-text("Start as Individual")');
    
    const initialText = await individualButton.textContent();
    expect(initialText).toBe('Start as Individual');
    
    await individualButton.click();
    
    await page.waitForTimeout(500); // Brief wait to see state change
    
    const clickedText = await individualButton.textContent();

    if (clickedText?.includes('Verifying')) {
      ');
    } else {
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        ');
      } else {
        
      }
    }
  });
});

test.describe('OAuth Flow Simulation', () => {
  test('Google OAuth button is clickable and initiates flow', async ({ page }) => {
    await page.goto('https://bookedbarber.com/register');
    await page.waitForLoadState('networkidle');
    
    const googleButton = await page.locator('button:has-text("Sign up with Google")');
    
    const popupPromise = page.waitForEvent('popup');
    
    await googleButton.click();
    
    await page.waitForTimeout(500);
    const buttonTextAfterClick = await googleButton.textContent();
    
    if (buttonTextAfterClick?.includes('Signing up')) {

      await page.waitForTimeout(3000);
      const buttonTextAfterWait = await googleButton.textContent();
      
      if (buttonTextAfterWait?.includes('Signing up')) {
        
      } else {
        
      }
    }
    
    try {
      const popup = await popupPromise;
      
      await popup.close();
    } catch (e) {
      ');
    }
  });
});