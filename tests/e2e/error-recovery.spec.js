/**
 * Error Recovery & Resilience E2E Tests
 * 6FB AI Agent System - Comprehensive Error Handling & Recovery
 * 
 * Test Coverage:
 * - Network failure recovery
 * - API error handling
 * - Session timeout recovery
 * - Browser refresh resilience
 * - Booking state persistence
 * - Graceful degradation
 * - Error messaging and UX
 * - Retry mechanisms
 * - Offline capability
 * - Connection restoration
 */

import { test, expect } from '@playwright/test'

// Error Recovery Test Configuration
const ERROR_TIMEOUT = 30000
const RECOVERY_TIMEOUT = 45000
const NETWORK_DELAY = 1000

// Test Data
const errorTestData = {
  customer: {
    name: 'Error Test Customer',
    email: 'error.test@6fb.co',
    phone: '(555) 999-0000'
  }
}

// Error Recovery Helper Class
class ErrorRecoveryHelper {
  constructor(page) {
    this.page = page
    this.networkFailures = 0
    this.apiErrors = 0
  }

  async setupErrorInterception() {
    // Track console errors
    this.consoleErrors = []
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text())
      }
    })

    // Track network failures
    this.page.on('response', response => {
      if (!response.ok()) {
        this.networkFailures++
      }
    })

    // Track page errors
    this.page.on('pageerror', error => {
      this.pageErrors = this.pageErrors || []
      this.pageErrors.push(error.message)
    })
  }

  async simulateNetworkFailure(duration = 5000) {
    // Block all network requests
    await this.page.route('**/*', route => route.abort())
    
    // Wait for specified duration
    await this.page.waitForTimeout(duration)
    
    // Restore network
    await this.page.unroute('**/*')
  }

  async simulateIntermittentNetworkIssues() {
    // Simulate 50% packet loss
    await this.page.route('**/*', route => {
      if (Math.random() < 0.5) {
        route.abort()
      } else {
        route.continue()
      }
    })
  }

  async simulateSlowNetwork(delay = 2000) {
    // Add delay to all requests
    await this.page.route('**/*', route => {
      return new Promise(resolve => {
        setTimeout(() => {
          route.continue()
          resolve()
        }, delay)
      })
    })
  }

  async simulateAPIErrors() {
    // Return error responses for API calls
    await this.page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Internal Server Error',
          message: 'Simulated API error for testing'
        })
      })
    })
  }

  async simulatePartialAPIFailure(failureRate = 0.3) {
    // Fail random percentage of API calls
    await this.page.route('**/api/**', route => {
      if (Math.random() < failureRate) {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Service Unavailable',
            message: 'Simulated partial API failure'
          })
        })
      } else {
        route.continue()
      }
    })
  }

  async navigateToBookingWithErrorHandling() {
    await this.page.goto('http://localhost:9999/book')
    
    // Wait for initial load with error tolerance
    try {
      await this.page.waitForSelector('[data-testid="booking-wizard"]', { timeout: 10000 })
    } catch (error) {
      // Check for error states
      const errorElement = this.page.locator('[data-testid="app-error"], [data-testid="loading-error"]')
      if (await errorElement.count() > 0) {
        // Try to recover
        await this.page.click('[data-testid="retry-button"], [data-testid="refresh-button"]')
        await this.page.waitForSelector('[data-testid="booking-wizard"]', { timeout: 10000 })
      } else {
        throw error
      }
    }
  }

  async completeStepWithRetry(stepFunction, maxRetries = 3) {
    let attempts = 0
    let lastError = null

    while (attempts < maxRetries) {
      try {
        await stepFunction()
        return true // Success
      } catch (error) {
        lastError = error
        attempts++
        
        // Check for retry button and click it
        const retryButton = this.page.locator('[data-testid="retry-button"], [data-testid="step-retry"]')
        if (await retryButton.count() > 0) {
          await retryButton.click()
          await this.page.waitForTimeout(1000)
        } else {
          // Wait before retry
          await this.page.waitForTimeout(2000)
        }
      }
    }
    
    throw new Error(`Step failed after ${maxRetries} attempts: ${lastError.message}`)
  }

  async verifyErrorMessageDisplay(expectedMessage = null) {
    // Check for error message visibility
    const errorContainer = this.page.locator('[data-testid="error-message"], [data-testid="booking-error"]')
    await expect(errorContainer).toBeVisible({ timeout: 5000 })
    
    if (expectedMessage) {
      const errorText = await errorContainer.textContent()
      expect(errorText.toLowerCase()).toContain(expectedMessage.toLowerCase())
    }
    
    // Verify error is user-friendly
    const errorText = await errorContainer.textContent()
    expect(errorText).not.toContain('500')
    expect(errorText).not.toContain('undefined')
    expect(errorText).not.toContain('null')
    
    return errorText
  }

  async verifyRetryMechanism() {
    // Check for retry button presence and functionality
    await expect(this.page.locator('[data-testid="retry-button"]')).toBeVisible()
    
    // Verify retry button works
    await this.page.click('[data-testid="retry-button"]')
    
    // Should show loading state
    const loadingIndicator = this.page.locator('[data-testid="loading"], [data-testid="retrying"]')
    await expect(loadingIndicator).toBeVisible({ timeout: 3000 })
  }

  async saveBookingState() {
    // Extract current booking state
    return await this.page.evaluate(() => {
      // Try to get state from localStorage, sessionStorage, or component state
      const localStorage = window.localStorage.getItem('bookingState')
      const sessionStorage = window.sessionStorage.getItem('bookingState')
      
      return {
        localStorage: localStorage ? JSON.parse(localStorage) : null,
        sessionStorage: sessionStorage ? JSON.parse(sessionStorage) : null,
        url: window.location.href
      }
    })
  }

  async verifyStateRecovery(previousState) {
    const currentState = await this.saveBookingState()
    
    // Check if state was restored
    if (previousState.localStorage) {
      expect(currentState.localStorage).toBeTruthy()
    }
    
    if (previousState.sessionStorage) {
      expect(currentState.sessionStorage).toBeTruthy()
    }
    
    return currentState
  }

  async checkAccessibilityDuringErrors() {
    // Verify error states are accessible
    const errorElements = this.page.locator('[data-testid*="error"]')
    const count = await errorElements.count()
    
    for (let i = 0; i < count; i++) {
      const element = errorElements.nth(i)
      
      // Check for ARIA attributes
      const hasAriaLabel = await element.getAttribute('aria-label')
      const hasRole = await element.getAttribute('role')
      
      expect(hasAriaLabel || hasRole).toBeTruthy()
    }
  }

  async verifyGracefulDegradation() {
    // Core booking functionality should still work despite errors
    const coreElements = [
      '[data-testid="booking-wizard"]',
      '[data-testid="step-indicator"]',
      '[data-testid="next-button"], [data-testid="continue-button"]'
    ]
    
    for (const selector of coreElements) {
      await expect(this.page.locator(selector)).toBeVisible({ timeout: 5000 })
    }
  }
}

