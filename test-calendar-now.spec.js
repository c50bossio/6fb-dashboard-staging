const { test } = require('@playwright/test');

test('calendar debug', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('response', async r => {
    if (r.url().includes('/api/')) {
      console.log('API:', r.status(), r.url());
      try {
        const j = await r.json();
        console.log('Response:', JSON.stringify(j).substring(0, 200));
      } catch(e) {}
    }
  });

  await page.goto('http://localhost:9999/dashboard/calendar');
  await page.waitForTimeout(5000);
  
  const count = await page.locator('.fc-event').count();
  console.log('Events on calendar:', count);
  
  await page.screenshot({ path: 'cal.png' });
});
