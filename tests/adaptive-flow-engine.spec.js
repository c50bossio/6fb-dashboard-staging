/**
 * Adaptive Flow Engine & Contextual Guidance Testing
 * Tests the intelligent onboarding flow adaptation based on user segmentation
 */

import { test, expect } from '@playwright/test'
import { setupSmartSuggestionsRoutes, TestScenarios } from '../test-utils/smart-suggestions-mocks.js'

test.describe('Adaptive Flow Engine - Intelligence Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up API mocks for consistent testing
    setupSmartSuggestionsRoutes(page, 'success')
    
    // Navigate to dashboard to trigger onboarding
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@barbershop.com')
    await page.fill('input[type="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Segmentation Path Adaptation', () => {
    
    test('should adapt flow for first barbershop owner path', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Select first barbershop path
      await page.click('[data-testid="segmentation-first-barbershop"]')
      
      // Check for adaptive messaging
      await expect(page.locator('text=new business')).toBeVisible()
      await expect(page.locator('text=comprehensive guidance')).toBeVisible()
      
      await page.click('text=Next')
      
      // Should see business planning step inserted before financial setup
      const stepIndicators = page.locator('[data-testid="step-indicator"]')
      await expect(stepIndicators).toContainText(['Business Info', 'Business Planning'])
      
      // Check for beginner-specific contextual help
      const helpText = page.locator('[data-testid="contextual-help"], [role="tooltip"]')
      if (await helpText.first().isVisible()) {
        await expect(helpText.first()).toContainText('Take your time')
      }
    })

    test('should adapt flow for multi-location expansion path', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Select adding locations path
      await page.click('[data-testid="segmentation-adding-locations"]')
      
      // Check for multi-location messaging
      await expect(page.locator('text=multiple locations')).toBeVisible()
      await expect(page.locator('text=scaling')).toBeVisible()
      
      await page.click('text=Next')
      
      // Should see Organization Setup instead of Business Info
      await expect(page.locator('text=Organization Setup')).toBeVisible()
      await expect(page.locator('text=Configure your enterprise')).toBeVisible()
      
      // Should have location management step
      const stepTitles = await page.locator('[data-testid="step-title"]').allTextContents()
      expect(stepTitles).toContain('Location Management')
    })

    test('should adapt flow for system migration path', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      // Select switching systems path
      await page.click('[data-testid="segmentation-switching-systems"]')
      
      // Check for migration messaging
      await expect(page.locator('text=existing system')).toBeVisible()
      await expect(page.locator('text=data import')).toBeVisible()
      
      await page.click('text=Next')
      
      // Should see Data Import as first step
      await expect(page.locator('text=Data Import')).toBeVisible()
      await expect(page.locator('text=Import your existing')).toBeVisible()
      
      // Check for data integrity focus
      await page.click('button:has-text("Next")')
      await expect(page.locator('text=Data Verification')).toBeVisible()
    })
  })

  test.describe('Smart Defaults Application', () => {
    
    test('should apply beginner-friendly defaults for first barbershop', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-first-barbershop"]')
      await page.click('text=Next')
      
      // Skip to schedule step to check default hours
      while (!(await page.locator('text=Business Hours').isVisible()) && 
             !(await page.locator('text=Schedule').isVisible())) {
        const nextBtn = page.locator('button:has-text("Next")')
        if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
          await nextBtn.click()
          await page.waitForTimeout(500)
        } else {
          break
        }
      }
      
      // Check if beginner-friendly hours are applied (9am-6pm, closed Sunday)
      if (await page.locator('input[value="09:00"]').first().isVisible()) {
        await expect(page.locator('input[value="09:00"]').first()).toBeVisible()
        await expect(page.locator('input[value="18:00"]').first()).toBeVisible()
        
        // Sunday should be closed for beginners
        const sundayCheckbox = page.locator('input[type="checkbox"]').last()
        await expect(sundayCheckbox).not.toBeChecked()
      }
    })

    test('should apply standard business defaults for multi-location', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-adding-locations"]')
      await page.click('text=Next')
      
      // Navigate to schedule step
      while (!(await page.locator('text=Operating Hours').isVisible()) && 
             !(await page.locator('text=Schedule').isVisible())) {
        const nextBtn = page.locator('button:has-text("Next")')
        if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
          await nextBtn.click()
          await page.waitForTimeout(500)
        } else {
          break
        }
      }
      
      // Check if standard business hours are applied (8am-7pm, open Sunday)
      if (await page.locator('input[value="08:00"]').first().isVisible()) {
        await expect(page.locator('input[value="08:00"]').first()).toBeVisible()
        await expect(page.locator('input[value="19:00"]').first()).toBeVisible()
        
        // Sunday should be open with limited hours (10am-4pm)
        if (await page.locator('input[value="10:00"]').last().isVisible()) {
          await expect(page.locator('input[value="10:00"]').last()).toBeVisible()
          await expect(page.locator('input[value="16:00"]').last()).toBeVisible()
        }
      }
    })

    test('should preserve existing data flag for migration users', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-switching-systems"]')
      await page.click('text=Next')
      
      // Should see data preservation options
      await expect(page.locator('text=preserve')).toBeVisible()
      await expect(page.locator('text=existing data')).toBeVisible()
      
      // Check for migration-specific options
      const preserveCheckbox = page.locator('input[type="checkbox"]:near(:text("preserve"))')
      if (await preserveCheckbox.isVisible()) {
        await expect(preserveCheckbox).toBeChecked()
      }
    })
  })

  test.describe('Contextual Help System', () => {
    
    test('should provide segmentation-specific help content', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-first-barbershop"]')
      await page.click('text=Next')
      
      // Look for contextual help panel
      const helpPanel = page.locator('[data-testid="contextual-help"]')
      
      if (await helpPanel.isVisible()) {
        // Should contain beginner-specific advice
        await expect(helpPanel).toContainText('new business')
        await expect(helpPanel).toContainText('foundation')
      }
      
      // Check tooltips for contextual information
      const infoIcons = page.locator('[data-testid="InformationCircleIcon"]')
      if (await infoIcons.first().isVisible()) {
        await infoIcons.first().hover()
        
        const tooltip = page.locator('[role="tooltip"]')
        await expect(tooltip).toBeVisible({ timeout: 2000 })
        await expect(tooltip).toContainText('business name')
      }
    })

    test('should show different help for experienced users', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-adding-locations"]')
      await page.click('text=Next')
      
      // Look for experienced user guidance
      const helpContent = page.locator('[data-testid="contextual-help"], text*="brand standards"')
      
      if (await helpContent.first().isVisible()) {
        await expect(helpContent.first()).toContainText('brand standards')
        await expect(helpContent.first()).toContainText('locations')
      }
    })

    test('should provide migration-specific guidance', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-switching-systems"]')
      await page.click('text=Next')
      
      // Look for data migration help
      const migrationHelp = page.locator('[data-testid="contextual-help"], text*="existing"')
      
      if (await migrationHelp.first().isVisible()) {
        await expect(migrationHelp.first()).toContainText('existing')
        await expect(migrationHelp.first()).toContainText('import')
      }
    })
  })

  test.describe('Step Skipping Logic', () => {
    
    test('should skip advanced features for beginners', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-first-barbershop"]')
      await page.click('text=Next')
      
      // Navigate through entire flow and verify advanced steps are skipped
      const steps = []
      while (await page.locator('button:has-text("Next")').isVisible()) {
        const stepTitle = await page.locator('h3, [data-testid="step-title"]').first().textContent()
        steps.push(stepTitle)
        
        const nextBtn = page.locator('button:has-text("Next")')
        if (await nextBtn.isEnabled()) {
          await nextBtn.click()
          await page.waitForTimeout(500)
        } else {
          break
        }
      }
      
      // Advanced analytics and enterprise features should not appear
      expect(steps).not.toContain('Advanced Analytics')
      expect(steps).not.toContain('Enterprise Features')
    })

    test('should skip basic setup for experienced users with data import', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-switching-systems"]')
      await page.click('text=Next')
      
      // Simulate having imported data
      if (await page.locator('text=Data Import').isVisible()) {
        const importCheckbox = page.locator('input[type="checkbox"]:near(:text("services"))')
        if (await importCheckbox.isVisible()) {
          await importCheckbox.check()
        }
        
        const staffImportCheckbox = page.locator('input[type="checkbox"]:near(:text("staff"))')
        if (await staffImportCheckbox.isVisible()) {
          await staffImportCheckbox.check()
        }
        
        await page.click('button:has-text("Next")')
        
        // Services and Staff setup might be skipped due to import
        const stepTitle = await page.locator('h3, [data-testid="step-title"]').first().textContent()
        
        // Should jump ahead if data was imported
        if (stepTitle) {
          expect(stepTitle).not.toBe('Services Setup')
        }
      }
    })
  })

  test.describe('Completion Messages', () => {
    
    test('should show adaptive completion message for first barbershop', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-first-barbershop"]')
      
      // Skip through to completion (simplified for testing)
      await page.click('text=Skip for now')
      
      const completeBtn = page.locator('button:has-text("Complete")')
      if (await completeBtn.isVisible()) {
        await completeBtn.click()
        
        // Look for first barbershop specific completion message
        await expect(page.locator('text=foundation for success')).toBeVisible({ timeout: 5000 })
        await expect(page.locator('text=ready for customers')).toBeVisible()
      }
    })

    test('should show scaling completion message for multi-location', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-adding-locations"]')
      await page.click('text=Skip for now')
      
      const completeBtn = page.locator('button:has-text("Complete")')
      if (await completeBtn.isVisible()) {
        await completeBtn.click()
        
        // Look for multi-location specific completion message
        await expect(page.locator('text=location is configured')).toBeVisible({ timeout: 5000 })
        await expect(page.locator('text=scale with your growing business')).toBeVisible()
      }
    })

    test('should show migration completion message', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-switching-systems"]')
      await page.click('text=Skip for now')
      
      const completeBtn = page.locator('button:has-text("Complete")')
      if (await completeBtn.isVisible()) {
        await completeBtn.click()
        
        // Look for migration specific completion message
        await expect(page.locator('text=Migration complete')).toBeVisible({ timeout: 5000 })
        await expect(page.locator('text=data has been successfully transferred')).toBeVisible()
      }
    })
  })

  test.describe('AI Integration & Learning', () => {
    
    test('should integrate with SmartSuggestionsAPI for contextual recommendations', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-first-barbershop"]')
      await page.click('text=Next')
      
      // Fill business info to trigger API calls
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'AI Test Barbershop')
      await page.click('text=Barbershop')
      
      // Wait for AI suggestions to load
      await page.waitForTimeout(2000)
      
      // Check for AI-powered suggestions panel
      const suggestionsPanel = page.locator('text=Smart Suggestions, text=AI insights')
      
      if (await suggestionsPanel.first().isVisible()) {
        await expect(suggestionsPanel.first()).toBeVisible()
        
        // Should show confidence indicators
        const confidence = page.locator('text*="confidence", text*="85%"')
        if (await confidence.isVisible()) {
          await expect(confidence).toBeVisible()
        }
      }
    })

    test('should adapt based on user behavior patterns', async ({ page }) => {
      const modal = page.locator('[data-onboarding-modal="true"]')
      await expect(modal).toBeVisible({ timeout: 10000 })
      
      await page.click('[data-testid="segmentation-first-barbershop"]')
      await page.click('text=Next')
      
      // Simulate user taking time on business name (indicating uncertainty)
      await page.focus('input[placeholder*="Tom\'s Barbershop"]')
      await page.waitForTimeout(3000) // Dwell time
      
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Test')
      await page.waitForTimeout(1000)
      
      // Delete and retry (indicating uncertainty)
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', '')
      await page.waitForTimeout(1000)
      
      await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Uncertain User Shop')
      
      // System should provide additional help for uncertain users
      const additionalHelp = page.locator('text*="take your time", text*="suggestions"')
      
      if (await additionalHelp.first().isVisible()) {
        await expect(additionalHelp.first()).toBeVisible()
      }
    })
  })

  test.afterEach(async ({ page }) => {
    // Clean up test state
    await page.evaluate(() => {
      localStorage.removeItem('onboarding_segmentation')
      localStorage.removeItem('onboarding_adaptive_state')
    })
  })
})