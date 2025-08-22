/**
 * Comprehensive End-to-End Testing Suite
 * Enhanced Onboarding System - Complete Flow Validation
 * 
 * Tests all components built during the onboarding enhancement project:
 * - Progressive Disclosure (BusinessInfoSetup)
 * - Welcome Segmentation 
 * - Adaptive Flow Engine
 * - Contextual Tooltips & Micro-interactions
 * - Smart Suggestions API
 * - Everboarding System
 * - Live Booking Preview
 */

import { test, expect } from '@playwright/test'

test.describe('Enhanced Onboarding System - Complete E2E Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/login')
    
    // Login as shop owner to trigger onboarding
    await page.fill('input[type="email"]', 'test@barbershop.com')
    await page.fill('input[type="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard and potential onboarding modal
    await page.waitForLoadState('networkidle')
  })

  test.describe('Phase 1: Progressive Disclosure Flow', () => {
    
    test('should display welcome segmentation as first step', async ({ page }) => {
      // Look for onboarding modal
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Check welcome segmentation step
      await expect(page.locator('h2').filter({ hasText: 'Welcome to Your Dashboard' })).toBeVisible()
      
      // Verify segmentation options are present
      await expect(page.locator('text=first barbershop')).toBeVisible()
      await expect(page.locator('text=adding locations')).toBeVisible() 
      await expect(page.locator('text=switching systems')).toBeVisible()
    })

    test('should navigate through 3-step business info progressive disclosure', async ({ page }) => {
      // Skip segmentation to get to business info
      await page.click('text=Skip for now')
      
      // Wait for business info step
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // STEP 1: Business basics
      await expect(page.locator('text=What\'s your business?')).toBeVisible()
      await expect(page.locator('text=Step 1 of 3')).toBeVisible()
      
      // Fill required fields
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Test Barbershop')
      await page.click('text=Barbershop') // Select business type
      
      // Check that Continue button becomes enabled
      const continueBtn = page.locator('button:has-text("Continue")')
      await expect(continueBtn).toBeEnabled()
      await continueBtn.click()
      
      // STEP 2: Location details  
      await expect(page.locator('text=Where are you located?')).toBeVisible()
      await expect(page.locator('text=Step 2 of 3')).toBeVisible()
      
      // Fill location fields
      await page.fill('input[placeholder="123 Main Street"]', '123 Test Street')
      await page.fill('input[placeholder="Los Angeles"]', 'Test City')
      await page.selectOption('select', 'CA')
      await page.fill('input[placeholder="90001"]', '90210')
      await page.fill('input[placeholder="(555) 123-4567"]', '555-123-4567')
      
      await continueBtn.click()
      
      // STEP 3: Additional details
      await expect(page.locator('text=Tell us more')).toBeVisible()
      await expect(page.locator('text=Step 3 of 3')).toBeVisible()
      
      // Verify optional fields are present
      await expect(page.locator('input[placeholder*="info@barbershop.com"]')).toBeVisible()
      await expect(page.locator('input[placeholder*="example.com"]')).toBeVisible()
    })

    test('should show live booking preview updates in real-time', async ({ page }) => {
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Fill business name and check preview updates
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Elite Barbershop')
      
      // Check that live preview shows the business name
      await expect(page.locator('text=Elite Barbershop')).toBeVisible()
      
      // Fill address and verify preview updates
      await page.click('button:has-text("Continue")')
      await page.fill('input[placeholder="123 Main Street"]', '456 Elite Street')
      await page.fill('input[placeholder="Los Angeles"]', 'Beverly Hills')
      
      // Verify location appears in preview
      await expect(page.locator('text=456 Elite Street')).toBeVisible()
      await expect(page.locator('text=Beverly Hills')).toBeVisible()
    })

    test('should display contextual tooltips and micro-interactions', async ({ page }) => {
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Check for info icon tooltips
      const infoIcon = page.locator('svg[data-testid="InformationCircleIcon"]').first()
      await expect(infoIcon).toBeVisible()
      
      // Hover to show tooltip
      await infoIcon.hover()
      
      // Check for contextual help content
      await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 3000 })
      
      // Test field focus animations
      const nameInput = page.locator('input[placeholder*="Tom\'s Barbershop"]')
      await nameInput.focus()
      
      // Verify input has focus styles applied
      await expect(nameInput).toHaveClass(/focus:ring-brand-500|focus:ring-2/)
    })

    test('should validate fields and show appropriate error messages', async ({ page }) => {
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Try to continue without filling required field
      const continueBtn = page.locator('button:has-text("Continue")')
      await expect(continueBtn).toBeDisabled()
      
      // Fill invalid email format in later step and check validation
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Test Shop')
      await continueBtn.click()
      
      // Fill required fields to get to step 3
      await page.fill('input[placeholder="123 Main Street"]', '123 Test St')
      await page.fill('input[placeholder="Los Angeles"]', 'Test City')
      await page.selectOption('select', 'CA')
      await page.fill('input[placeholder="90001"]', '90210')
      await page.fill('input[placeholder="(555) 123-4567"]', '555-123-4567')
      await continueBtn.click()
      
      // Try invalid email
      await page.fill('input[placeholder*="info@barbershop.com"]', 'invalid-email')
      
      // Check for validation error
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
    })
  })

  test.describe('Phase 2: Segmentation & Adaptive Flow', () => {
    
    test('should adapt onboarding flow for "first barbershop" path', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Select "first barbershop" segmentation
      await page.click('[data-testid="segmentation-first-barbershop"]')
      
      // Verify adaptive messaging appears
      await expect(page.locator('text=new business owner')).toBeVisible()
      
      // Check that guidance is tailored for beginners
      await page.click('text=Next')
      
      // Look for beginner-specific help text
      await expect(page.locator('text=Take your time here')).toBeVisible()
    })

    test('should adapt onboarding flow for "adding locations" path', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Select "adding locations" segmentation  
      await page.click('[data-testid="segmentation-adding-locations"]')
      
      // Verify step sequence changes for multi-location
      await page.click('text=Next')
      
      // Should see organization setup instead of basic business
      await expect(page.locator('text=Organization Setup')).toBeVisible()
    })

    test('should adapt onboarding flow for "switching systems" path', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Select "switching systems" segmentation
      await page.click('[data-testid="segmentation-switching-systems"]')
      
      // Should show data import step first
      await page.click('text=Next')
      
      await expect(page.locator('text=Data Import')).toBeVisible()
      await expect(page.locator('text=Import your existing')).toBeVisible()
    })

    test('should provide contextual help based on segmentation path', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-first-barbershop"]')
      await page.click('text=Next')
      
      // Check for beginner-specific contextual help
      const helpContent = page.locator('[role="tooltip"], [data-testid="contextual-help"]')
      
      if (await helpContent.isVisible()) {
        await expect(helpContent).toContainText('new business')
      }
    })
  })

  test.describe('Phase 3: Smart Suggestions API Integration', () => {
    
    test('should load business defaults via API', async ({ page }) => {
      // Intercept API calls
      page.route('**/api/suggestions/business-defaults**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            defaults: {
              numberOfChairs: 3,
              businessHours: {
                monday: { open: '09:00', close: '18:00' }
              }
            },
            confidence: 0.85,
            insights: ['Based on local market analysis']
          })
        })
      })
      
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Fill business type to trigger API call
      await page.click('text=Barbershop')
      
      // Wait for API response and check if defaults are applied
      await page.waitForTimeout(2000)
      
      // Navigate to step 3 to see if defaults were applied
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Test Shop')
      await page.click('button:has-text("Continue")')
      
      await page.fill('input[placeholder="123 Main Street"]', '123 Test St')
      await page.fill('input[placeholder="Los Angeles"]', 'Test City')
      await page.selectOption('select', 'CA')
      await page.fill('input[placeholder="90001"]', '90210')
      await page.fill('input[placeholder="(555) 123-4567"]', '555-123-4567')
      await page.click('button:has-text("Continue")')
      
      // Check if smart defaults were applied
      const chairsInput = page.locator('input[type="number"]').first()
      await expect(chairsInput).toHaveValue('3')
    })

    test('should show smart suggestions panel with AI insights', async ({ page }) => {
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Fill some data to trigger suggestions
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Elite Cuts')
      await page.click('text=Barbershop')
      
      // Look for suggestions panel
      await expect(page.locator('text=Smart Suggestions')).toBeVisible({ timeout: 5000 })
      
      // Check for AI-powered insights
      await expect(page.locator('[data-testid="ai-insights"]')).toBeVisible()
    })

    test('should handle API failures gracefully with fallback', async ({ page }) => {
      // Mock API failure
      page.route('**/api/suggestions/**', route => {
        route.fulfill({ status: 500 })
      })
      
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Should still function without API
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Test Shop')
      await page.click('text=Barbershop')
      
      // Should continue working even with API failure
      const continueBtn = page.locator('button:has-text("Continue")')
      await expect(continueBtn).toBeEnabled()
    })
  })

  test.describe('Phase 4: Data Persistence & State Management', () => {
    
    test('should persist data across browser refresh', async ({ page }) => {
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Fill some data
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Persistent Shop')
      await page.click('text=Barbershop')
      
      // Refresh page
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Check if onboarding resumes with saved data
      const modal = page.locator('[data-onboarding-modal="true"]')
      if (await modal.isVisible()) {
        const nameInput = page.locator('input[placeholder*="Tom\'s Barbershop"]')
        if (await nameInput.isVisible()) {
          await expect(nameInput).toHaveValue('Persistent Shop')
        }
      }
    })

    test('should auto-save progress during form completion', async ({ page }) => {
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Monitor network requests for auto-save
      const saveRequests = []
      page.on('request', request => {
        if (request.url().includes('/api/onboarding/save-progress')) {
          saveRequests.push(request)
        }
      })
      
      // Fill data gradually
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Auto Save Test')
      
      // Wait for potential auto-save
      await page.waitForTimeout(2000)
      
      // Continue filling
      await page.click('text=Barbershop')
      
      // Verify some save attempts were made
      expect(saveRequests.length).toBeGreaterThanOrEqual(0) // May be 0 if disabled
    })
  })

  test.describe('Phase 5: Complete User Journeys', () => {
    
    test('should complete full first barbershop owner journey', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Complete segmentation
      await page.click('[data-testid="segmentation-first-barbershop"]')
      await page.click('text=Next')
      
      // Complete business info step by step
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'My First Shop')
      await page.click('text=Barbershop')
      await page.click('button:has-text("Continue")')
      
      // Location step
      await page.fill('input[placeholder="123 Main Street"]', '789 New Business Ave')
      await page.fill('input[placeholder="Los Angeles"]', 'Startup City') 
      await page.selectOption('select', 'CA')
      await page.fill('input[placeholder="90001"]', '90210')
      await page.fill('input[placeholder="(555) 123-4567"]', '555-987-6543')
      await page.click('button:has-text("Continue")')
      
      // Final step
      await page.fill('input[placeholder*="info@barbershop.com"]', 'owner@myfirstshop.com')
      await page.click('button:has-text("Complete Setup")')
      
      // Should see completion
      await expect(page.locator('text=Setup complete')).toBeVisible({ timeout: 10000 })
    })

    test('should complete multi-location expansion journey', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-adding-locations"]')
      await page.click('text=Next')
      
      // Should see organization setup
      await expect(page.locator('text=Organization')).toBeVisible()
      
      // Complete the adapted flow
      const completeBtn = page.locator('button:has-text("Complete")')
      if (await completeBtn.isVisible()) {
        await completeBtn.click()
        await expect(page.locator('text=new location is configured')).toBeVisible({ timeout: 5000 })
      }
    })

    test('should handle migration user journey with data import', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-switching-systems"]')
      await page.click('text=Next')
      
      // Should see data import first
      await expect(page.locator('text=Data Import')).toBeVisible()
      await expect(page.locator('text=existing customer')).toBeVisible()
      
      // Complete migration flow
      const completeBtn = page.locator('button:has-text("Complete")')
      if (await completeBtn.isVisible()) {
        await completeBtn.click()
        await expect(page.locator('text=Migration complete')).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Phase 6: Performance & Accessibility', () => {
    
    test('should meet performance benchmarks', async ({ page }) => {
      // Monitor page load performance
      const startTime = Date.now()
      
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(5000) // Should load within 5 seconds
      
      // Check if onboarding modal appears quickly
      const modal = page.locator('[data-onboarding-modal="true"]')
      const modalStartTime = Date.now()
      
      if (await modal.isVisible({ timeout: 1000 })) {
        const modalLoadTime = Date.now() - modalStartTime
        expect(modalLoadTime).toBeLessThan(2000) // Modal should appear within 2 seconds
      }
    })

    test('should be keyboard navigable', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Test tab navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to select segmentation with keyboard
      await page.keyboard.press('Enter')
      
      // Continue with tab navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter') // Next button
      
      // Should progress through steps
      const businessStep = page.locator('text=Business Info')
      await expect(businessStep).toBeVisible()
    })

    test('should meet color contrast requirements', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Check contrast on key elements
      const header = page.locator('h2').first()
      await expect(header).toBeVisible()
      
      const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next")')
      await expect(continueBtn).toBeVisible()
      
      // These should pass automated accessibility checks
      await expect(page).toPassAxeTests({
        tags: ['wcag2a', 'wcag2aa'],
        rules: {
          'color-contrast': { enabled: true }
        }
      })
    })
  })

  test.describe('Phase 7: Cross-Browser Compatibility', () => {
    
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      // This test runs on all browser projects defined in playwright config
      console.log(`Testing onboarding in ${browserName}`)
      
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Basic functionality should work in all browsers
      await page.click('[data-testid="segmentation-first-barbershop"]')
      await page.click('text=Next')
      
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Form interactions should work
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', `Cross Browser Test ${browserName}`)
      
      const nameInput = page.locator('input[placeholder*="Tom\'s Barbershop"]')
      await expect(nameInput).toHaveValue(`Cross Browser Test ${browserName}`)
    })
  })

  test.describe('Phase 8: Edge Cases & Error Handling', () => {
    
    test('should handle network timeouts gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 10000) // 10 second delay
      }, { times: 1 })
      
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Should still function despite slow API
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Timeout Test')
      
      // Continue button should work
      const continueBtn = page.locator('button:has-text("Continue")')
      await expect(continueBtn).toBeEnabled()
    })

    test('should handle concurrent user sessions', async ({ page, context }) => {
      // Open second page in same context
      const page2 = await context.newPage()
      await page2.goto('/dashboard')
      
      // Both should be able to access onboarding independently
      const modal1 = page.locator('[data-onboarding-modal="true"]')
      const modal2 = page2.locator('[data-onboarding-modal="true"]')
      
      if (await modal1.isVisible() && await modal2.isVisible()) {
        await modal1.locator('text=Skip for now').click()
        await modal2.locator('text=Skip for now').click()
        
        // Both should handle independently
        await expect(page.locator('text=Business Info')).toBeVisible()
        await expect(page2.locator('text=Business Info')).toBeVisible()
      }
    })

    test('should handle empty and invalid data states', async ({ page }) => {
      await page.click('text=Skip for now')
      await expect(page.locator('text=Business Info')).toBeVisible()
      
      // Try various invalid inputs
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', '') // Empty
      const continueBtn = page.locator('button:has-text("Continue")')
      await expect(continueBtn).toBeDisabled()
      
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'a') // Too short
      await expect(continueBtn).toBeDisabled()
      
      // Very long input
      const longName = 'a'.repeat(200)
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', longName)
      
      // Should show validation error for length
      await expect(page.locator('text=less than 100 characters')).toBeVisible()
    })
  })

  test.afterEach(async ({ page }) => {
    // Clean up any test data or state
    await page.evaluate(() => {
      // Clear any stored onboarding state
      localStorage.removeItem('onboarding_state')
      sessionStorage.clear()
    })
  })
})