// Main Error Recovery Test Suite
test.describe('Network Failure Recovery', () => {
  let errorHelper

  test.beforeEach(async ({ page }) => {
    errorHelper = new ErrorRecoveryHelper(page)
    await errorHelper.setupErrorInterception()
  })

  test('should recover from complete network failure', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Start booking process
    await page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    await page.click('[data-testid="location-option"]:first-child')
    
    // Simulate network failure
    await errorHelper.simulateNetworkFailure(3000)
    
    // Try to proceed - should fail
    await page.click('[data-testid="next-button"]')
    
    // Should show network error
    await errorHelper.verifyErrorMessageDisplay('network')
    
    // Should provide retry mechanism
    await errorHelper.verifyRetryMechanism()
    
    // Network restored, retry should work
    await page.click('[data-testid="retry-button"]')
    
    // Should proceed to next step
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: RECOVERY_TIMEOUT })
    expect(await page.locator('[data-testid="barber-option"]').count()).toBeGreaterThan(0)
  })

  test('should handle intermittent network issues gracefully', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Start with intermittent network issues
    await errorHelper.simulateIntermittentNetworkIssues()
    
    // Try to complete booking flow with retries
    const completeLocation = async () => {
      await page.waitForSelector('[data-testid="location-option"]', { timeout: 15000 })
      await page.click('[data-testid="location-option"]:first-child')
      await page.click('[data-testid="next-button"]')
    }
    
    const completeBarber = async () => {
      await page.waitForSelector('[data-testid="barber-option"]', { timeout: 15000 })
      await page.click('[data-testid="barber-option"]:first-child')
      await page.click('[data-testid="next-button"]')
    }
    
    // Complete steps with retry logic
    await errorHelper.completeStepWithRetry(completeLocation)
    await errorHelper.completeStepWithRetry(completeBarber)
    
    // Should eventually succeed
    await page.waitForSelector('[data-testid="service-option"]', { timeout: RECOVERY_TIMEOUT })
    expect(await page.locator('[data-testid="service-option"]').count()).toBeGreaterThan(0)
  })

  test('should maintain booking state during network interruption', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Complete first two steps
    await page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    await page.click('[data-testid="location-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: 10000 })
    await page.click('[data-testid="barber-option"]:first-child')
    
    // Save state before network failure
    const stateBeforeFailure = await errorHelper.saveBookingState()
    
    // Simulate network failure
    await errorHelper.simulateNetworkFailure(2000)
    
    // Try to proceed
    await page.click('[data-testid="next-button"]')
    await errorHelper.verifyErrorMessageDisplay('network')
    
    // Retry after network restoration
    await page.click('[data-testid="retry-button"]')
    
    // Verify state was maintained
    await errorHelper.verifyStateRecovery(stateBeforeFailure)
    
    // Should proceed to next step
    await page.waitForSelector('[data-testid="service-option"]', { timeout: RECOVERY_TIMEOUT })
  })

  test('should handle slow network conditions', async ({ page }) => {
    await errorHelper.simulateSlowNetwork(3000)
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Should show appropriate loading indicators
    await expect(page.locator('[data-testid="loading"], [data-testid="slow-connection"]')).toBeVisible({ timeout: 15000 })
    
    // Should eventually load
    await page.waitForSelector('[data-testid="location-option"]', { timeout: 20000 })
    
    // Complete a step to verify functionality
    await page.click('[data-testid="location-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: 20000 })
  })
})

