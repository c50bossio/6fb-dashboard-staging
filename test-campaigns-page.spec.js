const { test, expect } = require('@playwright/test');

test.describe('Campaigns Page Loading Test', () => {
  test('should load campaigns page without infinite spinner', async ({ page }) => {
    // Set up development mode
    await page.addInitScript(() => {
      localStorage.setItem('dev_session', 'true');
      window.process = { env: { NODE_ENV: 'development', NEXT_PUBLIC_DEV_MODE: 'true' } };
    });

    console.log('🧪 Testing campaigns page loading...');
    
    // Navigate to campaigns page
    await page.goto('http://localhost:9999/dashboard/campaigns', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('📄 Page loaded, checking for loading states...');
    
    // Wait a moment for any initial loading to settle
    await page.waitForTimeout(2000);
    
    // Check if the infinite loading spinner is NOT present
    const loadingSpinner = page.locator('text="Loading campaigns..."');
    const isSpinnerVisible = await loadingSpinner.isVisible().catch(() => false);
    
    console.log('🔄 Loading spinner visible:', isSpinnerVisible);
    
    // Check for authentication loading state
    const authLoading = page.locator('text="Loading..." >> nth=0');
    const isAuthLoadingVisible = await authLoading.isVisible().catch(() => false);
    
    console.log('🔐 Auth loading visible:', isAuthLoadingVisible);
    
    // Check for actual page content
    const pageContent = await page.textContent('body');
    const hasPageContent = pageContent && pageContent.length > 100;
    
    console.log('📝 Page has substantial content:', hasPageContent);
    console.log('📏 Page content length:', pageContent?.length || 0);
    
    // Take a screenshot for debugging
    await page.screenshot({ 
      path: 'campaigns-page-debug.png', 
      fullPage: true 
    });
    
    console.log('📸 Screenshot saved as campaigns-page-debug.png');
    
    // Check for error messages
    const hasError = pageContent?.includes('error') || pageContent?.includes('Error');
    console.log('❌ Page contains error:', hasError);
    
    // Wait for the page to stabilize (no loading states)
    await page.waitForFunction(() => {
      const body = document.body.textContent;
      return !body.includes('Loading campaigns...') && 
             !body.includes('Loading...') &&
             body.length > 100;
    }, { timeout: 15000 });
    
    // Verify the page loaded successfully
    expect(isSpinnerVisible).toBe(false);
    expect(hasPageContent).toBe(true);
    
    console.log('✅ Campaigns page loaded successfully without infinite spinner');
  });
  
  test('should show billing data or empty state', async ({ page }) => {
    // Set up development mode
    await page.addInitScript(() => {
      localStorage.setItem('dev_session', 'true');
      window.process = { env: { NODE_ENV: 'development', NEXT_PUBLIC_DEV_MODE: 'true' } };
    });

    await page.goto('http://localhost:9999/dashboard/campaigns', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    const pageText = await page.textContent('body');
    
    // Should show either billing data or an empty state, not loading
    const hasBillingContent = pageText?.includes('Marketing') || 
                              pageText?.includes('Billing') ||
                              pageText?.includes('Campaign') ||
                              pageText?.includes('Account') ||
                              pageText?.includes('No campaigns') ||
                              pageText?.includes('Get started');
    
    console.log('💰 Page shows billing/marketing content:', hasBillingContent);
    
    expect(hasBillingContent).toBe(true);
  });
});