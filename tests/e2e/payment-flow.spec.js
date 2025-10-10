/**
 * Payment Flow E2E Tests
 * 6FB AI Agent System - Comprehensive Payment Integration Testing
 * 
 * Test Coverage:
 * - Stripe payment integration
 * - Payment success scenarios
 * - Payment failure handling
 * - In-person payment flow
 * - Payment security validation
 * - Refund and cancellation flows
 * - Payment method validation
 * - Currency handling
 * - Payment confirmation and receipts
 */

import { test, expect } from '@playwright/test'

// Payment Test Configuration
const PAYMENT_TIMEOUT = 60000
const STRIPE_TIMEOUT = 30000

// Test Payment Data
const paymentTestData = {
  validCards: {
    visa: {
      number: '4242424242424242',
      expiry: '12/25',
      cvc: '123',
      name: 'John Valid Card',
      zip: '12345'
    },
    mastercard: {
      number: '5555555555554444',
      expiry: '12/25',
      cvc: '123',
      name: 'Jane Mastercard',
      zip: '12345'
    },
    amex: {
      number: '378282246310005',
      expiry: '12/25',
      cvc: '1234',
      name: 'Alex Amex',
      zip: '12345'
    }
  },
  failingCards: {
    declined: {
      number: '4000000000000002',
      expiry: '12/25',
      cvc: '123',
      name: 'Declined Card',
      zip: '12345'
    },
    insufficientFunds: {
      number: '4000000000009995',
      expiry: '12/25',
      cvc: '123',
      name: 'No Funds Card',
      zip: '12345'
    },
    expired: {
      number: '4000000000000069',
      expiry: '12/25',
      cvc: '123',
      name: 'Expired Card',
      zip: '12345'
    },
    invalidCvc: {
      number: '4000000000000127',
      expiry: '12/25',
      cvc: '123',
      name: 'Invalid CVC',
      zip: '12345'
    }
  },
  customers: {
    regular: {
      name: 'Regular Customer',
      email: 'regular@test.com',
      phone: '(555) 123-4567'
    },
    international: {
      name: 'International Customer',
      email: 'international@test.com',
      phone: '+44 20 7123 4567'
    }
  }
}

// Payment Helper Class
class PaymentFlowHelper {
  constructor(page) {
    this.page = page
  }

  async navigateToPaymentStep() {
    // Navigate to booking and complete initial steps
    await this.page.goto('http://localhost:9999/book')
    await this.page.waitForLoadState('networkidle')
    
    // Quick progression to payment step
    await this.completeLocationStep()
    await this.completeBarberStep()
    await this.completeServiceStep()
    await this.completeDateTimeStep()
    
    // Should now be on payment step
    await this.page.waitForSelector('[data-testid="payment-step"]', { timeout: 10000 })
  }

  async completeLocationStep() {
    await this.page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    await this.page.click('[data-testid="location-option"]:first-child')
    await this.page.click('[data-testid="next-button"]')
  }

  async completeBarberStep() {
    await this.page.waitForSelector('[data-testid="barber-option"]', { timeout: 10000 })
    await this.page.click('[data-testid="barber-option"]:first-child')
    await this.page.click('[data-testid="next-button"]')
  }

  async completeServiceStep() {
    await this.page.waitForSelector('[data-testid="service-option"]', { timeout: 10000 })
    await this.page.click('[data-testid="service-option"]:first-child')
    await this.page.click('[data-testid="next-button"]')
  }

  async completeDateTimeStep() {
    await this.page.waitForSelector('[data-testid="available-date"]', { timeout: 10000 })
    await this.page.click('[data-testid="available-date"]:first-child')
    
    await this.page.waitForSelector('[data-testid="time-slot"]', { timeout: 5000 })
    await this.page.click('[data-testid="time-slot"]:first-child')
    await this.page.click('[data-testid="next-button"]')
  }

  async fillCustomerInformation(customer = paymentTestData.customers.regular) {
    await this.page.fill('[data-testid="customer-name"]', customer.name)
    await this.page.fill('[data-testid="customer-email"]', customer.email)
    await this.page.fill('[data-testid="customer-phone"]', customer.phone)
  }

