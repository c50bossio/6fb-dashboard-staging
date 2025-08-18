/**
 * Complete Booking Flow E2E Tests
 * 
 * This test suite verifies the entire booking journey from service selection 
 * to payment completion and confirmation, ensuring all components work together
 * with real data integration.
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@/lib/supabase/client'

// Test data setup and cleanup utilities
class BookingTestData {
  constructor() {
    this.supabase = createClient()
    this.testData = {
      customer: {
        name: `Test Customer ${Date.now()}`,
        email: `test.customer.${Date.now()}@example.com`,
        phone: '+1234567890'
      },
      booking: null,
      barbershop: null,
      barber: null,
      service: null
    }
  }

  async setupTestData() {
    try {
      // Get or create test barbershop with real data
      const { data: shops } = await this.supabase
        .from('barbershops')
        .select(`
          *,
          business_settings (*),
          stripe_connected_accounts (*)
        `)
        .eq('status', 'active')
        .limit(1)

      if (!shops || shops.length === 0) {
        throw new Error('No active barbershops found for testing')
      }

      this.testData.barbershop = shops[0]

      // Get available barber
      const { data: barbers } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('role', 'BARBER')
        .eq('barbershop_id', this.testData.barbershop.id)
        .eq('status', 'active')
        .limit(1)

      if (!barbers || barbers.length === 0) {
        throw new Error('No active barbers found for testing')
      }

      this.testData.barber = barbers[0]

      // Get available service
      const { data: services } = await this.supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', this.testData.barbershop.id)
        .eq('is_active', true)
        .limit(1)

      if (!services || services.length === 0) {
        throw new Error('No active services found for testing')
      }

      this.testData.service = services[0]

      console.log('Test data setup completed:', {
        barbershop: this.testData.barbershop.name,
        barber: this.testData.barber.name,
        service: this.testData.service.name
      })

      return this.testData
    } catch (error) {
      console.error('Test data setup failed:', error)
      throw error
    }
  }

  async cleanup() {
    try {
      // Clean up test booking if created
      if (this.testData.booking?.id) {
        await this.supabase
          .from('bookings')
          .delete()
          .eq('id', this.testData.booking.id)
      }
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }

  getBookingUrl() {
    return `/shop/${this.testData.barbershop.slug}/book`
  }

  getAvailableTimeSlot() {
    // Return a time slot 2 hours from now
    const now = new Date()
    now.setHours(now.getHours() + 2)
    now.setMinutes(0, 0, 0) // Round to nearest hour
    return now
  }
}

test.describe('Complete Booking Flow - End-to-End', () => {
  let testData

  test.beforeEach(async ({ page }) => {
    testData = new BookingTestData()
    await testData.setupTestData()
    
    // Navigate to booking page
    await page.goto(testData.getBookingUrl())
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await testData.cleanup()
  })

  test('Complete booking flow with online payment', async ({ page }) => {
    console.log('Testing complete booking flow with online payment...')

    // Step 1: Verify booking wizard loads with real shop settings
    await expect(page.locator('h1')).toContainText('Book Your Appointment')
    
    // Verify progress bar shows all steps
    const progressSteps = page.locator('[data-testid="progress-step"]')
    await expect(progressSteps).toHaveCount(6)

    // Step 2: Select location (if not already selected)
    if (testData.testData.barbershop) {
      const locationCard = page.locator(`[data-testid="location-${testData.testData.barbershop.id}"]`)
      if (await locationCard.isVisible()) {
        await locationCard.click()
        await page.locator('button', { hasText: 'Next' }).click()
      }
    }

    // Step 3: Select barber
    await expect(page.locator('[data-testid="barber-selection"]')).toBeVisible()
    
    const barberCard = page.locator(`[data-testid="barber-${testData.testData.barber.id}"]`)
    await expect(barberCard).toBeVisible()
    await barberCard.click()
    
    // Verify barber details are displayed
    await expect(page.locator('[data-testid="selected-barber-name"]')).toContainText(testData.testData.barber.name)
    
    await page.locator('button', { hasText: 'Next' }).click()

    // Step 4: Select service
    await expect(page.locator('[data-testid="service-selection"]')).toBeVisible()
    
    const serviceCard = page.locator(`[data-testid="service-${testData.testData.service.id}"]`)
    await expect(serviceCard).toBeVisible()
    await serviceCard.click()
    
    // Verify service details and price
    await expect(page.locator('[data-testid="selected-service-name"]')).toContainText(testData.testData.service.name)
    await expect(page.locator('[data-testid="selected-service-price"]')).toContainText('$')
    
    await page.locator('button', { hasText: 'Next' }).click()

    // Step 5: Select time slot
    await expect(page.locator('[data-testid="time-selection"]')).toBeVisible()
    
    // Wait for calendar to load
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 })
    
    // Select first available time slot
    const availableSlots = page.locator('[data-testid="time-slot"]:not([disabled])')
    await expect(availableSlots.first()).toBeVisible()
    await availableSlots.first().click()
    
    // Verify time selection
    await expect(page.locator('[data-testid="selected-time"]')).toBeVisible()
    
    await page.locator('button', { hasText: 'Next' }).click()

    // Step 6: Payment information
    await expect(page.locator('[data-testid="payment-step"]')).toBeVisible()
    
    // Fill customer information
    await page.fill('[data-testid="customer-name"]', testData.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', testData.testData.customer.email)
    await page.fill('[data-testid="customer-phone"]', testData.testData.customer.phone)
    
    // Verify payment methods are available based on shop settings
    const onlinePaymentOption = page.locator('[data-testid="payment-online"]')
    const inPersonPaymentOption = page.locator('[data-testid="payment-in-person"]')
    
    if (testData.testData.barbershop.business_settings?.accept_online_payment !== false) {
      await expect(onlinePaymentOption).toBeVisible()
    }
    
    if (testData.testData.barbershop.business_settings?.accept_in_person_payment !== false) {
      await expect(inPersonPaymentOption).toBeVisible()
    }

    // Select online payment
    await onlinePaymentOption.click()

    // Verify booking summary shows all details
    const summary = page.locator('[data-testid="booking-summary"]')
    await expect(summary).toBeVisible()
    await expect(summary).toContainText(testData.testData.barbershop.name)
    await expect(summary).toContainText(testData.testData.barber.name)
    await expect(summary).toContainText(testData.testData.service.name)
    await expect(summary).toContainText('$')

    // Mock Stripe payment for testing (or use test mode)
    await page.route('**/api/stripe/payment-intent', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clientSecret: 'pi_test_client_secret',
          paymentIntentId: 'pi_test_payment_intent',
          amount: testData.testData.service.price,
          currency: 'usd'
        })
      })
    })

    // Mock successful payment confirmation
    await page.route('**/api/stripe/confirm-payment', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          paymentIntent: {
            id: 'pi_test_payment_intent',
            status: 'succeeded'
          }
        })
      })
    })

    // Complete payment
    await page.locator('button', { hasText: 'Complete Booking' }).click()

    // Step 7: Verify confirmation page
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible({ timeout: 15000 })
    
    // Verify confirmation details
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('confirmed')
    await expect(page.locator('[data-testid="booking-id"]')).toBeVisible()
    
    // Verify booking details are displayed correctly
    await expect(page.locator('[data-testid="confirmation-barbershop"]')).toContainText(testData.testData.barbershop.name)
    await expect(page.locator('[data-testid="confirmation-barber"]')).toContainText(testData.testData.barber.name)
    await expect(page.locator('[data-testid="confirmation-service"]')).toContainText(testData.testData.service.name)

    // Verify payment status
    await expect(page.locator('[data-testid="payment-status"]')).toContainText('paid')

    // Verify booking exists in database
    const bookingId = await page.locator('[data-testid="booking-id"]').textContent()
    const { data: createdBooking } = await testData.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId.replace('Booking ID: ', ''))
      .single()

    expect(createdBooking).toBeTruthy()
    expect(createdBooking.status).toBe('CONFIRMED')
    expect(createdBooking.payment_status).toBe('completed')
    
    // Store for cleanup
    testData.testData.booking = createdBooking
  })

  test('Complete booking flow with in-person payment', async ({ page }) => {
    console.log('Testing complete booking flow with in-person payment...')

    // Navigate through booking steps (location, barber, service, time)
    await page.goto(testData.getBookingUrl())
    
    // Skip through steps quickly for in-person payment test
    await page.locator(`[data-testid="barber-${testData.testData.barber.id}"]`).click()
    await page.locator('button', { hasText: 'Next' }).click()
    
    await page.locator(`[data-testid="service-${testData.testData.service.id}"]`).click()
    await page.locator('button', { hasText: 'Next' }).click()
    
    await page.waitForSelector('[data-testid="time-slot"]')
    await page.locator('[data-testid="time-slot"]:not([disabled])').first().click()
    await page.locator('button', { hasText: 'Next' }).click()

    // Payment step - select in-person payment
    await page.fill('[data-testid="customer-name"]', testData.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', testData.testData.customer.email)
    await page.fill('[data-testid="customer-phone"]', testData.testData.customer.phone)
    
    await page.locator('[data-testid="payment-in-person"]').click()
    
    // Verify different flow for in-person payment
    await expect(page.locator('[data-testid="in-person-payment-info"]')).toBeVisible()
    await expect(page.locator('[data-testid="in-person-payment-info"]')).toContainText('at the shop')

    await page.locator('button', { hasText: 'Complete Booking' }).click()

    // Verify confirmation with pending payment status
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-status"]')).toContainText('at appointment')

    // Verify booking in database has pending payment
    const bookingId = await page.locator('[data-testid="booking-id"]').textContent()
    const { data: createdBooking } = await testData.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId.replace('Booking ID: ', ''))
      .single()

    expect(createdBooking.payment_status).toBe('pending')
    testData.testData.booking = createdBooking
  })

  test('Booking flow with failed payment handling', async ({ page }) => {
    console.log('Testing booking flow with failed payment...')

    // Navigate through booking steps
    await page.goto(testData.getBookingUrl())
    
    // Quick navigation to payment step
    await page.locator(`[data-testid="barber-${testData.testData.barber.id}"]`).click()
    await page.locator('button', { hasText: 'Next' }).click()
    
    await page.locator(`[data-testid="service-${testData.testData.service.id}"]`).click()
    await page.locator('button', { hasText: 'Next' }).click()
    
    await page.waitForSelector('[data-testid="time-slot"]')
    await page.locator('[data-testid="time-slot"]:not([disabled])').first().click()
    await page.locator('button', { hasText: 'Next' }).click()

    // Fill customer info and select online payment
    await page.fill('[data-testid="customer-name"]', testData.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', testData.testData.customer.email)
    await page.locator('[data-testid="payment-online"]').click()

    // Mock failed payment
    await page.route('**/api/stripe/payment-intent', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Your card was declined. Please try a different payment method.'
        })
      })
    })

    await page.locator('button', { hasText: 'Complete Booking' }).click()

    // Verify error handling
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined')
    
    // Verify user can retry payment
    await expect(page.locator('button', { hasText: 'Try Again' })).toBeVisible()
    
    // Verify booking was not created in database
    const { data: bookings } = await testData.supabase
      .from('bookings')
      .select('*')
      .eq('client_email', testData.testData.customer.email)

    expect(bookings).toHaveLength(0)
  })

  test('Booking wizard loads real shop settings correctly', async ({ page }) => {
    console.log('Testing shop settings integration...')

    await page.goto(testData.getBookingUrl())
    await page.waitForLoadState('networkidle')

    // Verify shop information is loaded
    await expect(page.locator('[data-testid="shop-name"]')).toContainText(testData.testData.barbershop.name)
    
    if (testData.testData.barbershop.address) {
      await expect(page.locator('[data-testid="shop-address"]')).toContainText(testData.testData.barbershop.address)
    }

    // Navigate to payment step to verify payment settings
    await page.locator(`[data-testid="barber-${testData.testData.barber.id}"]`).click()
    await page.locator('button', { hasText: 'Next' }).click()
    
    await page.locator(`[data-testid="service-${testData.testData.service.id}"]`).click()
    await page.locator('button', { hasText: 'Next' }).click()
    
    await page.waitForSelector('[data-testid="time-slot"]')
    await page.locator('[data-testid="time-slot"]:not([disabled])').first().click()
    await page.locator('button', { hasText: 'Next' }).click()

    // Verify payment options match shop settings
    const businessSettings = testData.testData.barbershop.business_settings

    if (businessSettings?.accept_online_payment !== false) {
      await expect(page.locator('[data-testid="payment-online"]')).toBeVisible()
    } else {
      await expect(page.locator('[data-testid="payment-online"]')).not.toBeVisible()
    }

    if (businessSettings?.accept_in_person_payment !== false) {
      await expect(page.locator('[data-testid="payment-in-person"]')).toBeVisible()
    } else {
      await expect(page.locator('[data-testid="payment-in-person"]')).not.toBeVisible()
    }

    // Verify deposit requirements if applicable
    if (businessSettings?.deposit_required) {
      await expect(page.locator('[data-testid="deposit-info"]')).toBeVisible()
      
      if (businessSettings.deposit_percentage) {
        await expect(page.locator('[data-testid="deposit-info"]')).toContainText(`${businessSettings.deposit_percentage}%`)
      } else if (businessSettings.deposit_amount) {
        await expect(page.locator('[data-testid="deposit-info"]')).toContainText(`$${businessSettings.deposit_amount}`)
      }
    }
  })

  test('Verify no mock data is used in booking flow', async ({ page }) => {
    console.log('Verifying no mock data is used...')

    // Monitor network requests to ensure no mock endpoints are called
    const mockDataDetected = []
    
    page.on('request', request => {
      const url = request.url()
      if (url.includes('mock') || url.includes('fake') || url.includes('test-data')) {
        mockDataDetected.push(url)
      }
    })

    await page.goto(testData.getBookingUrl())
    
    // Complete a full booking flow
    await page.locator(`[data-testid="barber-${testData.testData.barber.id}"]`).click()
    await page.locator('button', { hasText: 'Next' }).click()
    
    await page.locator(`[data-testid="service-${testData.testData.service.id}"]`).click()
    await page.locator('button', { hasText: 'Next' }).click()

    // Wait for real time slots to load
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 })
    
    // Verify time slots are real and not hardcoded
    const timeSlots = await page.locator('[data-testid="time-slot"]').count()
    expect(timeSlots).toBeGreaterThan(0)
    
    // Verify no mock data was detected
    expect(mockDataDetected).toHaveLength(0)
    
    // Verify real database queries are happening
    const databaseRequests = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('supabase') || url.includes('/api/')) {
        databaseRequests.push(url)
      }
    })

    await page.locator('[data-testid="time-slot"]:not([disabled])').first().click()
    await page.locator('button', { hasText: 'Next' }).click()

    expect(databaseRequests.length).toBeGreaterThan(0)
  })
})

