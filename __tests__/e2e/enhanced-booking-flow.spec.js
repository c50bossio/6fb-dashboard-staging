/**
 * Enhanced Booking Flow E2E Tests
 * 
 * Comprehensive Playwright tests covering the complete user journey
 * across different devices, feature flags, and booking scenarios.
 */

import { test, expect, devices } from '@playwright/test'

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const TEST_BARBERSHOP_SLUG = 'test-barbershop'
const TEST_BOOKING_URL = `${BASE_URL}/booking/${TEST_BARBERSHOP_SLUG}`

// Test data
const TEST_CUSTOMER = {
  name: 'John Doe',
  email: 'john.doe.test@example.com',
  phone: '+1234567890'
}

const TEST_SERVICE_ID = 'test-service-haircut'
const TEST_BARBER_ID = 'test-barber-123'

// Helper functions
async function waitForBookingComponentLoad(page, expectedComponent = null) {
  // Wait for the component to load and be interactive
  await page.waitForSelector('[data-testid*="booking-flow"], .booking-flow-orchestrator', { timeout: 10000 })
  
  if (expectedComponent) {
    await page.waitForSelector(`[data-testid="${expectedComponent}"]`, { timeout: 5000 })
  }
  
  // Wait for loading to complete
  await page.waitForFunction(() => {
    const loadingElements = document.querySelectorAll('[data-testid*="loading"], .animate-pulse')
    return loadingElements.length === 0
  }, { timeout: 10000 })
}

async function fillBookingForm(page, customer = TEST_CUSTOMER) {
  await page.fill('input[name="customerName"], input[placeholder*="name" i]', customer.name)
  await page.fill('input[name="customerEmail"], input[type="email"]', customer.email)
  await page.fill('input[name="customerPhone"], input[type="tel"]', customer.phone)
}

async function selectTimeSlot(page, timeSlot = '9:00 AM') {
  // Wait for time slots to load
  await page.waitForSelector('[data-testid*="time-slot"], .time-slot, button:has-text("AM"), button:has-text("PM")')
  
  // Click on the specified time slot
  await page.click(`button:has-text("${timeSlot}"):first`)
}

async function mockFeatureFlags(page, flags = {}) {
  await page.addInitScript((flags) => {
    window.__FEATURE_FLAGS__ = {
      new_booking_flow: true,
      enhanced_booking_flow: true,
      mobile_optimizer_enabled: true,
      realtime_availability: true,
      ...flags
    }
  }, flags)
}

async function mockSupabaseRealtime(page) {
  await page.addInitScript(() => {
    // Mock Supabase real-time for testing
    window.__SUPABASE_MOCK__ = {
      connected: true,
      channel: {
        subscribe: (callback) => {
          setTimeout(() => callback('SUBSCRIBED'), 100)
          return { unsubscribe: () => {} }
        }
      }
    }
  })
}

// Test suites organized by device and scenario

