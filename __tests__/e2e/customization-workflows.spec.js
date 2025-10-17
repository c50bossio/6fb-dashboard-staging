/**
 * E2E Tests for Complete Customization Workflows
 * 
 * These tests cover end-to-end user journeys through the customization system,
 * including cross-browser compatibility, real user interactions, and business workflows.
 */

const path = require('path')
const { test, expect } = require('@playwright/test')

// Test data and utilities
const testData = {
  barber: {
    full_name: 'John Professional',
    bio: 'Master barber with 15 years of experience specializing in classic cuts and modern styles.',
    phone: '+1-555-BARBER',
    instagram_handle: '@johnprofessional',
    years_experience: 15,
    specializations: ['Fades', 'Beard Styling', 'Classic Cuts', 'Hot Towel Shaves'],
    services: [
      { name: 'Signature Cut', price: 45, duration: 60 },
      { name: 'Beard Trim & Style', price: 25, duration: 30 },
      { name: 'Hot Towel Shave', price: 35, duration: 45 }
    ]
  },
  barbershop: {
    business_name: 'The Professional Barbershop',
    description: 'Premier barbershop offering traditional craftsmanship with modern techniques.',
    address: '123 Main Street, Professional City, PC 12345',
    phone: '+1-555-SHOP-123',
    email: 'info@professionalbarbershop.com',
    hours: {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '19:00' },
      friday: { start: '09:00', end: '19:00' },
      saturday: { start: '08:00', end: '17:00' },
      sunday: { start: '10:00', end: '16:00' }
    }
  },
  enterprise: {
    organization_name: 'Elite Barber Enterprise',
    description: 'Multi-location barbershop chain providing consistent premium service across all locations.',
    locations: [
      { name: 'Downtown Elite', address: '456 Business District, Metro City' },
      { name: 'Mall Elite', address: '789 Shopping Plaza, Suburb City' },
      { name: 'Airport Elite', address: '321 Terminal Way, Airport City' }
    ]
  }
}

// Helper functions
const loginAsRole = async (page, role = 'ENTERPRISE_OWNER') => {
  await page.goto('/auth/signin')
  await page.fill('[data-testid="email-input"]', `test-${role.toLowerCase()}@example.com`)
  await page.fill('[data-testid="password-input"]', 'TestPassword123!')
  await page.click('[data-testid="signin-button"]')
  await page.waitForURL('/dashboard')
}

const navigateToCustomize = async (page) => {
  await page.goto('/customize')
  await page.waitForLoadState('networkidle')
  
  // Wait for loading to complete
  await page.waitForSelector('[data-testid="skeleton-header"]', { state: 'detached', timeout: 5000 })
  await expect(page.locator('h1')).toContainText('Customize Your Experience')
}

const uploadTestImage = async (page, inputSelector, imageName = 'test-image.jpg') => {
  // Create a test image file
  const testImagePath = path.join(__dirname, '..', 'fixtures', imageName)
  
  // Upload the file
  await page.setInputFiles(inputSelector, testImagePath)
  
  // Wait for upload completion
  await page.waitForSelector('[data-testid="upload-progress"]', { state: 'detached', timeout: 10000 })
}

const saveSection = async (page, sectionId) => {
  const section = page.locator(`[data-testid="customization-section-${sectionId}"]`)
  await section.locator('[data-testid="save-section-button"]').click()
  await page.waitForSelector('[data-testid="save-success-indicator"]', { timeout: 10000 })
}

