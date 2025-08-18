/**
 * Error Scenarios and Edge Cases E2E Tests
 * 
 * Comprehensive testing of error handling, edge cases, and failure scenarios
 * to ensure the application gracefully handles unexpected situations and
 * provides helpful user feedback.
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@/lib/supabase/client'

class ErrorTestEnvironment {
  constructor() {
    this.supabase = createClient()
    this.testData = {
      shop: null,
      errorScenarios: [
        {
          name: 'network_failure',
          description: 'Simulate network connectivity issues',
          setup: (page) => page.setOffline(true)
        },
        {
          name: 'api_timeout',
          description: 'Simulate API request timeouts',
          setup: (page) => this.mockSlowAPI(page, 30000)
        },
        {
          name: 'server_error',
          description: 'Simulate server internal errors',
          setup: (page) => this.mockServerError(page, 500)
        },
        {
          name: 'authentication_failure',
          description: 'Simulate authentication failures',
          setup: (page) => this.mockAuthError(page)
        },
        {
          name: 'invalid_data',
          description: 'Test with invalid data inputs',
          setup: (page) => this.setupInvalidDataTest(page)
        }
      ]
    }
  }

  async setupErrorTest() {
    // Get test shop for error scenarios
    const { data: shop } = await this.supabase
      .from('barbershops')
      .select('*')
      .eq('status', 'active')
      .limit(1)
      .single()

    if (shop) {
      this.testData.shop = shop
    }

    return this.testData
  }

  async mockSlowAPI(page, delay = 30000) {
    await page.route('/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, delay))
      await route.continue()
    })
  }

  async mockServerError(page, statusCode = 500) {
    await page.route('/api/**', async route => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          code: 'SERVER_ERROR',
          timestamp: new Date().toISOString()
        })
      })
    })
  }

  async mockAuthError(page) {
    await page.route('/api/auth/**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Authentication failed',
          code: 'AUTH_ERROR'
        })
      })
    })
  }

  async setupInvalidDataTest(page) {
    // This method sets up scenarios for testing invalid data handling
    await page.route('/api/bookings/create', async route => {
      const requestBody = await route.request().postDataJSON()
      
      // Check for invalid data and return appropriate errors
      if (!requestBody.client_email || !requestBody.client_email.includes('@')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid email format',
            code: 'VALIDATION_ERROR',
            field: 'client_email'
          })
        })
        return
      }

      await route.continue()
    })
  }

  async simulateMemoryPressure(page) {
    // Simulate memory pressure scenarios
    await page.evaluate(() => {
      // Create large objects to consume memory
      const largeArray = new Array(1000000).fill('memory pressure test')
      window.testMemoryPressure = largeArray
    })
  }

  async simulateSlowConnection(page) {
    // Simulate slow network connection
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
  }
}

test.describe('Error Scenarios - Network and Connectivity', () => {
  let errorEnv

  test.beforeEach(async ({ page }) => {
    errorEnv = new ErrorTestEnvironment()
    await errorEnv.setupErrorTest()
  })

  test('Application handles offline mode gracefully', async ({ page }) => {
    console.log('Testing offline mode handling...')

    // Start online
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Verify online functionality
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible()

    // Go offline
    await page.setOffline(true)
    
    // Try to navigate to a new page
    await page.goto('/dashboard')
    
    // Verify offline message is displayed
    await expect(page.locator('[data-testid="offline-message"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="offline-message"]')).toContainText('offline')

    // Verify retry mechanism
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
    
    // Go back online
    await page.setOffline(false)
    await page.click('[data-testid="retry-button"]')
    
    // Verify functionality is restored
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15000 })
  })

  test('API timeout handling with user feedback', async ({ page }) => {
    console.log('Testing API timeout handling...')

    // Mock slow API responses
    await errorEnv.mockSlowAPI(page, 35000)

    await page.goto('/dashboard')
    
    // Verify loading state is shown
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    
    // Wait for timeout message
    await expect(page.locator('[data-testid="timeout-message"]')).toBeVisible({ timeout: 40000 })
    await expect(page.locator('[data-testid="timeout-message"]')).toContainText('taking longer than expected')
    
    // Verify retry option is available
    await expect(page.locator('[data-testid="retry-request"]')).toBeVisible()
  })

  test('Slow network connection handling', async ({ page }) => {
    console.log('Testing slow network handling...')

    await errorEnv.simulateSlowConnection(page)
    
    await page.goto('/dashboard')
    
    // Verify loading indicators persist during slow loading
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible()
    
    // Verify progressive loading feedback
    await expect(page.locator('[data-testid="loading-progress"]')).toBeVisible()
    
    // Wait for content to eventually load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 30000 })
  })

  test('Connection interruption during booking process', async ({ page }) => {
    if (!errorEnv.testData.shop) {
      test.skip('No test shop available')
    }

    console.log('Testing connection interruption during booking...')

    await page.goto(`/shop/${errorEnv.testData.shop.slug}/book`)
    
    // Start booking process
    await page.waitForSelector('[data-testid="booking-wizard"]')
    
    // Fill some booking details
    const serviceCard = page.locator('[data-testid^="service-"]').first()
    if (await serviceCard.isVisible()) {
      await serviceCard.click()
      await page.click('button:has-text("Next")')
    }

    // Simulate connection loss during process
    await page.setOffline(true)
    
    // Try to continue booking
    await page.click('button:has-text("Next")')
    
    // Verify error handling
    await expect(page.locator('[data-testid="connection-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="connection-error"]')).toContainText('connection')
    
    // Verify booking state is preserved
    await page.setOffline(false)
    await page.click('[data-testid="retry-booking"]')
    
    // Verify user can continue from where they left off
    await expect(page.locator('[data-testid="booking-progress"]')).toBeVisible()
  })
})

test.describe('Error Scenarios - Server Errors', () => {
  let errorEnv

  test.beforeEach(async ({ page }) => {
    errorEnv = new ErrorTestEnvironment()
    await errorEnv.setupErrorTest()
  })

  test('500 Server Error handling', async ({ page }) => {
    console.log('Testing 500 server error handling...')

    await errorEnv.mockServerError(page, 500)
    
    await page.goto('/dashboard')
    
    // Verify user-friendly error message
    await expect(page.locator('[data-testid="server-error"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="server-error"]')).toContainText('temporarily unavailable')
    
    // Verify contact support option
    await expect(page.locator('[data-testid="contact-support"]')).toBeVisible()
    
    // Verify retry mechanism
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })

  test('503 Service Unavailable handling', async ({ page }) => {
    console.log('Testing 503 service unavailable handling...')

    await errorEnv.mockServerError(page, 503)
    
    await page.goto('/dashboard')
    
    // Verify maintenance message
    await expect(page.locator('[data-testid="maintenance-message"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="maintenance-message"]')).toContainText('maintenance')
    
    // Verify status page link
    await expect(page.locator('[data-testid="status-page-link"]')).toBeVisible()
  })

  test('API rate limiting handling', async ({ page }) => {
    console.log('Testing rate limiting handling...')

    await page.route('/api/**', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: {
          'Retry-After': '60'
        },
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: 60
        })
      })
    })

    await page.goto('/dashboard')
    
    // Verify rate limit message
    await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="rate-limit-message"]')).toContainText('too many requests')
    
    // Verify countdown timer
    await expect(page.locator('[data-testid="retry-countdown"]')).toBeVisible()
  })

  test('Database connection error handling', async ({ page }) => {
    console.log('Testing database connection error handling...')

    await page.route('/api/**', async route => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Database connection failed',
          code: 'DATABASE_ERROR'
        })
      })
    })

    await page.goto('/dashboard')
    
    // Verify database error message
    await expect(page.locator('[data-testid="database-error"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="database-error"]')).toContainText('database')
  })
})

test.describe('Error Scenarios - Authentication and Authorization', () => {
  let errorEnv

  test.beforeEach(async ({ page }) => {
    errorEnv = new ErrorTestEnvironment()
    await errorEnv.setupErrorTest()
  })

  test('Session expiration handling', async ({ page }) => {
    console.log('Testing session expiration handling...')

    // Start with valid session
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'valid_token',
        expires_at: Date.now() + 3600000
      }))
    })

    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()

    // Mock session expiration
    await page.route('/api/**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        })
      })
    })

    // Try to perform an action that requires authentication
    await page.click('[data-testid="refresh-data"]')
    
    // Verify redirect to login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10000 })
    
    // Verify session expiration message
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible()
  })

  test('Insufficient permissions handling', async ({ page }) => {
    console.log('Testing insufficient permissions handling...')

    // Mock user with limited permissions
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'limited_token',
        user: {
          role: 'CLIENT' // Limited role
        }
      }))
    })

    await page.goto('/admin/settings')
    
    // Verify access denied message
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('permission')
    
    // Verify redirect to appropriate page
    await expect(page.locator('[data-testid="return-dashboard"]')).toBeVisible()
  })

  test('Invalid API key handling', async ({ page }) => {
    console.log('Testing invalid API key handling...')

    await page.route('/api/**', async route => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        })
      })
    })

    await page.goto('/dashboard')
    
    // Verify API key error message
    await expect(page.locator('[data-testid="api-key-error"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="api-key-error"]')).toContainText('API key')
  })
})

test.describe('Error Scenarios - Data Validation and Input Errors', () => {
  let errorEnv

  test.beforeEach(async ({ page }) => {
    errorEnv = new ErrorTestEnvironment()
    await errorEnv.setupErrorTest()
  })

  test('Invalid email format handling', async ({ page }) => {
    console.log('Testing invalid email format handling...')

    await page.goto('/register')
    
    // Enter invalid email formats
    const invalidEmails = [
      'invalid-email',
      'test@',
      '@example.com',
      'test..test@example.com',
      'test@.com'
    ]

    for (const email of invalidEmails) {
      await page.fill('[data-testid="email-input"]', email)
      await page.click('[data-testid="submit-button"]')
      
      // Verify validation error
      await expect(page.locator('[data-testid="email-validation-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="email-validation-error"]')).toContainText('valid email')
      
      // Clear for next test
      await page.fill('[data-testid="email-input"]', '')
    }
  })

  test('SQL injection attempt handling', async ({ page }) => {
    console.log('Testing SQL injection attempt handling...')

    await page.goto('/register')
    
    // Try various SQL injection attempts
    const sqlInjectionAttempts = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users --"
    ]

    for (const attempt of sqlInjectionAttempts) {
      await page.fill('[data-testid="name-input"]', attempt)
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="submit-button"]')
      
      // Verify input sanitization
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('invalid characters')
    }
  })

  test('XSS attempt handling', async ({ page }) => {
    console.log('Testing XSS attempt handling...')

    await page.goto('/register')
    
    // Try XSS injection
    const xssAttempts = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(1)">',
      '"><script>alert("XSS")</script>'
    ]

    for (const attempt of xssAttempts) {
      await page.fill('[data-testid="name-input"]', attempt)
      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'password123')
      await page.click('[data-testid="submit-button"]')
      
      // Verify XSS prevention
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
      
      // Verify no script execution
      page.on('dialog', dialog => {
        throw new Error('XSS attempt succeeded - alert dialog appeared')
      })
    }
  })

  test('Large file upload handling', async ({ page }) => {
    console.log('Testing large file upload handling...')

    if (!errorEnv.testData.shop) {
      test.skip('No test shop available')
    }

    await page.goto('/settings/profile')
    
    // Try to upload oversized file
    const fileInput = page.locator('[data-testid="avatar-upload"]')
    
    // Create a large file buffer (simulate 20MB file)
    const largeFileBuffer = Buffer.alloc(20 * 1024 * 1024, 'a')
    
    await fileInput.setInputFiles({
      name: 'large-image.jpg',
      mimeType: 'image/jpeg',
      buffer: largeFileBuffer
    })

    // Verify file size validation
    await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-size-error"]')).toContainText('too large')
  })

  test('Invalid date/time handling', async ({ page }) => {
    if (!errorEnv.testData.shop) {
      test.skip('No test shop available')
    }

    console.log('Testing invalid date/time handling...')

    await page.goto(`/shop/${errorEnv.testData.shop.slug}/book`)
    
    // Navigate to time selection
    await page.evaluate(() => {
      window.testUtils?.navigateToTimeStep()
    })

    // Try to select past dates
    await page.evaluate(() => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      document.querySelector('[data-testid="date-picker"]').value = pastDate.toISOString().split('T')[0]
    })

    await page.click('[data-testid="time-slot-9am"]')
    await page.click('button:has-text("Next")')
    
    // Verify past date validation
    await expect(page.locator('[data-testid="past-date-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="past-date-error"]')).toContainText('past date')
  })
})

test.describe('Error Scenarios - Memory and Performance Issues', () => {
  let errorEnv

  test.beforeEach(async ({ page }) => {
    errorEnv = new ErrorTestEnvironment()
    await errorEnv.setupErrorTest()
  })

  test('Memory pressure handling', async ({ page }) => {
    console.log('Testing memory pressure handling...')

    await page.goto('/dashboard')
    
    // Simulate memory pressure
    await errorEnv.simulateMemoryPressure(page)
    
    // Continue using the application
    await page.click('[data-testid="refresh-data"]')
    
    // Verify application continues to function
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
    
    // Check for memory optimization messages
    const memoryWarning = page.locator('[data-testid="memory-warning"]')
    if (await memoryWarning.isVisible()) {
      await expect(memoryWarning).toContainText('performance')
    }
  })

  test('Large dataset rendering handling', async ({ page }) => {
    console.log('Testing large dataset rendering...')

    // Mock API to return large dataset
    await page.route('/api/bookings', async route => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `booking_${i}`,
        client_name: `Customer ${i}`,
        service_name: `Service ${i % 10}`,
        scheduled_at: new Date().toISOString(),
        total_amount: Math.random() * 100
      }))

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: largeDataset })
      })
    })

    await page.goto('/bookings')
    
    // Verify virtual scrolling or pagination is implemented
    await expect(page.locator('[data-testid="bookings-list"]')).toBeVisible({ timeout: 15000 })
    
    // Verify performance optimization techniques
    const visibleRows = await page.locator('[data-testid="booking-row"]').count()
    
    // Should not render all 10,000 rows at once
    expect(visibleRows).toBeLessThan(100)
    
    // Verify pagination or virtual scrolling controls
    const paginationExists = await page.locator('[data-testid="pagination"]').isVisible()
    const virtualScrollExists = await page.locator('[data-testid="virtual-scroll"]').isVisible()
    
    expect(paginationExists || virtualScrollExists).toBe(true)
  })

  test('JavaScript error handling', async ({ page }) => {
    console.log('Testing JavaScript error handling...')

    // Listen for console errors
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Listen for page errors
    const pageErrors = []
    page.on('pageerror', error => {
      pageErrors.push(error.message)
    })

    await page.goto('/dashboard')
    
    // Intentionally cause a JavaScript error
    await page.evaluate(() => {
      throw new Error('Test JavaScript error')
    })

    // Verify error boundary handles the error
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-testid="error-boundary"]')).toContainText('something went wrong')
    
    // Verify recovery option
    await expect(page.locator('[data-testid="reload-page"]')).toBeVisible()
    
    // Test error recovery
    await page.click('[data-testid="reload-page"]')
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible()
  })
})

test.describe('Error Scenarios - Edge Cases', () => {
  let errorEnv

  test.beforeEach(async ({ page }) => {
    errorEnv = new ErrorTestEnvironment()
    await errorEnv.setupErrorTest()
  })

  test('Concurrent user actions handling', async ({ page, context }) => {
    if (!errorEnv.testData.shop) {
      test.skip('No test shop available')
    }

    console.log('Testing concurrent user actions...')

    // Open multiple tabs
    const page2 = await context.newPage()
    
    // Both pages try to book the same time slot
    await page.goto(`/shop/${errorEnv.testData.shop.slug}/book`)
    await page2.goto(`/shop/${errorEnv.testData.shop.slug}/book`)
    
    // Navigate both to the same service and time
    const promises = [
      page.evaluate(() => window.testUtils?.selectSameTimeSlot()),
      page2.evaluate(() => window.testUtils?.selectSameTimeSlot())
    ]

    await Promise.all(promises)
    
    // One should succeed, one should fail with conflict error
    const conflictError = page.locator('[data-testid="time-conflict-error"]')
    const conflictError2 = page2.locator('[data-testid="time-conflict-error"]')
    
    const hasConflictError = await conflictError.isVisible() || await conflictError2.isVisible()
    expect(hasConflictError).toBe(true)

    await page2.close()
  })

  test('Browser compatibility edge cases', async ({ page }) => {
    console.log('Testing browser compatibility edge cases...')

    // Simulate unsupported browser features
    await page.addInitScript(() => {
      // Remove modern browser features
      delete window.fetch
      delete window.localStorage
      delete window.sessionStorage
    })

    await page.goto('/')
    
    // Verify fallback mechanisms
    await expect(page.locator('[data-testid="browser-compatibility-warning"]')).toBeVisible()
    await expect(page.locator('[data-testid="browser-compatibility-warning"]')).toContainText('browser')
  })

  test('Timezone edge cases', async ({ page }) => {
    console.log('Testing timezone edge cases...')

    // Mock different timezone
    await page.addInitScript(() => {
      // Override timezone
      Date.prototype.getTimezoneOffset = () => 480 // PST
    })

    if (!errorEnv.testData.shop) {
      test.skip('No test shop available')
    }

    await page.goto(`/shop/${errorEnv.testData.shop.slug}/book`)
    
    // Navigate to time selection
    await page.evaluate(() => {
      window.testUtils?.navigateToTimeStep()
    })

    // Verify timezone-aware time display
    await expect(page.locator('[data-testid="timezone-indicator"]')).toBeVisible()
    await expect(page.locator('[data-testid="timezone-indicator"]')).toContainText('PST')
    
    // Test edge case times (midnight, DST transitions)
    await page.evaluate(() => {
      const midnightTime = new Date()
      midnightTime.setHours(0, 0, 0, 0)
      window.testUtils?.selectSpecificTime(midnightTime)
    })

    // Verify midnight booking handling
    const midnightWarning = page.locator('[data-testid="midnight-booking-warning"]')
    if (await midnightWarning.isVisible()) {
      await expect(midnightWarning).toContainText('different day')
    }
  })

  test('Mobile device edge cases', async ({ page }) => {
    console.log('Testing mobile device edge cases...')

    // Simulate mobile device with limited capabilities
    await page.setViewportSize({ width: 320, height: 568 }) // iPhone SE
    
    await page.goto('/')
    
    // Test touch events
    await page.tap('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    
    // Test orientation change
    await page.setViewportSize({ width: 568, height: 320 }) // Landscape
    await expect(page.locator('[data-testid="orientation-warning"]')).toBeVisible()
    
    // Test small screen adaptations
    await page.setViewportSize({ width: 280, height: 480 }) // Very small screen
    await expect(page.locator('[data-testid="small-screen-layout"]')).toBeVisible()
  })
})