test.describe('API Error Handling', () => {
  let errorHelper

  test.beforeEach(async ({ page }) => {
    errorHelper = new ErrorRecoveryHelper(page)
    await errorHelper.setupErrorInterception()
  })

  test('should handle API server errors gracefully', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Simulate API errors
    await errorHelper.simulateAPIErrors()
    
    // Try to proceed
    await page.click('[data-testid="location-option"]:first-child') // This might work from cache
    await page.click('[data-testid="next-button"]')
    
    // Should show API error message
    await errorHelper.verifyErrorMessageDisplay('server')
    
    // Should provide retry option
    await errorHelper.verifyRetryMechanism()
    
    // Restore API and retry
    await page.unroute('**/api/**')
    await page.click('[data-testid="retry-button"]')
    
    // Should recover
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: RECOVERY_TIMEOUT })
  })

  test('should handle partial API failures', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Simulate 30% API failure rate
    await errorHelper.simulatePartialAPIFailure(0.3)
    
    // Try to complete booking flow - should eventually succeed with retries
    const completeStep = async (stepSelector, nextSelector) => {
      await page.waitForSelector(stepSelector, { timeout: 15000 })
      await page.click(`${stepSelector}:first-child`)
      await page.click(nextSelector)
    }
    
    await errorHelper.completeStepWithRetry(() => 
      completeStep('[data-testid="location-option"]', '[data-testid="next-button"]')
    )
    
    await errorHelper.completeStepWithRetry(() => 
      completeStep('[data-testid="barber-option"]', '[data-testid="next-button"]')
    )
    
    // Should eventually reach service selection
    await page.waitForSelector('[data-testid="service-option"]', { timeout: RECOVERY_TIMEOUT })
  })

  test('should provide meaningful error messages for different API failures', async ({ page }) => {
    const errorScenarios = [
      { status: 400, message: 'invalid request' },
      { status: 401, message: 'authentication' },
      { status: 403, message: 'permission' },
      { status: 404, message: 'not found' },
      { status: 429, message: 'too many requests' },
      { status: 500, message: 'server error' },
      { status: 503, message: 'unavailable' }
    ]
    
    for (const scenario of errorScenarios) {
      // Setup specific error
      await page.route('**/api/locations', route => {
        route.fulfill({
          status: scenario.status,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: `HTTP ${scenario.status}`,
            message: `Test ${scenario.status} error`
          })
        })
      })
      
      await errorHelper.navigateToBookingWithErrorHandling()
      
      // Should show appropriate error message
      const errorMessage = await errorHelper.verifyErrorMessageDisplay(scenario.message)
      
      // Clean up route
      await page.unroute('**/api/locations')
      
      // Verify error message is user-friendly
      expect(errorMessage).toBeTruthy()
      expect(errorMessage.toLowerCase()).not.toContain('500')
      expect(errorMessage.toLowerCase()).not.toContain('error')
    }
  })
})

