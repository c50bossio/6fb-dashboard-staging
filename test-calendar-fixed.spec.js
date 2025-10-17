const { test, expect } = require('@playwright/test')

test.describe('Calendar with Fixed GlobalDashboardContext', () => {
  test('should load calendar and display appointments after shop_id fix', async ({ page }) => {
    // Capture console messages to check for errors
    const consoleMessages = []
    const consoleErrors = []

    page.on('console', msg => {
      const text = msg.text()
      consoleMessages.push(text)

      if (msg.type() === 'error') {
        consoleErrors.push(text)
      }

      // Log important GlobalDashboardContext messages
      if (text.includes('[GlobalDashboardContext]')) {
        console.log('📊 Context:', text)
      }
    })

    // Navigate to login page
    console.log('🔐 Navigating to login page...')
    await page.goto('http://localhost:9999/login', { waitUntil: 'networkidle' })

    // Fill in login credentials
    console.log('📝 Filling in credentials...')
    await page.fill('input[type="email"]', 'demo@barbershop.com')
    await page.fill('input[type="password"]', 'demo123')

    // Click login button
    console.log('🚀 Clicking login button...')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    console.log('⏳ Waiting for redirect to dashboard...')
    await page.waitForURL('**/dashboard/**', { timeout: 10000 })

    // Navigate to calendar
    console.log('📅 Navigating to calendar...')
    await page.goto('http://localhost:9999/dashboard/calendar', { waitUntil: 'networkidle' })

    // Wait for calendar to load
    console.log('⏳ Waiting for calendar to load...')
    await page.waitForTimeout(5000)

    // Check for specific error we're fixing
    const hasUserProfileError = consoleErrors.some(err =>
      err.includes('User profile not found') ||
      err.includes('Error loading locations from unified API')
    )

    if (hasUserProfileError) {
      console.error('❌ FAILED: Still seeing "User profile not found" error')
      console.error('Console errors:', consoleErrors)
    } else {
      console.log('✅ SUCCESS: No "User profile not found" error detected')
    }

    // Check if /api/user/locations call succeeded
    const hasLocationSuccess = consoleMessages.some(msg =>
      msg.includes('[GlobalDashboardContext]') &&
      (msg.includes('Found') || msg.includes('locations'))
    )

    console.log('\n📊 GlobalDashboardContext Status:')
    console.log('- User profile error:', hasUserProfileError ? '❌ YES' : '✅ NO')
    console.log('- Location load success:', hasLocationSuccess ? '✅ YES' : '❌ NO')

    // Check for calendar data
    const calendarElement = await page.$('.fc-view')
    const hasCalendar = !!calendarElement

    console.log('\n📅 Calendar Status:')
    console.log('- Calendar rendered:', hasCalendar ? '✅ YES' : '❌ NO')

    // Get appointment count from page
    const appointmentText = await page.textContent('body').catch(() => '')
    const appointmentMatches = appointmentText.match(/(\d+)\s+Appointments?/i)
    const appointmentCount = appointmentMatches ? parseInt(appointmentMatches[1]) : 0

    console.log('- Appointments displayed:', appointmentCount)

    // Check for network errors
    console.log('\n🌐 Network Status:')
    const has403Error = consoleErrors.some(err => err.includes('403'))
    const has500Error = consoleErrors.some(err => err.includes('500'))
    console.log('- 403 Forbidden errors:', has403Error ? '❌ YES' : '✅ NO')
    console.log('- 500 Server errors:', has500Error ? '❌ YES' : '✅ NO')

    // Final assertions
    expect(hasUserProfileError).toBe(false)
    expect(hasCalendar).toBe(true)
    expect(appointmentCount).toBeGreaterThan(0)
  })
})
