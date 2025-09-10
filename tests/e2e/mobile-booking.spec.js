/**
 * Mobile Booking Flow E2E Tests
 * 6FB AI Agent System - Mobile-Optimized Booking Experience
 * 
 * Test Coverage:
 * - Mobile viewport booking flow
 * - Touch interactions and gestures
 * - Mobile-specific UI components
 * - Responsive design validation
 * - Performance on mobile devices
 * - Portrait/landscape orientation
 * - Mobile payment integration
 */

import { test, expect, devices } from '@playwright/test'

// Mobile Test Configuration
const MOBILE_TIMEOUT = 90000 // Mobile operations may take longer
const TOUCH_TIMEOUT = 5000

// Test Data for Mobile
const mobileTestData = {
  customer: {
    name: 'Jane Mobile User',
    email: 'jane.mobile@6fb.co',
    phone: '(555) 987-6543',
    notes: 'Booking via mobile app'
  },
  payment: {
    number: '4242424242424242',
    expiry: '12/25',
    cvc: '123',
    name: 'Jane Mobile User'
  }
}

// Mobile Helper Class
class MobileBookingHelper {
  constructor(page) {
    this.page = page
  }

  async setupMobileEnvironment() {
    // Enable touch events
    await this.page.addInitScript(() => {
      // Mock touch capabilities
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: false,
        value: 5
      })
      
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        writable: false,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      })
    })
    
    // Wait for mobile optimizations to load
    await this.page.waitForTimeout(2000)
  }

  async navigateToMobileBooking(barberId = null) {
    const url = barberId 
      ? `http://localhost:9999/book/${barberId}` 
      : 'http://localhost:9999/book'
    
    await this.page.goto(url)
    await this.page.waitForLoadState('networkidle')
    
    // Verify mobile-optimized booking interface
    await expect(this.page.locator('[data-testid="mobile-booking-wizard"]')).toBeVisible({ timeout: 15000 })
  }

  async performTouchSwipe(selector, direction = 'left') {
    const element = this.page.locator(selector)
    const box = await element.boundingBox()
    
    if (!box) return
    
    const startX = direction === 'left' ? box.x + box.width - 50 : box.x + 50
    const endX = direction === 'left' ? box.x + 50 : box.x + box.width - 50
    const y = box.y + box.height / 2
    
    await this.page.mouse.move(startX, y)
    await this.page.mouse.down()
    await this.page.mouse.move(endX, y, { steps: 10 })
    await this.page.mouse.up()
    
    await this.page.waitForTimeout(500)
  }

  async scrollToElement(selector) {
    await this.page.locator(selector).scrollIntoViewIfNeeded()
    await this.page.waitForTimeout(300)
  }

  async tapElement(selector) {
    await this.scrollToElement(selector)
    await this.page.locator(selector).tap()
    await this.page.waitForTimeout(300)
  }

  async verifyMobileResponsiveness() {
    // Check for mobile-specific elements
    await expect(this.page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="mobile-booking-progress"]')).toBeVisible()
    
    // Verify no horizontal scrolling
    const bodyScrollWidth = await this.page.evaluate(() => document.body.scrollWidth)
    const windowInnerWidth = await this.page.evaluate(() => window.innerWidth)
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth + 1) // Allow 1px tolerance
  }

  async testTouchInteractions() {
    // Test touch scrolling
    await this.page.mouse.move(200, 300)
    await this.page.mouse.down()
    await this.page.mouse.move(200, 100, { steps: 5 })
    await this.page.mouse.up()
    
    // Test pinch zoom (if supported)
    try {
      await this.page.touchscreen.tap(200, 300)
    } catch (error) {
      // Touchscreen not supported in this browser
      console.log('Touchscreen not supported, skipping touch tests')
    }
  }

  async verifyMobileBookingStep(stepNumber) {
    await this.page.waitForSelector(`[data-testid="mobile-step-${stepNumber}"]`, { timeout: MOBILE_TIMEOUT })
    
    // Verify mobile-optimized step layout
    const stepContainer = this.page.locator(`[data-testid="mobile-step-${stepNumber}"]`)
    await expect(stepContainer).toBeVisible()
    
    // Check that content fits in mobile viewport
    const boundingBox = await stepContainer.boundingBox()
    const viewport = this.page.viewportSize()
    
    expect(boundingBox.width).toBeLessThanOrEqual(viewport.width)
    
    return stepContainer
  }

  async completeMobileLocationStep() {
    const stepContainer = await this.verifyMobileBookingStep(1)
    
    // Wait for mobile location cards to load
    await this.page.waitForSelector('[data-testid="mobile-location-card"]', { timeout: 10000 })
    
    // Use swipe gesture to browse locations if multiple exist
    const locationCards = this.page.locator('[data-testid="mobile-location-card"]')
    const cardCount = await locationCards.count()
    
    if (cardCount > 1) {
      // Swipe through a couple of locations
      await this.performTouchSwipe('[data-testid="location-carousel"]', 'left')
      await this.page.waitForTimeout(1000)
    }
    
    // Tap to select first location
    await this.tapElement('[data-testid="mobile-location-card"]:first-child')
    
    // Verify selection with mobile-specific feedback
    await expect(this.page.locator('[data-testid="mobile-location-selected"]')).toBeVisible()
    
    // Tap mobile next button
    await this.tapElement('[data-testid="mobile-next-btn"]')
  }

  async completeMobileBarberStep() {
    const stepContainer = await this.verifyMobileBookingStep(2)
    
    await this.page.waitForSelector('[data-testid="mobile-barber-card"]', { timeout: 10000 })
    
    // Test mobile barber selection
    const barberCards = this.page.locator('[data-testid="mobile-barber-card"]')
    const barberCount = await barberCards.count()
    
    if (barberCount > 1) {
      // Swipe through barbers
      await this.performTouchSwipe('[data-testid="barber-carousel"]', 'left')
      await this.page.waitForTimeout(1000)
    }
    
    // Tap to select barber
    await this.tapElement('[data-testid="mobile-barber-card"]:first-child')
    
    // Verify mobile selection feedback
    await expect(this.page.locator('[data-testid="mobile-barber-selected"]')).toBeVisible()
    
    await this.tapElement('[data-testid="mobile-next-btn"]')
  }

  async completeMobileServiceStep() {
    const stepContainer = await this.verifyMobileBookingStep(3)
    
    await this.page.waitForSelector('[data-testid="mobile-service-card"]', { timeout: 10000 })
    
    // Select service with mobile interaction
    await this.tapElement('[data-testid="mobile-service-card"]:first-child')
    
    // Check for mobile add-ons interface
    const addOnCards = this.page.locator('[data-testid="mobile-addon-card"]')
    const addOnCount = await addOnCards.count()
    
    if (addOnCount > 0) {
      // Toggle an add-on for testing
      await this.tapElement('[data-testid="mobile-addon-toggle"]:first-child')
      
      // Verify mobile add-on selection
      await expect(this.page.locator('[data-testid="mobile-addon-selected"]')).toBeVisible()
    }
    
    await this.tapElement('[data-testid="mobile-next-btn"]')
  }

  async completeMobileDateTimeStep() {
    const stepContainer = await this.verifyMobileBookingStep(4)
    
    // Mobile date picker
    await this.page.waitForSelector('[data-testid="mobile-date-picker"]', { timeout: 10000 })
    
    // Swipe through dates
    await this.performTouchSwipe('[data-testid="mobile-date-carousel"]', 'left')
    
    // Select available date
    await this.tapElement('[data-testid="mobile-available-date"]:first-child')
    
    // Wait for mobile time slots
    await this.page.waitForSelector('[data-testid="mobile-time-slot"]', { timeout: 5000 })
    
    // Select time slot
    await this.tapElement('[data-testid="mobile-time-slot"]:first-child')
    
    await this.tapElement('[data-testid="mobile-next-btn"]')
  }

  async completeMobilePaymentStep(paymentMethod = 'online') {
    const stepContainer = await this.verifyMobileBookingStep(5)
    
    if (paymentMethod === 'online') {
      // Mobile payment form
      await this.tapElement('[data-testid="mobile-payment-online"]')
      
      // Fill customer info with mobile keyboard
      await this.page.fill('[data-testid="mobile-customer-name"]', mobileTestData.customer.name)
      await this.page.fill('[data-testid="mobile-customer-email"]', mobileTestData.customer.email)
      await this.page.fill('[data-testid="mobile-customer-phone"]', mobileTestData.customer.phone)
      
      // Mobile card input
      const cardFrame = this.page.frameLocator('iframe[name*="cardNumber"]')
      await cardFrame.locator('[name="cardnumber"]').fill(mobileTestData.payment.number)
      
      const expiryFrame = this.page.frameLocator('iframe[name*="cardExpiry"]')
      await expiryFrame.locator('[name="exp-date"]').fill(mobileTestData.payment.expiry)
      
      const cvcFrame = this.page.frameLocator('iframe[name*="cardCvc"]')
      await cvcFrame.locator('[name="cvc"]').fill(mobileTestData.payment.cvc)
      
      // Submit mobile payment
      await this.tapElement('[data-testid="mobile-submit-payment"]')
      
    } else {
      // In-person payment on mobile
      await this.tapElement('[data-testid="mobile-payment-in-person"]')
      
      // Fill customer info
      await this.page.fill('[data-testid="mobile-customer-name"]', mobileTestData.customer.name)
      await this.page.fill('[data-testid="mobile-customer-email"]', mobileTestData.customer.email)
      await this.page.fill('[data-testid="mobile-customer-phone"]', mobileTestData.customer.phone)
      
      await this.tapElement('[data-testid="mobile-confirm-booking"]')
    }
  }

  async verifyMobileConfirmation() {
    await this.page.waitForSelector('[data-testid="mobile-booking-confirmation"]', { timeout: 30000 })
    
    // Verify mobile-optimized confirmation screen
    await expect(this.page.locator('[data-testid="mobile-confirmation-title"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="mobile-booking-reference"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="mobile-booking-details"]')).toBeVisible()
    
    // Check for mobile sharing options
    await expect(this.page.locator('[data-testid="mobile-share-booking"]')).toBeVisible()
    
    // Verify calendar add button for mobile
    await expect(this.page.locator('[data-testid="mobile-add-to-calendar"]')).toBeVisible()
    
    const reference = await this.page.locator('[data-testid="mobile-booking-reference"]').textContent()
    return { reference, confirmed: true }
  }
}

