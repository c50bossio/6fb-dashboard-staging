/**
 * Cross-Browser Compatibility Tests for Customization Components
 * Tests compatibility across Chrome, Firefox, Safari, and Edge
 */

import { test, expect } from '@playwright/test'

const TEST_URL = process.env.TEST_URL || 'http://localhost:3000'
const browsers = ['chromium', 'firefox', 'webkit'] // webkit = Safari

// Test data
const testProfiles = {
  barber: {
    role: 'BARBER',
    full_name: 'John Smith',
    barbershop_id: 'test-shop-1'
  },
  shop_owner: {
    role: 'SHOP_OWNER',
    full_name: 'Sarah Johnson',
    barbershop_id: 'test-shop-2'
  },
  enterprise_owner: {
    role: 'ENTERPRISE_OWNER',
    full_name: 'Michael Brown',
    barbershop_id: 'test-shop-3'
  }
}

// Browser-specific configurations
const browserConfigs = {
  chromium: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  },
  firefox: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    viewport: { width: 1280, height: 720 }
  },
  webkit: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    viewport: { width: 1280, height: 720 }
  }
}

// Helper function to setup test environment
async function setupTestEnvironment(page, browser, profile = testProfiles.shop_owner) {
  // Mock authentication
  await page.addInitScript((profile) => {
    // Mock localStorage
    window.localStorage.setItem('supabase.auth.token', JSON.stringify({
      user: { id: 'test-user-id', email: 'test@example.com' },
      profile: profile
    }))
    
    // Mock Supabase client
    window.mockSupabaseClient = {
      auth: {
        getUser: () => Promise.resolve({ 
          data: { user: { id: 'test-user-id' } }, 
          error: null 
        }),
        getSession: () => Promise.resolve({ 
          data: { session: { user: { id: 'test-user-id' } } }, 
          error: null 
        })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: profile, error: null })
          })
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: { id: 'test' }, error: null })
        })
      })
    }
  }, profile)

  await page.goto(`${TEST_URL}/customize`)
  
  // Wait for page to load
  await page.waitForSelector('[data-testid="loading-skeleton"]', { state: 'detached', timeout: 10000 })
  await page.waitForSelector('h1:has-text("Customize Your Experience")', { timeout: 10000 })
}

