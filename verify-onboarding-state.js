const { chromium } = require('playwright');

async function verifyOnboardingState() {
  console.log('🔍 Verifying current onboarding system state...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const page = await browser.newContext().then(ctx => ctx.newPage());
  
  try {
    // 1. CHECK LOGIN PAGE
    console.log('📝 Checking login page...');
    await page.goto('http://localhost:9999/login');
    await page.waitForLoadState('networkidle');
    
    // Look for bypass button
    const bypassButton = await page.locator('button:has-text("Continue as Demo User"), button:has-text("Dev Bypass"), button:has-text("Continue without login")').first();
    const hasBypass = await bypassButton.isVisible({ timeout: 1000 }).catch(() => false);
    
    if (hasBypass) {
      console.log('   ✅ Found auth bypass button');
      console.log('   Clicking bypass...');
      await bypassButton.click();
      
      // Wait for navigation
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('dashboard')) {
        console.log('   ✅ Redirected to dashboard\n');
        
        // Check for onboarding
        console.log('📝 Checking onboarding modal...');
        const hasOnboarding = await page.isVisible('text=Welcome to Your Dashboard', { timeout: 3000 });
        
        if (hasOnboarding) {
          console.log('   ✅ Onboarding modal is VISIBLE');
          
          // Check current step
          const stepIndicator = await page.locator('text=/Step \\d+ of \\d+/').first();
          if (await stepIndicator.isVisible()) {
            const stepText = await stepIndicator.textContent();
            console.log(`   Current: ${stepText}`);
          }
          
          // Test photo upload
          console.log('\n📝 Testing photo upload in Staff Setup...');
          
          // Navigate to Staff Setup step if not there
          let currentStep = 0;
          while (currentStep < 3) {
            const staffSetupVisible = await page.isVisible('text=Staff Setup');
            if (staffSetupVisible) break;
            
            await page.click('button:has-text("Next")');
            await page.waitForTimeout(1000);
            currentStep++;
          }
          
          // Check for upload error
          const uploadError = await page.locator('text=Unauthorized, text=row-level security').first();
          if (await uploadError.isVisible({ timeout: 1000 }).catch(() => false)) {
            const errorText = await uploadError.textContent();
            console.log(`   ❌ Upload error present: "${errorText}"`);
            console.log('   This confirms RLS is blocking uploads in dev mode');
          } else {
            console.log('   ✅ No upload errors visible');
          }
          
        } else {
          console.log('   ℹ️  Onboarding modal NOT visible');
          console.log('   Checking for Launch Onboarding button...');
          
          // Look in dropdown menu
          await page.click('button:has-text("Settings"), [aria-label="Settings"]').catch(() => {});
          await page.waitForTimeout(500);
          
          const launchButton = await page.locator('text=Launch Onboarding').first();
          if (await launchButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log('   ✅ Launch Onboarding button found');
            await launchButton.click();
            
            await page.waitForTimeout(2000);
            if (await page.isVisible('text=Welcome to Your Dashboard')) {
              console.log('   ✅ Onboarding modal opened successfully!');
            }
          } else {
            console.log('   ❌ Launch Onboarding button not found');
          }
        }
        
      } else {
        console.log('   ⚠️  Did not redirect to dashboard');
        console.log(`   Current page: ${currentUrl}`);
      }
      
    } else {
      console.log('   ℹ️  No auth bypass found');
      console.log('   This means you need to log in with real credentials\n');
      
      console.log('📝 Checking login form...');
      const emailInput = await page.isVisible('input[type="email"]');
      const passwordInput = await page.isVisible('input[type="password"]');
      const submitButton = await page.isVisible('button[type="submit"]');
      
      console.log(`   Email input: ${emailInput ? '✅' : '❌'}`);
      console.log(`   Password input: ${passwordInput ? '✅' : '❌'}`);
      console.log(`   Submit button: ${submitButton ? '✅' : '❌'}`);
    }
    
    // Take diagnostic screenshot
    await page.screenshot({ path: 'onboarding-state.png', fullPage: true });
    console.log('\n📸 Screenshot saved: onboarding-state.png');
    
    console.log('\n' + '='.repeat(50));
    console.log('SYSTEM STATE SUMMARY:');
    console.log('='.repeat(50));
    console.log(`Auth Bypass Available: ${hasBypass ? 'YES' : 'NO'}`);
    console.log(`Dashboard Accessible: ${page.url().includes('dashboard') ? 'YES' : 'NO'}`);
    console.log(`Onboarding System: ${await page.isVisible('text=Welcome to Your Dashboard', { timeout: 1000 }).catch(() => false) ? 'ACTIVE' : 'INACTIVE'}`);
    console.log('='.repeat(50));
    
    console.log('\n💡 RECOMMENDATIONS:');
    if (!hasBypass) {
      console.log('• Log in with real Supabase credentials for full testing');
      console.log('• Or add a dev bypass button for easier development');
    }
    console.log('• Run the SQL scripts to fix RLS policies');
    console.log('• Ensure all database tables are properly created');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: `error-state-${Date.now()}.png`, fullPage: true });
    
  } finally {
    console.log('\nBrowser will close in 10 seconds...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

verifyOnboardingState().catch(console.error);