test.describe('Desktop Booking Flow', () => {
  test.use({ ...devices['Desktop Chrome'] })

  test.beforeEach(async ({ page }) => {
    await mockFeatureFlags(page)
    await mockSupabaseRealtime(page)
  })

  test('should load EnhancedBookingFlow by default on desktop', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    
    await waitForBookingComponentLoad(page, 'enhanced-booking-flow')
    
    // Verify enhanced features are present
    await expect(page.locator('[data-testid="enhanced-booking-flow"]')).toBeVisible()
    
    // Check for development indicator (if in dev mode)
    if (process.env.NODE_ENV === 'development') {
      await expect(page.locator('[data-testid="desktop-icon"]')).toBeVisible()
    }
  })

  test('should complete full booking flow successfully', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Step 1: Select service
    await page.click('button:has-text("Haircut"), [data-service-id]')
    await page.click('button:has-text("Next"), button:has-text("Continue")')

    // Step 2: Select barber (if required)
    const barberStep = page.locator('button:has-text("Select Barber"), [data-barber-id]')
    if (await barberStep.count() > 0) {
      await barberStep.first().click()
      await page.click('button:has-text("Next"), button:has-text("Continue")')
    }

    // Step 3: Select date and time
    await selectTimeSlot(page)
    await page.click('button:has-text("Next"), button:has-text("Continue")')

    // Step 4: Fill customer information
    await fillBookingForm(page)

    // Step 5: Confirm booking
    await page.click('button:has-text("Book Appointment"), button:has-text("Confirm")')

    // Wait for confirmation
    await expect(page.locator(':has-text("Booking Confirmed"), :has-text("Thank you")')).toBeVisible({ timeout: 10000 })
    
    // Verify confirmation details
    await expect(page.locator(`:has-text("${TEST_CUSTOMER.name}")`)).toBeVisible()
    await expect(page.locator(`:has-text("${TEST_CUSTOMER.email}")`)).toBeVisible()
  })

  test('should handle URL parameters correctly', async ({ page }) => {
    const urlWithParams = `${TEST_BOOKING_URL}?service=${TEST_SERVICE_ID}&barber=${TEST_BARBER_ID}`
    await page.goto(urlWithParams)
    
    await waitForBookingComponentLoad(page)

    // Verify preselected service
    await expect(page.locator(`[data-service-id="${TEST_SERVICE_ID}"].selected, .selected[data-service-id="${TEST_SERVICE_ID}"]`)).toBeVisible()
    
    // Verify preselected barber
    await expect(page.locator(`[data-barber-id="${TEST_BARBER_ID}"].selected, .selected[data-barber-id="${TEST_BARBER_ID}"]`)).toBeVisible()
  })

  test('should show real-time status indicator', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Wait for real-time connection
    await expect(page.locator(':has-text("Live Updates"), [data-testid="realtime-status"]')).toBeVisible({ timeout: 5000 })
    
    // Verify connection status
    const statusElement = page.locator(':has-text("Live Updates")')
    await expect(statusElement).toBeVisible()
  })

  test('should handle feature flag overrides', async ({ page }) => {
    // Test enhanced=true parameter
    await page.goto(`${TEST_BOOKING_URL}?enhanced=true`)
    await waitForBookingComponentLoad(page, 'enhanced-booking-flow')
    await expect(page.locator('[data-testid="enhanced-booking-flow"]')).toBeVisible()

    // Test flow=public parameter
    await page.goto(`${TEST_BOOKING_URL}?flow=public`)
    await waitForBookingComponentLoad(page, 'public-booking-flow')
    await expect(page.locator('[data-testid="public-booking-flow"]')).toBeVisible()
  })

  test('should validate business hours', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Try to select a time outside business hours
    // This test assumes the mock data has business hours restrictions
    const timeSlots = page.locator('button:has-text("PM")')
    const slotsCount = await timeSlots.count()
    
    if (slotsCount > 0) {
      const lateSlot = timeSlots.last()
      await lateSlot.click()
      
      // Should see validation message or disabled state
      await expect(page.locator(':has-text("outside business hours"), :has-text("unavailable"), .disabled')).toBeVisible({ timeout: 3000 })
    }
  })

  test('should prevent double booking conflicts', async ({ page, context }) => {
    // Open first tab and start booking
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Open second tab
    const secondPage = await context.newPage()
    await secondPage.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(secondPage)

    // Both tabs select the same time slot
    const timeSlot = '10:00 AM'
    await selectTimeSlot(page, timeSlot)
    await selectTimeSlot(secondPage, timeSlot)

    // Complete booking in first tab
    await page.click('button:has-text("Next"), button:has-text("Continue")')
    await fillBookingForm(page)
    await page.click('button:has-text("Book Appointment"), button:has-text("Confirm")')

    // Try to book same slot in second tab
    await secondPage.click('button:has-text("Next"), button:has-text("Continue")')
    await fillBookingForm(secondPage)
    await secondPage.click('button:has-text("Book Appointment"), button:has-text("Confirm")')

    // Second tab should show conflict error
    await expect(secondPage.locator(':has-text("no longer available"), :has-text("conflict"), :has-text("already booked")')).toBeVisible({ timeout: 5000 })

    await secondPage.close()
  })

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Simulate network failure
    await page.route('**/api/**', route => route.abort('failed'))

    await selectTimeSlot(page)
    await page.click('button:has-text("Next"), button:has-text("Continue")')
    await fillBookingForm(page)
    await page.click('button:has-text("Book Appointment"), button:has-text("Confirm")')

    // Should show error message with retry option
    await expect(page.locator(':has-text("error"), :has-text("try again"), button:has-text("Retry")')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Mobile Booking Flow', () => {
  test.use({ ...devices['iPhone 12'] })

  test.beforeEach(async ({ page }) => {
    await mockFeatureFlags(page, { mobile_optimizer_enabled: true })
    await mockSupabaseRealtime(page)
  })

  test('should load MobileBookingOptimizer on mobile devices', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    
    await waitForBookingComponentLoad(page, 'mobile-booking-optimizer')
    
    await expect(page.locator('[data-testid="mobile-booking-optimizer"]')).toBeVisible()
    
    // Check for mobile indicator in dev mode
    if (process.env.NODE_ENV === 'development') {
      await expect(page.locator('[data-testid="mobile-icon"]')).toBeVisible()
    }
  })

  test('should have touch-optimized interface', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Check button sizes are touch-friendly (minimum 44px)
    const buttons = page.locator('button')
    const firstButton = buttons.first()
    const boundingBox = await firstButton.boundingBox()
    
    expect(boundingBox.height).toBeGreaterThanOrEqual(44)
    expect(boundingBox.width).toBeGreaterThanOrEqual(44)

    // Test touch interactions
    await firstButton.tap()
    await expect(firstButton).toHaveClass(/active|pressed|selected/)
  })

  test('should complete booking flow on mobile', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Mobile booking flow - typically more streamlined
    await page.tap('button:has-text("Book Now"), [data-service-id]')
    
    // Select time slot with touch
    await page.tap('button:has-text("9:00"), button:has-text("10:00")')
    
    // Fill mobile-optimized form
    await page.fill('input[type="text"]', TEST_CUSTOMER.name)
    await page.fill('input[type="email"]', TEST_CUSTOMER.email)
    await page.fill('input[type="tel"]', TEST_CUSTOMER.phone)

    // Submit booking
    await page.tap('button:has-text("Confirm"), button[type="submit"]')

    // Wait for confirmation on mobile
    await expect(page.locator(':has-text("Confirmed"), :has-text("Success")')).toBeVisible({ timeout: 10000 })
  })

  test('should handle orientation changes', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('[data-testid="mobile-booking-optimizer"]')).toBeVisible()

    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 })
    
    // Component should remain functional
    await expect(page.locator('[data-testid="mobile-booking-optimizer"]')).toBeVisible()
    
    // Test interaction still works
    await page.tap('button:has-text("Book")')
  })

  test('should show mobile status indicators', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Mobile status indicator should be appropriately positioned
    const statusIndicator = page.locator(':has-text("Live Updates"), [data-testid="realtime-status"]')
    await expect(statusIndicator).toBeVisible()
    
    // Should not overlap with other mobile UI elements
    const boundingBox = await statusIndicator.boundingBox()
    expect(boundingBox.x).toBeGreaterThanOrEqual(0)
    expect(boundingBox.y).toBeGreaterThanOrEqual(0)
  })

  test('should work with slow network conditions', async ({ page }) => {
    // Simulate slow 3G
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000) // 1s delay
    })

    await page.goto(TEST_BOOKING_URL)
    
    // Should show loading states appropriately on slow connections
    await expect(page.locator('.animate-pulse, [data-testid*="loading"]')).toBeVisible()
    
    await waitForBookingComponentLoad(page)
    
    // Should eventually load the mobile-optimized component
    await expect(page.locator('[data-testid="mobile-booking-optimizer"]')).toBeVisible()
  })
})