// Mobile Test Suite
test.describe('Mobile Booking Flow', () => {
  let mobileHelper

  // Mobile Chrome Tests
  test.describe('Mobile Chrome', () => {
    test.use({ ...devices['Pixel 5'] })

    test.beforeEach(async ({ page }) => {
      mobileHelper = new MobileBookingHelper(page)
      await mobileHelper.setupMobileEnvironment()
    })

    test('should complete full booking flow on mobile Chrome', async ({ page }) => {
      await mobileHelper.navigateToMobileBooking()
      await mobileHelper.verifyMobileResponsiveness()
      
      // Complete all mobile booking steps
      await mobileHelper.completeMobileLocationStep()
      await mobileHelper.completeMobileBarberStep()
      await mobileHelper.completeMobileServiceStep()
      await mobileHelper.completeMobileDateTimeStep()
      await mobileHelper.completeMobilePaymentStep('online')
      
      const confirmation = await mobileHelper.verifyMobileConfirmation()
      expect(confirmation.confirmed).toBe(true)
      expect(confirmation.reference).toBeTruthy()
    })

    test('should handle mobile touch interactions correctly', async ({ page }) => {
      await mobileHelper.navigateToMobileBooking()
      
      // Test touch interactions
      await mobileHelper.testTouchInteractions()
      
      // Test swipe navigation
      await mobileHelper.completeMobileLocationStep()
      
      // Verify swipe gestures work
      await mobileHelper.performTouchSwipe('[data-testid="barber-carousel"]', 'left')
      await page.waitForTimeout(1000)
      
      await mobileHelper.completeMobileBarberStep()
      await mobileHelper.completeMobileServiceStep()
      await mobileHelper.completeMobileDateTimeStep()
      await mobileHelper.completeMobilePaymentStep('in-person')
      
      const confirmation = await mobileHelper.verifyMobileConfirmation()
      expect(confirmation.confirmed).toBe(true)
    })
  })

  // Mobile Safari Tests
  test.describe('Mobile Safari', () => {
    test.use({ ...devices['iPhone 12'] })

    test.beforeEach(async ({ page }) => {
      mobileHelper = new MobileBookingHelper(page)
      await mobileHelper.setupMobileEnvironment()
    })

    test('should complete booking flow on Mobile Safari', async ({ page }) => {
      await mobileHelper.navigateToMobileBooking()
      await mobileHelper.verifyMobileResponsiveness()
      
      await mobileHelper.completeMobileLocationStep()
      await mobileHelper.completeMobileBarberStep()
      await mobileHelper.completeMobileServiceStep()
      await mobileHelper.completeMobileDateTimeStep()
      await mobileHelper.completeMobilePaymentStep('online')
      
      const confirmation = await mobileHelper.verifyMobileConfirmation()
      expect(confirmation.confirmed).toBe(true)
    })
  })

  // Tablet Tests
  test.describe('Tablet iPad', () => {
    test.use({ ...devices['iPad Pro'] })

    test.beforeEach(async ({ page }) => {
      mobileHelper = new MobileBookingHelper(page)
      await mobileHelper.setupMobileEnvironment()
    })

    test('should adapt to tablet viewport correctly', async ({ page }) => {
      await mobileHelper.navigateToMobileBooking()
      
      // Tablet should show hybrid mobile/desktop experience
      await expect(page.locator('[data-testid="tablet-booking-layout"]')).toBeVisible()
      
      await mobileHelper.completeMobileLocationStep()
      await mobileHelper.completeMobileBarberStep()
      await mobileHelper.completeMobileServiceStep()
      await mobileHelper.completeMobileDateTimeStep()
      await mobileHelper.completeMobilePaymentStep('online')
      
      const confirmation = await mobileHelper.verifyMobileConfirmation()
      expect(confirmation.confirmed).toBe(true)
    })
  })
})

