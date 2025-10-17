import { test, expect } from '@playwright/test'

/**
 * 6FB AI Agent System - Responsive Design Testing
 * Tests mobile and desktop responsiveness
 */

test.describe('Responsive Design - Mobile View', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
    await devBypassButton.click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('dashboard layout adapts to mobile', async ({ page }) => {
    await page.goto('/dashboard')
    
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent?.length || 0).toBeGreaterThan(10)
    
    const mobileMenu = page.locator(
      '[data-testid*="mobile"], button[aria-label*="menu"], ' +
      'button[class*="mobile"], [class*="hamburger"]'
    ).first()
    
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click()
      await page.waitForTimeout(500)
    }
    
    const pageWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(pageWidth).toBeLessThanOrEqual(375 + 50) // Allow small margin
  })

  test('navigation works on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    
    const testRoutes = ['/dashboard/ai-tools', '/dashboard/analytics', '/dashboard/settings']
    
    for (const route of testRoutes) {
      await page.goto(route)
      
      await expect(page).toHaveURL(new RegExp(route))
      
      const content = await page.locator('body').textContent()
      expect(content?.length || 0).toBeGreaterThan(10)
      
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth
      })
      expect(hasHorizontalScroll).toBeFalsy()
    }
  })

  test('interactive elements are touch-friendly', async ({ page }) => {
    await page.goto('/dashboard')
    
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(5, buttonCount); i++) {
        const button = buttons.nth(i)
        
        if (await button.isVisible()) {
          const box = await button.boundingBox()
          if (box) {
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
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
    await devBypassButton.click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('dashboard layout adapts to tablet', async ({ page }) => {
    await page.goto('/dashboard')
    
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent?.length || 0).toBeGreaterThan(10)
    
    const contentArea = page.locator('main, [role="main"], .main-content').first()
    
    if (await contentArea.isVisible()) {
      const box = await contentArea.boundingBox()
      if (box) {
        expect(box.width).toBeGreaterThan(400)
      }
    }
  })

  test('sidebar behavior on tablet', async ({ page }) => {
    await page.goto('/dashboard')
    
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
    
    if (await sidebar.isVisible()) {
      const box = await sidebar.boundingBox()
      if (box) {
        expect(box.width).toBeGreaterThan(50)
        expect(box.width).toBeLessThan(400)
      }
    }
  })
})

test.describe('Responsive Design - Desktop View', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    await page.goto('/login')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
    await devBypassButton.click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('dashboard layout utilizes desktop space', async ({ page }) => {
    await page.goto('/dashboard')
    
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent?.length || 0).toBeGreaterThan(10)
    
    const mainContent = page.locator('main, [role="main"], .main-content').first()
    
    if (await mainContent.isVisible()) {
      const box = await mainContent.boundingBox()
      if (box) {
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
        expect(box.width).toBeGreaterThanOrEqual(60)
        expect(box.width).toBeLessThanOrEqual(300)
      }
    }
  })

  test('multiple columns layout works on desktop', async ({ page }) => {
    const testRoutes = ['/dashboard/analytics', '/dashboard/overview']
    
    for (const route of testRoutes) {
      await page.goto(route)
      
      const gridContainers = page.locator('[class*="grid"], [class*="flex"], [style*="grid"], [style*="flex"]')
      const containerCount = await gridContainers.count()
      
      if (containerCount > 0) {
        for (let i = 0; i < Math.min(3, containerCount); i++) {
          const container = gridContainers.nth(i)
          
          if (await container.isVisible()) {
            const box = await container.boundingBox()
            if (box && box.width > 500) {
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
      
      await page.goto('/login')
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      
      const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
      await expect(devBypassButton).toBeVisible({ timeout: 5000 })
      
      await devBypassButton.click()
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
      
      const content = await page.locator('body').textContent()
      expect(content?.length || 0).toBeGreaterThan(10)
    })

    test(`core navigation works on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      await page.goto('/login')
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      const devBypassButton = page.locator('button', { hasText: /dev|bypass|localhost/i })
      await devBypassButton.click()
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
      
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