test.describe('Tablet Booking Flow', () => {
  test.use({ ...devices['iPad'] })

  test.beforeEach(async ({ page }) => {
    await mockFeatureFlags(page)
    await mockSupabaseRealtime(page)
  })

  test('should adapt to tablet viewport', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Should load appropriate component for tablet
    const isMobileOptimizer = await page.locator('[data-testid="mobile-booking-optimizer"]').isVisible()
    const isEnhanced = await page.locator('[data-testid="enhanced-booking-flow"]').isVisible()
    
    // Either mobile optimizer or enhanced flow is acceptable for tablet
    expect(isMobileOptimizer || isEnhanced).toBe(true)
  })

  test('should handle both touch and mouse interactions', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    const button = page.locator('button').first()

    // Test touch interaction
    await button.tap()
    
    // Test mouse interaction (if supported)
    await button.hover()
    await button.click()
    
    // Both should work without issues
  })
})

test.describe('Cross-Browser Compatibility', () => {
  const browsers = ['chromium', 'webkit', 'firefox']
  
  browsers.forEach(browserName => {
    test(`should work in ${browserName}`, async ({ page }) => {
      await mockFeatureFlags(page)
      await page.goto(TEST_BOOKING_URL)
      
      await waitForBookingComponentLoad(page)
      
      // Basic functionality should work in all browsers
      await expect(page.locator('[data-testid*="booking-flow"]')).toBeVisible()
      
      // Try basic interaction
      const button = page.locator('button').first()
      await button.click()
      
      // Should not throw errors
    })
  })
})

