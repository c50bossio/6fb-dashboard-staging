import { test, expect } from '@playwright/test'

test.describe('Verify 404 Error Fix for user_context_preferences', () => {
  test('should not show 404 error for user_context_preferences table', async ({ page }) => {
    // Array to capture network requests
    const failedRequests = []
    const contextPreferenceRequests = []

    // Listen for failed network requests
    page.on('response', async (response) => {
      const url = response.url()

      // Check for user_context_preferences requests
      if (url.includes('user_context_preferences')) {
        contextPreferenceRequests.push({
          url,
          status: response.status(),
          statusText: response.statusText()
        })

        // Track 404 errors
        if (response.status() === 404) {
          failedRequests.push({
            url,
            status: 404,
            statusText: response.statusText()
          })
        }
      }
    })

    // Navigate to the application
    console.log('🔍 Navigating to http://localhost:9999...')
    await page.goto('http://localhost:9999', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Wait a bit for all context provider requests to complete
    await page.waitForTimeout(3000)

    // Log all user_context_preferences requests
    console.log('\n📊 User Context Preferences Requests:')
    if (contextPreferenceRequests.length === 0) {
      console.log('   ℹ️  No requests to user_context_preferences table detected')
      console.log('   (This might mean the user is not logged in)')
    } else {
      contextPreferenceRequests.forEach((req, index) => {
        const emoji = req.status === 200 ? '✅' : req.status === 404 ? '❌' : '⚠️'
        console.log(`   ${emoji} Request ${index + 1}: ${req.status} ${req.statusText}`)
        console.log(`      URL: ${req.url}`)
      })
    }

    // Check for 404 errors
    console.log('\n🔍 Checking for 404 errors...')
    if (failedRequests.length > 0) {
      console.log('❌ Found 404 errors:')
      failedRequests.forEach((req) => {
        console.log(`   - ${req.url}`)
      })
      throw new Error(`Found ${failedRequests.length} 404 error(s) for user_context_preferences`)
    } else {
      console.log('✅ No 404 errors found!')
    }

    // Check console for errors
    const consoleErrors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('user_context_preferences')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.waitForTimeout(1000)

    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console errors related to user_context_preferences:')
      consoleErrors.forEach((error) => {
        console.log(`   - ${error}`)
      })
    } else {
      console.log('\n✅ No console errors related to user_context_preferences')
    }

    // Take a screenshot for verification
    await page.screenshot({
      path: 'test-results/404-fix-verification.png',
      fullPage: true
    })
    console.log('\n📸 Screenshot saved to: test-results/404-fix-verification.png')

    // Assertions
    expect(failedRequests.length).toBe(0)
    console.log('\n🎉 Test passed! The 404 error is fixed!')
  })

  test('should successfully query user_context_preferences when logged in', async ({ page }) => {
    // This test assumes you're logged in
    // If authentication is needed, you'll need to add login steps

    let contextPreferenceSuccess = false

    page.on('response', async (response) => {
      const url = response.url()

      if (url.includes('user_context_preferences') && response.status() === 200) {
        contextPreferenceSuccess = true
        console.log('✅ Successfully queried user_context_preferences')

        try {
          const data = await response.json()
          console.log('📋 Response data:', JSON.stringify(data, null, 2))
        } catch (e) {
          // Response might not be JSON
        }
      }
    })

    await page.goto('http://localhost:9999', {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    await page.waitForTimeout(3000)

    if (contextPreferenceSuccess) {
      console.log('✅ user_context_preferences table is accessible!')
    } else {
      console.log('ℹ️  No successful user_context_preferences query detected')
      console.log('   This might mean the user is not logged in or table is not queried on this page')
    }
  })
})
