const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true // Open DevTools automatically
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to console events
  page.on('console', msg => {
    if (msg.text().includes('Calendar')) {
      console.log('Console:', msg.text());
    }
  });

  // Navigate to calendar
  await page.goto('http://localhost:9999/dashboard/calendar');
  
  // Wait for calendar to load
  await page.waitForSelector('.fc', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Check what data exists
  const calendarData = await page.evaluate(() => {
    // Get all console logs that contain calendar data
    const results = {
      hasCalendar: !!document.querySelector('.fc'),
      resourceColumns: document.querySelectorAll('[data-resource-id]').length,
      eventsInDOM: document.querySelectorAll('.fc-event').length,
      timeSlots: document.querySelectorAll('.fc-timegrid-slot').length
    };

    // Try to get React component data
    const wrapper = document.querySelector('.professional-calendar-wrapper');
    if (wrapper) {
      // Look for React props
      const reactKey = Object.keys(wrapper).find(key => key.startsWith('__react'));
      if (reactKey) {
        results.hasReactData = true;
      }
    }

    // Check if FullCalendar has events in its internal state
    const fcEl = document.querySelector('.fc');
    if (fcEl) {
      // FullCalendar stores its instance on the element
      const fcKeys = Object.keys(fcEl);
      results.fcKeys = fcKeys.filter(k => k.includes('fc') || k.includes('Full'));
    }

    return results;
  });

  console.log('\n=== Calendar Data Analysis ===');
  console.log(JSON.stringify(calendarData, null, 2));

  // Keep browser open for inspection
  console.log('\nBrowser is open with DevTools. Press Ctrl+C to close.');
  
  // Keep the script running
  await new Promise(() => {});
})();