test.describe('Booking Flow - Mobile Responsive', () => {
  let testData

  test.beforeEach(async ({ page }) => {
    testData = new BookingTestData()
    await testData.setupTestData()
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(testData.getBookingUrl())
  })

  test.afterEach(async () => {
    await testData.cleanup()
  })

  test('Complete booking flow on mobile device', async ({ page }) => {
    console.log('Testing mobile booking flow...')

    // Verify mobile-optimized layout
    await expect(page.locator('[data-testid="mobile-booking-header"]')).toBeVisible()
    
    // Test touch interactions
    await page.locator(`[data-testid="barber-${testData.testData.barber.id}"]`).tap()
    await page.locator('button', { hasText: 'Next' }).tap()
    
    await page.locator(`[data-testid="service-${testData.testData.service.id}"]`).tap()
    await page.locator('button', { hasText: 'Next' }).tap()
    
    // Verify mobile time picker
    await page.waitForSelector('[data-testid="mobile-time-picker"]')
    await page.locator('[data-testid="time-slot"]:not([disabled])').first().tap()
    await page.locator('button', { hasText: 'Next' }).tap()

    // Test mobile payment form
    await page.fill('[data-testid="customer-name"]', testData.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', testData.testData.customer.email)
    
    // Verify mobile-optimized payment options
    await expect(page.locator('[data-testid="mobile-payment-options"]')).toBeVisible()
    
    await page.locator('[data-testid="payment-in-person"]').tap()
    await page.locator('button', { hasText: 'Complete Booking' }).tap()

    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()
  })
})