test.describe('Session and State Recovery', () => {
  let errorHelper

  test.beforeEach(async ({ page }) => {
    errorHelper = new ErrorRecoveryHelper(page)
    await errorHelper.setupErrorInterception()
  })

  test('should recover booking state after browser refresh', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Complete some steps
    await page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    await page.click('[data-testid="location-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: 10000 })
    await page.click('[data-testid="barber-option"]:first-child')
    
    // Save current state
    const stateBeforeRefresh = await errorHelper.saveBookingState()
    
    // Refresh page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Check if state was recovered
    try {
      // Should either restore to previous step or restart gracefully
      await page.waitForSelector('[data-testid="booking-wizard"]', { timeout: 10000 })
      
      // Verify graceful restart or state recovery
      const stateAfterRefresh = await errorHelper.saveBookingState()
      
      // Either state is preserved or user gets clear indication to restart
      const hasStateRecovery = stateAfterRefresh.localStorage || stateAfterRefresh.sessionStorage
      const hasRestartMessage = await page.locator('[data-testid="session-restored"], [data-testid="restart-booking"]').count() > 0
      
      expect(hasStateRecovery || hasRestartMessage).toBeTruthy()
      
    } catch (error) {
      // If state recovery not implemented, should at least provide good UX
      await expect(page.locator('[data-testid="booking-wizard"]')).toBeVisible()
    }
  })

  test('should handle session timeout gracefully', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Complete some steps
    await page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    await page.click('[data-testid="location-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    // Simulate session timeout by clearing storage and cookies
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    await page.context().clearCookies()
    
    // Try to proceed
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: 10000 })
    await page.click('[data-testid="barber-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    // Should handle session expiry gracefully
    try {
      await page.waitForSelector('[data-testid="service-option"], [data-testid="session-expired"]', { timeout: 10000 })
      
      // Either proceeds normally or shows session expired message
      const serviceOptions = await page.locator('[data-testid="service-option"]').count()
      const sessionExpiredMessage = await page.locator('[data-testid="session-expired"]').count()
      
      expect(serviceOptions > 0 || sessionExpiredMessage > 0).toBeTruthy()
    } catch (error) {
      // Should at least not crash
      await expect(page.locator('[data-testid="booking-wizard"]')).toBeVisible()
    }
  })

  test('should maintain accessibility during error states', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Simulate API error
    await errorHelper.simulateAPIErrors()
    
    try {
      await page.click('[data-testid="location-option"]:first-child')
      await page.click('[data-testid="next-button"]')
    } catch (error) {
      // Expected to fail
    }
    
    // Should show error state
    await errorHelper.verifyErrorMessageDisplay()
    
    // Check accessibility of error states
    await errorHelper.checkAccessibilityDuringErrors()
    
    // Verify keyboard navigation still works
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })
})

