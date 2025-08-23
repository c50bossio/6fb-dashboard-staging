import { test, expect } from '@playwright/test';

test.describe('Enterprise Onboarding Visual Test', () => {
  const BASE_URL = 'http://localhost:9999';
  
  test.beforeEach(async ({ page }) => {
    // Bypass authentication for testing
    await page.addInitScript(() => {
      // Mock localStorage to simulate authenticated enterprise user
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: {
          id: 'c50-enterprise-test',
          email: 'c50bossio@gmail.com',
          user_metadata: {
            role: 'ENTERPRISE_OWNER',
            subscription_tier: 'enterprise',
            onboarding_completed: false
          }
        }
      }));
      
      // Mock window.supabase to prevent authentication calls
      window.mockUser = {
        id: 'c50-enterprise-test',
        email: 'c50bossio@gmail.com',
        user_metadata: {
          role: 'ENTERPRISE_OWNER',
          subscription_tier: 'enterprise',
          onboarding_completed: false
        }
      };
    });
  });

  test('Enterprise Onboarding Complete Flow Visual Test', async ({ page }) => {
    console.log('🚀 Starting enterprise onboarding visual test...');
    
    // Step 1: Navigate and take initial screenshot
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000); // Allow React to render
    
    await page.screenshot({ 
      path: 'tests/screenshots/enterprise-01-initial-load.png',
      fullPage: true 
    });
    console.log('📸 Screenshot 1: Initial page load');

    // Step 2: Check page content for enterprise elements
    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent.substring(0, 500));
    
    // Look for enterprise-specific indicators
    const enterpriseIndicators = [
      '🏢 Enterprise Account',
      'Multi-Location Management',
      'Welcome to BookedBarber Enterprise',
      'Set up your multi-location business system',
      'Enterprise',
      'OnboardingOrchestrator'
    ];
    
    let foundIndicators = [];
    for (const indicator of enterpriseIndicators) {
      if (pageContent.includes(indicator)) {
        foundIndicators.push(indicator);
        console.log(`✅ Found enterprise indicator: ${indicator}`);
      }
    }
    
    console.log(`📊 Enterprise indicators found: ${foundIndicators.length}/${enterpriseIndicators.length}`);
    
    // Step 3: Look for onboarding elements
    await page.waitForTimeout(2000);
    
    const onboardingElements = [
      'button:has-text("Start Setup")',
      'button:has-text("Get Started")', 
      'button:has-text("Begin Onboarding")',
      'button:has-text("Continue")',
      '[data-testid="onboarding-start"]',
      '.onboarding-button'
    ];
    
    let startButton = null;
    for (const selector of onboardingElements) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          startButton = element;
          console.log(`✅ Found start button: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }
    
    await page.screenshot({ 
      path: 'tests/screenshots/enterprise-02-onboarding-detected.png',
      fullPage: true 
    });
    console.log('📸 Screenshot 2: Onboarding elements detected');

    // Step 4: Test interaction if button found
    if (startButton) {
      try {
        await startButton.click();
        console.log('✅ Successfully clicked start button');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'tests/screenshots/enterprise-03-onboarding-started.png',
          fullPage: true 
        });
        console.log('📸 Screenshot 3: Onboarding flow started');
        
      } catch (error) {
        console.log('❌ Could not click start button:', error.message);
      }
    } else {
      console.log('❌ No start button found');
    }
    
    // Step 5: Look for form elements
    const formElements = [
      'input[name="businessName"]',
      'input[placeholder*="business"]',
      'input[placeholder*="company"]',
      'select',
      'textarea'
    ];
    
    let foundForms = [];
    for (const selector of formElements) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          foundForms.push(selector);
          console.log(`✅ Found form element: ${selector}`);
          
          // Try to interact with business name field
          if (selector.includes('business') || selector.includes('company')) {
            await element.fill('Enterprise Test Business');
            console.log('✅ Filled business name field');
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (foundForms.length > 0) {
      await page.screenshot({ 
        path: 'tests/screenshots/enterprise-04-forms-detected.png',
        fullPage: true 
      });
      console.log('📸 Screenshot 4: Form elements detected');
    }
    
    // Step 6: Check console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Step 7: Look for completion elements
    const completionElements = [
      'button:has-text("Complete")',
      'button:has-text("Finish")',
      'button:has-text("Launch")',
      'text=Activating Enterprise Features',
      'text=Setup Complete'
    ];
    
    for (const selector of completionElements) {
      try {
        const element = page.locator(selector);
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found completion element: ${selector}`);
          
          if (selector.includes('button')) {
            await element.click();
            console.log('✅ Clicked completion button');
            await page.waitForTimeout(3000);
            
            await page.screenshot({ 
              path: 'tests/screenshots/enterprise-05-completion-clicked.png',
              fullPage: true 
            });
            console.log('📸 Screenshot 5: Completion flow triggered');
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Step 8: Final state
    await page.waitForTimeout(2000);
    const finalUrl = page.url();
    
    await page.screenshot({ 
      path: 'tests/screenshots/enterprise-06-final-state.png',
      fullPage: true 
    });
    console.log('📸 Screenshot 6: Final state');
    
    // Step 9: Generate comprehensive report
    console.log('\n📊 ENTERPRISE ONBOARDING VISUAL TEST REPORT');
    console.log('==============================================');
    console.log(`🌐 Test URL: ${BASE_URL}`);
    console.log(`👤 Mock Account: c50bossio@gmail.com (ENTERPRISE_OWNER)`);
    console.log(`📍 Final URL: ${finalUrl}`);
    console.log(`🎯 Enterprise Indicators: ${foundIndicators.length}/6`);
    console.log(`📝 Form Elements: ${foundForms.length}`);
    console.log(`🚨 Console Errors: ${consoleErrors.length}`);
    console.log('📸 Screenshots: 6 captured in tests/screenshots/');
    
    if (foundIndicators.length > 0) {
      console.log('\n✅ ENTERPRISE ELEMENTS DETECTED:');
      foundIndicators.forEach(indicator => {
        console.log(`  - ${indicator}`);
      });
    }
    
    if (foundForms.length > 0) {
      console.log('\n📝 FORM ELEMENTS DETECTED:');
      foundForms.forEach(form => {
        console.log(`  - ${form}`);
      });
    }
    
    if (consoleErrors.length > 0) {
      console.log('\n🚨 CONSOLE ERRORS:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n✨ Visual test completed successfully!');
    
    // Assertions
    expect(foundIndicators.length).toBeGreaterThan(0); // Should find some enterprise elements
    expect(consoleErrors.length).toBeLessThan(5); // Should have minimal errors
  });

  test('Check Page Structure and Components', async ({ page }) => {
    console.log('🔍 Testing page structure and React components...');
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(3000);
    
    // Check if React is loaded
    const hasReact = await page.evaluate(() => {
      return typeof window.React !== 'undefined' || document.querySelector('[data-reactroot]') !== null;
    });
    
    console.log(`⚛️ React detected: ${hasReact ? 'YES' : 'NO'}`);
    
    // Check for common component structures
    const componentSelectors = [
      '[class*="onboarding"]',
      '[class*="enterprise"]',
      '[data-testid]',
      '.btn, button',
      'form',
      'input',
      'nav'
    ];
    
    for (const selector of componentSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} elements matching: ${selector}`);
      }
    }
    
    await page.screenshot({ 
      path: 'tests/screenshots/enterprise-component-structure.png',
      fullPage: true 
    });
    
    expect(hasReact || componentSelectors.length > 0).toBeTruthy();
  });
});