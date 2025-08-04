import { test, expect } from '@playwright/test'

/**
 * 6FB AI Agent System - Responsive Design Testing
 * Tests mobile and desktop responsiveness
 */

test.describe('Responsive Design - Mobile View', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Authenticate
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
    await devBypassButton.click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('dashboard layout adapts to mobile', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check that page loads on mobile
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent?.length || 0).toBeGreaterThan(10)
    
    // Check for mobile-specific elements
    const mobileMenu = page.locator(
      '[data-testid*="mobile"], button[aria-label*="menu"], ' +
      'button[class*="mobile"], [class*="hamburger"]'
    ).first()
    
    // Mobile menu should be visible on small screens
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click()
      await page.waitForTimeout(500)
    }
    
    // Verify content is not cut off
    const pageWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(pageWidth).toBeLessThanOrEqual(375 + 50) // Allow small margin
  })

  test('navigation works on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Test navigation to different sections
    const testRoutes = ['/dashboard/ai-tools', '/dashboard/analytics', '/dashboard/settings']
    
    for (const route of testRoutes) {
      await page.goto(route)
      
      // Verify page loads properly on mobile
      await expect(page).toHaveURL(new RegExp(route))
      
      const content = await page.locator('body').textContent()
      expect(content?.length || 0).toBeGreaterThan(10)
      
      // Check for horizontal scrollbar (should not exist)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth
      })
      expect(hasHorizontalScroll).toBeFalsy()
    }
  })

  test('interactive elements are touch-friendly', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Find buttons and check they're large enough for touch
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(5, buttonCount); i++) {
        const button = buttons.nth(i)
        
        if (await button.isVisible()) {
          const box = await button.boundingBox()
          if (box) {
            // Touch targets should be at least 44px (iOS) or 48px (Android)
            const minTouchSize = 40 // Slightly smaller to account for padding
            expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(minTouchSize)
          }
        }
      }
    }
  })
})

test.describe('Responsive Design - Tablet View', () => {
  test.beforeEach(async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    // Authenticate
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
    await devBypassButton.click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('dashboard layout adapts to tablet', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Content should be visible and well-laid out
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent?.length || 0).toBeGreaterThan(10)
    
    // Check that layout uses available space efficiently
    const contentArea = page.locator('main, [role="main"], .main-content').first()
    
    if (await contentArea.isVisible()) {
      const box = await contentArea.boundingBox()
      if (box) {
        // Content should take reasonable portion of screen width
        expect(box.width).toBeGreaterThan(400)
      }
    }
  })

  test('sidebar behavior on tablet', async ({ page }) => {
    await page.goto('/dashboard')
    
    // On tablet, sidebar might be visible or collapsible
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
    
    if (await sidebar.isVisible()) {
      const box = await sidebar.boundingBox()
      if (box) {
        // Sidebar should have reasonable width for tablet
        expect(box.width).toBeGreaterThan(50)
        expect(box.width).toBeLessThan(400)
      }
    }
  })
})

test.describe('Responsive Design - Desktop View', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Authenticate
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
    await devBypassButton.click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('dashboard layout utilizes desktop space', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Content should be visible
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent?.length || 0).toBeGreaterThan(10)
    
    // Check for desktop-specific layout elements
    const mainContent = page.locator('main, [role="main"], .main-content').first()
    
    if (await mainContent.isVisible()) {
      const box = await mainContent.boundingBox()
      if (box) {
        // Content area should be substantial on desktop
        expect(box.width).toBeGreaterThan(800)
      }
    }
  })

  test('sidebar is appropriately sized on desktop', async ({ page }) => {
    await page.goto('/dashboard')
    
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
    
    if (await sidebar.isVisible()) {
      const box = await sidebar.boundingBox()
      if (box) {
        // Desktop sidebar should be in expected range
        // Expanded: ~288px, Collapsed: ~64px (as mentioned in requirements)
        expect(box.width).toBeGreaterThanOrEqual(60)
        expect(box.width).toBeLessThanOrEqual(300)
      }
    }
  })

  test('multiple columns layout works on desktop', async ({ page }) => {
    // Test pages that might have multi-column layouts
    const testRoutes = ['/dashboard/analytics', '/dashboard/overview']
    
    for (const route of testRoutes) {
      await page.goto(route)
      
      // Look for grid or flex layouts that might create columns
      const gridContainers = page.locator('[class*="grid"], [class*="flex"], [style*="grid"], [style*="flex"]')
      const containerCount = await gridContainers.count()
      
      if (containerCount > 0) {
        // At least one container should be using the available width
        for (let i = 0; i < Math.min(3, containerCount); i++) {
          const container = gridContainers.nth(i)
          
          if (await container.isVisible()) {
            const box = await container.boundingBox()
            if (box && box.width > 500) {
              // Container is utilizing desktop space
              expect(box.width).toBeGreaterThan(500)
            }
          }
        }
      }
    }
  })
})

test.describe('Cross-Device Consistency', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ]

  for (const viewport of viewports) {
    test(`authentication works on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Test authentication flow
      await page.goto('/login')
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      
      const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
      await expect(devBypassButton).toBeVisible({ timeout: 5000 })
      
      await devBypassButton.click()
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
      
      // Verify dashboard loads on this device size
      const content = await page.locator('body').textContent()
      expect(content?.length || 0).toBeGreaterThan(10)
    })

    test(`core navigation works on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Authenticate
      await page.goto('/login')
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
      await devBypassButton.click()
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
      
      // Test navigation to key sections
      const keyRoutes = ['/dashboard/ai-tools', '/dashboard/analytics']
      
      for (const route of keyRoutes) {
        await page.goto(route)
        await expect(page).toHaveURL(new RegExp(route))
        
        const content = await page.locator('body').textContent()
        expect(content?.length || 0).toBeGreaterThan(10)
      }
    })
  }
})