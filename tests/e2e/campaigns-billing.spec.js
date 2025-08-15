
const { test, expect } = require('@playwright/test');

test.use({
  baseURL: 'http://localhost:9999',
  actionTimeout: 10000,
  navigationTimeout: 10000,
});

test.beforeAll(async () => {
  console.log('🧪 Starting Campaign & Billing E2E Tests');
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_DEV_MODE = 'true';
});

test.describe('Campaign Management System', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/campaigns');
    
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
  });

  test('should display campaigns page with test user', async ({ page }) => {
    await expect(page.locator('text=Test Shop Owner')).toBeVisible();
    
    await expect(page.locator('h1:has-text("Campaign Management")')).toBeVisible();
    
    await expect(page.locator('text=Total Campaigns')).toBeVisible();
    await expect(page.locator('text=Email Campaigns')).toBeVisible();
    await expect(page.locator('text=SMS Campaigns')).toBeVisible();
  });

  test('should display campaign action buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("Billing")')).toBeVisible();
    await expect(page.locator('button:has-text("Email Campaign")')).toBeVisible();
    await expect(page.locator('button:has-text("SMS Campaign")')).toBeVisible();
    await expect(page.locator('button:has-text("Export Report")')).toBeVisible();
  });

  test('should open billing modal with test data', async ({ page }) => {
    await page.click('button:has-text("Billing")');
    
    await page.waitForSelector('text=Billing & Payment Methods', { timeout: 5000 });
    
    await expect(page.locator('text=Test Shop Marketing Account')).toBeVisible();
    await expect(page.locator('text=$2,000.00/month')).toBeVisible();
    await expect(page.locator('text=$485.75')).toBeVisible();
    
    await expect(page.locator('text=visa •••• 4242')).toBeVisible();
    await expect(page.locator('text=mastercard •••• 5555')).toBeVisible();
    
    const closeButton = page.locator('button:has-text("Close"), button[aria-label*="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('should create email campaign successfully', async ({ page }) => {
    await page.click('button:has-text("Email Campaign")');
    
    await page.waitForSelector('text=Create EMAIL Campaign', { timeout: 5000 });
    
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    
    await page.fill('input[placeholder*="subject"]', 'Test Campaign Subject - E2E Test');
    await page.fill('textarea', 'This is a test email campaign created by automated E2E testing. It should process successfully with mock services.');
    
    await page.click('button:has-text("Create Campaign")');
    
    await page.waitForTimeout(2000);
    
    const errorMessages = await page.locator('.error, .alert-danger, [role="alert"]').count();
    expect(errorMessages).toBe(0);
  });

  test('should create SMS campaign successfully', async ({ page }) => {
    await page.click('button:has-text("SMS Campaign")');
    
    await page.waitForSelector('text=Create SMS Campaign', { timeout: 5000 });
    
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    
    const messageField = page.locator('textarea').first();
    await messageField.fill('Limited time offer! Get 20% off your next visit. Reply STOP to opt out.');
    
    await page.click('button:has-text("Create Campaign")');
    
    await page.waitForTimeout(2000);
    
    const errorMessages = await page.locator('.error, .alert-danger, [role="alert"]').count();
    expect(errorMessages).toBe(0);
  });

  test('should handle campaign form validation', async ({ page }) => {
    await page.click('button:has-text("Email Campaign")');
    
    await page.waitForSelector('text=Create EMAIL Campaign', { timeout: 5000 });
    
    await page.click('button:has-text("Create Campaign")');
    
    await expect(page.locator('text=Create EMAIL Campaign')).toBeVisible();
    
    await page.click('button:has-text("Cancel")');
  });

  test('should display recent campaigns in table', async ({ page }) => {
    await expect(page.locator('text=Recent Campaigns')).toBeVisible();
    
    await expect(page.locator('text=CAMPAIGN')).toBeVisible();
    await expect(page.locator('text=TYPE')).toBeVisible();
    await expect(page.locator('text=STATUS')).toBeVisible();
    await expect(page.locator('text=AUDIENCE')).toBeVisible();
  });
});