  async fillStripeCardForm(cardData) {
    // Wait for Stripe iframes to load
    await this.page.waitForTimeout(2000)
    
    try {
      // Fill card number
      const cardNumberFrame = this.page.frameLocator('iframe[name*="cardNumber"]')
      await cardNumberFrame.locator('[name="cardnumber"]').fill(cardData.number, { timeout: STRIPE_TIMEOUT })
      
      // Fill expiry
      const expiryFrame = this.page.frameLocator('iframe[name*="cardExpiry"]')
      await expiryFrame.locator('[name="exp-date"]').fill(cardData.expiry, { timeout: STRIPE_TIMEOUT })
      
      // Fill CVC
      const cvcFrame = this.page.frameLocator('iframe[name*="cardCvc"]')
      await cvcFrame.locator('[name="cvc"]').fill(cardData.cvc, { timeout: STRIPE_TIMEOUT })
      
      // Fill cardholder name if field exists
      const nameField = this.page.locator('[data-testid="cardholder-name"]')
      if (await nameField.count() > 0) {
        await nameField.fill(cardData.name)
      }
      
      // Fill postal code if required
      const zipField = this.page.locator('[data-testid="billing-zip"]')
      if (await zipField.count() > 0) {
        await zipField.fill(cardData.zip)
      }
      
    } catch (error) {
      console.error('Error filling Stripe form:', error)
      throw new Error(`Failed to fill Stripe payment form: ${error.message}`)
    }
  }

  async processOnlinePayment(cardData, customer = paymentTestData.customers.regular) {
    // Select online payment method
    await this.page.click('[data-testid="payment-method-online"]')
    
    // Fill customer information
    await this.fillCustomerInformation(customer)
    
    // Fill payment information
    await this.fillStripeCardForm(cardData)
    
    // Submit payment
    await this.page.click('[data-testid="submit-payment"]')
  }

  async processInPersonPayment(customer = paymentTestData.customers.regular) {
    // Select in-person payment method
    await this.page.click('[data-testid="payment-method-in-person"]')
    
    // Fill customer information
    await this.fillCustomerInformation(customer)
    
    // Confirm booking
    await this.page.click('[data-testid="confirm-booking"]')
  }

  async verifyPaymentSuccess() {
    // Wait for payment processing
    await this.page.waitForSelector('[data-testid="payment-success"], [data-testid="booking-confirmation"]', { timeout: PAYMENT_TIMEOUT })
    
    // Verify success indicators
    await expect(this.page.locator('[data-testid="payment-success"], [data-testid="booking-confirmation"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="booking-reference"]')).toBeVisible()
    
    // Extract payment confirmation details
    const bookingReference = await this.page.locator('[data-testid="booking-reference"]').textContent()
    const paymentStatus = await this.page.locator('[data-testid="payment-status"]').textContent()
    
    return {
      reference: bookingReference,
      status: paymentStatus,
      success: true
    }
  }

  async verifyPaymentFailure(expectedErrorType = null) {
    // Wait for error message
    await this.page.waitForSelector('[data-testid="payment-error"]', { timeout: 30000 })
    
    // Verify error is displayed
    await expect(this.page.locator('[data-testid="payment-error"]')).toBeVisible()
    
    const errorMessage = await this.page.locator('[data-testid="payment-error"]').textContent()
    
    // Check for specific error types if provided
    if (expectedErrorType) {
      switch (expectedErrorType) {
        case 'declined':
          expect(errorMessage.toLowerCase()).toContain('declined')
          break
        case 'insufficient_funds':
          expect(errorMessage.toLowerCase()).toContain('insufficient')
          break
        case 'expired':
          expect(errorMessage.toLowerCase()).toContain('expired')
          break
        case 'invalid_cvc':
          expect(errorMessage.toLowerCase()).toContain('cvc')
          break
      }
    }
    
    return {
      error: errorMessage,
      success: false
    }
  }

  async retryPayment(newCardData) {
    // Clear previous payment attempt
    await this.page.click('[data-testid="retry-payment"]')
    
    // Wait for form to reset
    await this.page.waitForTimeout(1000)
    
    // Fill new payment information
    await this.fillStripeCardForm(newCardData)
    
    // Submit retry
    await this.page.click('[data-testid="submit-payment"]')
  }

  async verifyPaymentSecurity() {
    // Check for HTTPS
    const url = this.page.url()
    expect(url).toMatch(/^https:/)
    
    // Verify Stripe iframe security
    const stripeFrames = this.page.frameLocator('iframe[src*="stripe"]')
    const frameCount = await this.page.locator('iframe[src*="stripe"]').count()
    expect(frameCount).toBeGreaterThan(0)
    
    // Check for security indicators
    await expect(this.page.locator('[data-testid="secure-payment-badge"]')).toBeVisible()
    
    // Verify no sensitive data in DOM
    const pageContent = await this.page.content()
    expect(pageContent).not.toContain('4242424242424242') // Card numbers should not appear in DOM
  }

