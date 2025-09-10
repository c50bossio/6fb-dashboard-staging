import { test, expect } from '@playwright/test'

test.describe('Global Onboarding Widget', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard first (authenticated area)
    await page.goto('/dashboard')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should display onboarding widget on dashboard page', async ({ page }) => {
    // Check if the global onboarding widget appears
    const widget = page.locator('.fixed.bottom-4.right-4 .onboarding-widget, [data-testid="onboarding-widget"], .z-50 h3:has-text("Setup Progress")')
    
    // Widget should be visible
    await expect(widget).toBeVisible({ timeout: 10000 })
    
    // Should show setup progress header
    await expect(page.locator('text=Setup Progress')).toBeVisible()
    
    // Should show progress percentage
    await expect(page.locator('text=%')).toBeVisible()
  })

  test('should persist widget when navigating to calendar page', async ({ page }) => {
    // Wait for initial widget to appear on dashboard
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Navigate to calendar page
    await page.goto('/dashboard/calendar')
    await page.waitForLoadState('networkidle')
    
    // Widget should still be visible on calendar page
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Check for onboarding checklist items
    await expect(page.locator('text=Complete your profile')).toBeVisible()
  })

  test('should persist widget when navigating to bookings page', async ({ page }) => {
    // Wait for initial widget to appear
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Navigate to bookings page  
    await page.goto('/dashboard/bookings')
    await page.waitForLoadState('networkidle')
    
    // Widget should persist
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Check for specific checklist items
    await expect(page.locator('text=Add your services')).toBeVisible()
    await expect(page.locator('text=Set business hours')).toBeVisible()
  })

  test('should persist widget when navigating to shop settings', async ({ page }) => {
    // Wait for widget
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Navigate to shop settings
    await page.goto('/shop/settings')
    await page.waitForLoadState('networkidle')
    
    // Widget should be present in shop settings
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // This is where users would complete "Add your services" task
    await expect(page.locator('text=Add your services')).toBeVisible()
  })

  test('should persist widget when navigating to shop financial page', async ({ page }) => {
    // Wait for widget
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Navigate to financial page (where payment setup happens)
    await page.goto('/shop/financial')
    await page.waitForLoadState('networkidle')
    
    // Widget should remain visible
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Should show payment-related onboarding item
    await expect(page.locator('text=Connect payment processing')).toBeVisible()
  })

  test('should handle widget minimization and remember state', async ({ page }) => {
    // Wait for widget to appear
    const widget = page.locator('text=Setup Progress').first()
    await expect(widget).toBeVisible({ timeout: 10000 })
    
    // Look for minimize button (up/down chevron icons)
    const minimizeButton = page.locator('button:has([data-testid="chevron-down"], .chevron-down, svg[data-testid="ChevronDownIcon"])')
    
    // If minimize button exists, click it
    if (await minimizeButton.isVisible()) {
      await minimizeButton.click()
      
      // Navigate to another page
      await page.goto('/dashboard/calendar')
      await page.waitForLoadState('networkidle')
      
      // Widget should remember minimized state
      const expandedContent = page.locator('text=Complete your profile')
      await expect(expandedContent).not.toBeVisible()
    }
  })

  test('should allow clicking on onboarding items to navigate', async ({ page }) => {
    // Wait for widget
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Find and click on "Complete your profile" item
    const profileItem = page.locator('text=Complete your profile').first()
    await expect(profileItem).toBeVisible()
    
    // Click the item
    await profileItem.click()
    
    // Should navigate to settings page
    await page.waitForLoadState('networkidle')
    
    // Check if we're on a settings page (URL or content)
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/\/(dashboard\/settings|settings)/)
    
    // Widget should still be visible on the settings page
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 5000 })
  })

  test('should show achievement level and points', async ({ page }) => {
    // Wait for widget
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Check for achievement level (Newcomer, Beginner, etc.)
    const achievementLevel = page.locator('text=Level, text=Newcomer, text=Beginner, text=Intermediate, text=Advanced, text=Expert')
    await expect(achievementLevel).toBeVisible()
    
    // Check for points display
    const pointsDisplay = page.locator('text=points earned, text=pts')
    await expect(pointsDisplay).toBeVisible()
  })

  test('should show floating widget positioning', async ({ page }) => {
    // Wait for widget
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Check that widget has correct CSS classes for floating positioning
    const floatingWidget = page.locator('.fixed.bottom-4.right-4, .z-50')
    await expect(floatingWidget).toBeVisible()
    
    // Verify it's positioned in the bottom right
    const widgetElement = page.locator('text=Setup Progress').locator('..')
    const boundingBox = await widgetElement.boundingBox()
    
    // Should be positioned towards bottom-right of viewport
    expect(boundingBox.x).toBeGreaterThan(500) // Right side
    expect(boundingBox.y).toBeGreaterThan(300) // Lower part of screen
  })

  test('should not appear on landing page', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Widget should NOT be visible on landing page
    const widget = page.locator('text=Setup Progress')
    await expect(widget).not.toBeVisible()
  })

  test('should not appear on auth pages', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    // Widget should NOT be visible on auth pages
    const widget = page.locator('text=Setup Progress')
    await expect(widget).not.toBeVisible()
  })

  test('should maintain widget state during fast navigation', async ({ page }) => {
    // Start on dashboard
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Rapid navigation between pages
    await page.goto('/dashboard/calendar')
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 5000 })
    
    await page.goto('/dashboard/bookings')
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 5000 })
    
    await page.goto('/shop/settings')
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 5000 })
    
    await page.goto('/dashboard')
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 5000 })
    
    // Widget should remain functional after rapid navigation
    await expect(page.locator('text=Complete your profile')).toBeVisible()
    await expect(page.locator('text=Add your services')).toBeVisible()
  })

  test('should show progress updates across pages', async ({ page }) => {
    // Wait for widget on dashboard
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Capture initial progress percentage
    const initialProgress = await page.locator('text=%').first().textContent()
    
    // Navigate to settings (where profile completion might happen)
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')
    
    // Widget should show same progress on different page
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 5000 })
    const settingsProgress = await page.locator('text=%').first().textContent()
    
    // Progress should be consistent across pages
    expect(settingsProgress).toBe(initialProgress)
  })
})

test.describe('Global Onboarding Widget - Mobile', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
  })

  test('should display correctly on mobile dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Widget should be visible and responsive on mobile
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Should maintain floating position on mobile
    const widget = page.locator('.fixed.bottom-4.right-4, .z-50')
    await expect(widget).toBeVisible()
  })

  test('should persist on mobile during navigation', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 10000 })
    
    // Navigate on mobile
    await page.goto('/dashboard/calendar')
    await page.waitForLoadState('networkidle')
    
    // Should remain visible on mobile
    await expect(page.locator('text=Setup Progress')).toBeVisible({ timeout: 5000 })
  })
})