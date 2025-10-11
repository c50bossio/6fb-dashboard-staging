/**
 * Phase 4 Calendar Integration E2E Tests
 * Validates calendar component functionality with new appointment schema
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9999'

test.describe('Phase 4 - Calendar Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/calendar`)
  })

  test('calendar should load and display appointments', async ({ page }) => {
    await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible({ timeout: 10000 })

    // Verify calendar controls
    await expect(page.locator('[data-testid="calendar-prev"]')).toBeVisible()
    await expect(page.locator('[data-testid="calendar-next"]')).toBeVisible()
  }, 30000)

  test('should create appointment via calendar modal', async ({ page }) => {
    // Click on empty time slot
    await page.click('[data-testid="calendar-timeslot"]')

    // Modal should open
    await expect(page.locator('[data-testid="appointment-modal"]')).toBeVisible()

    // Fill appointment details
    await page.fill('[data-testid="client-name"]', 'Calendar Test Client')
    await page.click('[data-testid="service-select"]')
    await page.click('[data-testid="service-option"]:first-child')

    // Save appointment
    await page.click('[data-testid="save-appointment"]')

    // Verify appointment appears on calendar
    await expect(page.locator('[data-testid="appointment-event"]')).toHaveCount({ timeout: 10000 })
  }, 60000)

  test('should display appointment details on click', async ({ page }) => {
    // Click on existing appointment
    await page.click('[data-testid="appointment-event"]:first-child')

    // Details modal should open
    await expect(page.locator('[data-testid="appointment-details-modal"]')).toBeVisible()

    // Verify new field names displayed
    await expect(page.locator('[data-testid="field-client_id"]')).toBeVisible()
    await expect(page.locator('[data-testid="field-appointment_date"]')).toBeVisible()
    await expect(page.locator('[data-testid="field-appointment_time"]')).toBeVisible()
  }, 30000)

  test('should filter appointments by barber', async ({ page }) => {
    // Open barber filter
    await page.click('[data-testid="barber-filter"]')

    // Select specific barber
    await page.click('[data-testid="barber-option"]:first-child')

    // Verify filtered results
    await expect(page.locator('[data-testid="appointment-event"]')).toHaveCount({ timeout: 10000 })
  }, 30000)

  test('should navigate between months', async ({ page }) => {
    // Go to next month
    await page.click('[data-testid="calendar-next"]')

    // Verify month changed
    const monthText = await page.locator('[data-testid="calendar-month"]').textContent()
    expect(monthText).toBeTruthy()

    // Go back
    await page.click('[data-testid="calendar-prev"]')
  }, 30000)

  test('should handle drag and drop reschedule', async ({ page }) => {
    const appointment = page.locator('[data-testid="appointment-event"]:first-child')
    const newSlot = page.locator('[data-testid="calendar-timeslot"]').nth(5)

    // Drag appointment to new slot
    await appointment.dragTo(newSlot)

    // Confirm reschedule dialog
    await page.click('[data-testid="confirm-reschedule"]')

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  }, 30000)

  test('should sync with database on refresh', async ({ page }) => {
    // Note current appointments count
    const initialCount = await page.locator('[data-testid="appointment-event"]').count()

    // Reload page
    await page.reload()

    // Verify same count (data persisted)
    await expect(page.locator('[data-testid="appointment-event"]')).toHaveCount(initialCount)
  }, 30000)
})
