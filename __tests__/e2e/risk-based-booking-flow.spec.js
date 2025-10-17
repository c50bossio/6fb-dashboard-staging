/**
 * End-to-End Tests for Risk-Based Notification System
 * Tests complete booking flow integration with notification scheduling
 */

import { test, expect } from '@playwright/test'

// Test data for different risk tiers
const testCustomers = {
  green: {
    name: 'John Reliable',
    email: 'john.reliable@gmail.com',
    phone: '555-0123',
    expectedTier: 'green',
    expectedNotifications: 1-2
  },
  yellow: {
    name: 'Jane Maybe',
    email: 'jane.generic1234@gmail.com',
    phone: '555-0456',
    expectedTier: 'yellow',
    expectedNotifications: 3-4
  },
  red: {
    name: 'Bob Risk',
    email: 'bob.test@tempmail.com',
    phone: '800-555-0789',
    expectedTier: 'red',
    expectedNotifications: 5-6
  }
}

// Mock API responses for testing
const mockRiskAssessment = (tier) => ({
  success: true,
  risk_assessment: { tier, score: tier === 'green' ? 25 : tier === 'yellow' ? 55 : 85 },
  notifications_scheduled: testCustomers[tier].expectedNotifications,
  strategy: `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier strategy`,
  message: `Notifications scheduled for ${tier}-tier customer`
})

