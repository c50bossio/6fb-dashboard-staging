import { test, expect } from '@playwright/test';

test.describe('Dashboard Loading Investigation', () => {
  test('investigate dashboard loading without auth', async ({ page }) => {
    console.log('🔍 Starting dashboard loading investigation...');
    
    const logs = [];
    const errors = [];
    
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
      console.log(`📝 Console: ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log(`❌ Page Error: ${error.message}`);
    });
    
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
      console.log(`🌐 Request: ${request.method()} ${request.url()}`);
    });
    
    page.on('response', response => {
      console.log(`📡 Response: ${response.status()} ${response.url()}`);
    });
    
    console.log('🏃 Navigating to dashboard...');
    await page.goto('http://localhost:9999/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(5000);
    
    const pageContent = await page.textContent('body');
    console.log(`📄 Page content: ${pageContent.substring(0, 200)}...`);
    
    const loadingElements = await page.locator('text="Loading"').count();
    console.log(`⏳ Loading elements found: ${loadingElements}`);
    
    const loadingDashboard = await page.locator('text="Loading your dashboard"').count();
    const loadingApp = await page.locator('text="Loading application"').count();
    
    console.log(`📊 Dashboard loading messages: ${loadingDashboard}`);
    console.log(`📱 App loading messages: ${loadingApp}`);
    
    const protectedRouteLoading = loadingDashboard > 0 || loadingApp > 0;
    
    if (protectedRouteLoading) {
      console.log('🔒 Stuck in ProtectedRoute - trying dev bypass...');
      
      await page.evaluate(() => {
        localStorage.setItem('dev_session', 'true');
        document.cookie = 'dev_auth=true; path=/';
      });
      
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const newContent = await page.textContent('body');
      console.log(`📄 Content after dev bypass: ${newContent.substring(0, 200)}...`);
    }
    
    const dashboardTitle = await page.locator('text="Main Dashboard"').count();
    const executiveOverview = await page.locator('text="Executive Overview"').count();
    const modeButtons = await page.locator('[data-testid*="mode"]').count();
    
    console.log(`📊 Dashboard elements found:`);
    console.log(`   Main Dashboard: ${dashboardTitle}`);
    console.log(`   Executive Overview: ${executiveOverview}`);
    console.log(`   Mode buttons: ${modeButtons}`);
    
    await page.screenshot({ 
      path: 'test-results/screenshots/dashboard-investigation.png',
      fullPage: true 
    });
    
    console.log(`\n📋 INVESTIGATION SUMMARY:`);
    console.log(`   Page loaded: ${!errors.length > 0}`);
    console.log(`   Console errors: ${errors.length}`);
    console.log(`   Network requests: ${networkRequests.length}`);
    console.log(`   Stuck in auth: ${protectedRouteLoading}`);
    console.log(`   Dashboard visible: ${dashboardTitle > 0 || executiveOverview > 0}`);
    
    await page.evaluate((data) => {
      window.testResults = data;
    }, { logs, errors, networkRequests, protectedRouteLoading });
  });
  
  test('test with pre-set dev session', async ({ page }) => {
    console.log('🔓 Testing with pre-configured dev session...');
    
    await page.goto('http://localhost:9999/');
    await page.evaluate(() => {
      localStorage.setItem('dev_session', 'true');
      document.cookie = 'dev_auth=true; path=/';
    });
    
    await page.goto('http://localhost:9999/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 15000 
    });
    
    const isDashboardVisible = await page.locator('text="Main Dashboard"').isVisible({ timeout: 10000 });
    const isExecutiveVisible = await page.locator('text="Executive Overview"').isVisible({ timeout: 5000 });
    
    console.log(`📊 Dashboard visible: ${isDashboardVisible}`);
    console.log(`👔 Executive overview visible: ${isExecutiveVisible}`);
    
    if (isDashboardVisible || isExecutiveVisible) {
      console.log('✅ Dashboard loaded successfully with dev bypass!');
      
      const aiInsightsButton = page.locator('text="AI Insights"');
      if (await aiInsightsButton.isVisible()) {
        await aiInsightsButton.click();
        await page.waitForTimeout(2000);
        console.log('🤖 AI Insights mode tested');
      }
    } else {
      console.log('❌ Dashboard still not loading even with dev bypass');
      await page.screenshot({ path: 'test-results/screenshots/dashboard-dev-bypass-failed.png' });
    }
  });
});