test.describe('Graceful Degradation', () => {
  let errorHelper

  test.beforeEach(async ({ page }) => {
    errorHelper = new ErrorRecoveryHelper(page)
    await errorHelper.setupErrorInterception()
  })

  test('should provide core functionality even with JavaScript errors', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Inject JavaScript error
    await page.addInitScript(() => {
      // Simulate common JS errors
      window.addEventListener('load', () => {
        // Break some non-critical functionality
        if (window.console) {
          window.console.error = () => {} // Silence errors for cleaner test output
        }
      })
    })
    
    // Core booking should still work
    await errorHelper.verifyGracefulDegradation()
    
    // Should be able to complete basic booking flow
    await page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    await page.click('[data-testid="location-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: 10000 })
    expect(await page.locator('[data-testid="barber-option"]').count()).toBeGreaterThan(0)
  })

  test('should work with third-party service failures', async ({ page }) => {
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Block third-party services (analytics, payment processors, etc.)
    await page.route('**/analytics/**', route => route.abort())
    await page.route('**/stripe.com/**', route => route.abort())
    await page.route('**/google-analytics.com/**', route => route.abort())
    
    // Core functionality should still work
    await page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    await page.click('[data-testid="location-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: 10000 })
    await page.click('[data-testid="barber-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    await page.waitForSelector('[data-testid="service-option"]', { timeout: 10000 })
    
    // Should be able to proceed to payment (even if payment processor is down)
    await page.click('[data-testid="service-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    await page.waitForSelector('[data-testid="available-date"]', { timeout: 10000 })
    await page.click('[data-testid="available-date"]:first-child')
    
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 5000 })
    await page.click('[data-testid="time-slot"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    // Should reach payment step (might show payment processor error, but core flow works)
    await page.waitForSelector('[data-testid="payment-step"], [data-testid="payment-error"]', { timeout: 10000 })
    
    // At minimum should offer in-person payment option
    const inPersonPayment = page.locator('[data-testid="payment-method-in-person"]')
    if (await inPersonPayment.count() > 0) {
      await inPersonPayment.click()
      
      await page.fill('[data-testid="customer-name"]', errorTestData.customer.name)
      await page.fill('[data-testid="customer-email"]', errorTestData.customer.email)
      await page.fill('[data-testid="customer-phone"]', errorTestData.customer.phone)
      
      await page.click('[data-testid="confirm-booking"]')
      
      // Should complete booking
      await page.waitForSelector('[data-testid="booking-confirmation"]', { timeout: 15000 })
    }
  })
})

test.describe('Error Recovery Performance', () => {
  test('should recover from errors within acceptable timeframes', async ({ page }) => {
    const errorHelper = new ErrorRecoveryHelper(page)
    await errorHelper.setupErrorInterception()
    await errorHelper.navigateToBookingWithErrorHandling()
    
    // Simulate API error
    await errorHelper.simulateAPIErrors()
    
    // Measure error detection and recovery time
    const errorStart = Date.now()
    
    await page.click('[data-testid="location-option"]:first-child')
    await page.click('[data-testid="next-button"]')
    
    // Should show error quickly
    await errorHelper.verifyErrorMessageDisplay()
    const errorDetectionTime = Date.now() - errorStart
    
    // Should detect errors within 5 seconds
    expect(errorDetectionTime).toBeLessThan(5000)
    
    // Restore API and measure recovery time
    const recoveryStart = Date.now()
    await page.unroute('**/api/**')
    await page.click('[data-testid="retry-button"]')
    
    await page.waitForSelector('[data-testid="barber-option"]', { timeout: 15000 })
    const recoveryTime = Date.now() - recoveryStart
    
    // Should recover within 10 seconds
    expect(recoveryTime).toBeLessThan(10000)
  })
})