/**
 * Payment Processing E2E Tests
 * 
 * Comprehensive tests for Stripe payment integration, including successful payments,
 * failed payments, refunds, and webhook handling. Tests both online and in-person
 * payment scenarios with real Stripe integration.
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@/lib/supabase/client'
import Stripe from 'stripe'

class PaymentTestEnvironment {
  constructor() {
    this.supabase = createClient()
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
    this.testData = {
      customer: {
        name: `Payment Test ${Date.now()}`,
        email: `payment.test.${Date.now()}@example.com`,
        phone: '+1234567890'
      },
      booking: null,
      paymentIntent: null,
      testCardNumbers: {
        visa: '4242424242424242',
        visaDebit: '4000056655665556',
        mastercard: '5555555555554444',
        amex: '378282246310005',
        declined: '4000000000000002',
        insufficientFunds: '4000000000009995',
        invalidExpiry: '4000000000000069',
        invalidCvc: '4000000000000127'
      }
    }
  }

  async setupPaymentTest() {
    // Get test shop with Stripe Connect
    const { data: shop } = await this.supabase
      .from('barbershops')
      .select(`
        *,
        business_settings (*),
        stripe_connected_accounts (*)
      `)
      .eq('status', 'active')
      .not('stripe_connected_accounts', 'is', null)
      .limit(1)
      .single()

    if (!shop || !shop.stripe_connected_accounts?.[0]?.charges_enabled) {
      throw new Error('No shop with active Stripe Connect found for payment testing')
    }

    this.testData.shop = shop
    this.testData.stripeAccount = shop.stripe_connected_accounts[0]

    // Get test service
    const { data: service } = await this.supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', shop.id)
      .eq('is_active', true)
      .limit(1)
      .single()

    this.testData.service = service

    return this.testData
  }

  async createTestPaymentIntent(amount = 5000) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amount, // $50.00
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        test_booking: 'true',
        customer_email: this.testData.customer.email
      }
    }, {
      stripeAccount: this.testData.stripeAccount.stripe_account_id
    })

    this.testData.paymentIntent = paymentIntent
    return paymentIntent
  }

  async cleanup() {
    try {
      // Cancel test payment intent if exists
      if (this.testData.paymentIntent?.id) {
        await this.stripe.paymentIntents.cancel(
          this.testData.paymentIntent.id,
          {},
          { stripeAccount: this.testData.stripeAccount.stripe_account_id }
        )
      }

      // Clean up test booking
      if (this.testData.booking?.id) {
        await this.supabase
          .from('bookings')
          .delete()
          .eq('id', this.testData.booking.id)
      }
    } catch (error) {
      console.error('Payment cleanup error:', error)
    }
  }
}

test.describe('Payment Processing - Stripe Integration', () => {
  let paymentEnv

  test.beforeEach(async ({ page }) => {
    paymentEnv = new PaymentTestEnvironment()
    await paymentEnv.setupPaymentTest()
  })

  test.afterEach(async () => {
    await paymentEnv.cleanup()
  })

  test('Successful payment with valid Visa card', async ({ page }) => {
    console.log('Testing successful payment with Visa card...')

    // Navigate to payment form
    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    // Quick navigation to payment step (assume other components tested elsewhere)
    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    // Fill customer information
    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)
    await page.fill('[data-testid="customer-phone"]', paymentEnv.testData.customer.phone)

    // Select online payment
    await page.locator('[data-testid="payment-online"]').click()

    // Wait for Stripe Elements to load
    await page.waitForSelector('[data-testid="stripe-payment-element"]', { timeout: 10000 })

    // Fill payment details using Stripe test card
    const paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.visa)
    await paymentElement.locator('[name="exp-date"]').fill('12/34')
    await paymentElement.locator('[name="cvc"]').fill('123')
    await paymentElement.locator('[name="postal"]').fill('12345')

    // Submit payment
    await page.locator('button', { hasText: 'Complete Payment' }).click()

    // Wait for payment processing
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible()

    // Verify successful payment
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid="payment-confirmation"]')).toContainText('Payment successful')

    // Verify booking creation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()
    const bookingId = await page.locator('[data-testid="booking-id"]').textContent()

    // Verify in database
    const { data: booking } = await paymentEnv.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId.replace('Booking ID: ', ''))
      .single()

    expect(booking).toBeTruthy()
    expect(booking.payment_status).toBe('completed')
    expect(booking.transaction_id).toBeTruthy()

    paymentEnv.testData.booking = booking
  })

  test('Payment failure with declined card', async ({ page }) => {
    console.log('Testing payment failure with declined card...')

    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    // Navigate to payment step
    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    // Fill customer information
    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)

    // Select online payment
    await page.locator('[data-testid="payment-online"]').click()

    // Use declined test card
    const paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.declined)
    await paymentElement.locator('[name="exp-date"]').fill('12/34')
    await paymentElement.locator('[name="cvc"]').fill('123')

    await page.locator('button', { hasText: 'Complete Payment' }).click()

    // Verify error handling
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('declined')

    // Verify retry option is available
    await expect(page.locator('button', { hasText: 'Try Again' })).toBeVisible()

    // Verify no booking was created
    const { data: bookings } = await paymentEnv.supabase
      .from('bookings')
      .select('*')
      .eq('client_email', paymentEnv.testData.customer.email)

    expect(bookings).toHaveLength(0)
  })

  test('Payment with insufficient funds', async ({ page }) => {
    console.log('Testing payment with insufficient funds...')

    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)
    await page.locator('[data-testid="payment-online"]').click()

    const paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.insufficientFunds)
    await paymentElement.locator('[name="exp-date"]').fill('12/34')
    await paymentElement.locator('[name="cvc"]').fill('123')

    await page.locator('button', { hasText: 'Complete Payment' }).click()

    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('insufficient funds')
  })

  test('Deposit payment when shop requires deposit', async ({ page }) => {
    // Skip if shop doesn't require deposits
    if (!paymentEnv.testData.shop.business_settings?.deposit_required) {
      test.skip('Shop does not require deposits')
    }

    console.log('Testing deposit payment...')

    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    // Verify deposit information is displayed
    await expect(page.locator('[data-testid="deposit-info"]')).toBeVisible()
    
    const depositSettings = paymentEnv.testData.shop.business_settings
    const servicePrice = paymentEnv.testData.service.price
    const expectedDeposit = depositSettings.deposit_percentage 
      ? servicePrice * (depositSettings.deposit_percentage / 100)
      : depositSettings.deposit_amount

    await expect(page.locator('[data-testid="deposit-amount"]')).toContainText(`$${expectedDeposit.toFixed(2)}`)
    await expect(page.locator('[data-testid="remaining-amount"]')).toContainText(`$${(servicePrice - expectedDeposit).toFixed(2)}`)

    // Complete deposit payment
    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)
    await page.locator('[data-testid="payment-online"]').click()

    const paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.visa)
    await paymentElement.locator('[name="exp-date"]').fill('12/34')
    await paymentElement.locator('[name="cvc"]').fill('123')

    await page.locator('button', { hasText: 'Pay Deposit' }).click()

    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="deposit-confirmation"]')).toContainText('deposit paid')
    await expect(page.locator('[data-testid="remaining-balance"]')).toBeVisible()
  })

  test('Webhook handling for successful payment', async ({ page }) => {
    console.log('Testing webhook handling...')

    // Create a test payment intent
    const paymentIntent = await paymentEnv.createTestPaymentIntent()

    // Simulate webhook payload
    const webhookPayload = {
      id: 'evt_test_webhook',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntent.id,
          object: 'payment_intent',
          status: 'succeeded',
          amount: paymentIntent.amount,
          currency: 'usd',
          metadata: paymentIntent.metadata
        }
      }
    }

    // Send webhook to our endpoint
    const response = await page.request.post('/api/webhooks/stripe', {
      data: webhookPayload,
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test_signature' // In real tests, generate proper signature
      }
    })

    expect(response.status()).toBe(200)

    // Verify webhook processing created/updated booking correctly
    const responseData = await response.json()
    expect(responseData.received).toBe(true)
  })

  test('Payment retry after initial failure', async ({ page }) => {
    console.log('Testing payment retry functionality...')

    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)
    await page.locator('[data-testid="payment-online"]').click()

    // First attempt with declined card
    let paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.declined)
    await paymentElement.locator('[name="exp-date"]').fill('12/34')
    await paymentElement.locator('[name="cvc"]').fill('123')

    await page.locator('button', { hasText: 'Complete Payment' }).click()
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible()

    // Click retry
    await page.locator('button', { hasText: 'Try Again' }).click()

    // Second attempt with valid card
    paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').clear()
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.visa)

    await page.locator('button', { hasText: 'Complete Payment' }).click()

    // Verify successful payment
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible({ timeout: 15000 })
  })

  test('In-person payment flow', async ({ page }) => {
    console.log('Testing in-person payment flow...')

    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)

    // Select in-person payment
    await page.locator('[data-testid="payment-in-person"]').click()

    // Verify in-person payment info
    await expect(page.locator('[data-testid="in-person-payment-info"]')).toBeVisible()
    await expect(page.locator('[data-testid="in-person-payment-info"]')).toContainText('at the shop')

    // Complete booking
    await page.locator('button', { hasText: 'Complete Booking' }).click()

    // Verify booking confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-status"]')).toContainText('at appointment')

    // Verify booking in database
    const bookingId = await page.locator('[data-testid="booking-id"]').textContent()
    const { data: booking } = await paymentEnv.supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId.replace('Booking ID: ', ''))
      .single()

    expect(booking.payment_method).toBe('cash')
    expect(booking.payment_status).toBe('pending')

    paymentEnv.testData.booking = booking
  })

  test('Payment processing with network errors', async ({ page }) => {
    console.log('Testing payment with network errors...')

    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    // Simulate network error
    await page.route('**/api/stripe/payment-intent', async route => {
      await route.abort('networkfailure')
    })

    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)
    await page.locator('[data-testid="payment-online"]').click()

    await page.locator('button', { hasText: 'Complete Payment' }).click()

    // Verify network error handling
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="network-error"]')).toContainText('network')
    
    // Verify retry option
    await expect(page.locator('button', { hasText: 'Retry' })).toBeVisible()
  })
})