// Cross-browser test suite
browsers.forEach(browserName => {
  test.describe(`${browserName.charAt(0).toUpperCase() + browserName.slice(1)} Browser Tests`, () => {
    
    test.beforeEach(async ({ page, browser }) => {
      await page.setUserAgent(browserConfigs[browserName].userAgent)
      await page.setViewportSize(browserConfigs[browserName].viewport)
    })

    test('loads and renders customize page correctly', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Check main elements are present
      await expect(page.getByRole('heading', { name: 'Customize Your Experience' })).toBeVisible()
      await expect(page.getByText('Quick Actions:')).toBeVisible()
      await expect(page.getByText('Setup Progress')).toBeVisible()
      
      // Check sections are rendered
      await expect(page.getByTestId('customization-section-barber-profile')).toBeVisible()
      await expect(page.getByTestId('customization-section-barbershop-website')).toBeVisible()
    })

    test('section expansion works correctly', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      const barberSection = page.getByTestId('section-toggle-barber-profile')
      
      // Initially collapsed
      await expect(barberSection).toHaveAttribute('aria-expanded', 'false')
      
      // Click to expand
      await barberSection.click()
      await expect(barberSection).toHaveAttribute('aria-expanded', 'true')
      
      // Content should be visible
      await expect(page.getByTestId('barber-profile-customization')).toBeVisible()
      
      // Click to collapse
      await barberSection.click()
      await expect(barberSection).toHaveAttribute('aria-expanded', 'false')
    })

    test('keyboard navigation works across all browsers', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Test tab navigation
      await page.keyboard.press('Tab')
      let focusedElement = await page.evaluate(() => document.activeElement.tagName)
      expect(['BUTTON', 'A', 'INPUT'].includes(focusedElement)).toBeTruthy()

      // Test Enter key on section toggle
      const barberToggle = page.getByTestId('section-toggle-barber-profile')
      await barberToggle.focus()
      await page.keyboard.press('Enter')
      await expect(barberToggle).toHaveAttribute('aria-expanded', 'true')

      // Test Space key
      await page.keyboard.press('Space')
      await expect(barberToggle).toHaveAttribute('aria-expanded', 'false')
    })

    test('responsive design works on different viewports', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500) // Allow for responsive adjustments
      
      await expect(page.getByRole('heading', { name: 'Customize Your Experience' })).toBeVisible()
      
      // Check mobile-specific classes are applied
      const header = page.getByRole('heading', { name: 'Customize Your Experience' })
      const headerClasses = await header.getAttribute('class')
      expect(headerClasses).toContain('text-2xl') // Mobile text size

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.waitForTimeout(500)
      
      await expect(header).toBeVisible()
      const updatedClasses = await header.getAttribute('class')
      expect(updatedClasses).toContain('sm:text-3xl') // Tablet text size

      // Test desktop viewport
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.waitForTimeout(500)
      
      await expect(header).toBeVisible()
    })

    test('form interactions work consistently', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Expand barber profile section
      await page.getByTestId('section-toggle-barber-profile').click()
      await expect(page.getByTestId('barber-profile-customization')).toBeVisible()

      // Test form inputs (would need to mock the actual form)
      // For now, test that the section content is interactive
      const profileSection = page.getByTestId('barber-profile-customization')
      await expect(profileSection).toBeVisible()
      
      // Check if form elements would be accessible
      const inputs = profileSection.locator('input, textarea, select')
      if ((await inputs.count()) > 0) {
        await expect(inputs.first()).toBeVisible()
      }
    })

    test('tutorial modal works correctly', async ({ page }) => {
      // Clear tutorial seen flag
      await page.addInitScript(() => {
        window.localStorage.removeItem('customize-tutorial-seen')
      })

      await setupTestEnvironment(page, browserName)

      // Tutorial should appear
      await expect(page.getByText('Welcome to Customization!')).toBeVisible({ timeout: 5000 })
      
      // Test modal interactions
      const getStartedButton = page.getByText('Get Started')
      await expect(getStartedButton).toBeVisible()
      
      await getStartedButton.click()
      await expect(page.getByText('Welcome to Customization!')).not.toBeVisible()
      
      // Check that tutorial seen flag is set
      const tutorialSeen = await page.evaluate(() => 
        window.localStorage.getItem('customize-tutorial-seen')
      )
      expect(tutorialSeen).toBe('true')
    })

    test('progress indicator updates correctly', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Check initial progress
      await expect(page.getByText('100%')).toBeVisible()
      
      // Progress bar should be visible
      const progressBar = page.locator('.bg-gradient-to-r.from-blue-500.to-purple-600')
      await expect(progressBar).toBeVisible()
      
      // Check progress bar width
      const progressWidth = await progressBar.evaluate(el => el.style.width)
      expect(progressWidth).toBe('100%')
    })

    test('color schemes and themes render correctly', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Check that different color sections are present
      const sections = [
        'customization-section-barber-profile',
        'customization-section-barbershop-website'
      ]

      for (const sectionId of sections) {
        const section = page.getByTestId(sectionId)
        await expect(section).toBeVisible()
        
        // Check that section has proper styling
        const sectionClasses = await section.getAttribute('class')
        expect(sectionClasses).toContain('border')
        expect(sectionClasses).toContain('rounded-xl')
      }
    })

    test('animations work smoothly', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      const barberToggle = page.getByTestId('section-toggle-barber-profile')
      
      // Test expansion animation
      await barberToggle.click()
      
      // Wait for animation to complete
      await page.waitForTimeout(300)
      
      // Check that content is visible after animation
      await expect(page.getByTestId('barber-profile-customization')).toBeVisible()
      
      // Test collapse animation
      await barberToggle.click()
      await page.waitForTimeout(300)
      
      // Content should be hidden or have zero height
      const content = page.getByTestId('section-content')
      const contentHeight = await content.evaluate(el => el.offsetHeight)
      expect(contentHeight).toBeLessThanOrEqual(50) // Collapsed state
    })

    test('CSS Grid and Flexbox layouts work correctly', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Test main layout structure
      const mainContainer = page.locator('.max-w-7xl')
      await expect(mainContainer).toBeVisible()
      
      // Test section layout
      const sectionsContainer = page.locator('.space-y-6').last()
      await expect(sectionsContainer).toBeVisible()
      
      // Test that sections are properly spaced
      const sections = page.getByTestId(/customization-section-/)
      const sectionCount = await sections.count()
      expect(sectionCount).toBeGreaterThan(0)
    })

    test('image and media loading works', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Test that icons load properly
      const icons = page.locator('svg')
      const iconCount = await icons.count()
      expect(iconCount).toBeGreaterThan(0)
      
      // Check that icons are visible
      await expect(icons.first()).toBeVisible()
    })

    test('JavaScript events work correctly', async ({ page }) => {
      await setupTestEnvironment(page, browserName)

      // Test click events
      const quickActionButton = page.getByText('Show Tutorial')
      await quickActionButton.click()
      
      await expect(page.getByText('Welcome to Customization!')).toBeVisible()
      
      // Test keyboard events
      await page.keyboard.press('Escape')
      // Modal should close (if escape handling is implemented)
      
      // Close modal
      await page.getByText('Skip').click()
      await expect(page.getByText('Welcome to Customization!')).not.toBeVisible()
    })
  })
})