test.describe('Billing System Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/campaigns');
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
  });

  test('should display billing information correctly', async ({ page }) => {
    await page.click('button:has-text("Billing")');
    await page.waitForSelector('text=Billing & Payment Methods', { timeout: 5000 });
    
    const accountSection = page.locator('text=Billing Accounts').locator('..');
    await expect(accountSection).toContainText('Test Shop Marketing Account');
    await expect(accountSection).toContainText('Verified');
    
    const paymentSection = page.locator('text=Payment Methods').locator('..');
    await expect(paymentSection).toContainText('4242');
    await expect(paymentSection).toContainText('5555');
    await expect(paymentSection).toContainText('Default');
  });

  test('should show billing history', async ({ page }) => {
    await page.click('button:has-text("Billing")');
    await page.waitForSelector('text=Billing & Payment Methods', { timeout: 5000 });
    
    const historySection = page.locator('text=Recent Billing History');
    if (await historySection.isVisible()) {
      await historySection.scrollIntoViewIfNeeded();
    }
    
    await expect(page.locator('text=Billing History, text=Recent Billing')).toBeVisible({ timeout: 5000 });
  });

  test('should calculate campaign costs correctly', async ({ page }) => {
    await page.click('button:has-text("Email Campaign")');
    await page.waitForSelector('text=Create EMAIL Campaign', { timeout: 5000 });
    
    await expect(page.locator('text=Platform costs will be charged')).toBeVisible();
    
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    
    await expect(page.locator('text=~500, text=All Customers')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Mock Services Integration', () => {
  
  test('should use mock SendGrid service in development', async ({ page }) => {
    await page.goto('/dashboard/campaigns');
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
    
    await page.click('button:has-text("Email Campaign")');
    await page.waitForSelector('text=Create EMAIL Campaign', { timeout: 5000 });
    
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    await page.fill('input[placeholder*="subject"]', 'Mock Service Test');
    await page.fill('textarea', 'Testing mock SendGrid service');
    
    await page.click('button:has-text("Create Campaign")');
    
    await page.waitForTimeout(2000);
    
    const errors = await page.locator('[role="alert"], .error, .alert-danger').count();
    expect(errors).toBe(0);
  });

  test('should use mock Twilio service in development', async ({ page }) => {
    await page.goto('/dashboard/campaigns');
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
    
    await page.click('button:has-text("SMS Campaign")');
    await page.waitForSelector('text=Create SMS Campaign', { timeout: 5000 });
    
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    await page.fill('textarea', 'Test SMS via mock Twilio');
    
    await page.click('button:has-text("Create Campaign")');
    
    await page.waitForTimeout(2000);
    const errors = await page.locator('[role="alert"], .error, .alert-danger').count();
    expect(errors).toBe(0);
  });

  test('should use mock Stripe service for billing', async ({ page }) => {
    await page.goto('/dashboard/campaigns');
    await page.click('button:has-text("Billing")');
    await page.waitForSelector('text=Billing & Payment Methods', { timeout: 5000 });
    
    await expect(page.locator('text=visa •••• 4242')).toBeVisible();
    await expect(page.locator('text=mastercard •••• 5555')).toBeVisible();
    
    await expect(page.locator('text=cus_test')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Development Mode Authentication', () => {
  
  test('should auto-login with test user in dev mode', async ({ page }) => {
    await page.goto('/dashboard/campaigns');
    
    await expect(page).not.toHaveURL(/.*login.*/);
    
    await expect(page.locator('text=Test Shop Owner')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain session across navigation', async ({ page }) => {
    await page.goto('/dashboard/campaigns');
    await expect(page.locator('text=Test Shop Owner')).toBeVisible();
    
    await page.goto('/dashboard');
    await expect(page.locator('text=Test Shop Owner')).toBeVisible();
    
    await page.goto('/dashboard/campaigns');
    await expect(page.locator('text=Campaign Management')).toBeVisible();
    
    await expect(page.locator('text=Test Shop Owner')).toBeVisible();
  });

  test('should have test user UUID in API calls', async ({ page }) => {
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/marketing')) {
        apiCalls.push(request.url());
      }
    });
    
    await page.goto('/dashboard/campaigns');
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
    
    const hasTestUUID = apiCalls.some(url => 
      url.includes('11111111-1111-1111-1111-111111111111')
    );
    expect(hasTestUUID).toBeTruthy();
  });
});

test.afterAll(async () => {
  console.log('✅ Campaign & Billing E2E Tests Completed');
});