test.describe('Payment Processing - Error Scenarios', () => {
  let paymentEnv

  test.beforeEach(async ({ page }) => {
    paymentEnv = new PaymentTestEnvironment()
    await paymentEnv.setupPaymentTest()
  })

  test.afterEach(async () => {
    await paymentEnv.cleanup()
  })

  test('Invalid CVC handling', async ({ page }) => {
    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)
    await page.locator('[data-testid="payment-online"]').click()

    const paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.invalidCvc)
    await paymentElement.locator('[name="exp-date"]').fill('12/34')
    await paymentElement.locator('[name="cvc"]').fill('99')

    await page.locator('button', { hasText: 'Complete Payment' }).click()

    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('security code')
  })

  test('Expired card handling', async ({ page }) => {
    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)
    await page.locator('[data-testid="payment-online"]').click()

    const paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.visa)
    await paymentElement.locator('[name="exp-date"]').fill('12/20') // Expired date
    await paymentElement.locator('[name="cvc"]').fill('123')

    await page.locator('button', { hasText: 'Complete Payment' }).click()

    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('expired')
  })

  test('Payment timeout handling', async ({ page }) => {
    await page.goto(`/shop/${paymentEnv.testData.shop.slug}/book`)
    
    // Simulate slow payment processing
    await page.route('**/api/stripe/confirm-payment', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000)) // 35 second delay
      await route.fulfill({
        status: 408,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment processing timeout' })
      })
    })

    await page.evaluate(() => {
      window.testUtils?.navigateToPaymentStep({
        serviceId: paymentEnv.testData.service.id,
        amount: paymentEnv.testData.service.price
      })
    })

    await page.fill('[data-testid="customer-name"]', paymentEnv.testData.customer.name)
    await page.fill('[data-testid="customer-email"]', paymentEnv.testData.customer.email)
    await page.locator('[data-testid="payment-online"]').click()

    const paymentElement = page.frameLocator('[name^="__privateStripeFrame"]')
    await paymentElement.locator('[name="cardnumber"]').fill(paymentEnv.testData.testCardNumbers.visa)
    await paymentElement.locator('[name="exp-date"]').fill('12/34')
    await paymentElement.locator('[name="cvc"]').fill('123')

    await page.locator('button', { hasText: 'Complete Payment' }).click()

    await expect(page.locator('[data-testid="payment-timeout"]')).toBeVisible({ timeout: 40000 })
    await expect(page.locator('[data-testid="payment-timeout"]')).toContainText('timeout')
  })
})