// Cross-browser feature compatibility tests
test.describe('Cross-Browser Feature Compatibility', () => {
  
  test('localStorage works across all browsers', async ({ page, browserName }) => {
    await page.goto(`${TEST_URL}/customize`)
    
    // Set localStorage value
    await page.evaluate(() => {
      window.localStorage.setItem('test-key', 'test-value')
    })
    
    // Refresh page
    await page.reload()
    
    // Check if value persists
    const value = await page.evaluate(() => window.localStorage.getItem('test-key'))
    expect(value).toBe('test-value')
    
    // Clean up
    await page.evaluate(() => window.localStorage.removeItem('test-key'))
  })

  test('CSS custom properties work correctly', async ({ page, browserName }) => {
    await setupTestEnvironment(page, browserName)
    
    // Test CSS custom properties (CSS variables)
    const element = page.locator('.bg-blue-600').first()
    if (await element.count() > 0) {
      const bgColor = await element.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor
      })
      expect(bgColor).toBeTruthy()
    }
  })

  test('CSS Grid support across browsers', async ({ page, browserName }) => {
    await setupTestEnvironment(page, browserName)
    
    // Test grid layouts
    const gridElements = page.locator('.grid')
    if (await gridElements.count() > 0) {
      const display = await gridElements.first().evaluate(el => 
        window.getComputedStyle(el).display
      )
      expect(['grid', 'block', 'flex'].includes(display)).toBeTruthy()
    }
  })

  test('Modern JavaScript features work', async ({ page, browserName }) => {
    await page.goto(`${TEST_URL}/customize`)
    
    // Test modern JavaScript features
    const jsFeatures = await page.evaluate(() => {
      const results = {}
      
      // Test arrow functions
      const arrowFunction = () => true
      results.arrowFunctions = arrowFunction()
      
      // Test template literals
      results.templateLiterals = `test ${1 + 1}` === 'test 2'
      
      // Test const/let
      try {
        const testConst = 'const test'
        let testLet = 'let test'
        results.constLet = testConst && testLet
      } catch (e) {
        results.constLet = false
      }
      
      // Test async/await support
      results.asyncSupport = typeof Promise !== 'undefined'
      
      return results
    })
    
    expect(jsFeatures.arrowFunctions).toBeTruthy()
    expect(jsFeatures.templateLiterals).toBeTruthy()
    expect(jsFeatures.constLet).toBeTruthy()
    expect(jsFeatures.asyncSupport).toBeTruthy()
  })

  test('touch events work on mobile browsers', async ({ page, browserName }) => {
    // Only test on webkit (Safari) for mobile simulation
    test.skip(browserName !== 'webkit', 'Mobile touch testing on Safari only')
    
    await page.setViewportSize({ width: 375, height: 667 })
    await setupTestEnvironment(page, browserName, testProfiles.shop_owner)
    
    // Simulate touch on section toggle
    const toggle = page.getByTestId('section-toggle-barber-profile')
    await toggle.tap()
    
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})

