// E2E Tests for Campaign Management and Billing System
// These tests ensure the marketing campaign and billing features work correctly

const { test, expect } = require('@playwright/test');

// Test configuration
test.use({
  baseURL: 'http://localhost:9999',
  actionTimeout: 10000,
  navigationTimeout: 10000,
});

// Set up test environment
test.beforeAll(async () => {
  console.log('🧪 Starting Campaign & Billing E2E Tests');
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_DEV_MODE = 'true';
});

test.describe('Campaign Management System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to campaigns page
    await page.goto('/dashboard/campaigns');
    
    // Wait for page to load
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
  });

  test('should display campaigns page with test user', async ({ page }) => {
    // Check user is logged in as Test Shop Owner
    await expect(page.locator('text=Test Shop Owner')).toBeVisible();
    
    // Check campaign management header
    await expect(page.locator('h1:has-text("Campaign Management")')).toBeVisible();
    
    // Check campaign statistics are displayed
    await expect(page.locator('text=Total Campaigns')).toBeVisible();
    await expect(page.locator('text=Email Campaigns')).toBeVisible();
    await expect(page.locator('text=SMS Campaigns')).toBeVisible();
  });

  test('should display campaign action buttons', async ({ page }) => {
    // Check all action buttons are present
    await expect(page.locator('button:has-text("Billing")')).toBeVisible();
    await expect(page.locator('button:has-text("Email Campaign")')).toBeVisible();
    await expect(page.locator('button:has-text("SMS Campaign")')).toBeVisible();
    await expect(page.locator('button:has-text("Export Report")')).toBeVisible();
  });

  test('should open billing modal with test data', async ({ page }) => {
    // Click billing button
    await page.click('button:has-text("Billing")');
    
    // Wait for modal to open
    await page.waitForSelector('text=Billing & Payment Methods', { timeout: 5000 });
    
    // Check billing account is displayed
    await expect(page.locator('text=Test Shop Marketing Account')).toBeVisible();
    await expect(page.locator('text=$2,000.00/month')).toBeVisible();
    await expect(page.locator('text=$485.75')).toBeVisible();
    
    // Check payment methods
    await expect(page.locator('text=visa •••• 4242')).toBeVisible();
    await expect(page.locator('text=mastercard •••• 5555')).toBeVisible();
    
    // Close modal
    const closeButton = page.locator('button:has-text("Close"), button[aria-label*="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('should create email campaign successfully', async ({ page }) => {
    // Click Email Campaign button
    await page.click('button:has-text("Email Campaign")');
    
    // Wait for modal to open
    await page.waitForSelector('text=Create EMAIL Campaign', { timeout: 5000 });
    
    // Select billing account
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    
    // Fill campaign details
    await page.fill('input[placeholder*="subject"]', 'Test Campaign Subject - E2E Test');
    await page.fill('textarea', 'This is a test email campaign created by automated E2E testing. It should process successfully with mock services.');
    
    // Submit campaign
    await page.click('button:has-text("Create Campaign")');
    
    // Wait for success (API call should complete)
    await page.waitForTimeout(2000);
    
    // Verify campaign was created (check for any error messages)
    const errorMessages = await page.locator('.error, .alert-danger, [role="alert"]').count();
    expect(errorMessages).toBe(0);
  });

  test('should create SMS campaign successfully', async ({ page }) => {
    // Click SMS Campaign button
    await page.click('button:has-text("SMS Campaign")');
    
    // Wait for modal to open
    await page.waitForSelector('text=Create SMS Campaign', { timeout: 5000 });
    
    // Select billing account
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    
    // Fill SMS message
    const messageField = page.locator('textarea').first();
    await messageField.fill('Limited time offer! Get 20% off your next visit. Reply STOP to opt out.');
    
    // Submit campaign
    await page.click('button:has-text("Create Campaign")');
    
    // Wait for success
    await page.waitForTimeout(2000);
    
    // Verify no errors
    const errorMessages = await page.locator('.error, .alert-danger, [role="alert"]').count();
    expect(errorMessages).toBe(0);
  });

  test('should handle campaign form validation', async ({ page }) => {
    // Click Email Campaign button
    await page.click('button:has-text("Email Campaign")');
    
    // Wait for modal
    await page.waitForSelector('text=Create EMAIL Campaign', { timeout: 5000 });
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Create Campaign")');
    
    // Should not close modal (validation should prevent submission)
    await expect(page.locator('text=Create EMAIL Campaign')).toBeVisible();
    
    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('should display recent campaigns in table', async ({ page }) => {
    // Check for recent campaigns section
    await expect(page.locator('text=Recent Campaigns')).toBeVisible();
    
    // Check table headers
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
    // Open billing modal
    await page.click('button:has-text("Billing")');
    await page.waitForSelector('text=Billing & Payment Methods', { timeout: 5000 });
    
    // Check billing account details
    const accountSection = page.locator('text=Billing Accounts').locator('..');
    await expect(accountSection).toContainText('Test Shop Marketing Account');
    await expect(accountSection).toContainText('Verified');
    
    // Check payment methods section
    const paymentSection = page.locator('text=Payment Methods').locator('..');
    await expect(paymentSection).toContainText('4242');
    await expect(paymentSection).toContainText('5555');
    await expect(paymentSection).toContainText('Default');
  });

  test('should show billing history', async ({ page }) => {
    // Open billing modal
    await page.click('button:has-text("Billing")');
    await page.waitForSelector('text=Billing & Payment Methods', { timeout: 5000 });
    
    // Scroll to billing history section if needed
    const historySection = page.locator('text=Recent Billing History');
    if (await historySection.isVisible()) {
      await historySection.scrollIntoViewIfNeeded();
    }
    
    // Verify billing history section exists
    await expect(page.locator('text=Billing History, text=Recent Billing')).toBeVisible({ timeout: 5000 });
  });

  test('should calculate campaign costs correctly', async ({ page }) => {
    // Open email campaign modal
    await page.click('button:has-text("Email Campaign")');
    await page.waitForSelector('text=Create EMAIL Campaign', { timeout: 5000 });
    
    // Check for cost information
    await expect(page.locator('text=Platform costs will be charged')).toBeVisible();
    
    // Select billing account to see cost calculation
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    
    // Target audience should show recipient count
    await expect(page.locator('text=~500, text=All Customers')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Mock Services Integration', () => {
  
  test('should use mock SendGrid service in development', async ({ page }) => {
    // Navigate to campaigns
    await page.goto('/dashboard/campaigns');
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
    
    // Create email campaign
    await page.click('button:has-text("Email Campaign")');
    await page.waitForSelector('text=Create EMAIL Campaign', { timeout: 5000 });
    
    // Fill minimal required fields
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    await page.fill('input[placeholder*="subject"]', 'Mock Service Test');
    await page.fill('textarea', 'Testing mock SendGrid service');
    
    // Submit
    await page.click('button:has-text("Create Campaign")');
    
    // Mock service should process without errors
    await page.waitForTimeout(2000);
    
    // No error alerts should appear
    const errors = await page.locator('[role="alert"], .error, .alert-danger').count();
    expect(errors).toBe(0);
  });

  test('should use mock Twilio service in development', async ({ page }) => {
    // Navigate to campaigns
    await page.goto('/dashboard/campaigns');
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
    
    // Create SMS campaign
    await page.click('button:has-text("SMS Campaign")');
    await page.waitForSelector('text=Create SMS Campaign', { timeout: 5000 });
    
    // Fill required fields
    const billingDropdown = page.locator('select').first();
    await billingDropdown.selectOption({ index: 1 });
    await page.fill('textarea', 'Test SMS via mock Twilio');
    
    // Submit
    await page.click('button:has-text("Create Campaign")');
    
    // Should process without errors
    await page.waitForTimeout(2000);
    const errors = await page.locator('[role="alert"], .error, .alert-danger').count();
    expect(errors).toBe(0);
  });

  test('should use mock Stripe service for billing', async ({ page }) => {
    // The billing modal should display mock Stripe data
    await page.goto('/dashboard/campaigns');
    await page.click('button:has-text("Billing")');
    await page.waitForSelector('text=Billing & Payment Methods', { timeout: 5000 });
    
    // Mock Stripe payment methods should be visible
    await expect(page.locator('text=visa •••• 4242')).toBeVisible();
    await expect(page.locator('text=mastercard •••• 5555')).toBeVisible();
    
    // Mock Stripe customer ID format
    await expect(page.locator('text=cus_test')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Development Mode Authentication', () => {
  
  test('should auto-login with test user in dev mode', async ({ page }) => {
    // Navigate directly to protected route
    await page.goto('/dashboard/campaigns');
    
    // Should not redirect to login
    await expect(page).not.toHaveURL(/.*login.*/);
    
    // Should show test user
    await expect(page.locator('text=Test Shop Owner')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain session across navigation', async ({ page }) => {
    // Start at campaigns
    await page.goto('/dashboard/campaigns');
    await expect(page.locator('text=Test Shop Owner')).toBeVisible();
    
    // Navigate to different protected pages
    await page.goto('/dashboard');
    await expect(page.locator('text=Test Shop Owner')).toBeVisible();
    
    // Return to campaigns
    await page.goto('/dashboard/campaigns');
    await expect(page.locator('text=Campaign Management')).toBeVisible();
    
    // User should still be logged in
    await expect(page.locator('text=Test Shop Owner')).toBeVisible();
  });

  test('should have test user UUID in API calls', async ({ page }) => {
    // Set up request interception
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/marketing')) {
        apiCalls.push(request.url());
      }
    });
    
    // Navigate to campaigns
    await page.goto('/dashboard/campaigns');
    await page.waitForSelector('text=Campaign Management', { timeout: 10000 });
    
    // Check API calls include test user UUID
    const hasTestUUID = apiCalls.some(url => 
      url.includes('11111111-1111-1111-1111-111111111111')
    );
    expect(hasTestUUID).toBeTruthy();
  });
});

// Cleanup
test.afterAll(async () => {
  console.log('✅ Campaign & Billing E2E Tests Completed');
});