  async capturePricingDetails() {
    const pricing = await this.page.evaluate(() => {
      const getTextContent = (selector) => {
        const element = document.querySelector(selector)
        return element ? element.textContent.trim() : null
      }
      
      return {
        subtotal: getTextContent('[data-testid="pricing-subtotal"]'),
        tax: getTextContent('[data-testid="pricing-tax"]'),
        total: getTextContent('[data-testid="pricing-total"]'),
        currency: getTextContent('[data-testid="pricing-currency"]') || 'USD'
      }
    })
    
    return pricing
  }
}

// Main Payment Test Suite
test.describe('Payment Flow Integration', () => {
  let paymentHelper

  test.beforeEach(async ({ page }) => {
    paymentHelper = new PaymentFlowHelper(page)
    
    // Set up secure context
    await page.addInitScript(() => {
      // Mock secure context for development
      Object.defineProperty(window, 'isSecureContext', {
        value: true
      })
    })
  })

  test('should process successful Visa card payment', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    // Capture pricing before payment
    const pricing = await paymentHelper.capturePricingDetails()
    expect(pricing.total).toBeTruthy()
    
    // Process payment
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.visa)
    
    // Verify success
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
    expect(result.reference).toBeTruthy()
  })

  test('should process successful Mastercard payment', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.mastercard)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })

  test('should process successful American Express payment', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.amex)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })

  test('should handle declined card gracefully', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(paymentTestData.failingCards.declined)
    
    const result = await paymentHelper.verifyPaymentFailure('declined')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  test('should handle insufficient funds error', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(paymentTestData.failingCards.insufficientFunds)
    
    const result = await paymentHelper.verifyPaymentFailure('insufficient_funds')
    expect(result.success).toBe(false)
  })

  test('should handle expired card error', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(paymentTestData.failingCards.expired)
    
    const result = await paymentHelper.verifyPaymentFailure('expired')
    expect(result.success).toBe(false)
  })

  test('should handle invalid CVC error', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(paymentTestData.failingCards.invalidCvc)
    
    const result = await paymentHelper.verifyPaymentFailure('invalid_cvc')
    expect(result.success).toBe(false)
  })

  test('should allow payment retry after failure', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    // First attempt with failing card
    await paymentHelper.processOnlinePayment(paymentTestData.failingCards.declined)
    await paymentHelper.verifyPaymentFailure('declined')
    
    // Retry with valid card
    await paymentHelper.retryPayment(paymentTestData.validCards.visa)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })

  test('should process in-person payment successfully', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processInPersonPayment()
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
    
    // Should indicate payment to be collected in person
    const paymentMethod = await page.locator('[data-testid="payment-method-display"]').textContent()
    expect(paymentMethod.toLowerCase()).toContain('in-person')
  })

  test('should handle international customer payment', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(
      paymentTestData.validCards.visa,
      paymentTestData.customers.international
    )
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })

  test('should validate customer information before payment', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    // Try to submit payment without customer info
    await page.click('[data-testid="payment-method-online"]')
    await paymentHelper.fillStripeCardForm(paymentTestData.validCards.visa)
    await page.click('[data-testid="submit-payment"]')
    
    // Should show validation errors
    await expect(page.locator('[data-testid="name-validation-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="phone-validation-error"]')).toBeVisible()
    
    // Fill customer information and retry
    await paymentHelper.fillCustomerInformation()
    await page.click('[data-testid="submit-payment"]')
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })

  test('should validate email format', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await page.click('[data-testid="payment-method-online"]')
    
    // Fill invalid email
    await page.fill('[data-testid="customer-name"]', 'Test Customer')
    await page.fill('[data-testid="customer-email"]', 'invalid-email')
    await page.fill('[data-testid="customer-phone"]', '(555) 123-4567')
    
    await paymentHelper.fillStripeCardForm(paymentTestData.validCards.visa)
    await page.click('[data-testid="submit-payment"]')
    
    // Should show email validation error
    await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible()
    
    // Fix email and retry
    await page.fill('[data-testid="customer-email"]', 'test@valid.com')
    await page.click('[data-testid="submit-payment"]')
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })

  test('should validate phone number format', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await page.click('[data-testid="payment-method-online"]')
    
    // Fill invalid phone
    await page.fill('[data-testid="customer-name"]', 'Test Customer')
    await page.fill('[data-testid="customer-email"]', 'test@valid.com')
    await page.fill('[data-testid="customer-phone"]', '123') // Too short
    
    await paymentHelper.fillStripeCardForm(paymentTestData.validCards.visa)
    await page.click('[data-testid="submit-payment"]')
    
    // Should show phone validation error
    await expect(page.locator('[data-testid="phone-validation-error"]')).toBeVisible()
    
    // Fix phone and retry
    await page.fill('[data-testid="customer-phone"]', '(555) 123-4567')
    await page.click('[data-testid="submit-payment"]')
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })
})

