const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testCalendarStaff() {
  const screenshotsDir = path.join(__dirname, 'test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

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
        method: request.method()
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

  try {
    console.log('\n=== STEP 1: Navigate to Home Page ===');
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: path.join(screenshotsDir, '01-home-page.png'), fullPage: true });

    const homePageTitle = await page.title();
    console.log('Home page title:', homePageTitle);

    // Check if we're on a login page
    const emailInputs = await page.locator('input[type="email"]').count();
    const passwordInputs = await page.locator('input[type="password"]').count();
    const isLoginPage = emailInputs > 0 || passwordInputs > 0;
    console.log('Is login page?', isLoginPage);
    console.log('Email inputs:', emailInputs);
    console.log('Password inputs:', passwordInputs);

    if (isLoginPage) {
      console.log('\n=== LOGIN PAGE DETECTED ===');
      const pageContent = await page.content();
      console.log('Page contains "login"?', pageContent.toLowerCase().includes('login'));
      console.log('Page contains "sign in"?', pageContent.toLowerCase().includes('sign in'));
    }

    console.log('\n=== STEP 2: Navigate to Calendar ===');

    // Try direct navigation
    let calendarAccessible = false;
    try {
      const response = await page.goto('http://localhost:9999/dashboard/calendar', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      calendarAccessible = response.ok();
      console.log('✓ Direct navigation to /dashboard/calendar successful');
      console.log('Response status:', response.status());
    } catch (e) {
      console.log('✗ Direct navigation failed:', e.message);
    }

    await page.screenshot({ path: path.join(screenshotsDir, '02-calendar-attempt.png'), fullPage: true });

    const currentUrl = page.url();
    const currentTitle = await page.title();
    console.log('Current URL:', currentUrl);
    console.log('Current page title:', currentTitle);

    // Check if redirected to login
    const redirectedToAuth = currentUrl.includes('login') || currentUrl.includes('auth') || currentUrl.includes('sign-in');
    if (redirectedToAuth) {
      console.log('\n=== REDIRECTED TO LOGIN ===');
      console.log('Authentication is required to access the calendar');
    }

    console.log('\n=== STEP 3: Inspect Page Content ===');

    // Look for FullCalendar component
    const fullCalendarExists = await page.locator('.fc, [class*="fullcalendar"], #calendar, [class*="fc-"]').count();
    console.log('FullCalendar component count:', fullCalendarExists);

    // Look for staff/barber resources
    const staffElements = await page.locator('[class*="staff"], [class*="barber"], [class*="resource"], [data-resource-id]').count();
    console.log('Staff/Barber/Resource element count:', staffElements);

    // Check for specific calendar-related elements
    const calendarContainer = await page.locator('#calendar, [data-testid="calendar"], [class*="calendar-container"]').count();
    console.log('Calendar container count:', calendarContainer);

    // Get all class names on the page
    const allClasses = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class]');
      const classes = new Set();
      elements.forEach(el => {
        el.classList.forEach(cls => classes.add(cls));
      });
      return Array.from(classes).filter(cls =>
        cls.includes('calendar') || cls.includes('staff') || cls.includes('barber') || cls.includes('fc-')
      );
    });
    console.log('Relevant CSS classes found:', allClasses);

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
          console.log('Staff count:', Array.isArray(staffData) ? staffData.length : 'N/A');
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
      consoleMessages.slice(0, 20).forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.type}] ${msg.text}`);
      });
      if (consoleMessages.length > 20) {
        console.log(`... and ${consoleMessages.length - 20} more messages`);
      }
    } else {
      console.log('No console messages captured');
    }

    console.log('\n=== STEP 7: JavaScript Errors ===');
    if (errors.length > 0) {
      console.log(`Found ${errors.length} JavaScript errors:`);
      errors.forEach((error, index) => {
        console.log(`\n--- Error ${index + 1} ---`);
        console.log('Message:', error.message);
        if (error.stack) {
          console.log('Stack:', error.stack.substring(0, 500));
        }
      });
    } else {
      console.log('✓ No JavaScript errors detected');
    }

    console.log('\n=== STEP 8: All API Activity ===');
    console.log(`Total API requests: ${apiRequests.length}`);
    console.log(`Total API responses: ${apiResponses.length}`);

    if (apiResponses.length > 0) {
      console.log('\nAll API Responses:');
      apiResponses.forEach((resp, index) => {
        console.log(`\n${index + 1}. ${resp.url}`);
        console.log('   Status:', resp.status);
        if (resp.body && resp.body.length < 500) {
          console.log('   Body:', resp.body);
        } else if (resp.body) {
          console.log('   Body (truncated):', resp.body.substring(0, 300) + '...');
        }
      });
    }

    console.log('\n=== TEST SUMMARY ===');
    console.log('1. Calendar page accessible without auth?', calendarAccessible && !redirectedToAuth);
    console.log('2. Redirected to login?', redirectedToAuth);
    console.log('3. FullCalendar component found?', fullCalendarExists > 0);
    console.log('4. Staff elements found?', staffElements);
    console.log('5. Staff API calls made?', staffApiCalls.length);
    console.log('6. Console errors?', errors.length);
    console.log('7. Current URL:', currentUrl);
    console.log('8. Calendar container elements:', calendarContainer);

    console.log('\n=== Screenshots saved to:', screenshotsDir, '===');

  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await browser.close();
  }
}

// Run the test
testCalendarStaff()
  .then(() => {
    console.log('\n=== Test completed successfully ===');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n=== Test failed with error ===');
    console.error(error);
    process.exit(1);
  });
