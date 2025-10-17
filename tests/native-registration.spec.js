const { test, expect } = require('@playwright/test');

test.describe('Native Registration Flow End-to-End', () => {
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test.native@example.com',
    phone: '+1234567890',
    password: 'TestPassword123!',
    businessName: 'Test Barbershop',
    businessAddress: '123 Test Street, Test City, TS 12345',
    businessPhone: '+1987654321'
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:9999/subscribe');
  });

  test('Complete native registration flow from plan selection to billing', async ({ page }) => {

    await page.click('[data-plan="barber"]');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveURL(/register\?plan=barber&billing=monthly/);

    await expect(page.locator('text=Plan selected: Barber')).toBeVisible();

    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="phone"]', testUser.phone);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="businessName"]', testUser.businessName);
    await page.fill('textarea[name="businessAddress"]', testUser.businessAddress);
    await page.fill('input[name="businessPhone"]', testUser.businessPhone);

    let signUpRequest = null;
    page.on('request', request => {
      if (request.url().includes('signUp') || request.method() === 'POST') {
        , request.url());
        if (request.url().includes('auth') || request.postData()?.includes('email')) {
          signUpRequest = request;
        }
      }
    });

    page.on('response', response => {
      if (response.status() === 200 && response.url().includes('auth')) {
        );
      }
    });

    await page.click('button:has-text("Create account")');

    await expect(page.locator('text=Account created successfully')).toBeVisible({ timeout: 10000 });

    await page.waitForURL(/subscribe/, { timeout: 10000 });

    await expect(page).toHaveURL(/subscribe\?source=registration/);

  });

  test('Form validation works correctly', async ({ page }) => {

    await page.goto('http://localhost:9999/register?plan=barber&billing=monthly');
    
    await page.click('button:has-text("Next")');
    
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();

    await page.fill('input[name="email"]', 'invalid-email');
    await page.blur('input[name="email"]');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();

    await page.fill('input[name="password"]', '123');
    await page.blur('input[name="password"]');
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    
  });

  test.afterEach(async ({ page }) => {
    
    await page.evaluate(async () => {
    });
  });
});