// Orientation and Responsive Tests
test.describe('Mobile Orientation Tests', () => {
  let mobileHelper

  test.beforeEach(async ({ page }) => {
    mobileHelper = new MobileBookingHelper(page)
    await mobileHelper.setupMobileEnvironment()
  })

  test('should handle portrait to landscape orientation change', async ({ page }) => {
    // Start in portrait mode
    await page.setViewportSize({ width: 375, height: 812 })
    await mobileHelper.navigateToMobileBooking()
    
    // Complete first step in portrait
    await mobileHelper.completeMobileLocationStep()
    
    // Switch to landscape
    await page.setViewportSize({ width: 812, height: 375 })
    await page.waitForTimeout(1000)
    
    // Verify layout adapts
    await expect(page.locator('[data-testid="landscape-booking-layout"]')).toBeVisible()
    
    // Continue booking in landscape
    await mobileHelper.completeMobileBarberStep()
    
    // Switch back to portrait
    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(1000)
    
    // Complete booking
    await mobileHelper.completeMobileServiceStep()
    await mobileHelper.completeMobileDateTimeStep()
    await mobileHelper.completeMobilePaymentStep('in-person')
    
    const confirmation = await mobileHelper.verifyMobileConfirmation()
    expect(confirmation.confirmed).toBe(true)
  })

  test('should maintain booking state across orientation changes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await mobileHelper.navigateToMobileBooking()
    
    // Complete steps with orientation changes
    await mobileHelper.completeMobileLocationStep()
    
    // Change to landscape
    await page.setViewportSize({ width: 812, height: 375 })
    await mobileHelper.completeMobileBarberStep()
    
    // Change back to portrait
    await page.setViewportSize({ width: 375, height: 812 })
    await mobileHelper.completeMobileServiceStep()
    
    // Verify booking data is preserved
    await expect(page.locator('[data-testid="mobile-booking-summary"]')).toBeVisible()
    
    const summaryItems = await page.locator('[data-testid^="mobile-summary-"]').count()
    expect(summaryItems).toBeGreaterThanOrEqual(3) // Location, barber, service
    
    await mobileHelper.completeMobileDateTimeStep()
    await mobileHelper.completeMobilePaymentStep('online')
    
    const confirmation = await mobileHelper.verifyMobileConfirmation()
    expect(confirmation.confirmed).toBe(true)
  })
})