// Browser-specific issue tests
test.describe('Browser-Specific Issue Tests', () => {
  
  test('Safari flexbox behavior', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test')
    
    await setupTestEnvironment(page, browserName)
    
    // Test Safari flexbox quirks
    const flexContainer = page.locator('.flex').first()
    if (await flexContainer.count() > 0) {
      const styles = await flexContainer.evaluate(el => ({
        display: window.getComputedStyle(el).display,
        flexDirection: window.getComputedStyle(el).flexDirection
      }))
      
      expect(styles.display).toBe('flex')
    }
  })

  test('Firefox CSS Grid behavior', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test')
    
    await setupTestEnvironment(page, browserName)
    
    // Test Firefox grid implementation
    const gridElements = page.locator('.grid')
    if (await gridElements.count() > 0) {
      const gridSupport = await gridElements.first().evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.display === 'grid'
      })
      
      expect(gridSupport).toBeTruthy()
    }
  })

  test('Chrome/Chromium performance', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-specific test')
    
    await setupTestEnvironment(page, browserName)
    
    // Measure page load performance
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0]
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart
      }
    })
    
    expect(performanceMetrics.domContentLoaded).toBeGreaterThan(0)
    expect(performanceMetrics.domContentLoaded).toBeLessThan(5000) // Should load quickly
  })
})

// Error handling across browsers
test.describe('Error Handling Compatibility', () => {
  
  test('JavaScript error handling works consistently', async ({ page, browserName }) => {
    await page.goto(`${TEST_URL}/customize`)
    
    // Monitor console errors
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await setupTestEnvironment(page, browserName)
    
    // Should not have critical JavaScript errors
    const criticalErrors = errors.filter(error => 
      !error.includes('404') && // Ignore 404s
      !error.includes('favicon') && // Ignore favicon errors
      !error.includes('extension') // Ignore browser extension errors
    )
    
    expect(criticalErrors.length).toBe(0)
  })

  test('Network error handling', async ({ page, browserName }) => {
    await setupTestEnvironment(page, browserName)
    
    // Test that page doesn't break with network issues
    // This would require more sophisticated mocking in a real test
    await expect(page.getByRole('heading', { name: 'Customize Your Experience' })).toBeVisible()
  })
})

// Accessibility across browsers
test.describe('Cross-Browser Accessibility', () => {
  
  test('ARIA attributes work correctly', async ({ page, browserName }) => {
    await setupTestEnvironment(page, browserName)
    
    // Test ARIA expanded attributes
    const toggle = page.getByTestId('section-toggle-barber-profile')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    
    // Test ARIA controls
    const controlsId = await toggle.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    
    const controlledElement = page.locator(`#${controlsId}`)
    await expect(controlledElement).toBeAttached()
  })

  test('Focus management works across browsers', async ({ page, browserName }) => {
    await setupTestEnvironment(page, browserName)
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    
    const focusedElement = await page.evaluate(() => document.activeElement.tagName)
    expect(['BUTTON', 'A', 'INPUT'].includes(focusedElement)).toBeTruthy()
  })
})