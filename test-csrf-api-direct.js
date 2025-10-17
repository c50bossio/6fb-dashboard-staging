/**
 * Direct API CSRF Token Test
 * Tests the customer search API directly without UI interaction
 */

const { chromium } = require('playwright')

async function testCSRFApiDirect() {
  console.log('🧪 Testing CSRF Token - Direct API Call\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Track requests with CSRF tokens
  const apiRequests = []
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiRequests.push({
        url: request.url(),
        method: request.method(),
        hasCSRF: !!request.headers()['x-csrf-token'],
        csrfToken: request.headers()['x-csrf-token']?.substring(0, 30)
      })
    }
  })

  try {
    // Step 1: Navigate to app
    console.log('📍 Step 1: Loading application...')
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle', timeout: 15000 })
    console.log('✓ Page loaded\n')
    await page.waitForTimeout(2000)

    // Step 2: Test the csrfFetchJSON utility directly
    console.log('📍 Step 2: Testing csrfFetchJSON utility...')

    const testResult = await page.evaluate(async () => {
      try {
        // Import the CSRF utility
        const { csrfFetchJSON } = await import('/lib/csrf-fetch.js')

        // Test customer search with CSRF token
        const result = await csrfFetchJSON('/api/customers/search', {
          method: 'POST',
          body: JSON.stringify({
            phone: '5551234567',
            barbershop_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
          })
        })

        return {
          success: true,
          status: 'Request completed',
          data: result
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stack: error.stack
        }
      }
    })

    // Step 3: Analyze results
    console.log('\n📊 Test Results:')
    console.log('=' .repeat(60))

    if (testResult.success) {
      console.log('✅ SUCCESS: csrfFetchJSON executed without errors')
      console.log('\nResponse Data:')
      console.log(JSON.stringify(testResult.data, null, 2))
    } else {
      console.log('❌ FAIL: csrfFetchJSON threw an error')
      console.log(`\nError: ${testResult.error}`)

      if (testResult.error.includes('403')) {
        console.log('\n⚠️  Still getting 403 Forbidden - CSRF token may not be working')
      }
    }

    // Step 4: Check network requests
    console.log('\n📊 Network Request Analysis:')
    console.log('=' .repeat(60))

    const customerSearchRequests = apiRequests.filter(r =>
      r.url.includes('/api/customers/search') && r.method === 'POST'
    )

    if (customerSearchRequests.length > 0) {
      console.log(`\n✓ Found ${customerSearchRequests.length} customer search request(s)\n`)

      customerSearchRequests.forEach((req, i) => {
        console.log(`Request #${i + 1}:`)
        console.log(`  URL: ${req.url}`)
        console.log(`  Method: ${req.method}`)
        console.log(`  Has CSRF Token: ${req.hasCSRF ? '✅ YES' : '❌ NO'}`)
        if (req.csrfToken) {
          console.log(`  CSRF Token: ${req.csrfToken}...`)
        }
        console.log()
      })

      const hasCSRF = customerSearchRequests.some(r => r.hasCSRF)

      if (hasCSRF) {
        console.log('✅ CSRF Token Present: Token is being included in requests')
      } else {
        console.log('❌ CSRF Token Missing: Token is NOT being included')
      }
    } else {
      console.log('\n⚠️  No customer search requests captured')
      console.log('\nAll API Requests:')
      apiRequests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.url}`)
      })
    }

    // Step 5: Test token fetching mechanism
    console.log('\n📍 Step 3: Testing CSRF token fetching...')

    const tokenTest = await page.evaluate(async () => {
      try {
        // Fetch token via GET request
        const response = await fetch('/api/health', {
          method: 'GET',
          credentials: 'include'
        })

        const csrfToken = response.headers.get('X-CSRF-Token')

        return {
          success: true,
          hasToken: !!csrfToken,
          tokenPreview: csrfToken ? csrfToken.substring(0, 30) + '...' : null
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        }
      }
    })

    console.log('\nToken Fetch Test:')
    if (tokenTest.success && tokenTest.hasToken) {
      console.log(`✅ CSRF Token Retrieved: ${tokenTest.tokenPreview}`)
    } else if (tokenTest.success && !tokenTest.hasToken) {
      console.log('⚠️  No CSRF Token in Response Headers')
      console.log('This means user is not authenticated')
    } else {
      console.log(`❌ Token Fetch Failed: ${tokenTest.error}`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📋 FINAL SUMMARY')
    console.log('='.repeat(60))

    const csrfPresent = customerSearchRequests.some(r => r.hasCSRF)
    const requestSucceeded = testResult.success
    const tokenAvailable = tokenTest.hasToken

    console.log(`\n1. CSRF Token Available: ${tokenAvailable ? '✅' : '❌'}`)
    console.log(`2. CSRF Token Included in Requests: ${csrfPresent ? '✅' : '❌'}`)
    console.log(`3. API Request Succeeded: ${requestSucceeded ? '✅' : '❌'}`)

    if (tokenAvailable && csrfPresent && requestSucceeded) {
      console.log('\n🎉 Overall Result: ✅ PASS - CSRF implementation is working!')
      console.log('\nThe csrfFetchJSON utility successfully:')
      console.log('  ✓ Fetches CSRF token from server')
      console.log('  ✓ Includes token in POST request headers')
      console.log('  ✓ Allows requests to succeed without 403 errors')
    } else if (!tokenAvailable) {
      console.log('\n⚠️  User Not Authenticated')
      console.log('\nNote: CSRF protection only applies to authenticated users')
      console.log('Without authentication, the system cannot test CSRF protection')
    } else {
      console.log('\n❌ Overall Result: FAIL - CSRF implementation needs attention')
    }

    // Take screenshot
    console.log('\n📸 Taking screenshot...')
    await page.screenshot({
      path: 'test-results/csrf-api-test.png',
      fullPage: true
    })
    console.log('✓ Screenshot saved to test-results/csrf-api-test.png')

  } catch (error) {
    console.error('\n❌ Test Error:', error.message)
    await page.screenshot({ path: 'test-results/csrf-api-test-error.png' })
    console.log('Screenshot saved to test-results/csrf-api-test-error.png')
  } finally {
    console.log('\n🏁 Test Complete\n')
    await browser.close()
  }
}

// Run the test
testCSRFApiDirect().catch(console.error)
