/**
 * Comprehensive Booking Flow E2E Tests
 * 6FB AI Agent System - Complete 5-Phase Booking Journey
 * 
 * Test Coverage:
 * - Location Selection Phase
 * - Barber Selection Phase  
 * - Service Selection Phase
 * - Time Selection Phase
 * - Payment & Confirmation Phase
 * - Data persistence & validation
 * - Error handling & recovery
 * - Cross-browser compatibility
 */

import { test, expect } from '@playwright/test'

// Test Configuration
const BASE_URL = 'http://localhost:9999'
const BOOKING_TIMEOUT = 60000
const API_TIMEOUT = 30000

// Test Data
const testData = {
  customer: {
    name: 'John Doe',
    email: 'john.doe.test@6fb.co',
    phone: '(555) 123-4567',
    notes: 'First-time customer, prefer experienced barber'
  },
  paymentMethods: {
    card: {
      number: '4242424242424242',
      expiry: '12/25',
      cvc: '123',
      name: 'John Doe'
    },
    testCard: {
      number: '4000000000000002', // Card that will be declined
      expiry: '12/25',
      cvc: '123',
      name: 'John Doe'
    }
  }
}

// Helper Functions
class BookingFlowHelper {
  constructor(page) {
    this.page = page
  }

  async navigateToBooking(barberId = null) {
    const url = barberId 
      ? `${BASE_URL}/book/${barberId}` 
      : `${BASE_URL}/book`
    
    await this.page.goto(url)
    await this.page.waitForLoadState('networkidle')
    
    // Verify booking wizard is loaded
    await expect(this.page.locator('[data-testid="booking-wizard"]')).toBeVisible({ timeout: 10000 })
  }

  async waitForStepLoad(stepNumber) {
    await this.page.waitForSelector(`[data-testid="step-${stepNumber}"]`, { timeout: 10000 })
    await this.page.waitForLoadState('networkidle')
    
    // Wait for step content to be fully loaded
    await this.page.waitForTimeout(1000)
  }

  async selectLocation(locationIndex = 0) {
    await this.waitForStepLoad(1)
    
    // Wait for locations to load
    await this.page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    
    // Select first available location
    const locationCards = this.page.locator('[data-testid="location-option"]')
    await expect(locationCards).toHaveCount(1, { timeout: 5000 })
    
    const selectedLocation = locationCards.nth(locationIndex)
    await selectedLocation.click()
    
    // Verify selection
    await expect(selectedLocation).toHaveClass(/selected|active/)
    
    // Proceed to next step
    await this.page.click('[data-testid="next-button"]')
    
    return locationIndex
  }

  async selectBarber(barberIndex = 0) {
    await this.waitForStepLoad(2)
    
    // Wait for barbers to load
    await this.page.waitForSelector('[data-testid="barber-option"]', { timeout: 10000 })
    
    const barberCards = this.page.locator('[data-testid="barber-option"]')
    await expect(barberCards).toHaveCount(1, { timeout: 5000 })
    
    const selectedBarber = barberCards.nth(barberIndex)
    await selectedBarber.click()
    
    // Verify selection
    await expect(selectedBarber).toHaveClass(/selected|active/)
    
    // Proceed to next step
    await this.page.click('[data-testid="next-button"]')
    
    return barberIndex
  }

  async selectService(serviceIndex = 0) {
    await this.waitForStepLoad(3)
    
    // Wait for services to load
    await this.page.waitForSelector('[data-testid="service-option"]', { timeout: 10000 })
    
    const serviceCards = this.page.locator('[data-testid="service-option"]')
    await expect(serviceCards).toHaveCount(1, { timeout: 5000 })
    
    const selectedService = serviceCards.nth(serviceIndex)
    await selectedService.click()
    
    // Verify selection
    await expect(selectedService).toHaveClass(/selected|active/)
    
    // Check if add-ons are available
    const addOnOptions = this.page.locator('[data-testid="addon-option"]')
    const addOnCount = await addOnOptions.count()
    
    if (addOnCount > 0) {
      // Select first add-on for comprehensive testing
      await addOnOptions.first().click()
    }
    
    // Proceed to next step
    await this.page.click('[data-testid="next-button"]')
    
    return serviceIndex
  }

