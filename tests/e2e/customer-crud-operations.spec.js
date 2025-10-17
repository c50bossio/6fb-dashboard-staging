import { test, expect } from '@playwright/test';

/**
 * Customer CRUD Operations E2E Tests
 * Tests all customer management modal functionality including:
 * - Creating customers (Add modal)
 * - Editing customers (Edit modal)
 * - Deleting customers
 * - Dark mode visibility
 */

const TEST_CUSTOMER = {
  name: 'Test Customer ' + Date.now(),
  email: `test${Date.now()}@example.com`,
  phone: '(555) 123-4567',
  notes: 'Test customer created via E2E test'
};

test.describe('Customer Management CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to customer management page
    await page.goto('http://localhost:9999/dashboard/customers-enhanced');

    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Customer Management")');

    // Close any open modals from previous tests
    const closeButtons = page.locator('button:has-text("Cancel"), button:has-text("Close")');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      const button = closeButtons.nth(i);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should display customer management page correctly', async ({ page }) => {
    // Verify page title - use specific selector to avoid dashboard greeting h1
    await expect(page.locator('h1:has-text("Customer Management")')).toBeVisible();

    // Verify stats cards are visible
    await expect(page.locator('text=Total Customers')).toBeVisible();
    await expect(page.locator('text=New This Month')).toBeVisible();
    await expect(page.locator('text=VIP Customers')).toBeVisible();
    await expect(page.locator('text=Avg. Spent')).toBeVisible();

    // Verify table view is default
    await expect(page.locator('table')).toBeVisible();
  });

  test('should open Add Customer modal when clicking Add Customer button', async ({ page }) => {
    // Click Add Customer button - use first() to handle multiple buttons
    await page.locator('button:has-text("Add Customer")').first().click();

    // Wait for modal to appear
    await page.waitForSelector('text=Add New Customer');

    // Verify all form fields are present
    await expect(page.locator('input[type="text"]').first()).toBeVisible(); // Name field
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible(); // Preferred contact
    await expect(page.locator('textarea')).toBeVisible(); // Notes
  });

  test('should create a new customer successfully', async ({ page }) => {
    // Click Add Customer button
    await page.locator('button:has-text("Add Customer")').first().click();

    // Wait for modal
    await page.waitForSelector('text=Add New Customer');

    // Fill in customer details
    await page.fill('input[type="text"]', TEST_CUSTOMER.name);
    await page.fill('input[type="email"]', TEST_CUSTOMER.email);
    await page.fill('input[type="tel"]', TEST_CUSTOMER.phone);
    await page.selectOption('select', 'email');
    await page.fill('textarea', TEST_CUSTOMER.notes);

    // Submit form
    await page.click('button:has-text("Add Customer")');

    // Wait for modal to close and customer list to reload
    await page.waitForTimeout(1000);

    // Verify the customer appears in the table
    await expect(page.locator(`text=${TEST_CUSTOMER.name}`)).toBeVisible();
  });

  test('should close Add Customer modal when clicking Cancel', async ({ page }) => {
    // Click Add Customer button
    await page.locator('button:has-text("Add Customer")').first().click();

    // Wait for modal
    await page.waitForSelector('text=Add New Customer');

    // Click Cancel button
    await page.click('button:has-text("Cancel")');

    // Wait for modal to close
    await page.waitForTimeout(500);

    // Verify modal is closed
    await expect(page.locator('text=Add New Customer')).not.toBeVisible();
  });

  test('should open Edit Customer modal when clicking edit button', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Click first edit button in table
    await page.click('table tbody tr:first-child button[title="Edit Customer"]');

    // Wait for edit modal
    await page.waitForSelector('text=Edit Customer');

    // Verify form is populated with customer data
    const nameInput = page.locator('input[type="text"]');
    await expect(nameInput).not.toHaveValue('');
  });

  test('should update customer details successfully', async ({ page }) => {
    // First, create a test customer to edit
    await page.locator('button:has-text("Add Customer")').first().click();
    await page.waitForSelector('text=Add New Customer');

    const uniqueName = 'Edit Test ' + Date.now();
    await page.fill('input[type="text"]', uniqueName);
    await page.fill('input[type="email"]', `edit${Date.now()}@example.com`);
    await page.fill('input[type="tel"]', '(555) 999-8888');
    await page.click('button:has-text("Add Customer")');
    await page.waitForTimeout(1000);

    // Find and click edit button for the newly created customer
    const customerRow = page.locator(`tr:has-text("${uniqueName}")`);
    await customerRow.locator('button[title="Edit Customer"]').click();

    // Wait for edit modal
    await page.waitForSelector('text=Edit Customer');

    // Update the name
    const updatedName = uniqueName + ' Updated';
    await page.fill('input[type="text"]', updatedName);

    // Submit form
    await page.click('button:has-text("Update Customer")');

    // Wait for update to complete
    await page.waitForTimeout(1000);

    // Verify updated name appears in table
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
  });

  test('should show confirmation dialog when deleting customer', async ({ page }) => {
    // Setup dialog handler before triggering delete
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.dismiss(); // Dismiss to not actually delete
    });

    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Click first delete button
    await page.click('table tbody tr:first-child button[title="Delete Customer"]');

    // Wait a bit to ensure dialog was shown
    await page.waitForTimeout(500);
  });

  test('should display all modal labels correctly in light mode', async ({ page }) => {
    // Click Add Customer button
    await page.locator('button:has-text("Add Customer")').first().click();

    // Wait for modal
    await page.waitForSelector('text=Add New Customer');

    // Check all labels are visible
    await expect(page.locator('label:has-text("Full Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Phone Number")')).toBeVisible();
    await expect(page.locator('label:has-text("Preferred Contact Method")')).toBeVisible();
    await expect(page.locator('label:has-text("Notes")')).toBeVisible();
  });

  test('should display all modal labels correctly in dark mode', async ({ page }) => {
    // Toggle to dark mode (assuming there's a theme toggle button)
    // This might need adjustment based on your actual dark mode implementation
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    // Click Add Customer button
    await page.locator('button:has-text("Add Customer")').first().click();

    // Wait for modal
    await page.waitForSelector('text=Add New Customer');

    // Check all labels are visible in dark mode
    await expect(page.locator('label:has-text("Full Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Phone Number")')).toBeVisible();
    await expect(page.locator('label:has-text("Preferred Contact Method")')).toBeVisible();
    await expect(page.locator('label:has-text("Notes")')).toBeVisible();

    // Verify labels have correct dark mode color (should use text-card-foreground)
    const label = page.locator('label:has-text("Full Name")');
    const color = await label.evaluate(el => window.getComputedStyle(el).color);
    // Color should not be the dark gray-700 value
    expect(color).not.toBe('rgb(55, 65, 81)'); // gray-700 in dark mode would be invisible
  });

  test('should display Cancel button correctly in dark mode', async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    // Open modal
    await page.locator('button:has-text("Add Customer")').first().click();
    await page.waitForSelector('text=Add New Customer');

    // Check Cancel button is visible and has proper styling
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible();

    // Verify button doesn't have hardcoded gray colors
    const bgColor = await cancelButton.evaluate(el => window.getComputedStyle(el).backgroundColor);
    // Should be using muted background, not gray-300
    expect(bgColor).not.toBe('rgb(209, 213, 219)'); // gray-300
  });

  test('should handle required field validation', async ({ page }) => {
    // Click Add Customer button
    await page.locator('button:has-text("Add Customer")').first().click();

    // Wait for modal
    await page.waitForSelector('text=Add New Customer');

    // Try to submit without filling required fields
    await page.click('button:has-text("Add Customer")');

    // Browser should prevent submission due to HTML5 validation
    // Modal should still be visible
    await expect(page.locator('text=Add New Customer')).toBeVisible();
  });

  test('should open customer details modal when clicking on customer row', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr');

    // Click on first customer row (but not on action buttons)
    await page.click('table tbody tr:first-child td:first-child');

    // Wait for details modal
    await page.waitForTimeout(500);

    // Check if customer details modal or edit modal appeared
    const hasDetailsModal = await page.locator('text=Contact Information').isVisible().catch(() => false);
    const hasEditModal = await page.locator('text=Edit Customer').isVisible().catch(() => false);

    expect(hasDetailsModal || hasEditModal).toBeTruthy();
  });

  test('should switch between table and card views', async ({ page }) => {
    // Verify table view is visible
    await expect(page.locator('table')).toBeVisible();

    // Click card view button
    await page.click('button[title="Card View"]');

    // Wait for view change
    await page.waitForTimeout(500);

    // Verify card view is visible
    await expect(page.locator('.grid.grid-cols-1')).toBeVisible();

    // Switch back to table view
    await page.click('button[title="Table View"]');

    // Verify table view is visible again
    await expect(page.locator('table')).toBeVisible();
  });
});
