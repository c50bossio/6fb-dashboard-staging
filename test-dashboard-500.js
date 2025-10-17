const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track all network responses
  const responses = [];
  const errors = [];

  page.on('response', response => {
    const url = response.url();
    const status = response.status();

    responses.push({ url, status });

    if (status === 500 && url.includes('/api/')) {
      errors.push({ url, status });
      console.log(`❌ [500] ${url}`);
    }
  });

  // Track console errors
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('500')) {
      console.log(`🔴 Console: ${msg.text().substring(0, 150)}`);
    }
  });

  console.log('🔍 Navigating to login page...');
  await page.goto('http://localhost:9999/login');

  // Login with demo credentials
  console.log('🔐 Logging in as demo@barbershop.com...');
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.fill('input[type="email"]', 'demo@barbershop.com');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  console.log('⏳ Waiting for dashboard to load...');
  try {
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('✅ Reached dashboard URL:', page.url());
  } catch (e) {
    console.log('⚠️  Dashboard URL timeout, checking current URL...');
    console.log('   Current URL:', page.url());

    // Check if there's an error message on the page
    const bodyText = await page.locator('body').textContent();
    if (bodyText.includes('error') || bodyText.includes('Error')) {
      console.log('   Page contains error text');
    }
  }

  // Wait for API calls to complete
  console.log('⏳ Waiting 10 seconds for all API calls...');
  await page.waitForTimeout(10000);

  // Log all API responses
  console.log('\n📊 API Response Summary:');
  const apiResponses = responses.filter(r => r.url.includes('/api/'));

  const successCount = apiResponses.filter(r => r.status === 200 || r.status === 201).length;
  const errorCount = apiResponses.filter(r => r.status === 500).length;
  const otherCount = apiResponses.length - successCount - errorCount;

  console.log(`   ✅ Success (2xx): ${successCount}`);
  console.log(`   ❌ Server Errors (500): ${errorCount}`);
  console.log(`   ⚠️  Other: ${otherCount}`);

  // Show unique API endpoints called
  console.log('\n📋 Unique API Endpoints:');
  const uniqueEndpoints = [...new Set(apiResponses.map(r => {
    const url = new URL(r.url);
    return url.pathname;
  }))];

  uniqueEndpoints.forEach(endpoint => {
    const endpointResponses = apiResponses.filter(r => r.url.includes(endpoint));
    const statuses = endpointResponses.map(r => r.status);
    const hasError = statuses.includes(500);
    const emoji = hasError ? '❌' : '✅';
    console.log(`   ${emoji} ${endpoint} - ${JSON.stringify(statuses)}`);
  });

  // Log 500 errors
  if (errors.length > 0) {
    console.log(`\n❌ Found ${errors.length} API endpoints returning 500 errors:`);
    errors.forEach(err => {
      console.log(`  - ${err.url}`);
    });
  } else {
    console.log('\n✅ No 500 errors found!');
  }

  // Take a screenshot
  await page.screenshot({ path: 'dashboard-500-test.png', fullPage: true });
  console.log('\n📸 Screenshot saved to dashboard-500-test.png');

  await browser.close();

  process.exit(errors.length > 0 ? 1 : 0);
})();
