import { test, expect } from '@playwright/test';

test.describe('Dashboard Loading Investigation', () => {
  test('investigate dashboard loading without auth', async ({ page }) => {

    const logs = [];
    const errors = [];
    
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
      }: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      
    });
    
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
      } ${request.url()}`);
    });
    
    page.on('response', response => {
      } ${response.url()}`);
    });

    await page.goto('http://localhost:9999/dashboard', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(5000);
    
    const pageContent = await page.textContent('body');
    }...`);
    
    const loadingElements = await page.locator('text="Loading"').count();

    const loadingDashboard = await page.locator('text="Loading your dashboard"').count();
    const loadingApp = await page.locator('text="Loading application"').count();

    const protectedRouteLoading = loadingDashboard > 0 || loadingApp > 0;
    
    if (protectedRouteLoading) {

      await page.evaluate(() => {
        localStorage.setItem('dev_session', 'true');
        document.cookie = 'dev_auth=true; path=/';
      });
      
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const newContent = await page.textContent('body');
      }...`);
    }
    
    const dashboardTitle = await page.locator('text="Main Dashboard"').count();
    const executiveOverview = await page.locator('text="Executive Overview"').count();
    const modeButtons = await page.locator('[data-testid*="mode"]').count();

    await page.screenshot({ 
      path: 'test-results/screenshots/dashboard-investigation.png',
      fullPage: true 
    });

    await page.evaluate((data) => {
      window.testResults = data;
    }, { logs, errors, networkRequests, protectedRouteLoading });
  });
  
  test('test with pre-set dev session', async ({ page }) => {

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

    if (isDashboardVisible || isExecutiveVisible) {

      const aiInsightsButton = page.locator('text="AI Insights"');
      if (await aiInsightsButton.isVisible()) {
        await aiInsightsButton.click();
        await page.waitForTimeout(2000);
        
      }
    } else {
      
      await page.screenshot({ path: 'test-results/screenshots/dashboard-dev-bypass-failed.png' });
    }
  });
});