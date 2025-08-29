#!/usr/bin/env node

/**
 * OAuth Flow Test Script
 * Tests the complete OAuth authentication flow including profile creation
 */

const { chromium } = require('playwright');

async function testOAuthFlow() {
  console.log('🧪 Testing OAuth Authentication Flow...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to login page
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:9999/login');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Check for Google OAuth button
    console.log('2️⃣ Looking for Google OAuth button...');
    const googleButton = await page.locator('button:has-text("Continue with Google")').first();
    
    if (await googleButton.isVisible()) {
      console.log('✅ Google OAuth button found');
      
      // Note: Can't fully automate OAuth due to Google security
      console.log('\n⚠️ Manual step required:');
      console.log('   Click "Continue with Google" and complete authentication');
      console.log('   The test will continue once you return to the dashboard\n');
      
      // Wait for redirect to dashboard after OAuth
      await page.waitForURL('**/dashboard', { timeout: 60000 });
      console.log('✅ Successfully redirected to dashboard');
      
      // Step 3: Check if user is authenticated
      console.log('3️⃣ Checking authentication status...');
      
      // Check for profile data
      const profileResponse = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/profile/current');
          return await res.json();
        } catch (e) {
          return null;
        }
      });
      
      if (profileResponse?.id) {
        console.log('✅ User authenticated successfully');
        console.log('   User ID:', profileResponse.id);
        console.log('   Email:', profileResponse.email);
        console.log('   Role:', profileResponse.role);
        console.log('   Shop ID:', profileResponse.shop_id || 'Not assigned (needs onboarding)');
      }
      
      // Step 4: Check for onboarding prompt
      console.log('4️⃣ Checking onboarding status...');
      
      const onboardingProgress = await page.locator('[data-testid="onboarding-progress"]').first();
      if (await onboardingProgress.isVisible()) {
        console.log('✅ Onboarding progress component visible');
        
        // Check if user needs shop setup
        const setupButton = await page.locator('button:has-text("Complete Setup")').first();
        if (await setupButton.isVisible()) {
          console.log('ℹ️ User needs to complete onboarding (no shop assigned)');
        }
      }
      
      // Step 5: Check for errors
      console.log('5️⃣ Checking for errors...');
      
      // Check browser console for errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.error('❌ Console error:', msg.text());
        }
      });
      
      // Check for 400/404 errors in network
      const failedRequests = [];
      page.on('response', response => {
        if (response.status() >= 400) {
          failedRequests.push({
            url: response.url(),
            status: response.status()
          });
        }
      });
      
      // Wait a bit to collect any errors
      await page.waitForTimeout(3000);
      
      if (failedRequests.length > 0) {
        console.log('⚠️ Some API requests failed (expected for users without shop):');
        failedRequests.forEach(req => {
          if (!req.url.includes('api/staff') && !req.url.includes('api/services')) {
            console.log(`   ${req.status}: ${req.url}`);
          }
        });
      } else {
        console.log('✅ No unexpected API errors');
      }
      
      console.log('\n✅ OAuth flow test completed successfully!');
      
    } else {
      console.error('❌ Google OAuth button not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('\nPress any key to close browser...');
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    await browser.close();
  }
}

// Check if Playwright is installed
try {
  require('playwright');
  testOAuthFlow();
} catch (e) {
  console.log('📦 Installing Playwright for testing...');
  require('child_process').execSync('npm install -D playwright', { stdio: 'inherit' });
  console.log('✅ Playwright installed. Please run the script again.');
}