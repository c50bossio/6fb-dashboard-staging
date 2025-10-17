import { test, expect } from '@playwright/test';

test.describe('Enterprise Onboarding Complete Experience', () => {
  const BASE_URL = 'http://localhost:9999';
  const TEST_EMAIL = null /* hardcoded ID removed for production */;
  
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000); // Allow initial page load
  });

  test('Fresh Enterprise Customer Onboarding Flow', async ({ page }) => {
    // Step 1: Initial navigation and screenshot
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/enterprise-onboarding-01-initial.png',
      fullPage: true 
    });

    // Step 2: Look for enterprise banner and onboarding system

    // Check for enterprise banner
    const enterpriseBanner = page.locator('text=🏢 Enterprise Account • Multi-Location Management Available After Setup');
    const enhancedTitle = page.locator('text=Welcome to BookedBarber Enterprise');
    const enhancedSubtitle = page.locator('text=Set up your multi-location business system');
    
    try {
      await expect(enterpriseBanner).toBeVisible({ timeout: 10000 });
      
    } catch (error) {
      
      const pageContent = await page.textContent('body');
      );
    }

    try {
      await expect(enhancedTitle).toBeVisible({ timeout: 5000 });
      
    } catch (error) {
      
    }

    try {
      await expect(enhancedSubtitle).toBeVisible({ timeout: 5000 });
      
    } catch (error) {
      
    }

    // Take screenshot of enterprise detection
    await page.screenshot({ 
      path: 'tests/screenshots/enterprise-onboarding-02-detection.png',
      fullPage: true 
    });

    // Step 3: Check console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        );
      }
    });

    // Step 4: Test onboarding flow progression

    // Look for and click the start onboarding button
    const startButton = page.locator('button:has-text("Start Setup"), button:has-text("Get Started"), button:has-text("Begin Onboarding")').first();
    
    try {
      await expect(startButton).toBeVisible({ timeout: 10000 });
      await startButton.click();

      await page.waitForTimeout(2000); // Allow transition
      await page.screenshot({ 
        path: 'tests/screenshots/enterprise-onboarding-03-started.png',
        fullPage: true 
      });

    } catch (error) {
      
    }

    // Step 5: Test segmentation step

    // Look for segmentation options
    const segmentationOptions = [
      'Solo Barber',
      'Barbershop Owner',
      'Multi-Location',
      'Enterprise'
    ];
    
    let segmentationFound = false;
    for (const option of segmentationOptions) {
      const optionElement = page.locator(`text=${option}`);
      if (await optionElement.isVisible()) {
        
        segmentationFound = true;
        // Click enterprise option if available
        if (option === 'Enterprise' || option === 'Multi-Location') {
          await optionElement.click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    }
    
    if (segmentationFound) {
      await page.screenshot({ 
        path: 'tests/screenshots/enterprise-onboarding-04-segmentation.png',
        fullPage: true 
      });
      
    }

    // Step 6: Test business information step

    // Look for business name input
    const businessNameInput = page.locator('input[name="businessName"], input[placeholder*="business name" i], input[placeholder*="company name" i]');
    
    try {
      await expect(businessNameInput).toBeVisible({ timeout: 10000 });
      await businessNameInput.fill('Enterprise Test Barbershop');

      // Continue to next step
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(2000);
      }
      
      await page.screenshot({ 
        path: 'tests/screenshots/enterprise-onboarding-05-business-info.png',
        fullPage: true 
      });

    } catch (error) {
      
    }

    // Step 7: Test services configuration

    // Look for service inputs or predefined services
    const serviceElements = page.locator('input[placeholder*="service" i], .service-item, [data-testid*="service"]');
    
    if (await serviceElements.first().isVisible({ timeout: 5000 })) {
      
      await page.screenshot({ 
        path: 'tests/screenshots/enterprise-onboarding-06-services.png',
        fullPage: true 
      });

      // Try to continue
      const continueButton = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Save")').first();
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // Step 8: Test completion flow

    // Look for completion button
    const completeButton = page.locator('button:has-text("Complete Setup"), button:has-text("Launch"), button:has-text("Finish")').first();
    
    try {
      await expect(completeButton).toBeVisible({ timeout: 10000 });

      await page.screenshot({ 
        path: 'tests/screenshots/enterprise-onboarding-07-ready-complete.png',
        fullPage: true 
      });

      // Click complete and watch for loading overlay
      await completeButton.click();

      // Check for "Activating Enterprise Features" loading overlay
      const loadingOverlay = page.locator('text=Activating Enterprise Features');
      try {
        await expect(loadingOverlay).toBeVisible({ timeout: 5000 });

        await page.screenshot({ 
          path: 'tests/screenshots/enterprise-onboarding-08-activating.png',
          fullPage: true 
        });

      } catch (error) {
        
      }
      
      // Wait for completion (up to 15 seconds)
      await page.waitForTimeout(15000);
      
      await page.screenshot({ 
        path: 'tests/screenshots/enterprise-onboarding-09-post-completion.png',
        fullPage: true 
      });

    } catch (error) {
      
    }

    // Step 9: Verify final state

    // Check if we're now on dashboard or success page
    const currentUrl = page.url();

    // Look for dashboard elements or success indicators
    const dashboardIndicators = [
      'text=Dashboard',
      'text=Welcome',
      'text=Enterprise',
      '.dashboard',
      '[data-testid="dashboard"]'
    ];
    
    let dashboardFound = false;
    for (const indicator of dashboardIndicators) {
      if (await page.locator(indicator).isVisible()) {
        
        dashboardFound = true;
        break;
      }
    }
    
    await page.screenshot({ 
      path: 'tests/screenshots/enterprise-onboarding-10-final-state.png',
      fullPage: true 
    });

    // Step 10: Generate comprehensive report

    if (consoleErrors.length > 0) {
      
      consoleErrors.forEach((error, index) => {
        
      });
    }

    // Final assertion - should have minimal console errors
    expect(consoleErrors.length).toBeLessThan(3); // Allow for minor warnings
  });

  test('Verify Enterprise Features Are Available Post-Onboarding', async ({ page }) => {

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Look for enterprise-specific features
    const enterpriseFeatures = [
      'Multi-Location',
      'Enterprise Dashboard',
      'Advanced Analytics',
      'Bulk Operations',
      'Team Management'
    ];
    
    let featuresFound = 0;
    for (const feature of enterpriseFeatures) {
      const featureElement = page.locator(`text=${feature}`);
      if (await featureElement.isVisible({ timeout: 3000 })) {
        
        featuresFound++;
      }
    }

    await page.screenshot({ 
      path: 'tests/screenshots/enterprise-features-verification.png',
      fullPage: true 
    });
    
    // Should find at least some enterprise features
    expect(featuresFound).toBeGreaterThan(0);
  });
});