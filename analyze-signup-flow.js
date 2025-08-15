const { chromium } = require('playwright');

async function analyzeSignupFlow() {
  console.log('🔍 Analyzing Signup Flow - Best Practices vs Current Implementation\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('📋 BEST PRACTICES FOR SAAS SIGNUP FLOW:');
    console.log('=====================================');
    console.log('1. Plan Selection FIRST (builds intent & commitment)');
    console.log('2. Authentication SECOND (users know what they\'re signing up for)');
    console.log('3. Payment Collection THIRD (complete the purchase)');
    console.log('4. Onboarding/Welcome FOURTH (guide users to success)');
    console.log('');
    
    // Step 1: Navigate to homepage
    console.log('🏠 STEP 1: Navigating to homepage...');
    await page.goto('http://localhost:9999');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/screenshots/01-homepage.png' });
    console.log('✅ Homepage loaded');
    
    // Step 2: Find and analyze signup buttons
    console.log('\n🔍 STEP 2: Finding signup buttons on homepage...');
    
    const signupButtons = await page.locator('text=/sign.*up|register|get.*started|start.*free/i').all();
    
    console.log(`Found ${signupButtons.length} potential signup buttons:`);
    for (let i = 0; i < signupButtons.length; i++) {
      const text = await signupButtons[i].textContent();
      const href = await signupButtons[i].getAttribute('href') || 'No href';
      console.log(`  ${i + 1}. "${text.trim()}" → ${href}`);
    }
    
    // Step 3: Click the main signup button
    console.log('\n📱 STEP 3: Testing primary signup flow...');
    
    // Look for common signup button patterns
    const primarySignup = page.locator('text=/get.*started|sign.*up|register|start.*free/i').first();
    
    if (await primarySignup.count() > 0) {
      const buttonText = await primarySignup.textContent();
      console.log(`Clicking primary signup button: "${buttonText.trim()}"`);
      
      await primarySignup.click();
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      console.log(`✅ Redirected to: ${currentUrl}`);
      
      await page.screenshot({ path: 'test-results/screenshots/02-after-signup-click.png' });
      
      // Analyze what page we landed on
      const pageTitle = await page.locator('h1').first().textContent().catch(() => 'No title');
      console.log(`Page title: "${pageTitle}"`);
      
      // Check if this is a plan selection page or auth page
      const hasPlanSelection = await page.locator('text=/plan|pricing|choose/i').count() > 0;
      const hasAuthForm = await page.locator('text=/sign.*in|login|google|email.*password/i').count() > 0;
      
      console.log('\n📊 CURRENT FLOW ANALYSIS:');
      console.log('=========================');
      
      if (hasPlanSelection) {
        console.log('✅ FOLLOWS BEST PRACTICE: Plan selection comes first');
        
        // Test plan selection
        console.log('\n🎯 Testing plan selection...');
        const planButtons = await page.locator('button:has-text("Start as")').all();
        
        if (planButtons.length > 0) {
          console.log(`Found ${planButtons.length} plan options:`);
          for (let i = 0; i < planButtons.length; i++) {
            const planText = await planButtons[i].textContent();
            console.log(`  ${i + 1}. ${planText.trim()}`);
          }
          
          // Click first plan option
          const firstPlan = planButtons[0];
          const planName = await firstPlan.textContent();
          console.log(`\nClicking first plan: "${planName.trim()}"`);
          
          await firstPlan.click();
          await page.waitForLoadState('networkidle');
          
          const afterPlanUrl = page.url();
          console.log(`After plan selection: ${afterPlanUrl}`);
          
          await page.screenshot({ path: 'test-results/screenshots/03-after-plan-selection.png' });
          
          // Check if we go to auth next
          const nowHasAuth = await page.locator('text=/google.*sign|continue.*google|oauth/i').count() > 0;
          if (nowHasAuth) {
            console.log('✅ CORRECT: Plan → Auth flow');
          } else {
            console.log('❌ ISSUE: Plan selected but no auth prompt');
          }
        }
      } else if (hasAuthForm) {
        console.log('❌ VIOLATES BEST PRACTICE: Authentication comes before plan selection');
        console.log('   Users don\'t know what they\'re signing up for!');
        console.log('   This reduces conversion rates and increases confusion.');
        
        // Check what auth options are available
        const authOptions = await page.locator('button:has-text("Google"), button:has-text("Sign"), input[type="email"]').all();
        console.log(`\nFound ${authOptions.length} auth options on this page`);
        
      } else {
        console.log('❓ UNCLEAR: Neither plan selection nor clear auth form found');
        
        // Look for other elements to understand the page
        const allButtons = await page.locator('button').all();
        console.log(`\nFound ${allButtons.length} buttons on this page:`);
        for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
          const text = await allButtons[i].textContent();
          console.log(`  ${i + 1}. "${text.trim()}"`);
        }
      }
      
    } else {
      console.log('❌ No primary signup button found on homepage');
    }
    
    // Step 4: Test direct navigation to pricing/subscribe page
    console.log('\n💰 STEP 4: Testing direct navigation to pricing page...');
    await page.goto('http://localhost:9999/subscribe');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/screenshots/04-direct-pricing.png' });
    
    const pricingPageHasPlans = await page.locator('text=/individual.*barber|barbershop|enterprise/i').count() > 0;
    const pricingPageHasAuth = await page.locator('button:has-text("Start as")').count() > 0;
    
    console.log('✅ Direct pricing page analysis:');
    console.log(`   Has plan options: ${pricingPageHasPlans ? 'Yes' : 'No'}`);
    console.log(`   Has start buttons: ${pricingPageHasAuth ? 'Yes' : 'No'}`);
    
    if (pricingPageHasAuth) {
      console.log('\n🎯 Testing plan selection from pricing page...');
      const startButton = page.locator('button:has-text("Start as Individual")').first();
      
      if (await startButton.count() > 0) {
        console.log('Clicking "Start as Individual"...');
        await startButton.click();
        await page.waitForLoadState('networkidle');
        
        const afterClickUrl = page.url();
        console.log(`After clicking plan button: ${afterClickUrl}`);
        
        await page.screenshot({ path: 'test-results/screenshots/05-after-plan-click.png' });
        
        // Check if OAuth flow starts
        const hasOAuthFlow = afterClickUrl.includes('oauth') || afterClickUrl.includes('google') || 
                           await page.locator('text=/continue.*google|sign.*google/i').count() > 0;
        
        if (hasOAuthFlow) {
          console.log('✅ CORRECT FLOW: Plan selection → OAuth');
        } else {
          console.log('❓ Checking what happens after plan selection...');
        }
      }
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. Homepage signup should go to PLAN SELECTION first (/subscribe)');
    console.log('2. Plan selection should store choice and initiate OAuth');
    console.log('3. OAuth callback should redirect to payment/onboarding');
    console.log('4. Avoid auth-first flows (reduces conversion)');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeSignupFlow().catch(console.error);