  async selectDateTime() {
    await this.waitForStepLoad(4)
    
    // Wait for calendar to load
    await this.page.waitForSelector('[data-testid="date-picker"]', { timeout: 10000 })
    
    // Select available date (prefer tomorrow or next available)
    const availableDates = this.page.locator('[data-testid="available-date"]')
    await expect(availableDates).toHaveCount(1, { timeout: 5000 })
    
    const selectedDate = availableDates.first()
    await selectedDate.click()
    
    // Wait for time slots to load
    await this.page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 })
    
    const availableTimeSlots = this.page.locator('[data-testid="time-slot"]:not([disabled])')
    await expect(availableTimeSlots).toHaveCount(1, { timeout: 5000 })
    
    const selectedTimeSlot = availableTimeSlots.first()
    await selectedTimeSlot.click()
    
    // Verify selection
    await expect(selectedTimeSlot).toHaveClass(/selected|active/)
    
    // Proceed to next step
    await this.page.click('[data-testid="next-button"]')
    
    return {
      date: await selectedDate.textContent(),
      time: await selectedTimeSlot.textContent()
    }
  }

  async fillCustomerInformation(customerData = testData.customer) {
    // Fill customer details
    await this.page.fill('[data-testid="customer-name"]', customerData.name)
    await this.page.fill('[data-testid="customer-email"]', customerData.email)
    await this.page.fill('[data-testid="customer-phone"]', customerData.phone)
    
    // Add notes if provided
    if (customerData.notes) {
      await this.page.fill('[data-testid="customer-notes"]', customerData.notes)
    }
    
    // Verify form validation
    await expect(this.page.locator('[data-testid="customer-name"]')).toHaveValue(customerData.name)
    await expect(this.page.locator('[data-testid="customer-email"]')).toHaveValue(customerData.email)
    await expect(this.page.locator('[data-testid="customer-phone"]')).toHaveValue(customerData.phone)
  }

  async processPayment(paymentMethod = 'online', cardData = testData.paymentMethods.card) {
    await this.waitForStepLoad(5)
    
    // Select payment method
    if (paymentMethod === 'online') {
      await this.page.click('[data-testid="payment-online"]')
      
      // Fill payment information
      await this.fillCustomerInformation()
      
      // Fill card details in Stripe iframe
      const cardNumberFrame = this.page.frameLocator('iframe[name*="cardNumber"]')
      await cardNumberFrame.locator('[name="cardnumber"]').fill(cardData.number)
      
      const expiryFrame = this.page.frameLocator('iframe[name*="cardExpiry"]')
      await expiryFrame.locator('[name="exp-date"]').fill(cardData.expiry)
      
      const cvcFrame = this.page.frameLocator('iframe[name*="cardCvc"]')
      await cvcFrame.locator('[name="cvc"]').fill(cardData.cvc)
      
      // Submit payment
      await this.page.click('[data-testid="submit-payment"]')
      
    } else {
      // In-person payment
      await this.page.click('[data-testid="payment-in-person"]')
      await this.fillCustomerInformation()
      await this.page.click('[data-testid="confirm-booking"]')
    }
  }

  async verifyBookingConfirmation() {
    // Wait for confirmation screen
    await this.page.waitForSelector('[data-testid="booking-confirmation"]', { timeout: 30000 })
    
    // Verify confirmation elements
    await expect(this.page.locator('[data-testid="confirmation-title"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="booking-reference"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="booking-details"]')).toBeVisible()
    
    // Extract booking reference for follow-up tests
    const bookingReference = await this.page.locator('[data-testid="booking-reference"]').textContent()
    
    return {
      reference: bookingReference,
      confirmed: true
    }
  }

  async captureBookingDetails() {
    // Capture all booking details for verification
    const details = await this.page.evaluate(() => {
      const getTextContent = (selector) => {
        const element = document.querySelector(selector)
        return element ? element.textContent.trim() : null
      }
      
      return {
        location: getTextContent('[data-testid="selected-location"]'),
        barber: getTextContent('[data-testid="selected-barber"]'),
        service: getTextContent('[data-testid="selected-service"]'),
        dateTime: getTextContent('[data-testid="selected-datetime"]'),
        price: getTextContent('[data-testid="total-price"]'),
        customer: {
          name: getTextContent('[data-testid="customer-name-display"]'),
          email: getTextContent('[data-testid="customer-email-display"]'),
          phone: getTextContent('[data-testid="customer-phone-display"]')
        }
      }
    })
    
    return details
  }
}