// Mobile Performance Tests
test.describe('Mobile Performance', () => {
  test('should load quickly on mobile network conditions', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', route => {
      return new Promise(resolve => {
        setTimeout(() => {
          route.continue()
          resolve()
        }, 100) // Add 100ms delay to simulate slow network
      })
    })

    const mobileHelper = new MobileBookingHelper(page)
    await mobileHelper.setupMobileEnvironment()
    
    const startTime = Date.now()
    await mobileHelper.navigateToMobileBooking()
    const loadTime = Date.now() - startTime
    
    // Should load within reasonable time even on slow network
    expect(loadTime).toBeLessThan(10000) // 10 second threshold for slow network
    
    // Verify core functionality works
    await mobileHelper.completeMobileLocationStep()
    await mobileHelper.completeMobileBarberStep()
  })

  test('should handle mobile keyboard interactions', async ({ page }) => {
    const mobileHelper = new MobileBookingHelper(page)
    await mobileHelper.setupMobileEnvironment()
    
    await mobileHelper.navigateToMobileBooking()
    await mobileHelper.completeMobileLocationStep()
    await mobileHelper.completeMobileBarberStep()
    await mobileHelper.completeMobileServiceStep()
    await mobileHelper.completeMobileDateTimeStep()
    
    // Focus on input fields and verify mobile keyboard behavior
    const nameInput = page.locator('[data-testid="mobile-customer-name"]')
    await nameInput.click()
    
    // Verify input is focused and keyboard would appear
    await expect(nameInput).toBeFocused()
    
    // Type with mobile considerations
    await nameInput.fill('Mobile Test User')
    
    // Test email input with mobile keyboard
    const emailInput = page.locator('[data-testid="mobile-customer-email"]')
    await emailInput.click()
    await emailInput.fill('mobile@test.com')
    
    // Verify mobile email validation
    await expect(emailInput).toHaveValue('mobile@test.com')
    
    // Complete booking
    await page.fill('[data-testid="mobile-customer-phone"]', '(555) 123-4567')
    await mobileHelper.tapElement('[data-testid="mobile-confirm-booking"]')
    
    const confirmation = await mobileHelper.verifyMobileConfirmation()
    expect(confirmation.confirmed).toBe(true)
  })
})

