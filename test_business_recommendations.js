const { chromium } = require('playwright');

async function testBusinessRecommendations() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🌐 Navigating to business recommendations page...');
    await page.goto('http://localhost:9999/business-recommendations');
    
    // Wait for page to load
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'business-recommendations-test.png' });
    console.log('📸 Screenshot saved as business-recommendations-test.png');
    
    // Check if page loaded
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Look for key elements
    const hasRecommendationsEngine = await page.locator('text=Business Recommendations Engine').count() > 0;
    console.log('🧠 Has recommendations engine title:', hasRecommendationsEngine);
    
    const hasLoadingState = await page.locator('.animate-pulse').count() > 0;
    console.log('⏳ Shows loading state:', hasLoadingState);
    
    const hasErrorState = await page.locator('text=Failed to Load Recommendations').count() > 0;
    console.log('❌ Shows error state:', hasErrorState);
    
    // Wait a bit more to see if recommendations load
    console.log('⏱️ Waiting for recommendations to load...');
    await page.waitForTimeout(10000);
    
    // Check again after waiting
    const hasRecommendations = await page.locator('[data-testid*="recommendation"], .recommendations').count() > 0;
    console.log('💡 Has recommendation cards:', hasRecommendations);
    
    // Get page content for analysis
    const content = await page.content();
    const hasApiCall = content.includes('/api/business/recommendations');
    console.log('🔗 Makes API calls:', hasApiCall);
    
    // Check console errors
    const messages = [];
    page.on('console', msg => messages.push(msg.text()));
    
    console.log('\n📊 Test Results Summary:');
    console.log('- Page loads:', title.includes('6FB AI Agent System'));
    console.log('- Has title:', hasRecommendationsEngine);
    console.log('- Shows loading:', hasLoadingState);
    console.log('- Shows error:', hasErrorState);
    console.log('- Has recommendations:', hasRecommendations);
    console.log('- Makes API calls:', hasApiCall);
    
    // Take final screenshot
    await page.screenshot({ path: 'business-recommendations-final.png' });
    console.log('📸 Final screenshot saved');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await browser.close();
  }
}

testBusinessRecommendations();