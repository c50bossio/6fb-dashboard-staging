const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Calendar Staff Display Test', () => {
  test('should verify staff members appearing in calendar', async ({ page, context }) => {
    const screenshotsDir = path.join(__dirname, 'test-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Track network requests
    const apiRequests = [];
    const apiResponses = [];
    const consoleMessages = [];
    const errors = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // Capture errors
    page.on('pageerror', error => {
      errors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // Capture network activity
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        try {
          const body = await response.text();
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText(),
            headers: response.headers(),
            body: body.substring(0, 10000) // Limit size
          });
        } catch (e) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            error: 'Could not read response body'
          });
        }
      }
    });

    console.log('\n=== STEP 1: Navigate to Home Page ===');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(screenshotsDir, '01-home-page.png'), fullPage: true });

    const homePageTitle = await page.title();
    console.log('Home page title:', homePageTitle);

    // Check if we're on a login page
    const isLoginPage = await page.locator('input[type="email"], input[type="password"], form[action*="login"]').count() > 0;
    console.log('Is login page?', isLoginPage);

    if (isLoginPage) {
      console.log('\n=== LOGIN PAGE DETECTED ===');
      const loginForm = await page.locator('form').first();
      const formHTML = await loginForm.innerHTML().catch(() => 'Could not get form HTML');
      console.log('Login form HTML:', formHTML.substring(0, 500));

      // Try to find login inputs
      const emailInput = await page.locator('input[type="email"]').count();
      const passwordInput = await page.locator('input[type="password"]').count();
      console.log('Email input count:', emailInput);
      console.log('Password input count:', passwordInput);
    }

    console.log('\n=== STEP 2: Navigate to Calendar ===');

    // Try multiple navigation strategies
    let calendarAccessible = false;

    // Strategy 1: Direct navigation
    try {
      await page.goto('http://localhost:9999/dashboard/calendar', { waitUntil: 'networkidle', timeout: 10000 });
      calendarAccessible = true;
      console.log('✓ Direct navigation to /dashboard/calendar successful');
    } catch (e) {
      console.log('✗ Direct navigation failed:', e.message);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '02-calendar-attempt.png'), fullPage: true });

    const currentUrl = page.url();
    const currentTitle = await page.title();
    console.log('Current URL:', currentUrl);
    console.log('Current page title:', currentTitle);

    // Check if redirected to login
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('\n=== REDIRECTED TO LOGIN ===');
      console.log('Authentication is required to access the calendar');
    }

    console.log('\n=== STEP 3: Inspect Page Content ===');

    // Look for FullCalendar component
    const fullCalendarExists = await page.locator('.fc, [class*="fullcalendar"], #calendar').count();
    console.log('FullCalendar component count:', fullCalendarExists);

    // Look for staff/barber resources
    const staffElements = await page.locator('[class*="staff"], [class*="barber"], [class*="resource"]').count();
    console.log('Staff/Barber/Resource element count:', staffElements);

    // Get page HTML structure
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('\nPage structure (first 1000 chars):', bodyHTML.substring(0, 1000));

    // Check for specific calendar-related elements
    const calendarContainer = await page.locator('#calendar, [data-testid="calendar"], [class*="calendar-container"]').count();
    console.log('Calendar container count:', calendarContainer);

    console.log('\n=== STEP 4: Check API Requests ===');

    // Look for staff API call
    const staffApiCalls = apiResponses.filter(r => r.url.includes('/api/staff'));
    console.log(`Found ${staffApiCalls.length} calls to /api/staff`);

    if (staffApiCalls.length > 0) {
      staffApiCalls.forEach((call, index) => {
        console.log(`\n--- Staff API Call ${index + 1} ---`);
        console.log('URL:', call.url);
        console.log('Status:', call.status, call.statusText);
        console.log('Response body:', call.body);
      });
    }

    // Try to directly call the staff API
    console.log('\n=== STEP 5: Direct API Test ===');
    try {
      const apiResponse = await page.request.get('http://localhost:9999/api/staff');
      const apiStatus = apiResponse.status();
      const apiBody = await apiResponse.text();

      console.log('Direct /api/staff call:');
      console.log('Status:', apiStatus);
      console.log('Response:', apiBody);

      if (apiStatus === 200) {
        try {
          const staffData = JSON.parse(apiBody);
          console.log('Staff count:', staffData.length || 'N/A');
          console.log('Staff data:', JSON.stringify(staffData, null, 2));
        } catch (e) {
          console.log('Could not parse staff data as JSON');
        }
      }
    } catch (e) {
      console.log('Error calling /api/staff:', e.message);
    }

    console.log('\n=== STEP 6: Console Messages ===');
    if (consoleMessages.length > 0) {
      console.log(`Found ${consoleMessages.length} console messages:`);
      consoleMessages.forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
      });
    } else {
      console.log('No console messages captured');
    }

    console.log('\n=== STEP 7: JavaScript Errors ===');
    if (errors.length > 0) {
      console.log(`Found ${errors.length} JavaScript errors:`);
      errors.forEach((error, index) => {
        console.log(`\n--- Error ${index + 1} ---`);
        console.log('Message:', error.message);
        console.log('Stack:', error.stack);
      });
    } else {
      console.log('No JavaScript errors detected');
    }

    console.log('\n=== STEP 8: All API Requests ===');
    console.log(`Total API requests: ${apiRequests.length}`);
    console.log(`Total API responses: ${apiResponses.length}`);

    if (apiResponses.length > 0) {
      console.log('\nAPI Responses:');
      apiResponses.forEach((resp, index) => {
        console.log(`\n${index + 1}. ${resp.url}`);
        console.log('   Status:', resp.status);
        if (resp.body) {
          console.log('   Body:', resp.body.substring(0, 200));
        }
      });
    }

    console.log('\n=== TEST SUMMARY ===');
    console.log('1. Calendar page accessible without auth?', calendarAccessible);
    console.log('2. Redirected to login?', currentUrl.includes('login') || currentUrl.includes('auth'));
    console.log('3. FullCalendar component found?', fullCalendarExists > 0);
    console.log('4. Staff elements found?', staffElements);
    console.log('5. Staff API calls made?', staffApiCalls.length);
    console.log('6. Console errors?', errors.length);
    console.log('7. Current URL:', currentUrl);

    console.log('\n=== Screenshots saved to:', screenshotsDir, '===');
  });
});
