const { chromium } = require('playwright');

async function testLoginFunctionality() {
  let browser;
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000 
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('🧪 TESTING LOGIN FUNCTIONALITY');
    
    // Test 1: Navigate to login page
    console.log('\n1️⃣ Testing login page access...');
    await page.goto('http://localhost:9999/login');
    const loginFormExists = await page.locator('form').count() > 0;
    console.log(`   Login form loaded: ${loginFormExists ? '✅' : '❌'}`);
    
    if (!loginFormExists) {
      throw new Error('Login form not found');
    }
    
    // Test 2: Fill and submit credentials
    console.log('\n2️⃣ Testing credential submission...');
    await page.fill('input[name="email"]', 'demo@barbershop.com');
    await page.fill('input[name="password"]', 'demo123');
    
    const emailValue = await page.inputValue('input[name="email"]');
    const passwordValue = await page.inputValue('input[name="password"]');
    console.log(`   Email filled: ${emailValue === 'demo@barbershop.com' ? '✅' : '❌'}`);
    console.log(`   Password filled: ${passwordValue === 'demo123' ? '✅' : '❌'}`);
    
    // Test 3: Submit and monitor loading state
    console.log('\n3️⃣ Testing form submission and loading state...');
    await page.click('button[type="submit"]');
    
    // Check immediate loading state
    await page.waitForTimeout(500);
    const loadingText = await page.locator('button[type="submit"]').textContent();
    const showsLoading = loadingText.includes('Signing in...');
    console.log(`   Shows loading state: ${showsLoading ? '✅' : '❌'}`);
    
    // Test 4: Wait for redirect and verify dashboard access
    console.log('\n4️⃣ Testing redirect to dashboard...');
    
    let redirectSuccess = false;
    try {
      await page.waitForURL('**/dashboard', { timeout: 8000 });
      redirectSuccess = true;
    } catch (e) {
      console.log('   Redirect timeout, checking current state...');
    }
    
    const finalUrl = page.url();
    const isDashboard = finalUrl.includes('/dashboard');
    console.log(`   Redirected to dashboard: ${isDashboard ? '✅' : '❌'}`);
    console.log(`   Final URL: ${finalUrl}`);
    
    // Test 5: Verify dashboard content loads
    if (isDashboard) {
      console.log('\n5️⃣ Testing dashboard content...');
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        // Check for dashboard elements
        const hasDashboardTitle = await page.locator('text=Dashboard').count() > 0;
        const hasContent = await page.locator('main, .dashboard, [data-testid*="dashboard"]').count() > 0;
        
        console.log(`   Dashboard title present: ${hasDashboardTitle ? '✅' : '❌'}`);
        console.log(`   Dashboard content loaded: ${hasContent ? '✅' : '❌'}`);
      } catch (e) {
        console.log('   Dashboard content check failed:', e.message);
      }
    }
    
    // Test 6: Verify authentication state
    console.log('\n6️⃣ Testing authentication state...');
    try {
      // Try to access a protected page to verify auth
      await page.goto('http://localhost:9999/dashboard/settings');
      await page.waitForLoadState('networkidle', { timeout: 3000 });
      const settingsAccessible = !page.url().includes('/login');
      console.log(`   Protected page accessible: ${settingsAccessible ? '✅' : '❌'}`);
    } catch (e) {
      console.log('   Authentication state check inconclusive');
    }
    
    // Overall test result
    const overallSuccess = isDashboard && redirectSuccess;
    
    console.log('\n🎯 TEST RESULTS SUMMARY');
    console.log('================================');
    console.log(`Login Form Loading: ${loginFormExists ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Credential Input: ${emailValue === 'demo@barbershop.com' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Loading State: ${showsLoading ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Redirect Success: ${isDashboard ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Overall Login: ${overallSuccess ? '✅ WORKING' : '❌ BROKEN'}`);
    
    return {
      success: overallSuccess,
      details: {
        formLoaded: loginFormExists,
        credentialsFilled: emailValue === 'demo@barbershop.com',
        loadingStateShown: showsLoading,
        redirectedToDashboard: isDashboard,
        finalUrl
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (require.main === module) {
  testLoginFunctionality().then(result => {
    if (result.success) {
      console.log('\n🎉 LOGIN FUNCTIONALITY IS WORKING!');
      console.log('The user can now successfully log in with demo credentials.');
    } else {
      console.log('\n⚠️ LOGIN ISSUES DETECTED');
      console.log('Further investigation may be needed.');
    }
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = { testLoginFunctionality };