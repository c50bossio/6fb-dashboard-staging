const { test, expect } = require('@playwright/test');

test('Check calendar data loading', async ({ page }) => {
  // Enable console logging from browser
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('CALENDAR') || text.includes('Failed') || text.includes('Error')) {
      console.log('🔍 BROWSER:', text);
    }
  });

  // Capture network requests
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/appointments') || url.includes('/api/staff')) {
      console.log(`📡 API ${response.status()}: ${url}`);
      try {
        const json = await response.json();
        if (url.includes('/api/appointments')) {
          console.log(`   Appointments returned: ${json.data?.length || 0}`);
          if (json.error) console.log(`   ❌ Error: ${json.error}`);
        }
        if (url.includes('/api/staff')) {
          console.log(`   Staff returned: ${json.resources?.length || 0}`);
          if (json.error) console.log(`   ❌ Error: ${json.error}`);
        }
      } catch (e) {
        console.log(`   ⚠️  Could not parse response`);
      }
    }
  });

  console.log('\n🚀 Navigating to calendar...');
  await page.goto('http://localhost:9999/dashboard/calendar', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });

  console.log('⏳ Waiting for page to settle...');
  await page.waitForTimeout(3000);

  // Check appointment count
  try {
    const apptCountEl = await page.locator('.text-2xl.lg\\:text-3xl:has-text("Appointments")').first();
    const apptCount = await apptCountEl.textContent();
    console.log(`\n📊 Appointment Count Displayed: ${apptCount}`);
  } catch (e) {
    console.log('⚠️  Could not find appointment count element');
  }

  // Check barber count
  try {
    const barberCountEl = await page.locator('.text-2xl.lg\\:text-3xl').nth(1);
    const barberCount = await barberCountEl.textContent();
    console.log(`👥 Barber Count Displayed: ${barberCount}`);
  } catch (e) {
    console.log('⚠️  Could not find barber count element');
  }

  // Check for calendar events
  const events = await page.locator('.fc-event').count();
  console.log(`📅 Calendar Events Visible: ${events}\n`);

  // Take screenshot
  await page.screenshot({ path: 'calendar-debug.png', fullPage: true });
  console.log('📸 Screenshot saved: calendar-debug.png\n');
});
