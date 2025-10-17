const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  // Capture network errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  try {
    console.log('Step 1: Navigating to login page...');
    await page.goto('http://localhost:9999/auth/login');
    await page.waitForTimeout(2000);

    console.log('Step 2: Entering login credentials...');
    await page.fill('input[type="email"]', 'demo@barbershop.com');
    await page.fill('input[type="password"]', 'demo123');

    console.log('Step 3: Clicking login button...');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('✓ Successfully logged in and redirected to dashboard');

    console.log('Step 4: Navigating to calendar page...');
    await page.goto('http://localhost:9999/dashboard/calendar');

    console.log('Step 5: Waiting for calendar to load...');
    await page.waitForTimeout(5000);

    console.log('Step 6: Taking screenshot...');
    await page.screenshot({ path: '/Users/bossio/6FB AI Agent System/calendar-test-screenshot.png', fullPage: true });

    // Check for specific elements
    console.log('\n=== CALENDAR PAGE ANALYSIS ===');

    // Check if calendar loaded
    const calendarExists = await page.locator('.fc-view-harness').count() > 0;
    console.log(`Calendar component loaded: ${calendarExists ? 'YES ✓' : 'NO ✗'}`);

    // Check for appointments
    const appointmentCount = await page.locator('.fc-event').count();
    console.log(`Appointments visible: ${appointmentCount}`);

    // Check for location selector
    const locationSelectorExists = await page.locator('[class*="location"]').count() > 0;
    console.log(`Location selector present: ${locationSelectorExists ? 'YES ✓' : 'NO ✗'}`);

    // Filter console errors
    const consoleErrors = consoleMessages.filter(msg => msg.type === 'error');
    console.log(`\n=== CONSOLE ERRORS (${consoleErrors.length}) ===`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.log(`- ${err.text}`));
    } else {
      console.log('No console errors ✓');
    }

    // Check for specific error messages
    const profileErrorExists = consoleMessages.some(msg =>
      msg.text.includes('User profile not found') ||
      msg.text.includes('profile is null')
    );
    console.log(`\n"User profile not found" error: ${profileErrorExists ? 'YES ✗' : 'NO ✓'}`);

    // Page errors
    console.log(`\n=== PAGE ERRORS (${errors.length}) ===`);
    if (errors.length > 0) {
      errors.forEach(err => console.log(`- ${err}`));
    } else {
      console.log('No page errors ✓');
    }

    // Check API calls
    console.log('\n=== CHECKING API CALLS ===');
    const apiCalls = consoleMessages.filter(msg =>
      msg.text.includes('/api/user/locations') ||
      msg.text.includes('/api/appointments')
    );
    apiCalls.forEach(call => console.log(`- ${call.text}`));

    console.log('\n=== TEST SUMMARY ===');
    console.log(`✓ Login successful`);
    console.log(`✓ Redirected to dashboard`);
    console.log(`✓ Calendar page loaded`);
    console.log(`✓ Screenshot saved to: calendar-test-screenshot.png`);
    console.log(`${calendarExists ? '✓' : '✗'} Calendar component rendered`);
    console.log(`${appointmentCount > 0 ? '✓' : '✗'} Appointments visible: ${appointmentCount}`);
    console.log(`${!profileErrorExists ? '✓' : '✗'} No profile errors`);
    console.log(`${consoleErrors.length === 0 ? '✓' : '✗'} No console errors`);

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: '/Users/bossio/6FB AI Agent System/calendar-test-error.png', fullPage: true });
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
})();
