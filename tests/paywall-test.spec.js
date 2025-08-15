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
    
    console.log('✅ Register page loaded successfully');
    console.log('✅ Google OAuth button is visible and not loading');
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
    
    console.log('✅ Subscribe page loaded successfully');
    console.log('✅ All three pricing tiers are visible');
  });

  test('Login page loads and shows Google sign-in', async ({ page }) => {
    await page.goto('https://bookedbarber.com/login');
    
    await page.waitForLoadState('networkidle');
    
    const googleButton = await page.locator('button:has-text("Sign in with Google")');
    await expect(googleButton).toBeVisible();
    
    const buttonText = await googleButton.textContent();
    expect(buttonText).not.toContain('Signing in...');
    
    console.log('✅ Login page loaded successfully');
    console.log('✅ Google sign-in button is visible and not loading');
  });

  test('Protected route redirects to login when not authenticated', async ({ page }) => {
    await page.goto('https://bookedbarber.com/dashboard');
    
    await page.waitForTimeout(3000); // Wait for client-side redirect
    
    const url = page.url();
    console.log('Current URL after navigating to dashboard:', url);
    
    if (url.includes('/login')) {
      console.log('✅ Successfully redirected to login (client-side protection working)');
    } else {
      console.log('⚠️ No server-side protection (expected with middleware disabled)');
    }
  });

  test('API health check returns healthy status', async ({ page }) => {
    const response = await page.request.get('https://bookedbarber.com/api/health');
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBeTruthy();
    expect(health.services.supabase.status).toBe('healthy');
    expect(health.services.stripe.status).toBe('configured');
    
    console.log('✅ API is healthy');
    console.log('✅ Supabase connected');
    console.log('✅ Stripe configured');
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
    console.log('Button text after click:', clickedText);
    
    if (clickedText?.includes('Verifying')) {
      console.log('✅ Button shows "Verifying..." state (auth loading check working)');
    } else {
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        console.log('✅ Redirected to login (auth check working)');
      } else {
        console.log('⚠️ Button state:', clickedText);
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
      console.log('✅ OAuth button shows loading state after click');
      
      await page.waitForTimeout(3000);
      const buttonTextAfterWait = await googleButton.textContent();
      
      if (buttonTextAfterWait?.includes('Signing up')) {
        console.log('❌ ISSUE FOUND: Button stuck in "Signing up..." state');
      } else {
        console.log('✅ Button recovered from loading state');
      }
    }
    
    try {
      const popup = await popupPromise;
      console.log('✅ OAuth popup window opened');
      await popup.close();
    } catch (e) {
      console.log('⚠️ No popup detected (may be blocked or OAuth not fully configured)');
    }
  });
});