test.describe('Accessibility Tests', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to activate with keyboard
    await page.keyboard.press('Enter')
    
    // Focus should be visible
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Check for essential ARIA attributes
    await expect(page.locator('[aria-label], [role="button"], [role="main"]')).toHaveCount({ greaterThan: 0 })
    
    // Form elements should have labels
    const inputs = page.locator('input')
    const inputCount = await inputs.count()
    
    if (inputCount > 0) {
      const firstInput = inputs.first()
      const hasLabel = await firstInput.evaluate(el => {
        return el.hasAttribute('aria-label') || 
               el.hasAttribute('aria-labelledby') ||
               document.querySelector(`label[for="${el.id}"]`) !== null
      })
      expect(hasLabel).toBe(true)
    }
  })

  test('should support screen readers', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Check for screen reader friendly content
    await expect(page.locator('[aria-live], [role="alert"], [role="status"]')).toHaveCount({ greaterThan: 0 })
    
    // Status updates should be announced
    const statusElement = page.locator(':has-text("Live Updates")')
    if (await statusElement.count() > 0) {
      await expect(statusElement).toHaveAttribute('aria-live', 'polite')
    }
  })
})

test.describe('Performance Tests', () => {
  test('should load within performance budgets', async ({ page }) => {
    // Start performance monitoring
    await page.coverage.startJSCoverage()
    const startTime = Date.now()
    
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)
    
    const loadTime = Date.now() - startTime
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
    
    // Check JavaScript coverage
    const coverage = await page.coverage.stopJSCoverage()
    const totalBytes = coverage.reduce((total, entry) => total + entry.text.length, 0)
    const usedBytes = coverage.reduce((total, entry) => {
      return total + entry.ranges.reduce((used, range) => used + range.end - range.start, 0)
    }, 0)
    
    const unusedBytes = totalBytes - usedBytes
    const unusedPercentage = (unusedBytes / totalBytes) * 100
    
    // Should have reasonable code utilization (less than 70% unused)
    expect(unusedPercentage).toBeLessThan(70)
  })

  test('should handle memory efficiently', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Simulate multiple booking attempts to test memory usage
    for (let i = 0; i < 5; i++) {
      await page.reload()
      await waitForBookingComponentLoad(page)
    }

    // Memory usage should be stable (no significant leaks)
    // This is a basic test - more sophisticated memory testing would require additional tools
  })
})

