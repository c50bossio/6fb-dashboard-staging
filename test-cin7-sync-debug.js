const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Cin7 sync debug test...');
  
  const browser = await chromium.launch({ 
    headless: false, // Keep visible to see what's happening
    slowMo: 1000 // Slow down for debugging
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  // Listen to console logs from the browser
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    
    if (text.includes('COMPLETE Cin7 API RESPONSE ANALYSIS') || 
        text.includes('INVENTORY FIELDS FOUND') ||
        text.includes('Inventory values') ||
        text.includes('📦') ||
        text.includes('PRICE FIELDS FOUND') ||
        text.includes('Price values') ||
        text.includes('💰')) {
      console.log(`🎯 [BROWSER ${type.toUpperCase()}]:`, text);
    } else if (type === 'error') {
      console.error(`❌ [BROWSER ERROR]:`, text);
    } else {
      console.log(`🔍 [BROWSER ${type}]:`, text);
    }
  });
  
  // Listen to network responses to capture API responses
  page.on('response', response => {
    if (response.url().includes('/api/cin7/test-sync')) {
      console.log(`📡 Cin7 API Response Status: ${response.status()}`);
      
      response.json().then(data => {
        console.log('🎯 Cin7 API Response Data:', JSON.stringify(data, null, 2));
        
        if (data.debugInfo && data.debugInfo.fieldAnalysis) {
          console.log('\n🔍 FIELD ANALYSIS FROM API:');
          console.log('Stock fields found:', data.debugInfo.fieldAnalysis.stockRelatedFields);
          console.log('Stock field values:', data.debugInfo.fieldAnalysis.stockFieldValues);
          console.log('Price fields found:', data.debugInfo.fieldAnalysis.priceRelatedFields);
          console.log('Price field values:', data.debugInfo.fieldAnalysis.priceFieldValues);
        }
        
        if (data.fieldAnalysisReport) {
          console.log('\n📊 FIELD ANALYSIS REPORT:');
          console.log('Stock fields attempted:', data.fieldAnalysisReport.stockFieldsAttempted);
          console.log('Sample results:', data.fieldAnalysisReport.currentStockResults);
        }
      }).catch(err => {
        console.error('Error parsing API response:', err);
      });
    }
  });
  
  try {
    console.log('🌐 Navigating to products page...');
    await page.goto('http://localhost:9999/shop/products');
    
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);
    
    // Look for Cin7 sync button
    console.log('🔍 Looking for Cin7 sync button...');
    
    // Try different possible button selectors
    const syncButtonSelectors = [
      'button:has-text("Setup Cin7 Sync")',
      'button:has-text("Refresh Inventory")',
      'button:has-text("Sync")',
      '[data-testid="cin7-sync"]',
      '.cin7-sync-button'
    ];
    
    let syncButton = null;
    for (const selector of syncButtonSelectors) {
      try {
        syncButton = await page.locator(selector).first();
        if (await syncButton.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found sync button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!syncButton || !(await syncButton.isVisible())) {
      console.log('⚠️  No visible sync button found. Looking for "Setup Cin7 Sync" button...');
      
      // Check if we need to setup Cin7 first
      const setupButton = await page.locator('button:has-text("Setup Cin7 Sync")').first();
      if (await setupButton.isVisible({ timeout: 2000 })) {
        console.log('🔧 Found "Setup Cin7 Sync" button, clicking it...');
        await setupButton.click();
        
        await page.waitForTimeout(2000);
        
        // Fill in demo credentials for testing
        console.log('📝 Filling in test credentials...');
        await page.fill('input[placeholder*="Account ID"]', 'test-account-123');
        await page.fill('input[placeholder*="API key"]', 'test-api-key-456');
        
        // Click connect button
        const connectButton = await page.locator('button:has-text("Connect")').first();
        if (await connectButton.isVisible()) {
          console.log('🔗 Clicking connect button to trigger sync...');
          await connectButton.click();
          
          // Wait for response and logs
          await page.waitForTimeout(10000);
        }
      }
    } else {
      console.log('🔗 Clicking sync button...');
      await syncButton.click();
      
      // Wait for response and logs
      await page.waitForTimeout(10000);
    }
    
    console.log('✅ Sync operation completed. Check console logs above for field analysis.');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
  
  console.log('🔍 Keeping browser open for 10 more seconds to capture any delayed logs...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  console.log('✅ Browser closed. Test completed.');
})();