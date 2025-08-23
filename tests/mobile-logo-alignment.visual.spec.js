import { test, expect, devices } from '@playwright/test'

/**
 * Mobile Logo Alignment Visual Testing Suite
 * 
 * Tests the mobile logo alignment fixes implemented in Navigation.js
 * Verifies logo display across different mobile viewports and devices
 */

// Define mobile devices at module level to avoid Playwright configuration issues
const mobileDevices = [
  { 
    name: 'iPhone SE', 
    viewport: { width: 375, height: 667 },
    device: devices['iPhone SE']
  },
  { 
    name: 'iPhone 12', 
    viewport: { width: 390, height: 844 },
    device: devices['iPhone 12']
  },
  { 
    name: 'Galaxy S21', 
    viewport: { width: 360, height: 800 },
    device: devices['Galaxy S21']
  },
  { 
    name: 'Small Mobile', 
    viewport: { width: 320, height: 568 },
    device: devices['iPhone SE'] // Use as base for custom viewport
  }
]

test.describe('Mobile Logo Alignment - Visual Verification @visual @mobile', () => {
  // Test each mobile device configuration
  mobileDevices.forEach(({ name, viewport, device }) => {
    test.describe(`Logo Alignment - ${name} (${viewport.width}x${viewport.height})`, () => {

      test.beforeEach(async ({ page }) => {
        // Set specific viewport for precise testing
        await page.setViewportSize(viewport)
        
        // Disable animations for consistent screenshots
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0s !important;
              animation-delay: 0s !important;
              transition-duration: 0s !important;
              transition-delay: 0s !important;
            }
          `
        })

        // Navigate to dashboard to test navigation component
        await page.goto('/dashboard')
        
        // Wait for the navigation to be fully loaded
        await page.waitForSelector('nav', { timeout: 10000 })
        await page.waitForTimeout(500) // Additional stability wait
      })

      test('mobile header logo displays without cutoff', async ({ page }) => {
        // Check if mobile header is visible (should be on screens < 1024px)
        const mobileHeader = page.locator('.lg\\:hidden').first()
        await expect(mobileHeader).toBeVisible()

        // Verify mobile header has proper height (h-14 = 56px)
        const headerHeight = await mobileHeader.evaluate(el => el.offsetHeight)
        expect(headerHeight).toBeGreaterThanOrEqual(56)

        // Take screenshot of mobile header with logo
        await expect(mobileHeader).toHaveScreenshot(`mobile-header-${name.toLowerCase().replace(/\s+/g, '-')}-${viewport.width}w.png`)

        // Verify logo container is properly constrained
        const logoContainer = mobileHeader.locator('.flex-shrink-0.max-h-10')
        await expect(logoContainer).toBeVisible()

        // Take focused screenshot of just the logo area
        await expect(logoContainer).toHaveScreenshot(`mobile-logo-container-${name.toLowerCase().replace(/\s+/g, '-')}-${viewport.width}w.png`)
      })

      test('logo sizing respects responsive constraints', async ({ page }) => {
        const mobileHeader = page.locator('.lg\\:hidden').first()
        const logoContainer = mobileHeader.locator('.flex-shrink-0.max-h-10')
        
        // Check that logo container has proper max-height constraint
        const containerMaxHeight = await logoContainer.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return styles.maxHeight
        })
        expect(containerMaxHeight).toBe('40px') // max-h-10 = 40px

        // Check logo image has responsive classes applied
        const logoImage = logoContainer.locator('img')
        await expect(logoImage).toBeVisible()
        
        const logoClasses = await logoImage.getAttribute('class')
        expect(logoClasses).toContain('max-h-8') // Should have max-h-8 constraint
        expect(logoClasses).toContain('w-auto') // Should have w-auto for aspect ratio
      })

      test('mobile header padding provides adequate spacing', async ({ page }) => {
        const mobileHeader = page.locator('.lg\\:hidden').first()
        
        // Verify header has py-2 padding (8px top/bottom)
        const paddingTop = await mobileHeader.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return parseInt(styles.paddingTop)
        })
        const paddingBottom = await mobileHeader.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return parseInt(styles.paddingBottom)
        })
        
        expect(paddingTop).toBe(8) // py-2 = 8px
        expect(paddingBottom).toBe(8) // py-2 = 8px

        // Take full mobile header screenshot to verify spacing
        await expect(mobileHeader).toHaveScreenshot(`mobile-header-padding-${name.toLowerCase().replace(/\s+/g, '-')}-${viewport.width}w.png`)
      })

      test('logo remains visible when mobile menu is toggled', async ({ page }) => {
        const mobileHeader = page.locator('.lg\\:hidden').first()
        
        // Take screenshot before menu toggle
        await expect(mobileHeader).toHaveScreenshot(`mobile-header-menu-closed-${name.toLowerCase().replace(/\s+/g, '-')}-${viewport.width}w.png`)

        // Find and click mobile menu button
        const menuButton = page.locator('button').filter({ hasText: /menu|☰|≡/ }).or(
          page.locator('[aria-label*="menu"]')
        ).or(
          page.locator('.md\\:hidden button')
        ).first()

        if (await menuButton.isVisible()) {
          await menuButton.click()
          await page.waitForTimeout(300) // Wait for menu animation

          // Verify logo is still visible in mobile menu
          const mobileMenu = page.locator('.md\\:hidden').filter({ hasText: /dashboard|calendar|customers/i }).first()
          
          if (await mobileMenu.isVisible()) {
            await expect(mobileMenu).toHaveScreenshot(`mobile-menu-open-${name.toLowerCase().replace(/\s+/g, '-')}-${viewport.width}w.png`)
          }

          // Verify header logo still visible
          await expect(mobileHeader).toHaveScreenshot(`mobile-header-menu-open-${name.toLowerCase().replace(/\s+/g, '-')}-${viewport.width}w.png`)
        }
      })

      test('logo scales appropriately for screen width', async ({ page }) => {
        const logoContainer = page.locator('.lg\\:hidden .flex-shrink-0.max-h-10').first()
        const logoImage = logoContainer.locator('img')
        
        // Get actual rendered dimensions
        const logoDimensions = await logoImage.boundingBox()
        
        if (logoDimensions) {
          // Logo should not exceed container bounds
          expect(logoDimensions.height).toBeLessThanOrEqual(40) // max-h-10 = 40px
          expect(logoDimensions.height).toBeLessThanOrEqual(32) // max-h-8 = 32px (tighter constraint)
          
          // Logo should be proportionally sized for small screens
          if (viewport.width <= 360) {
            expect(logoDimensions.width).toBeLessThanOrEqual(120) // Reasonable max for small screens
          }
          
          // Logo should maintain aspect ratio
          const aspectRatio = logoDimensions.width / logoDimensions.height
          expect(aspectRatio).toBeGreaterThan(1) // Logo should be wider than tall
          expect(aspectRatio).toBeLessThan(5) // But not excessively wide
        }

        // Take screenshot with bounding box for visual verification
        await expect(logoContainer).toHaveScreenshot(`mobile-logo-scaled-${name.toLowerCase().replace(/\s+/g, '-')}-${viewport.width}w.png`)
      })
    })
  })

  test.describe('Logo Alignment - Landscape Orientation', () => {
    test('logo remains properly aligned in landscape mode', async ({ page }) => {
      // Test landscape orientation on iPhone
      await page.setViewportSize({ width: 844, height: 390 }) // iPhone 12 landscape
      
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            transition-duration: 0s !important;
          }
        `
      })

      await page.goto('/dashboard')
      await page.waitForSelector('nav')
      await page.waitForTimeout(500)

      const mobileHeader = page.locator('.lg\\:hidden').first()
      
      // In landscape, mobile header might still be visible depending on breakpoints
      if (await mobileHeader.isVisible()) {
        await expect(mobileHeader).toHaveScreenshot('mobile-header-landscape-844w.png')
        
        const logoContainer = mobileHeader.locator('.flex-shrink-0.max-h-10')
        await expect(logoContainer).toHaveScreenshot('mobile-logo-landscape-844w.png')
      }
    })
  })

  test.describe('Logo Alignment - Responsive Breakpoints', () => {
    const breakpointTests = [
      { width: 320, name: 'very-small' },
      { width: 375, name: 'small' },
      { width: 390, name: 'medium' },
      { width: 414, name: 'large' },
      { width: 768, name: 'tablet-boundary' }
    ]

    breakpointTests.forEach(({ width, name }) => {
      test(`logo alignment at ${width}px (${name})`, async ({ page }) => {
        await page.setViewportSize({ width, height: 667 })
        
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              animation-duration: 0s !important;
              transition-duration: 0s !important;
            }
          `
        })

        await page.goto('/dashboard')
        await page.waitForSelector('nav')
        await page.waitForTimeout(500)

        // Check if we're still in mobile breakpoint
        const mobileHeader = page.locator('.lg\\:hidden').first()
        
        if (await mobileHeader.isVisible()) {
          await expect(mobileHeader).toHaveScreenshot(`breakpoint-${name}-${width}w.png`)
          
          // Verify logo doesn't overflow viewport
          const logoContainer = mobileHeader.locator('.flex-shrink-0.max-h-10')
          const logoBounds = await logoContainer.boundingBox()
          
          if (logoBounds) {
            expect(logoBounds.x + logoBounds.width).toBeLessThanOrEqual(width)
            expect(logoBounds.y + logoBounds.height).toBeLessThanOrEqual(56) // h-14 header
          }
        }
      })
    })
  })

  test.describe('Logo Alignment - Comparison with Desktop', () => {
    test('verify mobile vs desktop logo consistency', async ({ page }) => {
      // First test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/dashboard')
      await page.waitForSelector('nav')
      
      const mobileHeader = page.locator('.lg\\:hidden').first()
      await expect(mobileHeader).toHaveScreenshot('comparison-mobile-375w.png')

      // Then test desktop view
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.waitForTimeout(500) // Allow responsive transition
      
      const desktopNav = page.locator('nav').first()
      await expect(desktopNav).toHaveScreenshot('comparison-desktop-1280w.png')

      // Verify both views loaded properly
      const bodyContent = await page.locator('body').textContent()
      expect(bodyContent).toContain('Dashboard')
    })
  })
})

test.describe('Mobile Logo Regression Testing', () => {
  test('verify no regressions in existing mobile functionality', async ({ page }) => {
    // Use standard mobile device
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/dashboard')
    await page.waitForSelector('nav')

    // Verify page loads correctly
    const bodyContent = await page.locator('body').textContent()
    expect(bodyContent).toContain('Dashboard')

    // Verify navigation is functional
    const mobileHeader = page.locator('.lg\\:hidden').first()
    await expect(mobileHeader).toBeVisible()

    // Test that we can navigate (basic functionality check)
    const navLinks = page.locator('a[href*="/dashboard"]')
    expect(await navLinks.count()).toBeGreaterThan(0)

    // Take final regression screenshot
    await expect(page).toHaveScreenshot('mobile-navigation-regression-check.png', { fullPage: true })
  })
})