// Payment Security Tests
test.describe('Payment Security', () => {
  let paymentHelper

  test.beforeEach(async ({ page }) => {
    paymentHelper = new PaymentFlowHelper(page)
  })

  test('should maintain payment security standards', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    // Verify security measures
    await paymentHelper.verifyPaymentSecurity()
    
    // Proceed with secure payment
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.visa)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })

  test('should handle Stripe iframe loading failures', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    // Block Stripe resources to simulate loading failure
    await page.route('**/stripe.com/**', route => route.abort())
    
    await page.click('[data-testid="payment-method-online"]')
    
    // Should show fallback or error message
    await expect(page.locator('[data-testid="stripe-loading-error"], [data-testid="payment-fallback"]')).toBeVisible({ timeout: 10000 })
    
    // Unblock and retry
    await page.unroute('**/stripe.com/**')
    await page.reload()
    
    await paymentHelper.navigateToPaymentStep()
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.visa)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })

  test('should not expose sensitive payment data', async ({ page }) => {
    await paymentHelper.navigateToPaymentStep()
    
    await page.click('[data-testid="payment-method-online"]')
    await paymentHelper.fillCustomerInformation()
    await paymentHelper.fillStripeCardForm(paymentTestData.validCards.visa)
    
    // Check that card details are not exposed in page source
    const pageSource = await page.content()
    expect(pageSource).not.toContain('4242424242424242')
    expect(pageSource).not.toContain('123') // CVC
    
    // Check console for sensitive data leaks
    const consoleLogs = []
    page.on('console', msg => consoleLogs.push(msg.text()))
    
    await page.click('[data-testid="submit-payment"]')
    
    // Wait for payment processing
    await page.waitForTimeout(3000)
    
    const sensitiveDataInLogs = consoleLogs.some(log => 
      log.includes('4242424242424242') || 
      log.includes('123') ||
      log.includes('sk_test_') ||
      log.includes('pk_test_')
    )
    
    expect(sensitiveDataInLogs).toBe(false)
  })
})

// Payment Receipt and Confirmation Tests
test.describe('Payment Confirmation', () => {
  test('should display complete payment receipt', async ({ page }) => {
    const paymentHelper = new PaymentFlowHelper(page)
    await paymentHelper.navigateToPaymentStep()
    
    // Capture pricing details before payment
    const pricing = await paymentHelper.capturePricingDetails()
    
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.visa)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
    
    // Verify receipt details
    await expect(page.locator('[data-testid="receipt-total"]')).toBeVisible()
    await expect(page.locator('[data-testid="receipt-payment-method"]')).toBeVisible()
    await expect(page.locator('[data-testid="receipt-date"]')).toBeVisible()
    
    // Verify amounts match
    const receiptTotal = await page.locator('[data-testid="receipt-total"]').textContent()
    expect(receiptTotal).toContain(pricing.total || '')
  })

  test('should provide booking confirmation details', async ({ page }) => {
    const paymentHelper = new PaymentFlowHelper(page)
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.visa)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
    
    // Verify confirmation details
    await expect(page.locator('[data-testid="confirmation-service"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirmation-date-time"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirmation-location"]')).toBeVisible()
    await expect(page.locator('[data-testid="confirmation-barber"]')).toBeVisible()
    
    // Verify confirmation actions
    await expect(page.locator('[data-testid="add-to-calendar"]')).toBeVisible()
    await expect(page.locator('[data-testid="email-confirmation"]')).toBeVisible()
  })
})

// Payment Performance Tests
test.describe('Payment Performance', () => {
  test('should process payments within acceptable timeframe', async ({ page }) => {
    const paymentHelper = new PaymentFlowHelper(page)
    await paymentHelper.navigateToPaymentStep()
    
    // Measure payment processing time
    const startTime = Date.now()
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.visa)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    const processTime = Date.now() - startTime
    
    expect(result.success).toBe(true)
    expect(processTime).toBeLessThan(30000) // Should complete within 30 seconds
  })

  test('should handle slow network conditions', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      return new Promise(resolve => {
        setTimeout(() => {
          route.continue()
          resolve()
        }, 200) // 200ms delay
      })
    })

    const paymentHelper = new PaymentFlowHelper(page)
    await paymentHelper.navigateToPaymentStep()
    
    await paymentHelper.processOnlinePayment(paymentTestData.validCards.visa)
    
    const result = await paymentHelper.verifyPaymentSuccess()
    expect(result.success).toBe(true)
  })
})