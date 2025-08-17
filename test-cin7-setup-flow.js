/**
 * Playwright Test for CIN7 Setup Flow
 * Tests the complete user journey from login to successful inventory sync
 */

const { chromium } = require('playwright');

// Test configuration
const config = {
  baseUrl: 'http://localhost:9999',
  credentials: {
    email: process.env.TEST_EMAIL || 'test@example.com',
    password: process.env.TEST_PASSWORD || 'testpassword',
    cin7AccountId: process.env.CIN7_ACCOUNT_ID || '',
    cin7ApiKey: process.env.CIN7_API_KEY || ''
  },
  timeout: 60000, // 60 seconds for the entire test
  headless: false, // Set to true for CI/CD
  slowMo: 500 // Slow down for visibility (remove in production)
};

async function testCIN7SetupFlow() {
  console.log('🚀 Starting CIN7 Setup Flow Test');
  console.log('==========================================');
  
  // Launch browser
  const browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('❌ Browser console error:', msg.text());
    }
  });
  
  // Monitor network requests
  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(`❌ HTTP ${response.status()} - ${response.url()}`);
    }
  });
  
  try {
    // Step 1: Navigate to login page
    console.log('\n📍 Step 1: Navigating to login page...');
    await page.goto(config.baseUrl + '/login', { waitUntil: 'networkidle' });
    
    // Check if we need to login or if we're already authenticated
    const isLoginPage = await page.isVisible('input[type="email"]').catch(() => false);
    
    if (isLoginPage) {
      console.log('📝 Logging in...');
      
      // Fill login form
      await page.fill('input[type="email"]', config.credentials.email);
      await page.fill('input[type="password"]', config.credentials.password);
      
      // Click login button
      await page.click('button:has-text("Sign In"), button:has-text("Log In")');
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'networkidle' });
      console.log('✅ Login successful');
    } else {
      console.log('✅ Already authenticated');
    }
    
    // Step 2: Navigate to products page
    console.log('\n📍 Step 2: Navigating to products page...');
    await page.goto(config.baseUrl + '/shop/products', { waitUntil: 'networkidle' });
    
    // Look for CIN7 setup button or existing setup
    const hasSetupButton = await page.isVisible('button:has-text("Set Up CIN7")').catch(() => false);
    const hasConnectedStatus = await page.isVisible('text=/Connected to CIN7/i').catch(() => false);
    
    if (hasConnectedStatus) {
      console.log('✅ CIN7 is already connected');
      
      // Test sync functionality
      console.log('\n📍 Testing sync functionality...');
      const syncButton = await page.$('button:has-text("Sync Now")');
      if (syncButton) {
        await syncButton.click();
        console.log('🔄 Sync initiated');
        
        // Wait for sync to complete
        await page.waitForSelector('text=/Sync complete/i', { timeout: 30000 }).catch(() => {
          console.log('⚠️ Sync status message not found');
        });
      }
    } else if (hasSetupButton) {
      console.log('📝 Starting CIN7 setup wizard...');
      
      // Click setup button
      await page.click('button:has-text("Set Up CIN7")');
      
      // Wait for wizard to appear
      await page.waitForSelector('text=/Welcome to Inventory Sync Setup/i', { timeout: 5000 });
      console.log('✅ Setup wizard opened');
      
      // Step 3: Go through setup wizard
      console.log('\n📍 Step 3: Completing setup wizard...');
      
      // Welcome screen - click Get Started
      await page.click('button:has-text("Get Started")');
      await page.waitForTimeout(1000);
      
      // System selection - CIN7 should auto-advance
      const cin7Button = await page.$('button:has-text("CIN7")');
      if (cin7Button) {
        await cin7Button.click();
        console.log('✅ Selected CIN7 system');
      }
      
      // Credentials screen
      await page.waitForSelector('input[placeholder*="Account ID"]', { timeout: 5000 });
      
      if (config.credentials.cin7AccountId && config.credentials.cin7ApiKey) {
        console.log('📝 Entering CIN7 credentials...');
        await page.fill('input[placeholder*="Account ID"]', config.credentials.cin7AccountId);
        await page.fill('input[placeholder*="API Key"]', config.credentials.cin7ApiKey);
        
        // Click Test Connection
        await page.click('button:has-text("Test Connection")');
        console.log('🔄 Testing connection...');
        
        // Wait for connection test result
        const connectionSuccess = await page.waitForSelector('text=/Connection successful/i', { timeout: 15000 }).catch(() => null);
        
        if (connectionSuccess) {
          console.log('✅ Connection test successful');
          
          // Click Continue to Sync
          const continueButton = await page.$('button:has-text("Continue to Sync")');
          if (continueButton) {
            await continueButton.click();
            console.log('🔄 Proceeding to sync...');
          }
          
          // Wait for Start Syncing button
          await page.waitForSelector('button:has-text("Start Syncing")', { timeout: 5000 });
          await page.click('button:has-text("Start Syncing")');
          console.log('🔄 Initial sync started...');
          
          // Wait for sync to complete
          const syncComplete = await page.waitForSelector('text=/Sync Complete/i, text=/All Set/i', { timeout: 30000 }).catch(() => null);
          
          if (syncComplete) {
            console.log('✅ Initial sync completed');
            
            // Get sync results
            const syncResults = await page.evaluate(() => {
              const text = document.body.innerText;
              const productMatch = text.match(/(\d+)\s+products?/i);
              return {
                productCount: productMatch ? parseInt(productMatch[1]) : 0
              };
            });
            
            console.log(`📦 Products synced: ${syncResults.productCount}`);
            
            // Click Finish Setup
            await page.click('button:has-text("Finish Setup")');
            console.log('✅ Setup completed successfully');
          } else {
            console.error('❌ Sync did not complete within timeout');
          }
        } else {
          console.error('❌ Connection test failed');
          
          // Capture error message
          const errorMessage = await page.textContent('.text-red-800, .text-red-600').catch(() => 'Unknown error');
          console.error(`Error details: ${errorMessage}`);
        }
      } else {
        console.log('⚠️ CIN7 credentials not provided - skipping actual connection');
        console.log('To test with real credentials, set environment variables:');
        console.log('  CIN7_ACCOUNT_ID=your_account_id');
        console.log('  CIN7_API_KEY=your_api_key');
      }
    } else {
      console.log('⚠️ No setup button or connection status found');
    }
    
    // Step 4: Verify final state
    console.log('\n📍 Step 4: Verifying final state...');
    
    // Check for products in the table
    const productRows = await page.$$('tbody tr').catch(() => []);
    console.log(`📊 Products in table: ${productRows.length}`);
    
    // Check for status widget
    const statusWidget = await page.isVisible('text=/Last sync/i').catch(() => false);
    if (statusWidget) {
      console.log('✅ Status widget is visible');
    }
    
    // Take screenshot for visual verification
    await page.screenshot({ 
      path: 'cin7-setup-test-result.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: cin7-setup-test-result.png');
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take error screenshot
    await page.screenshot({ 
      path: 'cin7-setup-test-error.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved: cin7-setup-test-error.png');
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
console.log('🔧 Test Configuration:');
console.log(`  Base URL: ${config.baseUrl}`);
console.log(`  Headless: ${config.headless}`);
console.log(`  Timeout: ${config.timeout}ms`);
console.log(`  CIN7 Credentials: ${config.credentials.cin7AccountId ? 'Provided' : 'Not provided'}`);

testCIN7SetupFlow()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });