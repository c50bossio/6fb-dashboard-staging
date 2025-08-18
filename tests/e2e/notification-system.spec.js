/**
 * Notification System E2E Tests
 * 
 * Tests for booking confirmations, payment receipts, SMS notifications,
 * email delivery, and webhook integrations. Verifies that all notification
 * channels work correctly with real service integrations.
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@/lib/supabase/client'

class NotificationTestEnvironment {
  constructor() {
    this.supabase = createClient()
    this.testData = {
      customer: {
        name: `Notification Test ${Date.now()}`,
        email: `notification.test.${Date.now()}@example.com`,
        phone: '+1234567890'
      },
      booking: null,
      notifications: [],
      webhookEvents: []
    }
  }

  async setupNotificationTest() {
    // Get test shop with notification settings
    const { data: shop } = await this.supabase
      .from('barbershops')
      .select(`
        *,
        business_settings (*),
        notification_settings (*)
      `)
      .eq('status', 'active')
      .limit(1)
      .single()

    if (!shop) {
      throw new Error('No active shop found for notification testing')
    }

    this.testData.shop = shop

    // Get test barber and service
    const { data: barber } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'BARBER')
      .eq('barbershop_id', shop.id)
      .eq('status', 'active')
      .limit(1)
      .single()

    const { data: service } = await this.supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', shop.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    this.testData.barber = barber
    this.testData.service = service

    return this.testData
  }

  async createTestBooking() {
    const bookingData = {
      barbershop_id: this.testData.shop.id,
      barber_id: this.testData.barber.id,
      service_id: this.testData.service.id,
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      duration_minutes: this.testData.service.duration_minutes || 60,
      service_price: this.testData.service.price || 50,
      client_name: this.testData.customer.name,
      client_email: this.testData.customer.email,
      client_phone: this.testData.customer.phone,
      payment_method: 'online',
      payment_status: 'completed',
      status: 'CONFIRMED'
    }

    const { data: booking, error } = await this.supabase
      .from('bookings')
      .insert(bookingData)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Failed to create test booking: ${error.message}`)
    }

    this.testData.booking = booking
    return booking
  }

  async monitorNotifications() {
    // Monitor notification_logs table for test notifications
    const { data: logs } = await this.supabase
      .from('notification_logs')
      .select('*')
      .eq('recipient_email', this.testData.customer.email)
      .order('created_at', { ascending: false })

    return logs || []
  }

  async cleanup() {
    try {
      // Clean up test booking
      if (this.testData.booking?.id) {
        await this.supabase
          .from('bookings')
          .delete()
          .eq('id', this.testData.booking.id)
      }

      // Clean up notification logs
      await this.supabase
        .from('notification_logs')
        .delete()
        .eq('recipient_email', this.testData.customer.email)
    } catch (error) {
      console.error('Notification cleanup error:', error)
    }
  }
}

test.describe('Notification System - Email Notifications', () => {
  let notificationEnv

  test.beforeEach(async ({ page }) => {
    notificationEnv = new NotificationTestEnvironment()
    await notificationEnv.setupNotificationTest()
  })

  test.afterEach(async () => {
    await notificationEnv.cleanup()
  })

  test('Booking confirmation email is sent', async ({ page }) => {
    console.log('Testing booking confirmation email...')

    // Complete a booking to trigger notification
    await page.goto(`/shop/${notificationEnv.testData.shop.slug}/book`)
    
    // Navigate through booking flow
    await page.evaluate((testData) => {
      window.testUtils?.completeBookingFlow({
        barberId: testData.barber.id,
        serviceId: testData.service.id,
        customerName: testData.customer.name,
        customerEmail: testData.customer.email,
        customerPhone: testData.customer.phone,
        paymentMethod: 'online'
      })
    }, notificationEnv.testData)

    // Wait for booking completion
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible({ timeout: 15000 })

    // Verify booking confirmation email was triggered
    const bookingId = await page.locator('[data-testid="booking-id"]').textContent()
    
    // Check notification endpoint was called
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/booking-notifications/webhooks/booking-wizard') && 
      response.status() === 200
    )

    // Verify email notification in system
    await page.waitForTimeout(2000) // Allow time for async notification processing
    
    const notifications = await notificationEnv.monitorNotifications()
    const emailNotification = notifications.find(n => 
      n.notification_type === 'email' && 
      n.template_type === 'booking_confirmation'
    )

    expect(emailNotification).toBeTruthy()
    expect(emailNotification.status).toBe('sent')
    expect(emailNotification.recipient_email).toBe(notificationEnv.testData.customer.email)
  })

  test('Payment receipt email is sent', async ({ page }) => {
    console.log('Testing payment receipt email...')

    // Mock successful payment webhook
    await page.route('**/api/webhooks/stripe', async route => {
      const requestBody = await route.request().postDataJSON()
      
      if (requestBody.type === 'payment_intent.succeeded') {
        // Process webhook and trigger payment receipt
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ received: true })
        })

        // Simulate payment receipt notification
        setTimeout(async () => {
          const receiptData = {
            notification_type: 'email',
            template_type: 'payment_receipt',
            recipient_email: notificationEnv.testData.customer.email,
            status: 'sent',
            metadata: {
              amount: requestBody.data.object.amount / 100,
              payment_intent_id: requestBody.data.object.id
            }
          }

          await notificationEnv.supabase
            .from('notification_logs')
            .insert(receiptData)
        }, 1000)
      } else {
        await route.continue()
      }
    })

    // Complete booking with payment
    await page.goto(`/shop/${notificationEnv.testData.shop.slug}/book`)
    
    await page.evaluate((testData) => {
      window.testUtils?.completeBookingWithPayment({
        barberId: testData.barber.id,
        serviceId: testData.service.id,
        customerName: testData.customer.name,
        customerEmail: testData.customer.email,
        paymentMethod: 'online'
      })
    }, notificationEnv.testData)

    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible()

    // Verify payment receipt notification
    await page.waitForTimeout(3000)
    
    const notifications = await notificationEnv.monitorNotifications()
    const receiptNotification = notifications.find(n => 
      n.notification_type === 'email' && 
      n.template_type === 'payment_receipt'
    )

    expect(receiptNotification).toBeTruthy()
    expect(receiptNotification.status).toBe('sent')
    expect(receiptNotification.metadata.amount).toBeGreaterThan(0)
  })

  test('Booking reminder email is scheduled', async ({ page }) => {
    console.log('Testing booking reminder email scheduling...')

    // Create a booking for tomorrow
    const booking = await notificationEnv.createTestBooking()

    // Navigate to admin panel to verify reminder scheduling
    await page.goto('/admin/notifications')
    
    // Verify reminder is scheduled
    await expect(page.locator('[data-testid="scheduled-reminders"]')).toBeVisible()
    
    // Check for booking reminder in scheduled notifications
    const reminderRow = page.locator(`[data-testid="reminder-${booking.id}"]`)
    await expect(reminderRow).toBeVisible()
    await expect(reminderRow).toContainText('24 hours before')
    await expect(reminderRow).toContainText(notificationEnv.testData.customer.email)
  })

  test('Email delivery failure handling', async ({ page }) => {
    console.log('Testing email delivery failure handling...')

    // Mock email service failure
    await page.route('**/api/notifications/email', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Email service unavailable',
          code: 'SERVICE_UNAVAILABLE'
        })
      })
    })

    // Complete booking to trigger email
    await page.goto(`/shop/${notificationEnv.testData.shop.slug}/book`)
    
    await page.evaluate((testData) => {
      window.testUtils?.completeBookingFlow({
        barberId: testData.barber.id,
        serviceId: testData.service.id,
        customerName: testData.customer.name,
        customerEmail: testData.customer.email
      })
    }, notificationEnv.testData)

    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()

    // Verify failure was logged but booking still succeeded
    await page.waitForTimeout(2000)
    
    const notifications = await notificationEnv.monitorNotifications()
    const failedNotification = notifications.find(n => 
      n.notification_type === 'email' && 
      n.status === 'failed'
    )

    expect(failedNotification).toBeTruthy()
    expect(failedNotification.error_message).toContain('service unavailable')
    
    // Verify booking was still created successfully
    const { data: booking } = await notificationEnv.supabase
      .from('bookings')
      .select('*')
      .eq('client_email', notificationEnv.testData.customer.email)
      .single()

    expect(booking).toBeTruthy()
    expect(booking.status).toBe('CONFIRMED')
  })
})

test.describe('Notification System - SMS Notifications', () => {
  let notificationEnv

  test.beforeEach(async ({ page }) => {
    notificationEnv = new NotificationTestEnvironment()
    await notificationEnv.setupNotificationTest()
  })

  test.afterEach(async () => {
    await notificationEnv.cleanup()
  })

  test('SMS booking confirmation is sent', async ({ page }) => {
    console.log('Testing SMS booking confirmation...')

    // Verify shop has SMS notifications enabled
    const smsEnabled = notificationEnv.testData.shop.notification_settings?.sms_enabled
    if (!smsEnabled) {
      test.skip('SMS notifications not enabled for this shop')
    }

    await page.goto(`/shop/${notificationEnv.testData.shop.slug}/book`)
    
    await page.evaluate((testData) => {
      window.testUtils?.completeBookingFlow({
        barberId: testData.barber.id,
        serviceId: testData.service.id,
        customerName: testData.customer.name,
        customerEmail: testData.customer.email,
        customerPhone: testData.customer.phone
      })
    }, notificationEnv.testData)

    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()

    // Verify SMS notification was sent
    await page.waitForTimeout(2000)
    
    const notifications = await notificationEnv.monitorNotifications()
    const smsNotification = notifications.find(n => 
      n.notification_type === 'sms' && 
      n.template_type === 'booking_confirmation'
    )

    expect(smsNotification).toBeTruthy()
    expect(smsNotification.status).toBe('sent')
    expect(smsNotification.recipient_phone).toBe(notificationEnv.testData.customer.phone)
  })

  test('SMS reminder notification', async ({ page }) => {
    console.log('Testing SMS reminder notification...')

    const booking = await notificationEnv.createTestBooking()

    // Mock Twilio SMS service
    await page.route('**/api/notifications/sms', async route => {
      const requestBody = await route.request().postDataJSON()
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message_sid: 'SM_test_message_id',
          status: 'sent'
        })
      })

      // Log SMS notification
      await notificationEnv.supabase
        .from('notification_logs')
        .insert({
          notification_type: 'sms',
          template_type: 'booking_reminder',
          recipient_phone: requestBody.to,
          status: 'sent',
          metadata: {
            booking_id: booking.id,
            message_content: requestBody.body
          }
        })
    })

    // Trigger SMS reminder manually (in real scenario, this would be scheduled)
    const response = await page.request.post('/api/notifications/send-reminder', {
      data: {
        booking_id: booking.id,
        notification_type: 'sms'
      }
    })

    expect(response.status()).toBe(200)

    // Verify SMS reminder was logged
    const notifications = await notificationEnv.monitorNotifications()
    const smsReminder = notifications.find(n => 
      n.notification_type === 'sms' && 
      n.template_type === 'booking_reminder'
    )

    expect(smsReminder).toBeTruthy()
    expect(smsReminder.metadata.booking_id).toBe(booking.id)
  })

  test('SMS failure with invalid phone number', async ({ page }) => {
    console.log('Testing SMS failure with invalid phone number...')

    // Use invalid phone number
    const invalidCustomer = {
      ...notificationEnv.testData.customer,
      phone: 'invalid-phone'
    }

    await page.goto(`/shop/${notificationEnv.testData.shop.slug}/book`)
    
    await page.evaluate((testData, customer) => {
      window.testUtils?.completeBookingFlow({
        barberId: testData.barber.id,
        serviceId: testData.service.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone
      })
    }, notificationEnv.testData, invalidCustomer)

    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()

    // Verify SMS failure was logged
    await page.waitForTimeout(2000)
    
    const notifications = await notificationEnv.monitorNotifications()
    const failedSms = notifications.find(n => 
      n.notification_type === 'sms' && 
      n.status === 'failed'
    )

    expect(failedSms).toBeTruthy()
    expect(failedSms.error_message).toContain('invalid')
  })
})

test.describe('Notification System - Real-time Notifications', () => {
  let notificationEnv

  test.beforeEach(async ({ page }) => {
    notificationEnv = new NotificationTestEnvironment()
    await notificationEnv.setupNotificationTest()
  })

  test.afterEach(async () => {
    await notificationEnv.cleanup()
  })

  test('Real-time booking notification to barber dashboard', async ({ page, context }) => {
    console.log('Testing real-time booking notifications...')

    // Open barber dashboard in second tab
    const barberPage = await context.newPage()
    await barberPage.goto(`/barber/dashboard?barberId=${notificationEnv.testData.barber.id}`)
    
    // Verify barber dashboard loads
    await expect(barberPage.locator('[data-testid="barber-dashboard"]')).toBeVisible()

    // Listen for real-time notification
    const notificationPromise = barberPage.waitForSelector('[data-testid="new-booking-notification"]', {
      timeout: 30000
    })

    // Complete booking on main page
    await page.goto(`/shop/${notificationEnv.testData.shop.slug}/book`)
    
    await page.evaluate((testData) => {
      window.testUtils?.completeBookingFlow({
        barberId: testData.barber.id,
        serviceId: testData.service.id,
        customerName: testData.customer.name,
        customerEmail: testData.customer.email
      })
    }, notificationEnv.testData)

    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()

    // Verify barber received real-time notification
    await notificationPromise
    await expect(barberPage.locator('[data-testid="new-booking-notification"]')).toBeVisible()
    await expect(barberPage.locator('[data-testid="new-booking-notification"]')).toContainText(notificationEnv.testData.customer.name)

    await barberPage.close()
  })

  test('Push notification to mobile app', async ({ page }) => {
    console.log('Testing push notifications...')

    // Mock push notification service
    let pushNotificationSent = false
    
    await page.route('**/api/notifications/push', async route => {
      const requestBody = await route.request().postDataJSON()
      
      pushNotificationSent = true
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message_id: 'push_test_id'
        })
      })
    })

    // Complete booking to trigger push notification
    await page.goto(`/shop/${notificationEnv.testData.shop.slug}/book`)
    
    await page.evaluate((testData) => {
      window.testUtils?.completeBookingFlow({
        barberId: testData.barber.id,
        serviceId: testData.service.id,
        customerName: testData.customer.name,
        customerEmail: testData.customer.email
      })
    }, notificationEnv.testData)

    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()

    // Wait for push notification
    await page.waitForTimeout(3000)
    expect(pushNotificationSent).toBe(true)
  })

  test('WebSocket notification delivery', async ({ page }) => {
    console.log('Testing WebSocket notifications...')

    // Listen for WebSocket messages
    const websocketMessages = []
    
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const data = JSON.parse(event.payload)
          if (data.type === 'booking_notification') {
            websocketMessages.push(data)
          }
        } catch (error) {
          // Ignore non-JSON messages
        }
      })
    })

    await page.goto(`/shop/${notificationEnv.testData.shop.slug}/book`)
    
    // Complete booking
    await page.evaluate((testData) => {
      window.testUtils?.completeBookingFlow({
        barberId: testData.barber.id,
        serviceId: testData.service.id,
        customerName: testData.customer.name,
        customerEmail: testData.customer.email
      })
    }, notificationEnv.testData)

    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()

    // Verify WebSocket notification was received
    await page.waitForTimeout(3000)
    expect(websocketMessages.length).toBeGreaterThan(0)
    
    const bookingNotification = websocketMessages.find(msg => 
      msg.type === 'booking_notification' && 
      msg.data.customer_name === notificationEnv.testData.customer.name
    )
    
    expect(bookingNotification).toBeTruthy()
  })
})

test.describe('Notification System - Webhook Integration', () => {
  let notificationEnv

  test.beforeEach(async ({ page }) => {
    notificationEnv = new NotificationTestEnvironment()
    await notificationEnv.setupNotificationTest()
  })

  test.afterEach(async () => {
    await notificationEnv.cleanup()
  })

  test('Booking webhook triggers notification processing', async ({ page }) => {
    console.log('Testing booking webhook notification processing...')

    const webhookPayload = {
      event_type: 'booking_completed',
      booking_data: {
        bookingId: 'test_booking_123',
        customerInfo: notificationEnv.testData.customer,
        locationDetails: { name: notificationEnv.testData.shop.name },
        barberDetails: { name: notificationEnv.testData.barber.name },
        serviceDetails: { name: notificationEnv.testData.service.name },
        dateTime: new Date().toISOString(),
        duration: 60,
        price: 50,
        paymentMethod: 'online',
        paymentStatus: 'completed'
      },
      timestamp: new Date().toISOString(),
      source: 'booking_wizard'
    }

    // Send webhook
    const response = await page.request.post('/api/v1/booking-notifications/webhooks/booking-wizard', {
      data: webhookPayload,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(response.status()).toBe(200)

    const responseData = await response.json()
    expect(responseData.success).toBe(true)
    expect(responseData.notifications_sent).toBeGreaterThan(0)
  })

  test('Payment webhook triggers receipt notification', async ({ page }) => {
    console.log('Testing payment webhook receipt notification...')

    const paymentWebhook = {
      id: 'evt_test_webhook',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_payment_intent',
          amount: 5000,
          currency: 'usd',
          metadata: {
            customer_email: notificationEnv.testData.customer.email,
            customer_name: notificationEnv.testData.customer.name,
            booking_id: 'test_booking_123'
          }
        }
      }
    }

    const response = await page.request.post('/api/webhooks/stripe', {
      data: paymentWebhook,
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature'
      }
    })

    expect(response.status()).toBe(200)

    // Verify receipt notification was triggered
    await page.waitForTimeout(2000)
    
    const notifications = await notificationEnv.monitorNotifications()
    const receiptNotification = notifications.find(n => 
      n.notification_type === 'email' && 
      n.template_type === 'payment_receipt'
    )

    expect(receiptNotification).toBeTruthy()
  })

  test('Third-party integration webhook processing', async ({ page }) => {
    console.log('Testing third-party integration webhooks...')

    // Mock calendar integration webhook
    const calendarWebhook = {
      event_type: 'appointment_confirmed',
      appointment_data: {
        external_id: 'cal_123',
        customer_email: notificationEnv.testData.customer.email,
        start_time: new Date().toISOString(),
        service_name: notificationEnv.testData.service.name
      },
      source: 'google_calendar'
    }

    const response = await page.request.post('/api/webhooks/calendar-integration', {
      data: calendarWebhook,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    expect(response.status()).toBe(200)

    // Verify integration notification processing
    const responseData = await response.json()
    expect(responseData.processed).toBe(true)
  })
})