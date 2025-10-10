const { chromium } = require('playwright');

async function testBusinessRecommendations() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    
    await page.goto('http://localhost:9999/business-recommendations');
    
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'business-recommendations-test.png' });

    const title = await page.title();

    const hasRecommendationsEngine = await page.locator('text=Business Recommendations Engine').count() > 0;

    const hasLoadingState = await page.locator('.animate-pulse').count() > 0;

    const hasErrorState = await page.locator('text=Failed to Load Recommendations').count() > 0;

    await page.waitForTimeout(10000);
    
    const hasRecommendations = await page.locator('[data-testid*="recommendation"], .recommendations').count() > 0;

    const content = await page.content();
    const hasApiCall = content.includes('/api/business/recommendations');

    const messages = [];
    page.on('console', msg => messages.push(msg.text()));

    );

    await page.screenshot({ path: 'business-recommendations-final.png' });

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testBusinessRecommendations();