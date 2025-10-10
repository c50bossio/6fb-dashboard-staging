const { chromium } = require('playwright');

async function testBusinessRecommendationsWithAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    
    await page.goto('http://localhost:9999/business-recommendations');
    
    await page.fill('[placeholder="Enter your email"]', 'demo@barbershop.com');
    await page.fill('[placeholder="Enter your password"]', 'demo123');
    
    await page.click('button:has-text("Sign in")');

    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();

    if (!currentUrl.includes('business-recommendations')) {
      
      await page.goto('http://localhost:9999/business-recommendations');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'recommendations-after-auth.png' });

    const hasTitle = await page.locator('h1:has-text("Business Recommendations Engine")').count() > 0;

    const hasSubtitle = await page.locator('text=AI-powered recommendations').count() > 0;

    const hasRefreshButton = await page.locator('button:has-text("Refresh Recommendations")').count() > 0;

    const isLoading = await page.locator('.animate-pulse').count() > 0;

    await page.waitForTimeout(8000);
    
    const hasError = await page.locator('text=Failed to Load Recommendations').count() > 0;

    if (hasError) {
      
      const refreshButton = page.locator('button:has-text("Try Again")');
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForTimeout(5000);
      }
    }
    
    const recommendationCards = await page.locator('.border-l-4, [class*="recommendation"]').count();

    const hasAnalysisSummary = await page.locator('text=Analysis Summary').count() > 0;

    const hasRoadmap = await page.locator('text=Implementation Roadmap').count() > 0;

    const hasPriorityMatrix = await page.locator('text=Priority Matrix').count() > 0;

    const hasRevenueMetrics = await page.locator('text*="Monthly Revenue"').count() > 0;

    const hasROIMetrics = await page.locator('text*="ROI"').count() > 0;

    if (hasRefreshButton) {
      
      await page.click('button:has-text("Refresh Recommendations")');
      await page.waitForTimeout(3000);
      
      const isRefreshing = await page.locator('.animate-spin').count() > 0;
      
    }
    
    await page.screenshot({ path: 'recommendations-final-test.png' });

    const implementButtons = await page.locator('button:has-text("Mark as Implemented")').count();

    if (implementButtons > 0) {
      
      await page.click('button:has-text("Mark as Implemented")');
      await page.waitForTimeout(2000);
    }

    const overallScore = [
      hasTitle,
      recommendationCards > 0,
      hasRefreshButton,
      hasAnalysisSummary || hasRoadmap || hasPriorityMatrix,
      !hasError
    ].filter(Boolean).length;

    if (overallScore >= 4) {
      
    } else if (overallScore >= 3) {
      
    } else {
      
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

testBusinessRecommendationsWithAuth();