test.describe('Complete Customization Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1200, height: 800 })
    
    // Mock API responses for faster testing
    await page.route('**/api/upload', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ url: 'https://example.com/uploaded-image.jpg' })
      })
    })

    await page.route('**/api/profiles', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true, updated_at: new Date().toISOString() })
        })
      } else {
        route.continue()
      }
    })
  })

  test.describe('Enterprise Owner Complete Journey', () => {
    test('should complete full enterprise customization workflow', async ({ page }) => {
      // Login as enterprise owner
      await loginAsRole(page, 'ENTERPRISE_OWNER')
      await navigateToCustomize(page)

      // Verify all sections are visible for enterprise owner
      await expect(page.locator('[data-testid="customization-section-barber-profile"]')).toBeVisible()
      await expect(page.locator('[data-testid="customization-section-barbershop-website"]')).toBeVisible()
      await expect(page.locator('[data-testid="customization-section-multi-location-management"]')).toBeVisible()

      // Check initial progress (should be 100% with no unsaved changes)
      await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('100%')

      // Step 1: Customize Barber Profile
      await test.step('Complete barber profile customization', async () => {
        // Expand barber section
        await page.click('[data-testid="section-toggle-barber-profile"]')
        await page.waitForSelector('[data-testid="barber-profile-form"]', { state: 'visible' })

        // Fill basic information
        await page.fill('[data-testid="full-name-input"]', testData.barber.full_name)
        await page.fill('[data-testid="bio-textarea"]', testData.barber.bio)
        await page.fill('[data-testid="phone-input"]', testData.barber.phone)
        await page.fill('[data-testid="instagram-input"]', testData.barber.instagram_handle)
        await page.fill('[data-testid="experience-input"]', testData.barber.years_experience.toString())

        // Upload profile image
        await uploadTestImage(page, '[data-testid="profile-image-upload"]', 'barber-profile.jpg')

        // Add specializations
        for (const specialization of testData.barber.specializations) {
          await page.click('[data-testid="add-specialization-button"]')
          await page.fill('[data-testid="specialization-input"]:last-child', specialization)
        }

        // Add services
        for (const service of testData.barber.services) {
          await page.click('[data-testid="add-service-button"]')
          const lastServiceRow = page.locator('[data-testid="service-row"]').last()
          await lastServiceRow.locator('[data-testid="service-name"]').fill(service.name)
          await lastServiceRow.locator('[data-testid="service-price"]').fill(service.price.toString())
          await lastServiceRow.locator('[data-testid="service-duration"]').fill(service.duration.toString())
        }

        // Upload portfolio images
        await uploadTestImage(page, '[data-testid="portfolio-upload"]', 'portfolio-1.jpg')
        await uploadTestImage(page, '[data-testid="portfolio-upload"]', 'portfolio-2.jpg')

        // Check for unsaved changes indicator
        await expect(page.locator('[data-testid="customization-section-barber-profile"] [data-testid="unsaved-changes-badge"]')).toBeVisible()
        
        // Progress should decrease (2 of 3 sections complete = 67%)
        await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('67%')

        // Save barber profile
        await saveSection(page, 'barber-profile')
        
        // Verify unsaved changes indicator disappears
        await expect(page.locator('[data-testid="customization-section-barber-profile"] [data-testid="unsaved-changes-badge"]')).not.toBeVisible()
      })

      // Step 2: Customize Barbershop Website
      await test.step('Complete barbershop website customization', async () => {
        // Expand barbershop section
        await page.click('[data-testid="section-toggle-barbershop-website"]')
        await page.waitForSelector('[data-testid="barbershop-form"]', { state: 'visible' })

        // Fill business information
        await page.fill('[data-testid="business-name-input"]', testData.barbershop.business_name)
        await page.fill('[data-testid="business-description-textarea"]', testData.barbershop.description)
        await page.fill('[data-testid="business-address-input"]', testData.barbershop.address)
        await page.fill('[data-testid="business-phone-input"]', testData.barbershop.phone)
        await page.fill('[data-testid="business-email-input"]', testData.barbershop.email)

        // Upload logo
        await uploadTestImage(page, '[data-testid="logo-upload"]', 'barbershop-logo.png')

        // Set brand color
        await page.fill('[data-testid="brand-color-input"]', '#2c3e50')

        // Configure business hours
        for (const [day, hours] of Object.entries(testData.barbershop.hours)) {
          const dayRow = page.locator(`[data-testid="hours-${day}"]`)
          await dayRow.locator('[data-testid="start-time"]').fill(hours.start)
          await dayRow.locator('[data-testid="end-time"]').fill(hours.end)
          await dayRow.locator('[data-testid="available-checkbox"]').check()
        }

        // Add gallery images
        await uploadTestImage(page, '[data-testid="gallery-upload"]', 'gallery-1.jpg')
        await uploadTestImage(page, '[data-testid="gallery-upload"]', 'gallery-2.jpg')
        await uploadTestImage(page, '[data-testid="gallery-upload"]', 'gallery-3.jpg')

        // Configure SEO settings
        await page.fill('[data-testid="meta-title-input"]', 'The Professional Barbershop - Expert Cuts & Styling')
        await page.fill('[data-testid="meta-description-textarea"]', 'Experience premium barbering services at The Professional Barbershop. Book your appointment today.')

        // Check unsaved changes and progress
        await expect(page.locator('[data-testid="customization-section-barbershop-website"] [data-testid="unsaved-changes-badge"]')).toBeVisible()
        await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('33%')

        // Save barbershop settings
        await saveSection(page, 'barbershop-website')
      })

      // Step 3: Customize Enterprise Multi-Location
      await test.step('Complete enterprise multi-location customization', async () => {
        // Expand enterprise section
        await page.click('[data-testid="section-toggle-multi-location-management"]')
        await page.waitForSelector('[data-testid="enterprise-form"]', { state: 'visible' })

        // Fill organization information
        await page.fill('[data-testid="organization-name-input"]', testData.enterprise.organization_name)
        await page.fill('[data-testid="organization-description-textarea"]', testData.enterprise.description)

        // Set brand colors
        await page.fill('[data-testid="primary-color-input"]', '#1a1a1a')
        await page.fill('[data-testid="secondary-color-input"]', '#666666')
        await page.fill('[data-testid="accent-color-input"]', '#e74c3c')

        // Add locations
        for (const location of testData.enterprise.locations) {
          await page.click('[data-testid="add-location-button"]')
          const lastLocationRow = page.locator('[data-testid="location-row"]').last()
          await lastLocationRow.locator('[data-testid="location-name"]').fill(location.name)
          await lastLocationRow.locator('[data-testid="location-address"]').fill(location.address)
        }

        // Configure enterprise features
        await page.check('[data-testid="multi-location-booking-checkbox"]')
        await page.check('[data-testid="centralized-analytics-checkbox"]')
        await page.check('[data-testid="staff-management-checkbox"]')
        await page.check('[data-testid="custom-reporting-checkbox"]')

        // Check final unsaved changes
        await expect(page.locator('[data-testid="customization-section-multi-location-management"] [data-testid="unsaved-changes-badge"]')).toBeVisible()
        await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('0%')
        await expect(page.locator('[data-testid="quick-actions"] [data-testid="unsaved-count"]')).toContainText('1 Unsaved Section')

        // Save enterprise settings
        await saveSection(page, 'multi-location-management')

        // Verify completion
        await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('100%')
        await expect(page.locator('[data-testid="quick-actions"] [data-testid="unsaved-count"]')).not.toBeVisible()
      })

      // Step 4: Use Save All Changes functionality
      await test.step('Test global save functionality', async () => {
        // Make a small change to trigger unsaved state
        await page.click('[data-testid="section-toggle-barber-profile"]')
        await page.fill('[data-testid="full-name-input"]', testData.barber.full_name + ' Updated')

        // Should show unsaved changes
        await expect(page.locator('[data-testid="quick-actions"] [data-testid="unsaved-count"]')).toContainText('1 Unsaved Section')

        // Use global save
        await page.click('[data-testid="save-all-changes-button"]')
        await page.waitForSelector('[data-testid="global-save-success"]', { timeout: 10000 })

        // Verify all changes saved
        await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('100%')
        await expect(page.locator('[data-testid="quick-actions"] [data-testid="unsaved-count"]')).not.toBeVisible()
      })

      // Step 5: Test preview functionality
      await test.step('Preview generated pages', async () => {
        // Preview barber profile page
        await page.click('[data-testid="preview-barber-profile-button"]')
        
        // Should open in new tab
        const [previewPage] = await Promise.all([
          page.waitForEvent('popup'),
          page.click('[data-testid="preview-barber-profile-button"]')
        ])
        
        await previewPage.waitForLoadState()
        await expect(previewPage.locator('h1')).toContainText(testData.barber.full_name)
        await expect(previewPage.locator('[data-testid="barber-bio"]')).toContainText(testData.barber.bio)
        await previewPage.close()

        // Preview barbershop website
        const [shopPreviewPage] = await Promise.all([
          page.waitForEvent('popup'),
          page.click('[data-testid="preview-barbershop-website-button"]')
        ])
        
        await shopPreviewPage.waitForLoadState()
        await expect(shopPreviewPage.locator('h1')).toContainText(testData.barbershop.business_name)
        await shopPreviewPage.close()
      })
    })

    test('should handle auto-save functionality correctly', async ({ page }) => {
      await loginAsRole(page, 'ENTERPRISE_OWNER')
      await navigateToCustomize(page)

      // Expand barber section
      await page.click('[data-testid="section-toggle-barber-profile"]')
      await page.waitForSelector('[data-testid="barber-profile-form"]', { state: 'visible' })

      // Make changes to trigger auto-save
      await page.fill('[data-testid="full-name-input"]', 'Auto Save Test Name')
      await page.fill('[data-testid="bio-textarea"]', 'Testing auto-save functionality with this bio text.')

      // Should show auto-saving indicator after delay
      await page.waitForSelector('[data-testid="auto-save-indicator"]', { timeout: 8000 })
      await expect(page.locator('[data-testid="auto-save-indicator"]')).toContainText('Auto-saving...')

      // Auto-save should complete
      await page.waitForSelector('[data-testid="auto-save-success"]', { timeout: 10000 })
      
      // Unsaved changes indicator should disappear
      await expect(page.locator('[data-testid="customization-section-barber-profile"] [data-testid="unsaved-changes-badge"]')).not.toBeVisible()
    })

    test('should handle undo/redo functionality', async ({ page }) => {
      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Expand barbershop section (primary for shop owner)
      await page.click('[data-testid="section-toggle-barbershop-website"]')
      await page.waitForSelector('[data-testid="barbershop-form"]', { state: 'visible' })

      const originalName = 'Original Name'
      const changedName = 'Changed Name'
      const finalName = 'Final Name'

      // Set initial value
      await page.fill('[data-testid="business-name-input"]', originalName)
      
      // Make first change
      await page.fill('[data-testid="business-name-input"]', changedName)
      await expect(page.locator('[data-testid="undo-button"]')).toBeEnabled()
      
      // Make second change  
      await page.fill('[data-testid="business-name-input"]', finalName)
      
      // Test undo
      await page.click('[data-testid="undo-button"]')
      await expect(page.locator('[data-testid="business-name-input"]')).toHaveValue(changedName)
      await expect(page.locator('[data-testid="redo-button"]')).toBeEnabled()
      
      // Test redo
      await page.click('[data-testid="redo-button"]')
      await expect(page.locator('[data-testid="business-name-input"]')).toHaveValue(finalName)
      
      // Undo to original
      await page.click('[data-testid="undo-button"]')
      await page.click('[data-testid="undo-button"]')
      await expect(page.locator('[data-testid="business-name-input"]')).toHaveValue(originalName)
    })

    test('should validate forms and show appropriate errors', async ({ page }) => {
      await loginAsRole(page, 'BARBER')
      await navigateToCustomize(page)

      // Barber should only see barber profile section
      await expect(page.locator('[data-testid="customization-section-barber-profile"]')).toBeVisible()
      await expect(page.locator('[data-testid="customization-section-barbershop-website"]')).not.toBeVisible()

      // Expand barber section
      await page.click('[data-testid="section-toggle-barber-profile"]')
      await page.waitForSelector('[data-testid="barber-profile-form"]', { state: 'visible' })

      // Test validation errors
      await page.fill('[data-testid="full-name-input"]', '') // Empty required field
      await page.fill('[data-testid="phone-input"]', 'invalid-phone') // Invalid phone format
      await page.fill('[data-testid="instagram-input"]', '@invalid..handle') // Invalid Instagram handle

      // Trigger validation by trying to save
      await page.click('[data-testid="save-section-button"]')

      // Should show validation errors
      await expect(page.locator('[data-testid="error-full-name"]')).toContainText('Name must be at least 2 characters')
      await expect(page.locator('[data-testid="error-phone"]')).toContainText('Invalid phone number format')
      await expect(page.locator('[data-testid="error-instagram"]')).toContainText('Invalid Instagram handle format')

      // Fix validation errors
      await page.fill('[data-testid="full-name-input"]', 'Valid Name')
      await page.fill('[data-testid="phone-input"]', '+1234567890')
      await page.fill('[data-testid="instagram-input"]', '@validhandle')

      // Errors should disappear
      await expect(page.locator('[data-testid="error-full-name"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="error-phone"]')).not.toBeVisible()
      await expect(page.locator('[data-testid="error-instagram"]')).not.toBeVisible()

      // Save should now work
      await page.click('[data-testid="save-section-button"]')
      await page.waitForSelector('[data-testid="save-success-indicator"]', { timeout: 10000 })
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async ({ page, isMobile }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Mobile-specific checks
      await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible()
      
      // Sections should be responsive
      const barberSection = page.locator('[data-testid="customization-section-barber-profile"]')
      await expect(barberSection).toBeVisible()

      // Touch interactions should work
      await barberSection.tap()
      await page.waitForSelector('[data-testid="barber-profile-form"]', { state: 'visible' })

      // Form fields should be mobile-friendly
      const nameInput = page.locator('[data-testid="full-name-input"]')
      await nameInput.fill('Mobile Test User')
      await expect(nameInput).toHaveValue('Mobile Test User')

      // Progress indicator should be visible
      await expect(page.locator('[data-testid="progress-percentage"]')).toBeVisible()
    })

    test('should handle image uploads on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 414, height: 736 }) // iPhone size

      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Expand barbershop section
      await page.tap('[data-testid="section-toggle-barbershop-website"]')
      await page.waitForSelector('[data-testid="barbershop-form"]', { state: 'visible' })

      // Test mobile image upload
      await uploadTestImage(page, '[data-testid="logo-upload"]', 'mobile-logo.png')
      
      // Should show upload success on mobile
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()

      // Image preview should be responsive
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible()
    })
  })

  test.describe('Cross-Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ page, browserName: actualBrowser }) => {
        test.skip(actualBrowser !== browserName, `This test is for ${browserName}`)

        await loginAsRole(page, 'SHOP_OWNER')
        await navigateToCustomize(page)

        // Core functionality should work across browsers
        await page.click('[data-testid="section-toggle-barbershop-website"]')
        await page.waitForSelector('[data-testid="barbershop-form"]', { state: 'visible' })

        await page.fill('[data-testid="business-name-input"]', `Test Business ${browserName}`)
        await page.fill('[data-testid="business-description-textarea"]', 'Cross-browser test description')

        // Save should work
        await page.click('[data-testid="save-section-button"]')
        await page.waitForSelector('[data-testid="save-success-indicator"]', { timeout: 10000 })

        // Verify data persisted
        await page.reload()
        await page.waitForLoadState('networkidle')
        await page.click('[data-testid="section-toggle-barbershop-website"]')
        
        await expect(page.locator('[data-testid="business-name-input"]')).toHaveValue(`Test Business ${browserName}`)
      })
    })
  })

  test.describe('Error Handling & Recovery', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Simulate network failure
      await page.route('**/api/profiles', (route) => {
        route.abort('internetdisconnected')
      })

      await page.click('[data-testid="section-toggle-barbershop-website"]')
      await page.fill('[data-testid="business-name-input"]', 'Network Failure Test')

      // Try to save
      await page.click('[data-testid="save-section-button"]')

      // Should show error message
      await expect(page.locator('[data-testid="save-error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="save-error-message"]')).toContainText('network')

      // Should offer retry
      await expect(page.locator('[data-testid="retry-save-button"]')).toBeVisible()

      // Re-enable network
      await page.unroute('**/api/profiles')
      await page.route('**/api/profiles', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        })
      })

      // Retry should work
      await page.click('[data-testid="retry-save-button"]')
      await page.waitForSelector('[data-testid="save-success-indicator"]', { timeout: 10000 })
    })

    test('should handle validation errors during save', async ({ page }) => {
      await loginAsRole(page, 'BARBER')
      await navigateToCustomize(page)

      await page.click('[data-testid="section-toggle-barber-profile"]')
      await page.fill('[data-testid="full-name-input"]', '') // Invalid empty name

      // Mock server validation error
      await page.route('**/api/profiles', (route) => {
        route.fulfill({
          status: 400,
          body: JSON.stringify({
            error: 'Validation failed',
            details: { full_name: 'Name is required' }
          })
        })
      })

      await page.click('[data-testid="save-section-button"]')

      // Should show server-side validation errors
      await expect(page.locator('[data-testid="error-full-name"]')).toContainText('Name is required')
      await expect(page.locator('[data-testid="save-error-banner"]')).toBeVisible()
    })

    test('should maintain state during page refresh', async ({ page }) => {
      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Make changes but don't save
      await page.click('[data-testid="section-toggle-barbershop-website"]')
      await page.fill('[data-testid="business-name-input"]', 'Unsaved Changes Test')
      await page.fill('[data-testid="business-description-textarea"]', 'This should persist after refresh')

      // Should show unsaved changes
      await expect(page.locator('[data-testid="unsaved-changes-badge"]')).toBeVisible()

      // Refresh page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should show warning about unsaved changes
      await expect(page.locator('[data-testid="unsaved-changes-warning"]')).toBeVisible()

      // User can choose to restore or discard
      await page.click('[data-testid="restore-changes-button"]')

      // Data should be restored
      await page.click('[data-testid="section-toggle-barbershop-website"]')
      await expect(page.locator('[data-testid="business-name-input"]')).toHaveValue('Unsaved Changes Test')
      await expect(page.locator('[data-testid="business-description-textarea"]')).toHaveValue('This should persist after refresh')
    })
  })

  test.describe('Performance & Accessibility', () => {
    test('should meet performance benchmarks', async ({ page }) => {
      // Start performance tracing
      await page.tracing.start({ screenshots: true, snapshots: true })

      await loginAsRole(page, 'ENTERPRISE_OWNER')
      const startTime = Date.now()
      
      await navigateToCustomize(page)
      
      const loadTime = Date.now() - startTime
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)

      // All critical elements should be visible quickly
      await expect(page.locator('h1')).toBeVisible({ timeout: 1000 })
      await expect(page.locator('[data-testid="progress-percentage"]')).toBeVisible({ timeout: 1000 })

      await page.tracing.stop({ path: 'performance-trace.zip' })
    })

    test('should be accessible to screen readers', async ({ page }) => {
      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Run accessibility audit
      await expect(page.locator('h1')).toHaveAttribute('role', 'heading')
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveAttribute('aria-label')

      // Form elements should have proper labels
      await page.click('[data-testid="section-toggle-barbershop-website"]')
      
      const nameInput = page.locator('[data-testid="business-name-input"]')
      await expect(nameInput).toHaveAttribute('aria-labelledby')
      
      const descTextarea = page.locator('[data-testid="business-description-textarea"]')
      await expect(descTextarea).toHaveAttribute('aria-describedby')

      // Buttons should have accessible names
      const saveButton = page.locator('[data-testid="save-section-button"]')
      await expect(saveButton).toHaveAttribute('aria-label')
    })

    test('should support keyboard navigation', async ({ page }) => {
      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Tab through interactive elements
      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="section-toggle-barber-profile"]')).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(page.locator('[data-testid="section-toggle-barbershop-website"]')).toBeFocused()

      // Enter should activate buttons
      await page.keyboard.press('Enter')
      await page.waitForSelector('[data-testid="barbershop-form"]', { state: 'visible' })

      // Tab into form fields
      await page.keyboard.press('Tab')
      const firstInput = page.locator('[data-testid="business-name-input"]')
      await expect(firstInput).toBeFocused()
    })
  })

  test.describe('Tutorial System', () => {
    test('should show tutorial for new users', async ({ page }) => {
      // Clear tutorial seen flag
      await page.evaluate(() => localStorage.removeItem('customize-tutorial-seen'))

      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Should show tutorial overlay
      await expect(page.locator('[data-testid="tutorial-overlay"]')).toBeVisible()
      await expect(page.locator('[data-testid="tutorial-title"]')).toContainText('Welcome to Customization!')
      await expect(page.locator('[data-testid="tutorial-content"]')).toContainText('Six Figure Barber methodology')

      // Can dismiss tutorial
      await page.click('[data-testid="tutorial-get-started-button"]')
      await expect(page.locator('[data-testid="tutorial-overlay"]')).not.toBeVisible()

      // Should not show again
      await page.reload()
      await page.waitForLoadState('networkidle')
      await expect(page.locator('[data-testid="tutorial-overlay"]')).not.toBeVisible()
    })

    test('should allow reopening tutorial', async ({ page }) => {
      // Set tutorial as seen
      await page.evaluate(() => localStorage.setItem('customize-tutorial-seen', 'true'))

      await loginAsRole(page, 'SHOP_OWNER')
      await navigateToCustomize(page)

      // Should not show initially
      await expect(page.locator('[data-testid="tutorial-overlay"]')).not.toBeVisible()

      // Can reopen from quick actions
      await page.click('[data-testid="show-tutorial-button"]')
      await expect(page.locator('[data-testid="tutorial-overlay"]')).toBeVisible()

      // Can skip
      await page.click('[data-testid="tutorial-skip-button"]')
      await expect(page.locator('[data-testid="tutorial-overlay"]')).not.toBeVisible()
    })
  })
})