test.describe('Risk-Based Notification System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login to the system
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'c50bossio@gmail.com')
    await page.fill('[data-testid="password"]', 'test-password')
    await page.click('[data-testid="login-button"]')
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test.describe('Public Booking Flow Integration', () => {
    test('should process green-tier customer booking with minimal notifications', async ({ page }) => {
      const customer = testCustomers.green
      
      // Mock the notification API response
      await page.route('/api/customer-behavior/notifications', async (route) => {
        if (route.request().method() === 'POST') {
          const postData = route.request().postDataJSON()
          if (postData.action === 'process_new_booking') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(mockRiskAssessment('green'))
            })
          }
        }
      })

      // Navigate to public booking page
      await page.goto('/book')
      
      // Select service
      await page.click('[data-testid="service-haircut"]')
      
      // Select date and time
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
      await page.click('[data-time="10:00"]')
      
      // Fill customer information
      await page.fill('[data-testid="customer-name"]', customer.name)
      await page.fill('[data-testid="customer-email"]', customer.email)
      await page.fill('[data-testid="customer-phone"]', customer.phone)
      
      // Submit booking
      await page.click('[data-testid="book-appointment"]')
      
      // Wait for booking confirmation
      await expect(page.locator('[data-testid="booking-success"]')).toBeVisible()
      
      // Verify notification system was called
      const notificationRequests = await page.evaluate(() => window.notificationApiCalls || [])
      expect(notificationRequests.length).toBeGreaterThan(0)
      
      // Verify risk tier assessment
      const bookingDetails = await page.locator('[data-testid="booking-details"]').textContent()
      expect(bookingDetails).toContain('Reliable Customer') // Green tier messaging
    })

    test('should process yellow-tier customer with enhanced confirmations', async ({ page }) => {
      const customer = testCustomers.yellow
      
      await page.route('/api/customer-behavior/notifications', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockRiskAssessment('yellow'))
          })
        }
      })

      // Complete booking flow
      await page.goto('/book')
      await page.click('[data-testid="service-beard-trim"]')
      
      const dayAfterTomorrow = new Date()
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
      await page.click(`[data-date="${dayAfterTomorrow.toISOString().split('T')[0]}"]`)
      await page.click('[data-time="14:00"]')
      
      await page.fill('[data-testid="customer-name"]', customer.name)
      await page.fill('[data-testid="customer-email"]', customer.email)
      await page.fill('[data-testid="customer-phone"]', customer.phone)
      
      await page.click('[data-testid="book-appointment"]')
      
      // Verify enhanced confirmation messaging for yellow tier
      await expect(page.locator('[data-testid="booking-success"]')).toBeVisible()
      
      const confirmationMessage = await page.locator('[data-testid="confirmation-message"]').textContent()
      expect(confirmationMessage).toContain('enhanced confirmations')
      expect(confirmationMessage).toContain('reschedule')
    })

    test('should process red-tier customer with white-glove treatment', async ({ page }) => {
      const customer = testCustomers.red
      
      await page.route('/api/customer-behavior/notifications', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockRiskAssessment('red'))
          })
        }
      })

      // Complete booking flow
      await page.goto('/book')
      await page.click('[data-testid="service-full-service"]')
      
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      await page.click(`[data-date="${nextWeek.toISOString().split('T')[0]}"]`)
      await page.click('[data-time="16:00"]')
      
      await page.fill('[data-testid="customer-name"]', customer.name)
      await page.fill('[data-testid="customer-email"]', customer.email)
      await page.fill('[data-testid="customer-phone"]', customer.phone)
      
      await page.click('[data-testid="book-appointment"]')
      
      // Verify white-glove messaging for red tier
      await expect(page.locator('[data-testid="booking-success"]')).toBeVisible()
      
      const confirmationMessage = await page.locator('[data-testid="confirmation-message"]').textContent()
      expect(confirmationMessage).toContain('personal confirmation call')
      expect(confirmationMessage).toContain('detailed follow-up')
    })
  })

  test.describe('Dashboard Integration', () => {
    test('should display notification effectiveness metrics', async ({ page }) => {
      // Mock effectiveness metrics API
      await page.route('/api/customer-behavior/notifications*', async (route) => {
        if (route.request().url().includes('type=effectiveness_metrics')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              metrics: {
                total_notifications: 150,
                delivery_rate: '95.3%',
                engagement_rate: '67.2%',
                effectiveness_by_tier: {
                  green: { total: 50, delivery_rate: '98.0', engagement_rate: '45.0' },
                  yellow: { total: 75, delivery_rate: '94.7', engagement_rate: '72.0' },
                  red: { total: 25, delivery_rate: '92.0', engagement_rate: '88.0' }
                },
                period: 'Last 30 days'
              }
            })
          })
        }
      })

      // Navigate to customer intelligence dashboard
      await page.goto('/dashboard/customers?tab=intelligence')
      
      // Verify effectiveness panel is visible
      await expect(page.locator('[data-testid="notification-effectiveness-panel"]')).toBeVisible()
      
      // Check metrics display
      await expect(page.locator('[data-testid="total-notifications"]')).toContainText('150')
      await expect(page.locator('[data-testid="delivery-rate"]')).toContainText('95.3%')
      await expect(page.locator('[data-testid="engagement-rate"]')).toContainText('67.2%')
      
      // Verify tier-specific metrics
      await expect(page.locator('[data-testid="green-tier-delivery"]')).toContainText('98.0')
      await expect(page.locator('[data-testid="yellow-tier-engagement"]')).toContainText('72.0')
      await expect(page.locator('[data-testid="red-tier-engagement"]')).toContainText('88.0')
    })

    test('should display upcoming notifications', async ({ page }) => {
      const upcomingNotifications = [
        {
          id: 'notification-1',
          type: 'reminder',
          scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          customers: { name: 'John Doe', phone: '555-0123' },
          booking_notification_plans: { 
            customer_risk_tier: 'yellow',
            communication_strategy: 'Enhanced Confirmation'
          }
        },
        {
          id: 'notification-2',
          type: 'personal_confirmation',
          scheduled_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          customers: { name: 'Jane Risk', phone: '555-0789' },
          booking_notification_plans: { 
            customer_risk_tier: 'red',
            communication_strategy: 'White-Glove Concierge'
          }
        }
      ]
      
      await page.route('/api/customer-behavior/notifications*', async (route) => {
        if (route.request().url().includes('type=upcoming_notifications')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              upcoming_notifications: upcomingNotifications,
              count: upcomingNotifications.length
            })
          })
        }
      })

      await page.goto('/dashboard')
      
      // Verify upcoming notifications section
      await expect(page.locator('[data-testid="upcoming-notifications"]')).toBeVisible()
      await expect(page.locator('[data-testid="notification-count"]')).toContainText('2')
      
      // Check individual notifications
      await expect(page.locator('[data-testid="notification-john-doe"]')).toBeVisible()
      await expect(page.locator('[data-testid="notification-jane-risk"]')).toBeVisible()
      
      // Verify risk tier indicators
      await expect(page.locator('[data-testid="tier-yellow"]')).toBeVisible()
      await expect(page.locator('[data-testid="tier-red"]')).toBeVisible()
    })

    test('should show high-risk customer alerts', async ({ page }) => {
      const highRiskAlerts = [
        {
          customer_id: 'customer-risk-1',
          customer_name: 'Bob Risky',
          risk_score: 85,
          risk_tier: 'red',
          appointment_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
          alert_type: 'high_risk_booking',
          urgency: 'high'
        }
      ]
      
      await page.route('/api/customer-behavior/risk-alerts*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            alerts: highRiskAlerts,
            count: highRiskAlerts.length
          })
        })
      })

      await page.goto('/dashboard')
      
      // Verify high-risk alerts are displayed
      await expect(page.locator('[data-testid="high-risk-alerts"]')).toBeVisible()
      await expect(page.locator('[data-testid="alert-bob-risky"]')).toBeVisible()
      await expect(page.locator('[data-testid="risk-score-85"]')).toBeVisible()
    })
  })

  test.describe('Notification Workflow Testing', () => {
    test('should handle appointment rescheduling', async ({ page }) => {
      // Mock reschedule API
      await page.route('/api/customer-behavior/notifications', async (route) => {
        if (route.request().method() === 'POST') {
          const postData = route.request().postDataJSON()
          if (postData.action === 'reschedule_notifications') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                message: 'Notifications rescheduled successfully',
                new_schedule: {
                  notifications_cancelled: 'pending notifications cancelled',
                  notifications_scheduled: 3,
                  strategy: 'Enhanced Confirmation - Moderate Risk'
                }
              })
            })
          }
        }
      })

      // Navigate to appointments page
      await page.goto('/dashboard/appointments')
      
      // Find an appointment to reschedule
      await page.click('[data-testid="appointment-1"] [data-testid="reschedule-button"]')
      
      // Select new date/time
      const newDate = new Date()
      newDate.setDate(newDate.getDate() + 3)
      await page.click(`[data-date="${newDate.toISOString().split('T')[0]}"]`)
      await page.click('[data-time="11:00"]')
      
      // Confirm reschedule
      await page.click('[data-testid="confirm-reschedule"]')
      
      // Verify success message
      await expect(page.locator('[data-testid="reschedule-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="reschedule-success"]')).toContainText('rescheduled successfully')
    })

    test('should update notification status from external webhooks', async ({ page, context }) => {
      // Simulate webhook update (e.g., from SMS provider)
      const webhookPayload = {
        action: 'update_notification_status',
        notification_id: 'notification-123',
        booking_data: {
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          customer_id: 'customer-456',
          barbershop_id: 'shop-789'
        }
      }

      // Mock webhook endpoint
      await page.route('/api/customer-behavior/notifications', async (route) => {
        if (route.request().method() === 'POST') {
          const postData = route.request().postDataJSON()
          if (postData.action === 'update_notification_status') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                message: 'Notification status updated successfully'
              })
            })
          }
        }
      })

      // Trigger webhook simulation
      await context.request.post('/api/customer-behavior/notifications', {
        data: webhookPayload
      })

      // Navigate to notification history to verify update
      await page.goto('/dashboard/customers?customer_id=customer-456')
      
      // Check that notification status is updated
      await expect(page.locator('[data-testid="notification-status-delivered"]')).toBeVisible()
    })
  })

  test.describe('Performance and Reliability', () => {
    test('should process bookings quickly under load', async ({ page }) => {
      const startTime = Date.now()
      
      // Mock fast API response
      await page.route('/api/customer-behavior/notifications', async (route) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRiskAssessment('yellow'))
        })
      })

      // Complete a booking
      await page.goto('/book')
      await page.click('[data-testid="service-haircut"]')
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
      await page.click('[data-time="10:00"]')
      
      await page.fill('[data-testid="customer-name"]', 'Speed Test')
      await page.fill('[data-testid="customer-email"]', 'speed@test.com')
      await page.fill('[data-testid="customer-phone"]', '555-0123')
      
      await page.click('[data-testid="book-appointment"]')
      await expect(page.locator('[data-testid="booking-success"]')).toBeVisible()
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Booking should complete within 10 seconds
      expect(duration).toBeLessThan(10000)
    })

    test('should handle API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('/api/customer-behavior/notifications', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error'
          })
        })
      })

      await page.goto('/book')
      await page.click('[data-testid="service-haircut"]')
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
      await page.click('[data-time="10:00"]')
      
      await page.fill('[data-testid="customer-name"]', 'Failure Test')
      await page.fill('[data-testid="customer-email"]', 'failure@test.com')
      await page.fill('[data-testid="customer-phone"]', '555-0123')
      
      await page.click('[data-testid="book-appointment"]')
      
      // Should still show booking success (with fallback notifications)
      await expect(page.locator('[data-testid="booking-success"]')).toBeVisible()
      
      // Should show warning about basic notifications
      await expect(page.locator('[data-testid="fallback-warning"]')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      
      await page.route('/api/customer-behavior/notifications', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockRiskAssessment('green'))
        })
      })

      await page.goto('/book')
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-booking-form"]')).toBeVisible()
      
      // Complete mobile booking flow
      await page.click('[data-testid="service-haircut"]')
      await page.click('[data-testid="mobile-date-picker"]')
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      await page.click(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`)
      await page.click('[data-time="10:00"]')
      
      await page.fill('[data-testid="customer-name"]', 'Mobile User')
      await page.fill('[data-testid="customer-email"]', 'mobile@test.com')
      await page.fill('[data-testid="customer-phone"]', '555-0123')
      
      await page.click('[data-testid="book-appointment"]')
      
      await expect(page.locator('[data-testid="mobile-booking-success"]')).toBeVisible()
    })
  })
})

// Utility functions for test data generation
export const generateTestBookingData = (tier = 'yellow') => {
  const baseData = {
    booking_id: `test-booking-${Date.now()}`,
    barbershop_id: 'test-shop-789',
    service_name: 'Test Service',
    appointment_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }

  const customerData = testCustomers[tier]
  return {
    ...baseData,
    ...customerData,
    customer_id: `test-customer-${tier}-${Date.now()}`
  }
}

export const waitForNotificationProcessing = async (page, timeout = 5000) => {
  await page.waitForFunction(
    () => window.notificationProcessingComplete === true,
    {},
    { timeout }
  )
}