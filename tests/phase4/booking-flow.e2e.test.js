/**
 * Phase 4 E2E Booking Flow Tests
 * Validates complete user workflows for appointment booking
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9999'

describe('Phase 4 - End-to-End Booking Workflows', () => {
  test.describe('Walk-in Customer Booking Flow', () => {
    test('staff should create walk-in appointment successfully', async ({ page }) => {
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/dashboard`)

      // Click add walk-in appointment
      await page.click('[data-testid="add-walk-in"]')

      // Fill in walk-in customer details
      await page.fill('[data-testid="client-first-name"]', 'John')
      await page.fill('[data-testid="client-last-name"]', 'Doe')
      await page.fill('[data-testid="client-phone"]', '+15551234567')

      // Select service
      await page.click('[data-testid="service-select"]')
      await page.click('[data-testid="service-option"]:first-child')

      // Select barber
      await page.click('[data-testid="barber-select"]')
      await page.click('[data-testid="barber-option"]:first-child')

      // Select time
      await page.click('[data-testid="time-slot"]:first-child')

      // Submit appointment
      await page.click('[data-testid="create-appointment"]')

      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 })
    }, 60000)

    test('walk-in appointment should appear in queue', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/queue`)

      // Verify queue displays appointments
      await expect(page.locator('[data-testid="queue-item"]')).toHaveCount({ timeout: 10000 })
    }, 30000)
  })

  test.describe('Registered Client Online Booking', () => {
    test('client should complete online booking successfully', async ({ page }) => {
      // Navigate to public booking page
      await page.goto(`${BASE_URL}/book`)

      // Step 1: Select location
      await page.waitForSelector('[data-testid="location-option"]')
      await page.click('[data-testid="location-option"]:first-child')
      await page.click('[data-testid="next-button"]')

      // Step 2: Select barber
      await page.waitForSelector('[data-testid="barber-option"]')
      await page.click('[data-testid="barber-option"]:first-child')
      await page.click('[data-testid="next-button"]')

      // Step 3: Select service
      await page.waitForSelector('[data-testid="service-option"]')
      await page.click('[data-testid="service-option"]:first-child')
      await page.click('[data-testid="next-button"]')

      // Step 4: Select date and time
      await page.waitForSelector('[data-testid="available-date"]')
      await page.click('[data-testid="available-date"]:first-child')
      await page.click('[data-testid="time-slot"]:first-child')
      await page.click('[data-testid="next-button"]')

      // Step 5: Enter customer information
      await page.fill('[data-testid="customer-name"]', 'Jane Smith')
      await page.fill('[data-testid="customer-email"]', 'jane@example.com')
      await page.fill('[data-testid="customer-phone"]', '+15559876543')

      // Select payment method
      await page.click('[data-testid="payment-in-person"]')
      await page.click('[data-testid="confirm-booking"]')

      // Verify confirmation
      await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible({ timeout: 30000 })
    }, 90000)
  })

  test.describe('Barber Calendar Management', () => {
    test('barber should view and manage appointments', async ({ page }) => {
      // Login as barber (assuming auth setup)
      await page.goto(`${BASE_URL}/dashboard/calendar`)

      // Verify calendar loads
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible({ timeout: 10000 })

      // Verify appointments are displayed
      await expect(page.locator('[data-testid="appointment-event"]')).toHaveCount({ timeout: 10000 })
    }, 60000)

    test('barber should reschedule appointment', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/calendar`)

      // Click on an appointment
      await page.click('[data-testid="appointment-event"]:first-child')

      // Open reschedule modal
      await page.click('[data-testid="reschedule-button"]')

      // Select new time
      await page.click('[data-testid="new-time-slot"]:first-child')

      // Confirm reschedule
      await page.click('[data-testid="confirm-reschedule"]')

      // Verify success
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 })
    }, 60000)
  })

  test.describe('Appointment Lifecycle', () => {
    test('should complete full appointment lifecycle', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`)

      // Create appointment (PENDING)
      await page.click('[data-testid="create-appointment"]')
      await page.fill('[data-testid="client-name"]', 'Test Client')
      await page.click('[data-testid="service-select"]')
      await page.click('[data-testid="service-option"]:first-child')
      await page.click('[data-testid="submit"]')

      // Verify PENDING status
      await expect(page.locator('[data-testid="status-PENDING"]')).toBeVisible()

      // Confirm appointment
      await page.click('[data-testid="confirm-button"]')
      await expect(page.locator('[data-testid="status-CONFIRMED"]')).toBeVisible()

      // Check-in customer
      await page.click('[data-testid="check-in-button"]')
      await expect(page.locator('[data-testid="status-CHECKED_IN"]')).toBeVisible()

      // Complete service
      await page.click('[data-testid="complete-button"]')
      await expect(page.locator('[data-testid="status-COMPLETED"]')).toBeVisible()
    }, 90000)
  })

  test.describe('Data Persistence Validation', () => {
    test('should maintain data consistency through state changes', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/calendar`)

      // Create appointment with specific data
      const testData = {
        clientName: 'John Consistency Test',
        service: 'Basic Haircut',
        date: '2025-10-15',
        time: '14:00'
      }

      // Create appointment
      await page.click('[data-testid="create-appointment"]')
      await page.fill('[data-testid="client-name"]', testData.clientName)

      // Submit and verify
      await page.click('[data-testid="submit"]')

      // Retrieve and verify data persisted
      await page.reload()
      await expect(page.locator(`text=${testData.clientName}`)).toBeVisible({ timeout: 10000 })
    }, 60000)
  })

  test.describe('Error Handling and Recovery', () => {
    test('should handle booking conflicts gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/book`)

      // Attempt to book already taken slot
      await page.click('[data-testid="time-slot"][data-booked="true"]')

      // Should show error message
      await expect(page.locator('[data-testid="conflict-error"]')).toBeVisible()
    }, 30000)

    test('should recover from network errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/book`)

      // Simulate network failure
      await page.route('**/api/appointments', route => route.abort())

      // Attempt action
      await page.click('[data-testid="submit"]')

      // Should show error and retry option
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()

      // Restore network and retry
      await page.unroute('**/api/appointments')
      await page.click('[data-testid="retry-button"]')
    }, 60000)
  })
})
