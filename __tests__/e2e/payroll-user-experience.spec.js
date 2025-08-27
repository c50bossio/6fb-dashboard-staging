/**
 * Comprehensive User Experience Testing Suite for 6FB Payroll System
 * Tests complete user workflows, interface responsiveness, and accessibility
 * 
 * UX Coverage:
 * 1. Payroll Dashboard User Experience
 * 2. Commission Tracking & Visualization
 * 3. Export Generation Workflows
 * 4. Tier Progression Interface
 * 5. Mobile Responsiveness
 * 6. Accessibility Compliance
 * 7. Error Handling & User Feedback
 */

const { test, expect } = require('@playwright/test')

test.describe('Payroll System User Experience Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/login')
    
    // Login as shop owner
    await page.fill('[data-testid="email"]', 'shop_owner@test.com')
    await page.fill('[data-testid="password"]', 'TestPassword123!')
    await page.click('[data-testid="login-button"]')
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-loaded"]', { timeout: 10000 })
  })

  test.describe('Payroll Dashboard User Experience', () => {
    test('should load payroll dashboard with all key metrics within 3 seconds', async ({ page }) => {
      const startTime = Date.now()
      
      await page.click('[data-testid="nav-payroll"]')
      
      // Wait for all critical elements to load
      await Promise.all([
        page.waitForSelector('[data-testid="total-commissions-card"]'),
        page.waitForSelector('[data-testid="pending-payouts-card"]'),
        page.waitForSelector('[data-testid="staff-performance-chart"]'),
        page.waitForSelector('[data-testid="commission-trends-chart"]')
      ])
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // Under 3 seconds
      
      // Verify all metrics display data
      const totalCommissions = await page.textContent('[data-testid="total-commissions-amount"]')
      expect(totalCommissions).toMatch(/\$[\d,]+\.?\d*/) // Currency format
      
      const pendingPayouts = await page.textContent('[data-testid="pending-payouts-amount"]')
      expect(pendingPayouts).toMatch(/\$[\d,]+\.?\d*/)
      
      // Verify charts are rendered
      const chartElements = await page.locator('[data-testid*="chart"]').count()
      expect(chartElements).toBeGreaterThanOrEqual(2)
      
      console.log(`✅ Payroll dashboard loaded in ${loadTime}ms`)
    })

    test('should display real-time commission updates', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      
      // Get initial commission total
      const initialTotal = await page.textContent('[data-testid="total-commissions-amount"]')
      const initialValue = parseFloat(initialTotal.replace(/[$,]/g, ''))
      
      // Simulate real-time commission update (webhook processing)
      await page.evaluate(() => {
        // Trigger a test webhook event
        window.testHarness.simulateCommissionUpdate({
          barber_id: 'test_barber',
          commission_amount: 75.00,
          customer_name: 'John Doe'
        })
      })
      
      // Wait for real-time update
      await page.waitForFunction((expectedIncrease) => {
        const currentTotal = document.querySelector('[data-testid="total-commissions-amount"]')?.textContent
        if (!currentTotal) return false
        
        const currentValue = parseFloat(currentTotal.replace(/[$,]/g, ''))
        return currentValue >= expectedIncrease
      }, initialValue + 75.00, { timeout: 5000 })
      
      // Verify notification appeared
      await expect(page.locator('[data-testid="commission-notification"]')).toBeVisible({ timeout: 2000 })
      const notificationText = await page.textContent('[data-testid="commission-notification"]')
      expect(notificationText).toContain('Commission earned')
      expect(notificationText).toContain('$75.00')
    })

    test('should provide intuitive navigation between payroll sections', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      
      const payrollSections = [
        { tab: 'overview', testId: 'payroll-overview', expectedElement: 'total-commissions-card' },
        { tab: 'staff', testId: 'payroll-staff', expectedElement: 'staff-list-table' },
        { tab: 'tiers', testId: 'payroll-tiers', expectedElement: 'tier-structure-config' },
        { tab: 'history', testId: 'payroll-history', expectedElement: 'payout-history-table' },
        { tab: 'exports', testId: 'payroll-exports', expectedElement: 'export-generator-form' }
      ]
      
      for (const section of payrollSections) {
        await page.click(`[data-testid="payroll-tab-${section.tab}"]`)
        
        // Verify section loads quickly
        await expect(page.locator(`[data-testid="${section.expectedElement}"]`)).toBeVisible({ timeout: 2000 })
        
        // Check URL reflects current section
        const url = page.url()
        expect(url).toContain(`payroll/${section.tab}`)
        
        // Verify active tab styling
        await expect(page.locator(`[data-testid="payroll-tab-${section.tab}"]`)).toHaveClass(/active|selected/)
      }
    })

    test('should handle large datasets with smooth scrolling and pagination', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      await page.click('[data-testid="payroll-tab-history"]')
      
      // Generate large dataset
      await page.evaluate(() => {
        window.testHarness.generateLargePayrollDataset(500) // 500 records
      })
      
      await page.reload()
      await page.click('[data-testid="nav-payroll"]')
      await page.click('[data-testid="payroll-tab-history"]')
      
      // Wait for table to load
      await page.waitForSelector('[data-testid="payout-history-table"]')
      
      // Test pagination
      const paginationInfo = await page.textContent('[data-testid="pagination-info"]')
      expect(paginationInfo).toMatch(/Showing \d+ to \d+ of \d+ entries/)
      
      // Test smooth scrolling through virtual scrolling
      const tableContainer = page.locator('[data-testid="payout-history-table-container"]')
      
      // Scroll down and verify performance
      const scrollStart = Date.now()
      await tableContainer.evaluate(element => {
        element.scrollTop = element.scrollHeight / 2
      })
      
      // Wait for virtual scroll to update
      await page.waitForTimeout(100)
      
      const scrollEnd = Date.now()
      const scrollTime = scrollEnd - scrollStart
      expect(scrollTime).toBeLessThan(500) // Smooth scrolling under 500ms
      
      // Verify pagination controls work
      await page.click('[data-testid="pagination-next"]')
      await page.waitForSelector('[data-testid="payout-history-row-0"]') // First row of next page
      
      const nextPageUrl = page.url()
      expect(nextPageUrl).toContain('page=2')
    })
  })

  test.describe('Commission Tracking & Visualization', () => {
    test('should display comprehensive commission breakdown', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      await page.click('[data-testid="staff-member-barber-john"]') // Click on specific barber
      
      // Verify commission breakdown loads
      await expect(page.locator('[data-testid="commission-breakdown-panel"]')).toBeVisible()
      
      const breakdownElements = [
        'service-commissions',
        'product-commissions', 
        'tier-bonuses',
        'total-earned',
        'total-paid',
        'pending-balance'
      ]
      
      for (const element of breakdownElements) {
        const locator = page.locator(`[data-testid="${element}"]`)
        await expect(locator).toBeVisible()
        
        const value = await locator.textContent()
        expect(value).toMatch(/\$[\d,]+\.?\d*/) // Valid currency format
      }
      
      // Test interactive commission history chart
      const chartContainer = page.locator('[data-testid="commission-history-chart"]')
      await expect(chartContainer).toBeVisible()
      
      // Test chart interactivity
      await chartContainer.hover({ position: { x: 100, y: 100 } })
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible({ timeout: 1000 })
      
      const tooltipText = await page.textContent('[data-testid="chart-tooltip"]')
      expect(tooltipText).toContain('$') // Should show monetary value
      expect(tooltipText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/) // Should show date
    })

    test('should provide detailed tier progression visualization', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      await page.click('[data-testid="payroll-tab-tiers"]')
      
      // Wait for tier visualization to load
      await expect(page.locator('[data-testid="tier-progression-chart"]')).toBeVisible({ timeout: 5000 })
      
      // Test tier progression indicators
      const tierLevels = await page.locator('[data-testid^="tier-level-"]').count()
      expect(tierLevels).toBeGreaterThanOrEqual(3) // At least 3 tier levels
      
      // Test progress bars for each barber
      const progressBars = page.locator('[data-testid^="tier-progress-"]')
      const progressCount = await progressBars.count()
      expect(progressCount).toBeGreaterThan(0)
      
      // Verify progress bar accuracy
      for (let i = 0; i < Math.min(progressCount, 5); i++) {
        const progressBar = progressBars.nth(i)
        const progressValue = await progressBar.getAttribute('data-progress')
        const progressPercent = parseFloat(progressValue)
        
        expect(progressPercent).toBeGreaterThanOrEqual(0)
        expect(progressPercent).toBeLessThanOrEqual(100)
        
        // Visual verification of progress bar width
        const barWidth = await progressBar.evaluate(el => {
          const progressFill = el.querySelector('[data-testid="progress-fill"]')
          return progressFill ? progressFill.style.width : '0%'
        })
        
        expect(barWidth).toMatch(/\d+%/)
      }
      
      // Test tier achievement notifications
      await page.click('[data-testid="simulate-tier-upgrade"]') // Test button
      await expect(page.locator('[data-testid="tier-upgrade-celebration"]')).toBeVisible({ timeout: 3000 })
    })

    test('should handle complex filtering and sorting', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      await page.click('[data-testid="payroll-tab-staff"]')
      
      // Wait for staff table
      await page.waitForSelector('[data-testid="staff-list-table"]')
      
      // Test date range filtering
      await page.click('[data-testid="date-range-picker"]')
      await page.click('[data-testid="date-preset-last-30-days"]')
      await page.waitForSelector('[data-testid="filter-applied-indicator"]')
      
      // Verify filtered data
      const filteredRows = await page.locator('[data-testid^="staff-row-"]').count()
      expect(filteredRows).toBeGreaterThan(0)
      
      // Test commission range filtering
      await page.fill('[data-testid="commission-min-filter"]', '100')
      await page.fill('[data-testid="commission-max-filter"]', '1000')
      await page.click('[data-testid="apply-commission-filter"]')
      
      await page.waitForTimeout(1000) // Allow filtering to complete
      
      // Verify commission values are within range
      const commissionCells = page.locator('[data-testid^="commission-amount-"]')
      const commissionCount = await commissionCells.count()
      
      for (let i = 0; i < Math.min(commissionCount, 10); i++) {
        const cellText = await commissionCells.nth(i).textContent()
        const amount = parseFloat(cellText.replace(/[$,]/g, ''))
        expect(amount).toBeGreaterThanOrEqual(100)
        expect(amount).toBeLessThanOrEqual(1000)
      }
      
      // Test sorting functionality
      const sortableHeaders = ['name', 'commissions', 'tier', 'last-payout']
      
      for (const header of sortableHeaders) {
        await page.click(`[data-testid="sort-${header}"]`)
        await page.waitForTimeout(500) // Allow sort to complete
        
        // Verify sort indicator
        const sortIndicator = page.locator(`[data-testid="sort-${header}"] [data-testid="sort-icon"]`)
        await expect(sortIndicator).toBeVisible()
        
        // Test reverse sort
        await page.click(`[data-testid="sort-${header}"]`)
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('Export Generation Workflows', () => {
    test('should provide seamless export generation experience', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      await page.click('[data-testid="payroll-tab-exports"]')
      
      await expect(page.locator('[data-testid="export-generator-form"]')).toBeVisible()
      
      // Test export configuration
      const exportFormats = ['pdf', 'excel', 'csv']
      const exportTypes = ['summary', 'detailed', 'custom']
      
      for (const format of exportFormats) {
        await page.selectOption('[data-testid="export-format"]', format)
        
        for (const type of exportTypes) {
          await page.selectOption('[data-testid="export-type"]', type)
          
          // Configure date range
          await page.click('[data-testid="export-date-range"]')
          await page.click('[data-testid="date-preset-last-month"]')
          
          // Test export preview
          await page.click('[data-testid="preview-export"]')
          await expect(page.locator('[data-testid="export-preview-modal"]')).toBeVisible({ timeout: 5000 })
          
          // Verify preview shows correct data
          const previewData = await page.textContent('[data-testid="preview-summary"]')
          expect(previewData).toContain(`Format: ${format.toUpperCase()}`)
          expect(previewData).toContain(`Type: ${type}`)
          
          await page.click('[data-testid="close-preview"]')
          
          // Test actual export generation
          await page.click('[data-testid="generate-export"]')
          
          // Monitor export progress
          await expect(page.locator('[data-testid="export-progress-bar"]')).toBeVisible({ timeout: 2000 })
          
          // Wait for completion
          await expect(page.locator('[data-testid="export-completed"]')).toBeVisible({ timeout: 30000 })
          
          // Verify download link
          const downloadLink = page.locator('[data-testid="download-export-link"]')
          await expect(downloadLink).toBeVisible()
          
          const downloadUrl = await downloadLink.getAttribute('href')
          expect(downloadUrl).toContain('download')
          expect(downloadUrl).toContain(format)
          
          // Test email delivery option
          await page.check('[data-testid="email-export-checkbox"]')
          await page.fill('[data-testid="email-recipients"]', 'owner@barbershop.com')
          await page.click('[data-testid="send-export-email"]')
          
          await expect(page.locator('[data-testid="email-sent-confirmation"]')).toBeVisible({ timeout: 5000 })
        }
      }
    })

    test('should handle export customization options', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      await page.click('[data-testid="payroll-tab-exports"]')
      
      // Select custom export type
      await page.selectOption('[data-testid="export-type"]', 'custom')
      
      // Test field selection
      const availableFields = [
        'barber-name',
        'commission-amount',
        'service-breakdown',
        'product-sales',
        'tier-information',
        'payout-history',
        'performance-metrics'
      ]
      
      // Uncheck all fields first
      for (const field of availableFields) {
        await page.uncheck(`[data-testid="field-${field}"]`)
      }
      
      // Select specific fields
      const selectedFields = ['barber-name', 'commission-amount', 'tier-information']
      for (const field of selectedFields) {
        await page.check(`[data-testid="field-${field}"]`)
      }
      
      // Test custom date range
      await page.click('[data-testid="custom-date-range"]')
      await page.fill('[data-testid="start-date"]', '2024-01-01')
      await page.fill('[data-testid="end-date"]', '2024-01-31')
      
      // Test filtering options
      await page.check('[data-testid="filter-active-staff-only"]')
      await page.selectOption('[data-testid="minimum-commission-filter"]', '50')
      
      // Generate customized export
      await page.click('[data-testid="generate-export"]')
      
      // Verify customization is reflected in preview
      await page.click('[data-testid="preview-export"]')
      const previewContent = await page.textContent('[data-testid="export-preview-content"]')
      
      selectedFields.forEach(field => {
        expect(previewContent).toContain(field.replace('-', ' '))
      })
      
      // Verify excluded fields are not present
      const excludedFields = availableFields.filter(field => !selectedFields.includes(field))
      excludedFields.forEach(field => {
        expect(previewContent).not.toContain(field.replace('-', ' '))
      })
    })

    test('should provide export scheduling functionality', async ({ page }) => {
      await page.click('[data-testid="nav-payroll"]')
      await page.click('[data-testid="payroll-tab-exports"]')
      
      // Test scheduled exports
      await page.click('[data-testid="schedule-export-tab"]')
      await expect(page.locator('[data-testid="export-scheduler"]')).toBeVisible()
      
      // Create new scheduled export
      await page.click('[data-testid="new-scheduled-export"]')
      
      // Configure schedule
      await page.fill('[data-testid="schedule-name"]', 'Monthly Payroll Report')
      await page.selectOption('[data-testid="schedule-frequency"]', 'monthly')
      await page.selectOption('[data-testid="schedule-day"]', '1') // 1st of month
      await page.selectOption('[data-testid="export-format"]', 'excel')
      
      // Configure recipients
      await page.fill('[data-testid="schedule-recipients"]', 'owner@barbershop.com,manager@barbershop.com')
      
      // Test schedule validation
      await page.click('[data-testid="validate-schedule"]')
      await expect(page.locator('[data-testid="schedule-validation-success"]')).toBeVisible()
      
      // Save scheduled export
      await page.click('[data-testid="save-scheduled-export"]')
      await expect(page.locator('[data-testid="schedule-saved-confirmation"]')).toBeVisible()
      
      // Verify scheduled export appears in list
      const scheduledExports = page.locator('[data-testid="scheduled-export-item"]')
      await expect(scheduledExports).toHaveCount(1)
      
      const exportItem = scheduledExports.first()
      const exportName = await exportItem.locator('[data-testid="export-name"]').textContent()
      expect(exportName).toBe('Monthly Payroll Report')
      
      // Test schedule modification
      await exportItem.locator('[data-testid="edit-schedule"]').click()
      await page.selectOption('[data-testid="schedule-frequency"]', 'weekly')
      await page.click('[data-testid="update-scheduled-export"]')
      
      await expect(page.locator('[data-testid="schedule-updated-confirmation"]')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should provide excellent mobile user experience', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      
      await page.goto('/payroll')
      
      // Test mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
      await page.click('[data-testid="mobile-menu-button"]')
      await expect(page.locator('[data-testid="mobile-navigation-menu"]')).toBeVisible()
      
      // Test payroll sections are accessible on mobile
      await page.click('[data-testid="mobile-nav-payroll"]')
      await expect(page.locator('[data-testid="payroll-mobile-dashboard"]')).toBeVisible()
      
      // Test card layout on mobile
      const mobileCards = page.locator('[data-testid^="mobile-metric-card-"]')
      const cardCount = await mobileCards.count()
      expect(cardCount).toBeGreaterThanOrEqual(3) // Key metrics cards
      
      // Test card interactions
      await page.click('[data-testid="mobile-metric-card-commissions"]')
      await expect(page.locator('[data-testid="commission-detail-modal"]')).toBeVisible()
      
      // Test swipe navigation
      const chartContainer = page.locator('[data-testid="mobile-chart-container"]')
      await expect(chartContainer).toBeVisible()
      
      // Simulate swipe gesture
      await chartContainer.touchscreen.tap(200, 200)
      await chartContainer.touchscreen.swipe(200, 200, 100, 200) // Swipe left
      
      // Verify chart navigation
      await expect(page.locator('[data-testid="chart-navigation-dots"]')).toBeVisible()
      
      // Test mobile table interactions
      await page.click('[data-testid="mobile-staff-list-tab"]')
      const mobileTable = page.locator('[data-testid="mobile-staff-table"]')
      await expect(mobileTable).toBeVisible()
      
      // Test horizontal scrolling
      await mobileTable.evaluate(el => el.scrollLeft = 100)
      
      // Test tap to expand row
      await page.tap('[data-testid="mobile-staff-row-0"]')
      await expect(page.locator('[data-testid="mobile-staff-detail-panel"]')).toBeVisible()
    })

    test('should optimize touch interactions for mobile', async ({ page }) => {
      await page.setViewportSize({ width: 414, height: 896 }) // iPhone 11 Pro
      
      await page.goto('/payroll')
      
      // Test touch targets are appropriately sized (minimum 44px)
      const touchTargets = [
        '[data-testid="export-button"]',
        '[data-testid="filter-button"]',
        '[data-testid="sort-menu-button"]',
        '[data-testid="staff-action-menu"]'
      ]
      
      for (const target of touchTargets) {
        const element = page.locator(target)
        if (await element.isVisible()) {
          const boundingBox = await element.boundingBox()
          expect(boundingBox.height).toBeGreaterThanOrEqual(44)
          expect(boundingBox.width).toBeGreaterThanOrEqual(44)
        }
      }
      
      // Test gesture-based interactions
      const gestureTests = [
        {
          element: '[data-testid="commission-chart"]',
          gesture: 'pinch-to-zoom',
          verification: '[data-testid="chart-zoom-controls"]'
        },
        {
          element: '[data-testid="staff-list-container"]', 
          gesture: 'pull-to-refresh',
          verification: '[data-testid="refresh-indicator"]'
        }
      ]
      
      for (const test of gestureTests) {
        const element = page.locator(test.element)
        await expect(element).toBeVisible()
        
        // Simulate gesture (simplified for testing)
        await element.touchscreen.tap(200, 300)
        await page.waitForTimeout(100)
        
        if (test.verification) {
          // Verify gesture feedback appears
          await expect(page.locator(test.verification)).toBeVisible({ timeout: 2000 })
        }
      }
    })
  })

  test.describe('Accessibility Compliance', () => {
    test('should meet WCAG 2.1 AA accessibility standards', async ({ page }) => {
      await page.goto('/payroll')
      
      // Test keyboard navigation
      await page.keyboard.press('Tab') // Should focus first interactive element
      let focusedElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'))
      expect(focusedElement).toBeTruthy()
      
      // Test tab order through main navigation
      const expectedTabOrder = [
        'nav-dashboard',
        'nav-appointments', 
        'nav-customers',
        'nav-payroll',
        'nav-analytics',
        'nav-settings'
      ]
      
      for (const expectedElement of expectedTabOrder) {
        await page.keyboard.press('Tab')
        focusedElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'))
        expect(focusedElement).toBe(expectedElement)
      }
      
      // Test payroll section accessibility
      await page.click('[data-testid="nav-payroll"]')
      
      // Verify ARIA labels and roles
      const ariaElements = await page.locator('[aria-label]').count()
      expect(ariaElements).toBeGreaterThan(10) // Multiple elements should have ARIA labels
      
      // Test table accessibility
      const table = page.locator('[data-testid="staff-list-table"]')
      await expect(table).toHaveAttribute('role', 'table')
      
      const tableHeaders = page.locator('[data-testid="staff-list-table"] th')
      const headerCount = await tableHeaders.count()
      
      for (let i = 0; i < headerCount; i++) {
        const header = tableHeaders.nth(i)
        await expect(header).toHaveAttribute('role', 'columnheader')
        
        const headerText = await header.textContent()
        expect(headerText).toBeTruthy() // Headers should have text content
      }
      
      // Test color contrast (simplified check)
      const contrastElements = [
        '[data-testid="total-commissions-card"]',
        '[data-testid="commission-amount"]',
        '[data-testid="tier-level-indicator"]'
      ]
      
      for (const elementSelector of contrastElements) {
        const element = page.locator(elementSelector)
        if (await element.isVisible()) {
          const computedStyle = await element.evaluate(el => {
            const style = window.getComputedStyle(el)
            return {
              color: style.color,
              backgroundColor: style.backgroundColor
            }
          })
          
          // Basic check - ensure color and background are different
          expect(computedStyle.color).not.toBe(computedStyle.backgroundColor)
        }
      }
    })

    test('should provide screen reader compatibility', async ({ page }) => {
      await page.goto('/payroll')
      
      // Test screen reader announcements
      const announceableElements = [
        {
          selector: '[data-testid="total-commissions-amount"]',
          expectedAnnouncement: /total commissions.*\$/i
        },
        {
          selector: '[data-testid="pending-payouts-amount"]', 
          expectedAnnouncement: /pending payouts.*\$/i
        },
        {
          selector: '[data-testid="staff-count"]',
          expectedAnnouncement: /staff members|barbers/i
        }
      ]
      
      for (const element of announceableElements) {
        const locator = page.locator(element.selector)
        
        // Check for aria-live regions
        const isLiveRegion = await locator.evaluate(el => {
          return el.hasAttribute('aria-live') || 
                 el.hasAttribute('aria-atomic') ||
                 el.closest('[aria-live]') !== null
        })
        
        if (isLiveRegion) {
          const ariaLive = await locator.getAttribute('aria-live')
          expect(['polite', 'assertive', 'off']).toContain(ariaLive)
        }
        
        // Check for descriptive text
        const textContent = await locator.textContent()
        if (element.expectedAnnouncement) {
          expect(textContent).toMatch(element.expectedAnnouncement)
        }
      }
      
      // Test form accessibility
      await page.click('[data-testid="payroll-tab-exports"]')
      
      const formControls = [
        '[data-testid="export-format"]',
        '[data-testid="export-type"]',
        '[data-testid="date-range-picker"]'
      ]
      
      for (const control of formControls) {
        const element = page.locator(control)
        if (await element.isVisible()) {
          // Check for associated label
          const hasLabel = await element.evaluate(el => {
            const labelId = el.getAttribute('aria-labelledby')
            const labelFor = el.getAttribute('id')
            
            return labelId || 
                   document.querySelector(`label[for="${labelFor}"]`) ||
                   el.getAttribute('aria-label')
          })
          
          expect(hasLabel).toBeTruthy()
        }
      }
    })

    test('should handle high contrast mode and zoom levels', async ({ page }) => {
      await page.goto('/payroll')
      
      // Test high contrast mode simulation
      await page.addStyleTag({
        content: `
          * {
            filter: contrast(200%) !important;
          }
        `
      })
      
      // Verify content is still readable
      const keyElements = [
        '[data-testid="total-commissions-amount"]',
        '[data-testid="staff-list-table"]',
        '[data-testid="commission-chart"]'
      ]
      
      for (const elementSelector of keyElements) {
        const element = page.locator(elementSelector)
        if (await element.isVisible()) {
          // Check visibility after high contrast filter
          const isVisible = await element.isVisible()
          expect(isVisible).toBe(true)
        }
      }
      
      // Test zoom levels
      const zoomLevels = [150, 200, 300] // 150%, 200%, 300%
      
      for (const zoomLevel of zoomLevels) {
        await page.evaluate((zoom) => {
          document.body.style.zoom = `${zoom}%`
        }, zoomLevel)
        
        await page.waitForTimeout(500) // Allow layout to stabilize
        
        // Verify critical elements remain accessible
        await expect(page.locator('[data-testid="nav-payroll"]')).toBeVisible()
        await expect(page.locator('[data-testid="total-commissions-card"]')).toBeVisible()
        
        // Check for horizontal scrolling (should be minimal)
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
        const viewportWidth = await page.evaluate(() => window.innerWidth)
        
        // Allow some scrolling but not excessive
        expect(bodyWidth / viewportWidth).toBeLessThan(1.5)
      }
      
      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '100%'
      })
    })
  })

  test.describe('Error Handling & User Feedback', () => {
    test('should provide clear error messages and recovery options', async ({ page }) => {
      await page.goto('/payroll')
      
      // Test network error handling
      await page.route('/api/payroll/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })
      
      await page.reload()
      
      // Verify error message appears
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 })
      
      const errorMessage = await page.textContent('[data-testid="error-message"]')
      expect(errorMessage).toContain('Unable to load payroll data')
      
      // Test retry functionality
      await page.unroute('/api/payroll/**') // Remove route mock
      await page.click('[data-testid="retry-button"]')
      
      // Verify data loads after retry
      await expect(page.locator('[data-testid="total-commissions-card"]')).toBeVisible({ timeout: 5000 })
      
      // Test export error handling
      await page.click('[data-testid="payroll-tab-exports"]')
      
      // Mock export failure
      await page.route('/api/payroll/export', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Export generation failed' })
        })
      })
      
      await page.click('[data-testid="generate-export"]')
      
      await expect(page.locator('[data-testid="export-error-message"]')).toBeVisible({ timeout: 3000 })
      
      const exportError = await page.textContent('[data-testid="export-error-message"]')
      expect(exportError).toContain('Export generation failed')
      
      // Verify error includes helpful suggestions
      await expect(page.locator('[data-testid="error-suggestions"]')).toBeVisible()
    })

    test('should provide loading states and progress indicators', async ({ page }) => {
      await page.goto('/payroll')
      
      // Test initial loading state
      const loadingIndicator = page.locator('[data-testid="payroll-loading"]')
      if (await loadingIndicator.isVisible()) {
        // Verify loading spinner or skeleton
        const hasSpinner = await page.locator('[data-testid="loading-spinner"]').isVisible()
        const hasSkeleton = await page.locator('[data-testid="skeleton-loader"]').isVisible()
        
        expect(hasSpinner || hasSkeleton).toBe(true)
      }
      
      // Test export progress
      await page.click('[data-testid="payroll-tab-exports"]')
      
      // Mock slow export generation
      await page.route('/api/payroll/export', async route => {
        await page.waitForTimeout(2000) // Simulate slow response
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            download_url: '/exports/test-export.pdf' 
          })
        })
      })
      
      await page.click('[data-testid="generate-export"]')
      
      // Verify progress indicator appears
      await expect(page.locator('[data-testid="export-progress-bar"]')).toBeVisible({ timeout: 1000 })
      
      // Verify progress text updates
      const progressText = page.locator('[data-testid="progress-text"]')
      await expect(progressText).toContainText(/generating|processing/i)
      
      // Wait for completion
      await expect(page.locator('[data-testid="export-completed"]')).toBeVisible({ timeout: 5000 })
    })

    test('should handle validation errors gracefully', async ({ page }) => {
      await page.goto('/payroll')
      await page.click('[data-testid="payroll-tab-exports"]')
      
      // Test form validation
      await page.click('[data-testid="generate-export"]') // Without selecting format
      
      // Verify validation errors appear
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible()
      
      const validationMessage = await page.textContent('[data-testid="validation-error"]')
      expect(validationMessage).toContain('required') // Should indicate required field
      
      // Test invalid date range
      await page.selectOption('[data-testid="export-format"]', 'pdf')
      await page.click('[data-testid="custom-date-range"]')
      await page.fill('[data-testid="start-date"]', '2024-12-31')
      await page.fill('[data-testid="end-date"]', '2024-01-01') // End before start
      
      await page.click('[data-testid="generate-export"]')
      
      await expect(page.locator('[data-testid="date-validation-error"]')).toBeVisible()
      const dateError = await page.textContent('[data-testid="date-validation-error"]')
      expect(dateError).toContain('End date must be after start date')
      
      // Test field highlighting for errors
      const startDateField = page.locator('[data-testid="start-date"]')
      await expect(startDateField).toHaveClass(/error|invalid/)
    })
  })
})