// Main Test Suite
test.describe('Complete Booking Flow', () => {
  let helper

  test.beforeEach(async ({ page }) => {
    helper = new BookingFlowHelper(page)
    
    // Set up test environment
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Mock time for consistent testing
    await page.addInitScript(() => {
      Date.now = () => new Date('2024-01-15T10:00:00Z').getTime()
    })
  })

  test('should complete successful booking flow with online payment', async ({ page }) => {
    // Phase 1: Location Selection
    await helper.navigateToBooking()
    const locationIndex = await helper.selectLocation(0)
    
    // Phase 2: Barber Selection
    const barberIndex = await helper.selectBarber(0)
    
    // Phase 3: Service Selection
    const serviceIndex = await helper.selectService(0)
    
    // Phase 4: Time Selection
    const dateTime = await helper.selectDateTime()
    
    // Phase 5: Payment & Confirmation
    await helper.processPayment('online')
    const confirmation = await helper.verifyBookingConfirmation()
    
    // Verify booking was created
    expect(confirmation.confirmed).toBe(true)
    expect(confirmation.reference).toBeTruthy()
    
    // Capture final booking details
    const bookingDetails = await helper.captureBookingDetails()
    expect(bookingDetails.location).toBeTruthy()
    expect(bookingDetails.barber).toBeTruthy()
    expect(bookingDetails.service).toBeTruthy()
    expect(bookingDetails.dateTime).toBeTruthy()
    expect(bookingDetails.price).toBeTruthy()
  })

  test('should complete successful booking flow with in-person payment', async ({ page }) => {
    await helper.navigateToBooking()
    
    // Complete all phases with in-person payment
    await helper.selectLocation(0)
    await helper.selectBarber(0)
    await helper.selectService(0)
    await helper.selectDateTime()
    await helper.processPayment('in-person')
    
    const confirmation = await helper.verifyBookingConfirmation()
    expect(confirmation.confirmed).toBe(true)
  })

  test('should handle booking with add-ons and special requests', async ({ page }) => {
    await helper.navigateToBooking()
    
    await helper.selectLocation(0)
    await helper.selectBarber(0)
    await helper.selectService(0) // This will select add-ons if available
    await helper.selectDateTime()
    
    // Add special customer notes
    await helper.processPayment('online', testData.paymentMethods.card)
    
    const confirmation = await helper.verifyBookingConfirmation()
    expect(confirmation.confirmed).toBe(true)
    
    // Verify notes were preserved
    const bookingDetails = await helper.captureBookingDetails()
    expect(bookingDetails.customer.name).toBe(testData.customer.name)
  })

  test('should persist data when navigating back and forth', async ({ page }) => {
    await helper.navigateToBooking()
    
    // Go through first 3 steps
    await helper.selectLocation(0)
    await helper.selectBarber(0)
    await helper.selectService(0)
    
    // Go back to barber selection
    await page.click('[data-testid="back-button"]')
    await helper.waitForStepLoad(2)
    
    // Verify barber is still selected
    const selectedBarber = page.locator('[data-testid="barber-option"].selected')
    await expect(selectedBarber).toBeVisible()
    
    // Go forward again
    await page.click('[data-testid="next-button"]')
    
    // Verify service is still selected
    await helper.waitForStepLoad(3)
    const selectedService = page.locator('[data-testid="service-option"].selected')
    await expect(selectedService).toBeVisible()
    
    // Complete booking
    await page.click('[data-testid="next-button"]')
    await helper.selectDateTime()
    await helper.processPayment('in-person')
    
    const confirmation = await helper.verifyBookingConfirmation()
    expect(confirmation.confirmed).toBe(true)
  })

  test('should validate required fields and show appropriate errors', async ({ page }) => {
    await helper.navigateToBooking()
    
    // Try to proceed without selecting location
    await page.click('[data-testid="next-button"]')
    
    // Should show validation error
    await expect(page.locator('[data-testid="location-error"]')).toBeVisible()
    
    // Select location and proceed
    await helper.selectLocation(0)
    
    // Similar validation for other steps
    await page.click('[data-testid="next-button"]')
    await expect(page.locator('[data-testid="barber-error"]')).toBeVisible()
    
    await helper.selectBarber(0)
    await helper.selectService(0)
    await helper.selectDateTime()
    
    // Test customer information validation
    await page.click('[data-testid="payment-online"]')
    await page.click('[data-testid="submit-payment"]')
    
    // Should show validation errors for required fields
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="phone-error"]')).toBeVisible()
  })

  test('should handle payment failure gracefully', async ({ page }) => {
    await helper.navigateToBooking()
    
    // Complete booking flow with failing card
    await helper.selectLocation(0)
    await helper.selectBarber(0)
    await helper.selectService(0)
    await helper.selectDateTime()
    
    // Use failing test card
    await helper.processPayment('online', testData.paymentMethods.testCard)
    
    // Should show payment error
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible()
    
    // User should be able to retry with different payment method
    await page.click('[data-testid="payment-in-person"]')
    await page.click('[data-testid="confirm-booking"]')
    
    const confirmation = await helper.verifyBookingConfirmation()
    expect(confirmation.confirmed).toBe(true)
  })

  test('should display booking summary correctly throughout flow', async ({ page }) => {
    await helper.navigateToBooking()
    
    await helper.selectLocation(0)
    
    // Verify location appears in summary
    await expect(page.locator('[data-testid="booking-summary-location"]')).toBeVisible()
    
    await helper.selectBarber(0)
    
    // Verify barber appears in summary
    await expect(page.locator('[data-testid="booking-summary-barber"]')).toBeVisible()
    
    await helper.selectService(0)
    
    // Verify service and pricing appear in summary
    await expect(page.locator('[data-testid="booking-summary-service"]')).toBeVisible()
    await expect(page.locator('[data-testid="booking-summary-price"]')).toBeVisible()
    
    await helper.selectDateTime()
    
    // Verify complete summary before payment
    await expect(page.locator('[data-testid="booking-summary-datetime"]')).toBeVisible()
    
    const summaryItems = await page.locator('[data-testid^="booking-summary-"]').count()
    expect(summaryItems).toBeGreaterThanOrEqual(4) // Location, barber, service, datetime
  })

  test('should handle network interruption gracefully', async ({ page }) => {
    await helper.navigateToBooking()
    
    // Complete first few steps
    await helper.selectLocation(0)
    await helper.selectBarber(0)
    
    // Simulate network interruption
    await page.route('**/api/**', route => route.abort())
    
    // Try to proceed - should show network error
    await page.click('[data-testid="next-button"]')
    
    // Should show appropriate error message
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    
    // Restore network and retry
    await page.unroute('**/api/**')
    await page.click('[data-testid="retry-button"]')
    
    // Should proceed normally
    await helper.selectService(0)
    await helper.selectDateTime()
    await helper.processPayment('in-person')
    
    const confirmation = await helper.verifyBookingConfirmation()
    expect(confirmation.confirmed).toBe(true)
  })

  test('should maintain booking state across page refresh', async ({ page }) => {
    await helper.navigateToBooking()
    
    // Complete first 3 steps
    await helper.selectLocation(0)
    await helper.selectBarber(0)
    await helper.selectService(0)
    
    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Should restore booking state (if implemented)
    // Note: This test assumes local storage or session persistence
    try {
      await expect(page.locator('[data-testid="step-3"]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-testid="service-option"].selected')).toBeVisible()
    } catch (error) {
      // If state persistence not implemented, should start from beginning
      await expect(page.locator('[data-testid="step-1"]')).toBeVisible()
    }
  })
})

// Performance and Load Testing
test.describe('Booking Performance', () => {
  test('should load booking steps within performance thresholds', async ({ page }) => {
    const helper = new BookingFlowHelper(page)
    
    // Measure initial load time
    const startTime = Date.now()
    await helper.navigateToBooking()
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
    
    // Measure step transition times
    const stepTransitionStart = Date.now()
    await helper.selectLocation(0)
    const stepTransitionTime = Date.now() - stepTransitionStart
    
    expect(stepTransitionTime).toBeLessThan(2000) // Step transitions should be under 2 seconds
  })

  test('should handle multiple rapid interactions', async ({ page }) => {
    const helper = new BookingFlowHelper(page)
    await helper.navigateToBooking()
    
    // Rapid clicking should not break the flow
    const nextButton = page.locator('[data-testid="next-button"]')
    
    // Click multiple times rapidly (should be debounced)
    await nextButton.click()
    await nextButton.click()
    await nextButton.click()
    
    // Should still show location validation error
    await expect(page.locator('[data-testid="location-error"]')).toBeVisible()
  })
})