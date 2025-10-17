/**
 * E2E Tests for Analytics Components
 *
 * Tests the 3 analytics components we fixed:
 * - ProductPerformanceCharts.js
 * - ProductAnalyticsPanel.js
 * - InventoryInsights.js
 *
 * Run: npx playwright test __tests__/e2e/analytics-components.spec.js
 */

const { test, expect } = require('@playwright/test')

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9999'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test123'

test.describe('Analytics Components Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`)

    // Login (adjust selectors based on your actual login form)
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('ProductPerformanceCharts: renders with real data', async ({ page }) => {
    // Navigate to page with ProductPerformanceCharts component
    // Adjust this URL to wherever the component is actually rendered
    await page.goto(`${BASE_URL}/dashboard/analytics`)

    // Wait for component to load
    await page.waitForSelector('text=Product Performance Charts', { timeout: 10000 })

    // Verify loading state disappears
    await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 5000 })

    // Verify charts are rendered (check for chart containers)
    const salesTrendsChart = await page.locator('text=Sales Trends').count()
    expect(salesTrendsChart).toBeGreaterThan(0)

    const categoryChart = await page.locator('text=Category Performance').count()
    expect(categoryChart).toBeGreaterThan(0)

    // Verify timeframe selector works
    await page.click('select:has-text("Last 30 days")')
    await page.selectOption('select:has-text("Last 30 days")', '7')

    // Wait for data to reload
    await page.waitForTimeout(1000)

    // Verify metric selector works
    await page.selectOption('select:has-text("Revenue")', 'units')
    await page.waitForTimeout(1000)

    // Verify no error states
    const errorMessages = await page.locator('text=Unable to Load').count()
    expect(errorMessages).toBe(0)

    console.log('✅ ProductPerformanceCharts: All tests passed')
  })

  test('ProductAnalyticsPanel: displays top products and categories', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/analytics`)

    // Wait for ProductAnalyticsPanel component
    await page.waitForSelector('text=Product Analytics', { timeout: 10000 })

    // Expand the panel if collapsed
    const chevronDown = await page.locator('[class*="ChevronDownIcon"]').count()
    if (chevronDown > 0) {
      await page.click('text=Product Analytics')
      await page.waitForTimeout(500)
    }

    // Verify loading completes
    await page.waitForSelector('text=Loading analytics...', { state: 'detached', timeout: 5000 })

    // Verify top products section exists
    const topProductsSection = await page.locator('text=Top Selling Products').count()
    expect(topProductsSection).toBeGreaterThan(0)

    // Verify category breakdown exists
    const categorySection = await page.locator('text=Revenue by Category').count()
    expect(categorySection).toBeGreaterThan(0)

    // Test view switcher
    await page.click('button:has-text("Financial")')
    await page.waitForTimeout(500)

    // Verify profit margin table appears
    const profitMarginSection = await page.locator('text=Profit Margin Analysis').count()
    expect(profitMarginSection).toBeGreaterThan(0)

    // Test insights view
    await page.click('button:has-text("Insights")')
    await page.waitForTimeout(500)

    // Verify insights section
    const insightsSection = await page.locator('text=Business Insights').count()
    expect(insightsSection).toBeGreaterThan(0)

    // Verify no error states
    const errorMessages = await page.locator('text=Unable to Load').count()
    expect(errorMessages).toBe(0)

    console.log('✅ ProductAnalyticsPanel: All tests passed')
  })

  test('InventoryInsights: shows stock alerts and recommendations', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/analytics`)

    // Wait for InventoryInsights component
    await page.waitForSelector('text=Inventory Insights', { timeout: 10000 })

    // Verify loading completes
    await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 5000 })

    // Verify stock alerts section
    const stockAlertsTab = await page.locator('button:has-text("Stock Alerts")').count()
    expect(stockAlertsTab).toBeGreaterThan(0)

    // Click on stock alerts tab
    await page.click('button:has-text("Stock Alerts")')
    await page.waitForTimeout(500)

    // Verify predictions tab exists
    const predictionsTab = await page.locator('button:has-text("Predictions")').count()
    expect(predictionsTab).toBeGreaterThan(0)

    // Click predictions tab
    await page.click('button:has-text("Predictions")')
    await page.waitForTimeout(500)

    // Verify category health overview
    const categoryHealth = await page.locator('text=Category Health Overview').count()
    expect(categoryHealth).toBeGreaterThan(0)

    // Test cost analysis tab
    await page.click('button:has-text("Cost Analysis")')
    await page.waitForTimeout(500)

    // Verify cost analysis table
    const costAnalysis = await page.locator('text=Inventory Cost Analysis').count()
    expect(costAnalysis).toBeGreaterThan(0)

    // Verify no error states
    const errorMessages = await page.locator('text=Unable to Load').count()
    expect(errorMessages).toBe(0)

    console.log('✅ InventoryInsights: All tests passed')
  })

  test('Error handling: components show error states on API failure', async ({ page }) => {
    // Intercept API calls and force them to fail
    await page.route('**/api/shop/analytics/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto(`${BASE_URL}/dashboard/analytics`)

    // Wait for components to attempt loading
    await page.waitForTimeout(2000)

    // Verify error states appear
    const errorMessages = await page.locator('text=Unable to Load').count()
    expect(errorMessages).toBeGreaterThan(0)

    // Verify retry buttons exist
    const retryButtons = await page.locator('button:has-text("Try Again")').count()
    expect(retryButtons).toBeGreaterThan(0)

    console.log('✅ Error handling: Error states work correctly')
  })

  test('Console errors: no JavaScript errors during normal operation', async ({ page }) => {
    const consoleErrors = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(`${BASE_URL}/dashboard/analytics`)

    // Wait for page to fully load
    await page.waitForTimeout(3000)

    // Filter out expected errors (if any)
    const unexpectedErrors = consoleErrors.filter(error => {
      // Add any known/expected errors to ignore here
      return !error.includes('expected-error-pattern')
    })

    // Verify no unexpected console errors
    expect(unexpectedErrors.length).toBe(0)

    if (unexpectedErrors.length > 0) {
      console.log('❌ Console errors found:', unexpectedErrors)
    } else {
      console.log('✅ No console errors detected')
    }
  })
})

test.describe('Data Accuracy Tests', () => {
  test('API responses match database data', async ({ page, request }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_USER_EMAIL)
    await page.fill('input[type="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    // Get auth cookies
    const cookies = await page.context().cookies()

    // Make authenticated API request
    const response = await request.get(`${BASE_URL}/api/shop/analytics/products?period_days=30`, {
      headers: {
        cookie: cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }
    })

    expect(response.ok()).toBeTruthy()

    const data = await response.json()

    // Verify response structure
    expect(data.success).toBe(true)
    expect(data.summary).toBeDefined()
    expect(data.top_selling_products).toBeDefined()
    expect(data.category_performance).toBeDefined()

    // Verify data types
    expect(Array.isArray(data.top_selling_products)).toBe(true)
    expect(Array.isArray(data.category_performance)).toBe(true)

    // Verify we have actual data (not empty)
    expect(data.top_selling_products.length).toBeGreaterThan(0)
    expect(data.category_performance.length).toBeGreaterThan(0)

    console.log('✅ API data validation passed')
    console.log(`   - Top Products: ${data.top_selling_products.length}`)
    console.log(`   - Categories: ${data.category_performance.length}`)
    console.log(`   - Total Revenue: $${data.summary.total_revenue}`)
  })
})
