/**
 * Standalone CSRF Token Test
 * Tests the customer search API to verify CSRF token is working
 */

const { chromium } = require('playwright')

async function testCSRFToken() {
  console.log('🧪 Starting CSRF Token Test...\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Track network requests
  const requests = []
  const responses = []

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        hasCSRF: !!request.headers()['x-csrf-token'],
        csrfToken: request.headers()['x-csrf-token']?.substring(0, 30)
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

  try {
    // Step 1: Navigate to home page
    console.log('📍 Step 1: Navigating to http://localhost:9999')
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle', timeout: 15000 })
    console.log('✓ Page loaded\n')

    await page.waitForTimeout(2000)

    // Step 2: Try to find and navigate to calendar
    console.log('📍 Step 2: Looking for calendar/booking interface...')

    const possibleLinks = [
      'a[href*="calendar"]',
      'a[href*="appointment"]',
      'a[href*="booking"]',
      'button:has-text("Calendar")',
      'nav a:has-text("Calendar")'
    ]

    let foundCalendar = false
    for (const selector of possibleLinks) {
      try {
        const element = await page.locator(selector).first()
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`✓ Found calendar link: ${selector}`)
          await element.click()
          await page.waitForLoadState('networkidle')
          foundCalendar = true
          break
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!foundCalendar) {
      console.log('⚠️  Could not find calendar link, trying direct navigation')
      await page.goto('http://localhost:9999/dashboard/calendar', { waitUntil: 'networkidle', timeout: 10000 })
    }

    console.log('✓ Navigated to calendar page\n')
    await page.waitForTimeout(2000)

    // Step 3: Look for appointment booking button
    console.log('📍 Step 3: Looking for appointment booking button...')

    const bookingSelectors = [
      'button:has-text("New Appointment")',
      'button:has-text("Book Appointment")',
      'button:has-text("Add Appointment")',
      '[data-testid="new-appointment"]',
      'button[aria-label*="appointment"]'
    ]

    let foundButton = false
    for (const selector of bookingSelectors) {
      try {
        const button = await page.locator(selector).first()
        if (await button.isVisible({ timeout: 2000 })) {
          console.log(`✓ Found booking button: ${selector}`)
          await button.click()
          await page.waitForTimeout(1500)
          foundButton = true
          break
        }
      } catch (e) {
        // Continue
      }
    }

    if (!foundButton) {
      console.log('⚠️  No booking button found, assuming form is visible\n')
    } else {
      console.log('✓ Opened booking modal\n')
    }

    // Step 4: Find customer input field
    console.log('📍 Step 4: Looking for customer input field...')

    const inputSelectors = [
      'input[name="phone"]',
      'input[type="tel"]',
      'input[placeholder*="phone" i]',
      'input[name="email"]',
      'input[type="email"]'
    ]

    let inputField = null
    for (const selector of inputSelectors) {
      try {
        const field = await page.locator(selector).first()
        if (await field.isVisible({ timeout: 2000 })) {
          console.log(`✓ Found input field: ${selector}`)
          inputField = field
          break
        }
      } catch (e) {
        // Continue
      }
    }

    if (!inputField) {
      console.log('❌ Could not find customer input field')
      await page.screenshot({ path: 'test-results/csrf-test-no-input.png' })
      throw new Error('Customer input field not found')
    }

    // Step 5: Enter customer phone to trigger search
    console.log('\n📍 Step 5: Entering customer phone number...')
    await inputField.fill('5551234567')
    console.log('✓ Entered phone number: 5551234567')

    console.log('⏳ Waiting for search request (debounced)...')
    await page.waitForTimeout(2000)

    // Step 6: Analyze network requests
    console.log('\n📊 Network Request Analysis:')
    console.log('=' .repeat(60))

    const customerSearchRequests = requests.filter(r =>
      r.url.includes('/api/customers/search') && r.method === 'POST'
    )

    if (customerSearchRequests.length === 0) {
      console.log('⚠️  No customer search requests found')
      console.log('\nAll API Requests:')
      requests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.url}`)
      })
    } else {
      console.log(`\n✓ Found ${customerSearchRequests.length} customer search request(s)\n`)

      customerSearchRequests.forEach((req, i) => {
        console.log(`Request #${i + 1}:`)
        console.log(`  URL: ${req.url}`)
        console.log(`  Method: ${req.method}`)
        console.log(`  Has CSRF Token: ${req.hasCSRF ? '✓ YES' : '✗ NO'}`)
        if (req.csrfToken) {
          console.log(`  CSRF Token: ${req.csrfToken}...`)
        }
        console.log()
      })

      // Check if CSRF token was present
      const hasCSRF = customerSearchRequests.some(r => r.hasCSRF)

      if (hasCSRF) {
        console.log('✅ SUCCESS: CSRF token is present in customer search request!')
      } else {
        console.log('❌ FAIL: CSRF token is MISSING from customer search request!')
      }
    }

    // Step 7: Check response status
    console.log('\n📊 Response Analysis:')
    console.log('=' .repeat(60))

    const customerSearchResponses = responses.filter(r =>
      r.url.includes('/api/customers/search')
    )

    if (customerSearchResponses.length > 0) {
      customerSearchResponses.forEach((res, i) => {
        const statusEmoji = res.status === 200 ? '✓' : (res.status === 403 ? '✗' : '⚠️')
        console.log(`\nResponse #${i + 1}:`)
        console.log(`  Status: ${statusEmoji} ${res.status} ${res.statusText}`)
        console.log(`  URL: ${res.url}`)
      })

      const has403 = customerSearchResponses.some(r => r.status === 403)
      const has200 = customerSearchResponses.some(r => r.status === 200)

      if (has403) {
        console.log('\n❌ FAIL: Received 403 Forbidden - CSRF protection blocking request!')
      } else if (has200) {
        console.log('\n✅ SUCCESS: Received 200 OK - Request succeeded!')
      } else {
        console.log(`\n⚠️  Received status: ${customerSearchResponses[0].status}`)
      }
    }

    // Step 8: Take screenshot
    console.log('\n📸 Taking screenshot...')
    await page.screenshot({
      path: 'test-results/csrf-test-success.png',
      fullPage: true
    })
    console.log('✓ Screenshot saved to test-results/csrf-test-success.png')

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 TEST SUMMARY')
    console.log('='.repeat(60))

    const csrfPresent = customerSearchRequests.some(r => r.hasCSRF)
    const no403Errors = !responses.some(r => r.url.includes('customers/search') && r.status === 403)

    console.log(`CSRF Token Present: ${csrfPresent ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`No 403 Errors: ${no403Errors ? '✅ PASS' : '❌ FAIL'}`)

    if (csrfPresent && no403Errors) {
      console.log('\n🎉 Overall Result: ✅ PASS - CSRF fix is working!')
    } else {
      console.log('\n❌ Overall Result: FAIL - CSRF fix needs attention')
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error.message)
    await page.screenshot({ path: 'test-results/csrf-test-error.png' })
    console.log('Screenshot saved to test-results/csrf-test-error.png')
  } finally {
    console.log('\n🏁 Test Complete\n')
    await browser.close()
  }
}

// Run the test
testCSRFToken().catch(console.error)
