/**
 * Comprehensive E2E test for complete onboarding system
 * Verifies all paths and step IDs work without "coming soon" placeholders
 */

import { test, expect } from '@playwright/test'

test.describe('Complete Onboarding System', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('test-mode', 'true')
      window.localStorage.setItem('mock-user', JSON.stringify({
        id: 'test-user-123',
        email: 'test@barbershop.com'
      }))
    })
  })

  test('First Barbershop path - no placeholders', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard')
    
    // Start onboarding
    await page.click('text=Get Started')
    
    // Select "First Barbershop" segmentation
    await page.click('text=First Barbershop')
    await page.click('text=Continue')
    
    // Verify Business Planning step loads (not "coming soon")
    await expect(page.locator('text=Choose Your Business Model')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=coming soon')).not.toBeVisible()
    
    // Select a business model
    await page.click('text=Traditional Barbershop')
    await page.click('text=Competitive Pricing')
    await page.click('text=Build Client Base')
    await page.click('text=Complete Business Plan')
    
    // Verify progression to next step
    await expect(page.locator('text=Business Information')).toBeVisible({ timeout: 10000 })
  })

  test('Switching Systems path - data import works', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard')
    
    // Start onboarding
    await page.click('text=Get Started')
    
    // Select "Switching Systems" segmentation
    await page.click('text=Switching Systems')
    await page.click('text=Continue')
    
    // Verify Data Import step loads (not "coming soon")
    await expect(page.locator('text=Import Your Data')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=coming soon')).not.toBeVisible()
    
    // Select import platform
    await page.click('text=Square')
    
    // Upload mock CSV file
    const fileInput = await page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-data.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('name,email,phone\nJohn Doe,john@example.com,555-1234')
    })
    
    // Verify import preview
    await expect(page.locator('text=1 customers found')).toBeVisible({ timeout: 5000 })
    
    // Continue to verification
    await page.click('text=Import Data')
    
    // Verify Data Verification step loads
    await expect(page.locator('text=Verify Your Data')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=coming soon')).not.toBeVisible()
  })

  test('Adding Locations path - location management works', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard')
    
    // Start onboarding
    await page.click('text=Get Started')
    
    // Select "Adding Locations" segmentation
    await page.click('text=Adding Locations')
    await page.click('text=Continue')
    
    // Verify Location Management step loads (not "coming soon")
    await expect(page.locator('text=Manage Your Locations')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=coming soon')).not.toBeVisible()
    
    // Add a new location
    await page.click('text=Add New Location')
    
    // Fill location details
    await page.fill('input[placeholder="e.g., Downtown Branch"]', 'Test Location')
    await page.fill('input[placeholder="(555) 123-4567"]', '555-123-4567')
    await page.fill('input[placeholder="downtown@barbershop.com"]', 'test@location.com')
    await page.fill('input[placeholder="123 Main Street"]', '123 Test St')
    await page.fill('input[placeholder="New York"]', 'Test City')
    await page.fill('input[placeholder="NY"]', 'TS')
    await page.fill('input[placeholder="10001"]', '12345')
    await page.fill('input[placeholder="John Smith"]', 'Test Manager')
    
    // Add location
    await page.click('text=Add Location')
    
    // Verify location was added
    await expect(page.locator('text=Test Location')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=1 location configured')).toBeVisible()
  })

  test('All step IDs are handled - no unknown steps', async ({ page }) => {
    // Test that all dynamically generated step IDs are recognized
    const stepIds = [
      'business',
      'schedule',
      'services',
      'staff',
      'financial',
      'booking',
      'branding',
      'data_import',
      'data_verification',
      'business_planning',
      'location_management',
      'analytics_setup',
      'ai_training'
    ]
    
    for (const stepId of stepIds) {
      await page.goto(`http://localhost:9999/dashboard?onboarding=true&step=${stepId}`)
      
      // Verify no "Unknown step" message appears
      await expect(page.locator('text=Unknown step')).not.toBeVisible({ timeout: 5000 })
      
      // Verify no generic "coming soon" placeholder
      await expect(page.locator('text=is coming soon')).not.toBeVisible()
    }
  })

  test('Analytics and AI Training have proper placeholders', async ({ page }) => {
    // These steps should have professional placeholders, not generic "coming soon"
    
    // Test Analytics Setup
    await page.goto('http://localhost:9999/dashboard?onboarding=true&step=analytics_setup')
    await expect(page.locator('text=Analytics Dashboard Setup')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Configure your analytics')).toBeVisible()
    await expect(page.locator('text=coming soon')).not.toBeVisible()
    
    // Test AI Training
    await page.goto('http://localhost:9999/dashboard?onboarding=true&step=ai_training')
    await expect(page.locator('text=AI Assistant Training')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Train your AI assistant')).toBeVisible()
    await expect(page.locator('text=coming soon')).not.toBeVisible()
  })

  test('Complete onboarding flow - end to end', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard')
    
    // Start onboarding
    await page.click('text=Get Started')
    
    // Go through complete flow
    await page.click('text=First Barbershop')
    await page.click('text=Continue')
    
    // Complete each step (abbreviated for test performance)
    const steps = [
      'Business Planning',
      'Business Information',
      'Schedule Setup',
      'Service Setup',
      'Staff Setup',
      'Financial Setup',
      'Booking Rules',
      'Branding'
    ]
    
    for (const step of steps) {
      // Wait for step to be visible
      const stepVisible = await page.locator(`text=${step}`).isVisible().catch(() => false)
      
      if (stepVisible) {
        // Look for any completion button
        const completeButton = await page.locator('button:has-text("Complete"), button:has-text("Continue"), button:has-text("Next")').first()
        if (await completeButton.isVisible()) {
          await completeButton.click()
        }
      }
    }
    
    // Verify onboarding completion
    await expect(page.locator('text=Onboarding Complete')).toBeVisible({ timeout: 30000 })
  })
})

test.describe('Onboarding Error Handling', () => {
  test('Handles missing data gracefully', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard?onboarding=true&step=data_verification')
    
    // Should show appropriate message when no data to verify
    await expect(page.locator('text=No data to verify')).toBeVisible({ timeout: 5000 })
  })

  test('Validation works on all forms', async ({ page }) => {
    await page.goto('http://localhost:9999/dashboard?onboarding=true&step=location_management')
    
    // Try to add location without required fields
    await page.click('text=Add New Location')
    await page.click('text=Add Location')
    
    // Should show validation errors
    await expect(page.locator('text=Location name is required')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Address is required')).toBeVisible()
  })
})