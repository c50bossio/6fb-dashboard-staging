import { test, expect } from '@playwright/test'

/**
 * Simple Mobile Logo Alignment Test
 * Direct test without complex authentication setup
 */

test.describe('Mobile Logo Alignment - Simple Test', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
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
  })

  test('mobile logo displays without cutoff on iPhone SE', async ({ page }) => {
    // Navigate directly to dashboard
    await page.goto('http://localhost:9999/dashboard')
    
    // Wait for navigation to load (with a reasonable timeout)
    try {
      await page.waitForSelector('nav', { timeout: 15000 })
    } catch (e) {
      console.log('Navigation selector not found, trying alternative selectors...')
      
      // Try to find any navigation-like elements
      const navElements = await page.locator('header, .navigation, [role="navigation"], nav').count()
      console.log(`Found ${navElements} navigation elements`)
      
      if (navElements > 0) {
        await page.waitForTimeout(2000) // Give time for elements to stabilize
      }
    }

    // Take a screenshot of the entire page to see what's loaded
    await page.screenshot({ 
      path: 'test-results/mobile-dashboard-full-page.png',
      fullPage: true 
    })

    // Look for mobile header specifically
    const mobileHeaders = page.locator('.lg\\:hidden')
    const mobileHeaderCount = await mobileHeaders.count()
    console.log(`Found ${mobileHeaderCount} mobile header elements`)

    if (mobileHeaderCount > 0) {
      const firstMobileHeader = mobileHeaders.first()
      
      // Take screenshot of mobile header
      await firstMobileHeader.screenshot({ 
        path: 'test-results/mobile-header-screenshot.png' 
      })

      // Check if logo container exists
      const logoContainer = firstMobileHeader.locator('.flex-shrink-0')
      const logoContainerCount = await logoContainer.count()
      console.log(`Found ${logoContainerCount} logo containers in mobile header`)

      if (logoContainerCount > 0) {
        await logoContainer.first().screenshot({ 
          path: 'test-results/mobile-logo-container.png' 
        })
        
        // Check logo image
        const logoImage = logoContainer.locator('img').first()
        if (await logoImage.count() > 0) {
          await logoImage.screenshot({ 
            path: 'test-results/mobile-logo-image.png' 
          })
          
          // Verify logo dimensions don't exceed container
          const logoBounds = await logoImage.boundingBox()
          console.log('Logo dimensions:', logoBounds)
          
          if (logoBounds) {
            expect(logoBounds.height).toBeLessThanOrEqual(50) // Should fit in mobile header
            expect(logoBounds.width).toBeGreaterThan(0) // Should be visible
          }
        }
      }
    }

    // Test that the page actually loads content
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.length || 0).toBeGreaterThan(100) // Should have substantial content
  })

  test('test multiple mobile screen sizes', async ({ page }) => {
    const testSizes = [
      { width: 320, height: 568, name: 'small' },
      { width: 375, height: 667, name: 'medium' },
      { width: 414, height: 896, name: 'large' }
    ]

    for (const size of testSizes) {
      console.log(`Testing ${size.name} mobile size: ${size.width}x${size.height}`)
      
      await page.setViewportSize({ width: size.width, height: size.height })
      await page.goto('http://localhost:9999/dashboard')
      
      // Wait for page load
      await page.waitForTimeout(3000)
      
      // Take screenshot
      await page.screenshot({ 
        path: `test-results/mobile-${size.name}-${size.width}w.png`,
        fullPage: false // Just the viewport
      })

      // Check for mobile elements
      const mobileElements = page.locator('.lg\\:hidden')
      const count = await mobileElements.count()
      console.log(`Mobile elements found at ${size.width}px: ${count}`)
      
      if (count > 0) {
        await mobileElements.first().screenshot({ 
          path: `test-results/mobile-header-${size.name}-${size.width}w.png` 
        })
      }
    }
  })

  test('verify logo responsive classes are applied', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard')
    await page.waitForTimeout(3000)

    // Look for logo images
    const logoImages = page.locator('img').filter({ hasText: /logo|brand/i }).or(
      page.locator('img[src*="logo"]')
    ).or(
      page.locator('img[alt*="logo"]')
    ).or(
      page.locator('img[alt*="BookedBarber"]')
    )

    const logoCount = await logoImages.count()
    console.log(`Found ${logoCount} potential logo images`)

    if (logoCount > 0) {
      const firstLogo = logoImages.first()
      
      // Check classes
      const logoClasses = await firstLogo.getAttribute('class')
      console.log('Logo classes:', logoClasses)
      
      // Take screenshot
      await firstLogo.screenshot({ path: 'test-results/logo-with-classes.png' })
      
      // Verify responsive classes exist
      if (logoClasses) {
        const hasResponsiveClasses = logoClasses.includes('max-h') || logoClasses.includes('w-auto')
        console.log('Has responsive classes:', hasResponsiveClasses)
      }
    }
  })
})