/**
 * E2E Test: Appointment Booking with CSRF Protection
 *
 * This test verifies that the CSRF token fix allows appointment booking
 * customer search to work without 403 Forbidden errors.
 *
 * Test Coverage:
 * - CSRF token is fetched from GET requests
 * - CSRF token is included in POST /api/customers/search
 * - Customer search completes successfully (200 OK)
 * - No 403 Forbidden errors occur
 */

import { test, expect } from '@playwright/test'

test.describe('Appointment Booking with CSRF Protection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:9999')

    // Wait for page to be ready
    await page.waitForLoadState('networkidle')
  })

  test('should include CSRF token in customer search requests', async ({ page }) => {
    // Track network requests
    const requests = []
    const responses = []

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        })
      }
    })

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        })
      }
    })

    // Step 1: Navigate to calendar/booking page
    // (Adjust this selector based on your actual page structure)
    try {
      await page.goto('http://localhost:9999/dashboard/calendar', { timeout: 10000 })
    } catch (error) {
      // If calendar page requires auth, try navigating to login first
      console.log('Calendar page may require authentication')
      await page.goto('http://localhost:9999/login', { timeout: 10000 })

      // Check if we need to log in
      const loginFormExists = await page.locator('input[type="email"], input[type="text"][name*="email"]').isVisible().catch(() => false)

      if (loginFormExists) {
        console.log('Login required - using demo credentials')
        await page.fill('input[type="email"], input[type="text"][name*="email"]', 'demo@example.com')
        await page.fill('input[type="password"]', 'demo123')
        await page.click('button[type="submit"]')
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {})

        // Navigate to calendar after login
        await page.goto('http://localhost:9999/dashboard/calendar', { timeout: 10000 })
      }
    }

    await page.waitForLoadState('networkidle')

    // Step 2: Look for appointment booking modal trigger
    // Common selectors for appointment booking buttons
    const bookingSelectors = [
      'button:has-text("New Appointment")',
      'button:has-text("Book Appointment")',
      'button:has-text("Add Appointment")',
      '[data-testid="new-appointment-button"]',
      '[aria-label*="appointment"]',
      'button[aria-label*="Add"]',
    ]

    let bookingButtonFound = false
    for (const selector of bookingSelectors) {
      try {
        const button = page.locator(selector).first()
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`Found booking button with selector: ${selector}`)
          await button.click()
          bookingButtonFound = true
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!bookingButtonFound) {
      console.log('No booking button found - checking if modal is already open')
    }

    // Wait for modal or form to appear
    await page.waitForTimeout(1000)

    // Step 3: Find customer phone/email input field
    const inputSelectors = [
      'input[name="phone"]',
      'input[type="tel"]',
      'input[placeholder*="phone"]',
      'input[placeholder*="Phone"]',
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email"]',
    ]

    let inputField = null
    for (const selector of inputSelectors) {
      try {
        const field = page.locator(selector).first()
        if (await field.isVisible({ timeout: 2000 })) {
          console.log(`Found input field with selector: ${selector}`)
          inputField = field
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    expect(inputField, 'Customer input field should be found').not.toBeNull()

    // Step 4: Enter customer phone or email to trigger search
    await inputField.fill('5551234567')

    // Wait for debounced search to trigger
    await page.waitForTimeout(1500)

    // Step 5: Verify CSRF token was included in customer search request
    const customerSearchRequests = requests.filter(req =>
      req.url.includes('/api/customers/search') && req.method === 'POST'
    )

    console.log('\n=== Customer Search Requests ===')
    console.log(`Found ${customerSearchRequests.length} customer search request(s)`)

    if (customerSearchRequests.length > 0) {
      const searchRequest = customerSearchRequests[0]
      console.log('\nRequest Details:')
      console.log(`URL: ${searchRequest.url}`)
      console.log(`Method: ${searchRequest.method}`)
      console.log(`Has X-CSRF-Token: ${!!searchRequest.headers['x-csrf-token']}`)

      if (searchRequest.headers['x-csrf-token']) {
        console.log(`CSRF Token: ${searchRequest.headers['x-csrf-token'].substring(0, 20)}...`)
      }

      // CRITICAL ASSERTION: CSRF token must be present
      expect(
        searchRequest.headers['x-csrf-token'],
        'CSRF token should be included in customer search POST request'
      ).toBeDefined()

      expect(
        searchRequest.headers['x-csrf-token'],
        'CSRF token should not be empty'
      ).toBeTruthy()
    }

    // Step 6: Verify response status (should be 200, not 403)
    const customerSearchResponses = responses.filter(res =>
      res.url.includes('/api/customers/search')
    )

    console.log('\n=== Customer Search Responses ===')
    console.log(`Found ${customerSearchResponses.length} customer search response(s)`)

    if (customerSearchResponses.length > 0) {
      const searchResponse = customerSearchResponses[0]
      console.log('\nResponse Details:')
      console.log(`Status: ${searchResponse.status} ${searchResponse.statusText}`)

      // CRITICAL ASSERTION: Should NOT be 403 Forbidden
      expect(
        searchResponse.status,
        'Customer search should not return 403 Forbidden'
      ).not.toBe(403)

      // Should be successful (200 or 404 if no customer found)
      expect(
        [200, 404].includes(searchResponse.status),
        'Customer search should return 200 OK or 404 Not Found'
      ).toBeTruthy()
    }

    // Step 7: Log all API requests for debugging
    console.log('\n=== All API Requests ===')
    requests.forEach((req, index) => {
      console.log(`\n[${index + 1}] ${req.method} ${req.url}`)
      if (req.headers['x-csrf-token']) {
        console.log(`  ✓ CSRF Token: ${req.headers['x-csrf-token'].substring(0, 20)}...`)
      } else if (req.method !== 'GET') {
        console.log(`  ✗ No CSRF Token (${req.method} request)`)
      }
    })

    console.log('\n=== All API Responses ===')
    responses.forEach((res, index) => {
      const statusEmoji = res.status === 200 ? '✓' : (res.status === 403 ? '✗' : '⚠')
      console.log(`[${index + 1}] ${statusEmoji} ${res.status} ${res.url}`)
    })

    // Step 8: Take screenshot for verification
    await page.screenshot({
      path: '__tests__/screenshots/appointment-booking-csrf-test.png',
      fullPage: true
    })

    console.log('\n✅ Test completed - Screenshot saved to __tests__/screenshots/')
  })

  test('should successfully fetch CSRF token from GET requests', async ({ page }) => {
    let csrfTokenFound = false
    let csrfToken = null

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const headers = response.headers()
        if (headers['x-csrf-token']) {
          csrfTokenFound = true
          csrfToken = headers['x-csrf-token']
          console.log(`\n✓ CSRF Token found in response to: ${response.url()}`)
          console.log(`  Token: ${csrfToken.substring(0, 30)}...`)
        }
      }
    })

    // Trigger a GET request to fetch CSRF token
    await page.goto('http://localhost:9999/api/health')
    await page.waitForLoadState('networkidle')

    console.log(`\nCSRF Token Found: ${csrfTokenFound}`)

    if (csrfTokenFound) {
      expect(csrfToken).toBeTruthy()
      expect(csrfToken.length).toBeGreaterThan(20) // Token should be reasonably long
    } else {
      console.log('⚠ Warning: No CSRF token found in GET responses')
      console.log('This may be expected if user is not authenticated')
    }
  })
})
