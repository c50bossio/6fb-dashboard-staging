// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('BookedBarber Paywall Tests - Direct', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('1. Register page - Google OAuth button check', async ({ page }) => {

    await page.goto('https://bookedbarber.com/register');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/register-page.png' });
    
    const googleButton = await page.locator('button:has-text("Sign up with Google")');
    const isVisible = await googleButton.isVisible();
    const buttonText = await googleButton.textContent();

    }`);
    
    expect(isVisible).toBeTruthy();
    expect(buttonText).not.toContain('Signing up...');

  });

  test('2. Subscribe page - Pricing tiers display', async ({ page }) => {

    await page.goto('https://bookedbarber.com/subscribe');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/subscribe-page.png' });
    
    const tiers = [
      { name: 'Individual', price: '$35' },
      { name: 'Shop Owner', price: '$99' },
      { name: 'Enterprise', price: '$249' }
    ];
    
    for (const tier of tiers) {
      const button = await page.locator(`button:has-text("Start as ${tier.name}")`);
      const priceElement = await page.locator(`text=${tier.price}`);
      
      const buttonVisible = await button.isVisible();
      const priceVisible = await priceElement.isVisible();

      expect(buttonVisible).toBeTruthy();
      expect(priceVisible).toBeTruthy();
    }

  });

  test('3. Login page - Google sign-in button', async ({ page }) => {

    await page.goto('https://bookedbarber.com/login');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/login-page.png' });
    
    const googleButton = await page.locator('button:has-text("Sign in with Google")');
    const isVisible = await googleButton.isVisible();
    const buttonText = await googleButton.textContent();

    }`);
    
    expect(isVisible).toBeTruthy();
    expect(buttonText).not.toContain('Signing in...');

  });

  test('4. API Health Check', async ({ page }) => {

    const response = await page.request.get('https://bookedbarber.com/api/health');
    const health = await response.json();
    
     ? 'OK' : 'ERROR'}`);

    expect(response.ok()).toBeTruthy();
    expect(health.services.supabase.status).toBe('healthy');

  });

  test('5. Subscribe button behavior (unauthenticated)', async ({ page }) => {

    await page.goto('https://bookedbarber.com/subscribe');
    await page.waitForLoadState('networkidle');
    
    const individualButton = await page.locator('button:has-text("Start as Individual")');
    
    let redirected = false;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame() && page.url().includes('/login')) {
        redirected = true;
      }
    });
    
    await individualButton.click();
    
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const buttonText = await individualButton.textContent();

    }`);
    
    if (currentUrl.includes('/login')) {
      
    } else if (buttonText?.includes('Verifying')) {
      
    } else {
      
    }
  });

  test('6. OAuth flow initiation', async ({ page }) => {

    await page.goto('https://bookedbarber.com/register');
    await page.waitForLoadState('networkidle');
    
    const googleButton = await page.locator('button:has-text("Sign up with Google")');
    
    let popupDetected = false;
    const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
    
    await googleButton.click();
    
    await page.waitForTimeout(1000);
    const buttonTextAfterClick = await googleButton.textContent();

    const popup = await popupPromise;
    if (popup) {
      popupDetected = true;
      const popupUrl = popup.url();
      }...`);
      await popup.close();
    }
    
    if (buttonTextAfterClick?.includes('Signing up...')) {
      await page.waitForTimeout(3000);
      const buttonTextAfterWait = await googleButton.textContent();
      
      if (buttonTextAfterWait?.includes('Signing up...')) {

      } else {
        
      }
    } else if (popupDetected) {
      
    } else {
      
    }
  });

  test('7. Protected route access', async ({ page }) => {

    await page.goto('https://bookedbarber.com/dashboard');
    
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();

    if (currentUrl.includes('/login')) {
      
    } else if (currentUrl.includes('/dashboard')) {
      \n');
    }
  });
});

test('📊 Test Summary', async ({ page }) => {
  );
  
  );

  ');
  ');
  
  );
});