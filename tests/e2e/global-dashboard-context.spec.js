const { test, expect } = require('@playwright/test');

test.describe('Global Dashboard Context System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:9999');
  });

  test.describe('Enterprise Owner Flow', () => {
    test('should show location selector for enterprise owners', async ({ page }) => {
      // Login as enterprise owner
      await page.goto('http://localhost:9999/login');
      await page.fill('input[type="email"]', 'enterprise@test.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard to load
      await page.waitForURL('**/dashboard');
      
      // Check for location selector
      await expect(page.locator('text=Select Location')).toBeVisible();
      
      // Click location dropdown
      await page.click('text=Select Location');
      
      // Verify dropdown menu appears
      await expect(page.locator('[role="menu"]')).toBeVisible();
      
      // Select multiple locations
      await page.click('text=Select All');
      
      // Verify view mode toggle appears
      await expect(page.locator('text=Consolidated')).toBeVisible();
      await expect(page.locator('text=Individual')).toBeVisible();
      await expect(page.locator('text=Compare')).toBeVisible();
    });

    test('should switch between view modes', async ({ page }) => {
      // Assume logged in as enterprise owner with multiple locations selected
      await page.goto('http://localhost:9999/dashboard');
      
      // Click Individual view
      await page.click('text=Individual');
      
      // Verify Individual view is active
      await expect(page.locator('button:has-text("Individual")')).toHaveClass(/bg-olive-600/);
      
      // Click Comparison view
      await page.click('text=Compare');
      
      // Verify Comparison view is active
      await expect(page.locator('button:has-text("Compare")')).toHaveClass(/bg-olive-600/);
      
      // Verify table view appears
      await expect(page.locator('table')).toBeVisible();
    });

    test('should show barber selector after location selection', async ({ page }) => {
      await page.goto('http://localhost:9999/dashboard');
      
      // Select a location first
      await page.click('text=Select Location');
      await page.click('text=Elite Cuts GMB Test');
      
      // Verify barber selector appears
      await expect(page.locator('text=All Barbers')).toBeVisible();
      
      // Click barber dropdown
      await page.click('text=All Barbers');
      
      // Verify barber list appears
      await expect(page.locator('text=Select All')).toBeVisible();
    });
  });

  test.describe('Shop Owner Flow', () => {
    test('should not show view mode toggle for single location', async ({ page }) => {
      // Login as shop owner
      await page.goto('http://localhost:9999/login');
      await page.fill('input[type="email"]', 'shopowner@test.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/dashboard');
      
      // Verify no view mode toggle
      await expect(page.locator('text=Consolidated')).not.toBeVisible();
      await expect(page.locator('text=Individual')).not.toBeVisible();
      await expect(page.locator('text=Compare')).not.toBeVisible();
      
      // Verify can see barber selector
      await expect(page.locator('text=All Barbers')).toBeVisible();
    });

    test('should show Add Barber button', async ({ page }) => {
      await page.goto('http://localhost:9999/dashboard');
      
      // Click barber dropdown
      await page.click('text=All Barbers');
      
      // Verify Add New Barber button
      await expect(page.locator('text=Add New Barber')).toBeVisible();
      
      // Click Add New Barber
      await page.click('text=Add New Barber');
      
      // Verify modal appears
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Add New Barber')).toBeVisible();
    });
  });

  test.describe('Barber Flow', () => {
    test('should not show location or barber selectors', async ({ page }) => {
      // Login as barber
      await page.goto('http://localhost:9999/login');
      await page.fill('input[type="email"]', 'barber@test.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/dashboard');
      
      // Verify no location selector
      await expect(page.locator('text=Select Location')).not.toBeVisible();
      
      // Verify no barber selector
      await expect(page.locator('text=All Barbers')).not.toBeVisible();
      
      // Verify appropriate navigation items
      await expect(page.locator('text=My Schedule')).toBeVisible();
      await expect(page.locator('text=My Clients')).toBeVisible();
    });
  });

  test.describe('Context Persistence', () => {
    test('should persist selections across page refreshes', async ({ page }) => {
      await page.goto('http://localhost:9999/dashboard');
      
      // Select locations
      await page.click('text=Select Location');
      await page.click('text=Elite Cuts GMB Test');
      await page.click('text=Demo Elite Barbershop');
      
      // Select view mode
      await page.click('text=Individual');
      
      // Refresh page
      await page.reload();
      
      // Verify selections persist
      await expect(page.locator('text=2 Locations')).toBeVisible();
      await expect(page.locator('button:has-text("Individual")')).toHaveClass(/bg-olive-600/);
    });

    test('should clear old context after 24 hours', async ({ page, context }) => {
      await page.goto('http://localhost:9999/dashboard');
      
      // Set old context in localStorage
      await page.evaluate(() => {
        const oldContext = {
          selectedLocations: ['old-location'],
          viewMode: 'comparison',
          lastUpdated: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
        };
        localStorage.setItem('globalDashboardContext_user-1', JSON.stringify(oldContext));
      });
      
      // Reload page
      await page.reload();
      
      // Verify default state is loaded
      await expect(page.locator('text=Select Location')).toBeVisible();
      await expect(page.locator('button:has-text("Individual")')).toHaveClass(/bg-olive-600/);
    });
  });

  test.describe('Dashboard Component Integration', () => {
    test('should update calendar when locations change', async ({ page }) => {
      await page.goto('http://localhost:9999/dashboard/calendar');
      
      // Select a location
      await page.click('text=Select Location');
      await page.click('text=Elite Cuts GMB Test');
      
      // Verify calendar updates
      await page.waitForTimeout(1000); // Wait for calendar to update
      
      // Check for calendar events or resources
      await expect(page.locator('.fc-resource-cell')).toBeVisible();
    });

    test('should filter analytics by selected locations', async ({ page }) => {
      await page.goto('http://localhost:9999/dashboard?mode=analytics');
      
      // Select multiple locations
      await page.click('text=Select Location');
      await page.click('text=Select All');
      
      // Verify analytics shows aggregated data
      await expect(page.locator('text=locations')).toBeVisible();
    });
  });

  test.describe('Add Location Modal', () => {
    test('should open and submit add location modal', async ({ page }) => {
      await page.goto('http://localhost:9999/dashboard');
      
      // Open location dropdown
      await page.click('text=Select Location');
      
      // Click Add New Location
      await page.click('text=Add New Location');
      
      // Fill form
      await page.fill('input[id="name"]', 'Test Barbershop');
      await page.fill('input[id="city"]', 'New York');
      await page.fill('input[id="state"]', 'NY');
      
      // Submit
      await page.click('text=Create Location');
      
      // Verify modal closes and location appears
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Add Barber Modal', () => {
    test('should open and submit add barber modal', async ({ page }) => {
      await page.goto('http://localhost:9999/dashboard');
      
      // Select a location first
      await page.click('text=Select Location');
      await page.click('text=Elite Cuts GMB Test');
      
      // Open barber dropdown
      await page.click('text=All Barbers');
      
      // Click Add New Barber
      await page.click('text=Add New Barber');
      
      // Fill form
      await page.fill('input[id="email"]', 'newbarber@test.com');
      await page.fill('input[id="full_name"]', 'Test Barber');
      
      // Select financial arrangement
      await page.click('text=Commission Based');
      
      // Submit
      await page.click('text=Add Barber');
      
      // Verify modal closes
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('http://localhost:9999/dashboard');
      
      // Verify mobile menu button
      await expect(page.locator('[aria-label="Open menu"]')).toBeVisible();
      
      // Verify selectors are still accessible
      await expect(page.locator('text=Select Location')).toBeVisible();
    });
  });
});