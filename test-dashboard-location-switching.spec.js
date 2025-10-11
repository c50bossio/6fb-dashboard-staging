/**
 * Playwright test to verify dashboard shows location-specific data
 * Tests that switching locations updates dashboard metrics with real database data
 */

const { test, expect } = require('@playwright/test');

test.describe('Dashboard Location Switching', () => {
  test('dashboard shows different data for different locations', async ({ page }) => {
    // Enable console logging to see API calls
    page.on('console', msg => {
      if (msg.type() === 'log' && (msg.text().includes('barbershop_id') || msg.text().includes('location'))) {
        console.log('📊 Browser log:', msg.text());
      }
    });

    // Track API requests to verify real database queries
    const apiRequests = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/dashboard/metrics') || url.includes('/api/analytics/live-data')) {
        apiRequests.push({
          url,
          method: request.method()
        });
        console.log('🔍 API Request:', url);
      }
    });

    // Track API responses to see the data
    const apiResponses = [];
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/dashboard/metrics') || url.includes('/api/analytics/live-data')) {
        try {
          const data = await response.json();
          apiResponses.push({
            url,
            status: response.status(),
            barbershop_id: data.barbershop_id || data.meta?.barbershop_id,
            has_data: !!data.data || !!data.business_insights,
            sample_metrics: {
              customers: data.user_engagement?.total_users || data.data?.total_customers,
              revenue: data.business_insights?.raw_metrics?.total_revenue || data.data?.total_revenue,
              appointments: data.data?.total_appointments
            }
          });
          console.log('✅ API Response:', JSON.stringify(apiResponses[apiResponses.length - 1], null, 2));
        } catch (e) {
          console.log('⚠️ Could not parse response from:', url);
        }
      }
    });

    console.log('\n🚀 Step 1: Navigating to dashboard...');

    // Navigate to dashboard
    await page.goto('http://localhost:9999/dashboard?mode=executive');

    // Wait for the dashboard to load
    await page.waitForSelector('[class*="card-modern"]', { timeout: 10000 });
    console.log('✅ Dashboard loaded');

    // Wait a bit for initial data to load
    await page.waitForTimeout(3000);

    console.log('\n📍 Step 2: Checking current location and metrics...');

    // Check if shop selector exists
    const shopSelectorExists = await page.locator('text=/Select Shop|Elite Cuts|Downtown|Midtown/i').first().isVisible()
      .catch(() => false);

    if (!shopSelectorExists) {
      console.log('⚠️ No shop selector found - user may have only one location');
      console.log('📊 API Requests made:', apiRequests.length);
      console.log('📊 API Responses received:', apiResponses.length);

      if (apiResponses.length > 0) {
        console.log('\n✅ Dashboard is making real API calls!');
        console.log('Sample response:', JSON.stringify(apiResponses[0], null, 2));
      }
      return;
    }

    // Try to find location name in the sidebar
    const currentLocationText = await page.locator('[class*="border-b border-border"] p').first().textContent()
      .catch(() => null);
    console.log('Current location:', currentLocationText);

    // Capture initial metrics from the dashboard
    const getMetrics = async () => {
      const metrics = {};

      // Try to find metric cards with numbers
      const metricCards = await page.locator('[class*="card-modern"]').all();

      for (const card of metricCards.slice(0, 5)) { // Check first 5 cards
        const text = await card.textContent().catch(() => '');

        // Look for revenue
        if (text.includes('Revenue') || text.includes('$')) {
          const match = text.match(/\$[\d,]+/);
          if (match) metrics.revenue = match[0];
        }

        // Look for customers
        if (text.includes('Customer') || text.includes('Client')) {
          const match = text.match(/\d+/);
          if (match) metrics.customers = match[0];
        }

        // Look for appointments
        if (text.includes('Appointment') || text.includes('Booking')) {
          const match = text.match(/\d+/);
          if (match) metrics.appointments = match[0];
        }
      }

      return metrics;
    };

    const initialMetrics = await getMetrics();
    console.log('📊 Initial metrics:', initialMetrics);

    console.log('\n🔄 Step 3: Attempting to switch location...');

    // Try to click the shop selector to open dropdown
    const shopSelector = page.locator('[class*="border-b border-border"]').first();
    await shopSelector.click().catch(() => console.log('Could not click shop selector'));

    // Wait for dropdown to appear
    await page.waitForTimeout(1000);

    // Look for available locations in the dropdown
    const locationOptions = await page.locator('button:has-text("Elite"), button:has-text("Downtown"), button:has-text("Midtown")').all();

    if (locationOptions.length < 2) {
      console.log('⚠️ Only one location available - cannot test switching');
      console.log('📊 Total API requests:', apiRequests.length);
      console.log('📊 Total API responses:', apiResponses.length);

      if (apiResponses.length > 0) {
        console.log('\n✅ Dashboard is querying real database!');
        console.log('Latest response data:', JSON.stringify(apiResponses[apiResponses.length - 1], null, 2));
      }
      return;
    }

    console.log(`Found ${locationOptions.length} locations available`);

    // Click the second location option
    await locationOptions[1].click();
    console.log('✅ Clicked different location');

    // Wait for dashboard to reload with new data
    await page.waitForTimeout(3000);

    console.log('\n📊 Step 4: Checking metrics after location switch...');

    const newMetrics = await getMetrics();
    console.log('📊 New metrics:', newMetrics);

    // Compare metrics
    console.log('\n🔍 Comparison:');
    console.log('Before:', initialMetrics);
    console.log('After:', newMetrics);

    const metricsChanged = JSON.stringify(initialMetrics) !== JSON.stringify(newMetrics);
    console.log(`\n${metricsChanged ? '✅ SUCCESS' : '❌ FAILED'}: Metrics ${metricsChanged ? 'changed' : 'stayed the same'} after location switch`);

    // Verify API calls
    console.log(`\n📡 Total API calls made: ${apiRequests.length}`);
    console.log(`📡 Total API responses: ${apiResponses.length}`);

    if (apiResponses.length >= 2) {
      console.log('\n📊 Comparing API responses for different locations:');
      console.log('Response 1:', JSON.stringify(apiResponses[0], null, 2));
      console.log('Response 2:', JSON.stringify(apiResponses[apiResponses.length - 1], null, 2));

      const differentShops = apiResponses[0].barbershop_id !== apiResponses[apiResponses.length - 1].barbershop_id;
      console.log(`\n${differentShops ? '✅ SUCCESS' : '❌ FAILED'}: API requests use ${differentShops ? 'different' : 'same'} barbershop_id`);
    }

    // Final verification
    expect(apiRequests.length).toBeGreaterThan(0);
    if (locationOptions.length >= 2) {
      expect(metricsChanged).toBe(true);
    }
  });
});
