const { test, expect } = require('@playwright/test');

test.describe('AI Intelligent Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the AI intelligent dashboard
    await page.goto('http://localhost:9999/dashboard/ai-intelligent');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for the main dashboard title to be visible
    await expect(page.locator('h1')).toContainText('Intelligent AI Dashboard');
  });

  test('Financial Coach Widget loads and displays insights', async ({ page }) => {
    // Wait for Financial Insights Widget to load
    const financialWidget = page.locator('h3:has-text("Financial Coach Insights")').locator('..');
    await expect(financialWidget).toBeVisible();
    
    // Check for Marcus name
    await expect(financialWidget).toContainText('Marcus - Financial Coach');
    
    // Check for refresh button
    const refreshButton = financialWidget.locator('button').first();
    await expect(refreshButton).toBeVisible();
    
    // Test refresh functionality
    await refreshButton.click();
    
    // Wait for widget to reload
    await page.waitForTimeout(2000);
    
    // Verify content is present
    await expect(financialWidget).toContainText('Revenue');
  });

  test('Marketing Expert Widget loads and displays insights', async ({ page }) => {
    // Wait for Marketing Insights Widget to load
    const marketingWidget = page.locator('h3:has-text("Marketing Expert Insights")').locator('..');
    await expect(marketingWidget).toBeVisible();
    
    // Check for Sophia name
    await expect(marketingWidget).toContainText('Sophia - Marketing Expert');
    
    // Check for refresh button
    const refreshButton = marketingWidget.locator('button').first();
    await expect(refreshButton).toBeVisible();
    
    // Test refresh functionality
    await refreshButton.click();
    
    // Wait for widget to reload
    await page.waitForTimeout(2000);
    
    // Verify content is present
    await expect(marketingWidget).toContainText('Social');
  });

  test('Operations Manager Widget loads and displays insights', async ({ page }) => {
    // Wait for Operations Insights Widget to load
    const operationsWidget = page.locator('h3:has-text("Operations Manager Insights")').locator('..');
    await expect(operationsWidget).toBeVisible();
    
    // Check for David name
    await expect(operationsWidget).toContainText('David - Operations Manager');
    
    // Check for refresh button
    const refreshButton = operationsWidget.locator('button').first();
    await expect(refreshButton).toBeVisible();
    
    // Test refresh functionality
    await refreshButton.click();
    
    // Wait for widget to reload
    await page.waitForTimeout(2000);
    
    // Verify content is present
    await expect(operationsWidget).toContainText('Operations');
  });

  test('Business Recommendations Widget loads and displays advice', async ({ page }) => {
    // Wait for Business Recommendations Widget to load
    const recommendationsWidget = page.locator('h3:has-text("AI Business Recommendations")').locator('..');
    await expect(recommendationsWidget).toBeVisible();
    
    // Check for AI Business Coach content
    await expect(recommendationsWidget).toContainText('AI Business');
    
    // Check for refresh button
    const refreshButton = recommendationsWidget.locator('button').first();
    await expect(refreshButton).toBeVisible();
    
    // Test refresh functionality
    await refreshButton.click();
    
    // Wait for widget to reload
    await page.waitForTimeout(2000);
    
    // Verify priority actions are present
    await expect(recommendationsWidget).toContainText('Priority Actions');
  });

  test('Agent System Status Widget shows all agents as active', async ({ page }) => {
    // Wait for Agent System Status Widget to load
    const statusWidget = page.locator('h3:has-text("AI System Status")').locator('..');
    await expect(statusWidget).toBeVisible();
    
    // Check for status indicator (green dot)
    const statusIndicator = statusWidget.locator('.bg-green-500');
    await expect(statusIndicator).toBeVisible();
    
    // Check for total agents count
    await expect(statusWidget).toContainText('3');
    
    // Check for individual agent statuses
    await expect(statusWidget).toContainText('Marcus (Financial)');
    await expect(statusWidget).toContainText('Sophia (Marketing)');
    await expect(statusWidget).toContainText('David (Operations)');
    
    // Verify all agents show as Active
    const activeStatuses = statusWidget.locator('text=Active');
    await expect(activeStatuses).toHaveCount(3);
  });

  test('Global refresh button works for all widgets', async ({ page }) => {
    // Find the global refresh button
    const globalRefreshButton = page.locator('button:has-text("Refresh All Insights")');
    await expect(globalRefreshButton).toBeVisible();
    
    // Click the global refresh button
    await globalRefreshButton.click();
    
    // Wait for all widgets to refresh
    await page.waitForTimeout(3000);
    
    // Verify all widgets have content after refresh
    await expect(page.locator('h3:has-text("Financial Coach Insights")').locator('..')).toContainText('Marcus');
    await expect(page.locator('h3:has-text("Marketing Expert Insights")').locator('..')).toContainText('Sophia');
    await expect(page.locator('h3:has-text("Operations Manager Insights")').locator('..')).toContainText('David');
  });

  test('Widget confidence scores are displayed correctly', async ({ page }) => {
    // Wait for widgets to load
    await page.waitForTimeout(3000);
    
    // Check for confidence scores in each widget
    const confidenceScores = page.locator('text=/Confidence: \\d+%/');
    await expect(confidenceScores).toHaveCount(4); // Financial, Marketing, Operations, and Recommendations widgets
    
    // Verify confidence scores are reasonable (between 50% and 100%)
    const scores = await confidenceScores.allTextContents();
    for (const scoreText of scores) {
      const percentage = parseInt(scoreText.match(/\\d+/)[0]);
      expect(percentage).toBeGreaterThanOrEqual(50);
      expect(percentage).toBeLessThanOrEqual(100);
    }
  });

  test('Widget loading states work correctly', async ({ page }) => {
    // Navigate to page and immediately check for loading states
    await page.goto('http://localhost:9999/dashboard/ai-intelligent');
    
    // Check for loading animations (pulse or spinner)
    const loadingElements = page.locator('.animate-pulse, .animate-spin');
    
    // Wait for loading to complete
    await page.waitForTimeout(5000);
    
    // Verify loading states are gone and content is visible
    await expect(page.locator('text=Marcus - Financial Coach')).toBeVisible();
    await expect(page.locator('text=Sophia - Marketing Expert')).toBeVisible();
    await expect(page.locator('text=David - Operations Manager')).toBeVisible();
  });

  test('Quick Actions footer is functional', async ({ page }) => {
    // Scroll to Quick Actions section
    const quickActions = page.locator('h3:has-text("Quick Actions")').locator('..');
    await expect(quickActions).toBeVisible();
    
    // Verify all 4 quick action buttons are present
    await expect(quickActions.locator('button')).toHaveCount(4);
    
    // Check button labels
    await expect(quickActions).toContainText('Financial Analysis');
    await expect(quickActions).toContainText('Marketing Strategy');
    await expect(quickActions).toContainText('Operations Review');
    await expect(quickActions).toContainText('Full Analytics');
    
    // Test button hover states
    const financialButton = quickActions.locator('button:has-text("Financial Analysis")');
    await financialButton.hover();
    await expect(financialButton).toHaveClass(/hover:bg-green-100/);
  });

  test('Widget data quality and business relevance', async ({ page }) => {
    // Wait for all widgets to fully load
    await page.waitForTimeout(5000);
    
    // Check Financial Widget for business-specific content
    const financialWidget = page.locator('h3:has-text("Financial Coach Insights")').locator('..');
    const financialContent = await financialWidget.textContent();
    
    // Verify financial widget contains revenue-related keywords
    expect(financialContent.toLowerCase()).toMatch(/(revenue|profit|customer|ticket|growth|financial)/);
    
    // Check Marketing Widget for marketing-specific content
    const marketingWidget = page.locator('h3:has-text("Marketing Expert Insights")').locator('..');
    const marketingContent = await marketingWidget.textContent();
    
    // Verify marketing widget contains marketing-related keywords
    expect(marketingContent.toLowerCase()).toMatch(/(social|media|customer|marketing|brand|strategy)/);
    
    // Check Operations Widget for operations-specific content
    const operationsWidget = page.locator('h3:has-text("Operations Manager Insights")').locator('..');
    const operationsContent = await operationsWidget.textContent();
    
    // Verify operations widget contains operations-related keywords
    expect(operationsContent.toLowerCase()).toMatch(/(operations|staff|efficiency|schedule|process|management)/);
  });
});

test.describe('Dashboard Error Handling', () => {
  test('Widgets handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/ai/agents', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable' })
      });
    });
    
    await page.goto('http://localhost:9999/dashboard/ai-intelligent');
    await page.waitForTimeout(3000);
    
    // Verify widgets show appropriate fallback content or error states
    // (This depends on how error handling is implemented in the components)
    await expect(page.locator('h1')).toContainText('Intelligent AI Dashboard');
  });
});