// Mobile Accessibility Tests
test.describe('Mobile Accessibility', () => {
  test('should be accessible on mobile devices', async ({ page }) => {
    const mobileHelper = new MobileBookingHelper(page)
    await mobileHelper.setupMobileEnvironment()
    
    await mobileHelper.navigateToMobileBooking()
    
    // Check for mobile accessibility features
    await expect(page.locator('[data-testid="mobile-booking-wizard"]')).toHaveAttribute('role', 'main')
    
    // Verify touch target sizes (minimum 44px)
    const touchTargets = page.locator('[data-testid*="mobile-"][role="button"], [data-testid*="mobile-"]button, [data-testid*="mobile-"]input[type="submit"]')
    const touchTargetCount = await touchTargets.count()
    
    for (let i = 0; i < touchTargetCount; i++) {
      const target = touchTargets.nth(i)
      const box = await target.boundingBox()
      
      if (box) {
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44) // WCAG touch target size
      }
    }
    
    // Verify focus indicators on mobile
    const focusableElements = page.locator('[data-testid*="mobile-"]input, [data-testid*="mobile-"]button')
    const focusableCount = await focusableElements.count()
    
    for (let i = 0; i < Math.min(3, focusableCount); i++) {
      const element = focusableElements.nth(i)
      await element.focus()
      
      // Verify focus is visible
      const focused = await page.locator(':focus')
      expect(await focused.count()).toBeGreaterThan(0)
    }
  })
})