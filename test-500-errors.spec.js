const { test, expect } = require('@playwright/test');

test('Check for 500 errors on authenticated dashboard', async ({ page }) => {
  // Track all network responses
  const responses = [];
  const errors = [];

  page.on('response', response => {
    responses.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText()
    });

    if (response.status() === 500) {
      errors.push({
        url: response.url(),
        status: 500,
        statusText: response.statusText()
      });
    }
  });

  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('🔍 Navigating to login page...');
  await page.goto('http://localhost:9999/login');

  // Login with demo credentials
  console.log('🔐 Logging in as demo@barbershop.com...');
  await page.fill('input[type="email"]', 'demo@barbershop.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  console.log('⏳ Waiting for dashboard to load...');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });

  // Wait a bit for all API calls to complete
  await page.waitForTimeout(5000);

  // Log all responses
  console.log('\n📊 All API Responses:');
  responses
    .filter(r => r.url.includes('/api/'))
    .forEach(r => {
      const emoji = r.status === 200 ? '✅' : r.status === 500 ? '❌' : '⚠️';
      console.log(`${emoji} [${r.status}] ${r.url}`);
    });

  // Log 500 errors
  if (errors.length > 0) {
    console.log('\n❌ 500 Errors Found:');
    errors.forEach(err => {
      console.log(`  - ${err.url}`);
    });
  } else {
    console.log('\n✅ No 500 errors found!');
  }

  // Log console errors
  if (consoleErrors.length > 0) {
    console.log('\n🔴 Console Errors:');
    consoleErrors.slice(0, 10).forEach(err => {
      console.log(`  - ${err.substring(0, 200)}`);
    });
  }

  // Take a screenshot
  await page.screenshot({ path: 'dashboard-test.png', fullPage: true });
  console.log('\n📸 Screenshot saved to dashboard-test.png');

  // Fail the test if there are 500 errors
  expect(errors.length).toBe(0);
});