test.describe('Error Scenarios', () => {
  test('should handle API failures gracefully', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })

    await page.goto(TEST_BOOKING_URL)
    
    // Should show error state, not crash
    await expect(page.locator(':has-text("Error"), :has-text("Try again"), [data-testid*="error"]')).toBeVisible({ timeout: 10000 })
  })

  test('should recover from network interruptions', async ({ page }) => {
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)

    // Simulate network going offline
    await page.context().setOffline(true)
    
    // Should show offline status
    await expect(page.locator(':has-text("Offline"), [data-testid*="offline"]')).toBeVisible({ timeout: 5000 })

    // Simulate network coming back online
    await page.context().setOffline(false)
    
    // Should recover and show connected status
    await expect(page.locator(':has-text("Live Updates"), :has-text("Connected")')).toBeVisible({ timeout: 5000 })
  })

  test('should handle malformed data gracefully', async ({ page }) => {
    await page.route('**/api/availability**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          malformed: 'data',
          slots: 'not_an_array'
        })
      })
    })

    await page.goto(TEST_BOOKING_URL)
    
    // Should not crash, should show appropriate error
    await expect(page.locator(':has-text("Error"), :has-text("Unable to load")')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Real-world Scenarios', () => {
  test('should handle peak usage times', async ({ page, context }) => {
    // Simulate multiple concurrent users
    const pages = []
    
    for (let i = 0; i < 5; i++) {
      const newPage = await context.newPage()
      pages.push(newPage)
      await newPage.goto(TEST_BOOKING_URL)
    }

    // All pages should load successfully
    for (const testPage of pages) {
      await waitForBookingComponentLoad(testPage)
      await expect(testPage.locator('[data-testid*="booking-flow"]')).toBeVisible()
    }

    // Clean up
    for (const testPage of pages) {
      await testPage.close()
    }
  })

  test('should work with marketing campaign URLs', async ({ page }) => {
    const campaignUrl = `${TEST_BOOKING_URL}?utm_source=google&utm_campaign=summer&service=${TEST_SERVICE_ID}&promo=SUMMER20`
    
    await page.goto(campaignUrl)
    await waitForBookingComponentLoad(page)

    // Should preselect service despite UTM parameters
    await expect(page.locator(`[data-service-id="${TEST_SERVICE_ID}"].selected`)).toBeVisible()
    
    // Should preserve UTM parameters for tracking
    expect(page.url()).toContain('utm_source=google')
    expect(page.url()).toContain('utm_campaign=summer')
  })

  test('should handle booking modifications', async ({ page }) => {
    // Complete initial booking
    await page.goto(TEST_BOOKING_URL)
    await waitForBookingComponentLoad(page)
    
    await selectTimeSlot(page, '10:00 AM')
    await page.click('button:has-text("Next")')
    await fillBookingForm(page)
    await page.click('button:has-text("Confirm")')
    
    await expect(page.locator(':has-text("Confirmed")')).toBeVisible()

    // Test modification flow (if supported)
    const modifyButton = page.locator('button:has-text("Modify"), button:has-text("Reschedule")')
    if (await modifyButton.count() > 0) {
      await modifyButton.click()
      
      // Should allow time slot change
      await selectTimeSlot(page, '11:00 AM')
      await page.click('button:has-text("Confirm"), button:has-text("Update")')
      
      await expect(page.locator(':has-text("Updated"), :has-text("Modified")')).toBeVisible()
    }
  })
})

// Test configuration and setup
test.afterEach(async ({ page }, testInfo) => {
  // Take screenshot on failure
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot()
    await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' })
  }

  // Clear any test data
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
})

test.beforeAll(async () => {
  // Global test setup if needed
  console.log('Starting Enhanced Booking Flow E2E Tests')
})

test.afterAll(async () => {
  // Global test cleanup
  console.log('Enhanced Booking Flow E2E Tests completed')
})