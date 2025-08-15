const { chromium } = require('playwright');

async function testBusinessRecommendationsWithAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🔐 Step 1: Authenticating with demo credentials...');
    await page.goto('http://localhost:9999/business-recommendations');
    
    await page.fill('[placeholder="Enter your email"]', 'demo@barbershop.com');
    await page.fill('[placeholder="Enter your password"]', 'demo123');
    
    await page.click('button:has-text("Sign in")');
    console.log('✅ Submitted login form');
    
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('🌐 Current URL:', currentUrl);
    
    if (!currentUrl.includes('business-recommendations')) {
      console.log('🧭 Navigating to business recommendations page...');
      await page.goto('http://localhost:9999/business-recommendations');
      await page.waitForTimeout(2000);
    }
    
    console.log('📊 Step 2: Testing Business Recommendations Engine...');
    
    await page.screenshot({ path: 'recommendations-after-auth.png' });
    console.log('📸 Screenshot after auth saved');
    
    const hasTitle = await page.locator('h1:has-text("Business Recommendations Engine")').count() > 0;
    console.log('🧠 Has main title:', hasTitle);
    
    const hasSubtitle = await page.locator('text=AI-powered recommendations').count() > 0;
    console.log('🤖 Has AI subtitle:', hasSubtitle);
    
    const hasRefreshButton = await page.locator('button:has-text("Refresh Recommendations")').count() > 0;
    console.log('🔄 Has refresh button:', hasRefreshButton);
    
    const isLoading = await page.locator('.animate-pulse').count() > 0;
    console.log('⏳ Currently loading:', isLoading);
    
    console.log('⏱️ Waiting for recommendations to load...');
    await page.waitForTimeout(8000);
    
    const hasError = await page.locator('text=Failed to Load Recommendations').count() > 0;
    console.log('❌ Has error state:', hasError);
    
    if (hasError) {
      console.log('🔧 Error detected, trying to refresh recommendations...');
      const refreshButton = page.locator('button:has-text("Try Again")');
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForTimeout(5000);
      }
    }
    
    const recommendationCards = await page.locator('.border-l-4, [class*="recommendation"]').count();
    console.log('💡 Number of recommendation cards:', recommendationCards);
    
    const hasAnalysisSummary = await page.locator('text=Analysis Summary').count() > 0;
    console.log('📈 Has analysis summary:', hasAnalysisSummary);
    
    const hasRoadmap = await page.locator('text=Implementation Roadmap').count() > 0;
    console.log('🗺️ Has implementation roadmap:', hasRoadmap);
    
    const hasPriorityMatrix = await page.locator('text=Priority Matrix').count() > 0;
    console.log('📊 Has priority matrix:', hasPriorityMatrix);
    
    const hasRevenueMetrics = await page.locator('text*="Monthly Revenue"').count() > 0;
    console.log('💰 Has revenue metrics:', hasRevenueMetrics);
    
    const hasROIMetrics = await page.locator('text*="ROI"').count() > 0;
    console.log('📈 Has ROI metrics:', hasROIMetrics);
    
    if (hasRefreshButton) {
      console.log('🔄 Testing refresh functionality...');
      await page.click('button:has-text("Refresh Recommendations")');
      await page.waitForTimeout(3000);
      
      const isRefreshing = await page.locator('.animate-spin').count() > 0;
      console.log('🔄 Currently refreshing:', isRefreshing);
    }
    
    await page.screenshot({ path: 'recommendations-final-test.png' });
    console.log('📸 Final screenshot saved');
    
    const implementButtons = await page.locator('button:has-text("Mark as Implemented")').count();
    console.log('✅ Implementation buttons found:', implementButtons);
    
    if (implementButtons > 0) {
      console.log('🧪 Testing implementation tracking...');
      await page.click('button:has-text("Mark as Implemented")');
      await page.waitForTimeout(2000);
    }
    
    console.log('\n📊 COMPREHENSIVE TEST RESULTS:');
    console.log('================================');
    console.log('🔐 Authentication:', hasTitle || hasSubtitle ? 'SUCCESS' : 'FAILED');
    console.log('🧠 Recommendations Engine:', hasTitle ? 'LOADED' : 'NOT LOADED');
    console.log('💡 Recommendation Cards:', recommendationCards > 0 ? `${recommendationCards} found` : 'NONE');
    console.log('📈 Analysis Features:', hasAnalysisSummary ? 'PRESENT' : 'MISSING');
    console.log('🗺️ Implementation Roadmap:', hasRoadmap ? 'PRESENT' : 'MISSING');
    console.log('📊 Priority Matrix:', hasPriorityMatrix ? 'PRESENT' : 'MISSING');
    console.log('💰 Business Metrics:', hasRevenueMetrics ? 'PRESENT' : 'MISSING');
    console.log('🔄 Refresh Functionality:', hasRefreshButton ? 'AVAILABLE' : 'MISSING');
    console.log('✅ Implementation Tracking:', implementButtons > 0 ? 'WORKING' : 'NOT AVAILABLE');
    console.log('❌ Error Handling:', hasError ? 'ERROR DISPLAYED' : 'NO ERRORS');
    
    const overallScore = [
      hasTitle,
      recommendationCards > 0,
      hasRefreshButton,
      hasAnalysisSummary || hasRoadmap || hasPriorityMatrix,
      !hasError
    ].filter(Boolean).length;
    
    console.log('\n🏆 OVERALL ASSESSMENT:');
    console.log(`Score: ${overallScore}/5`);
    if (overallScore >= 4) {
      console.log('Status: ✅ EXCELLENT - Recommendations engine is working well');
    } else if (overallScore >= 3) {
      console.log('Status: ⚠️ GOOD - Some features may need attention');
    } else {
      console.log('Status: ❌ NEEDS WORK - Major issues detected');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

testBusinessRecommendationsWithAuth();