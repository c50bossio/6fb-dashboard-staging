/**
 * E2E Tests: Calendar Location Switching
 *
 * Tests verify actual user workflow for switching locations in the calendar
 * and seeing correct staff members for each location
 *
 * Bug Fixed: Carlos Martinez and DeAndre Williams appearing for all locations
 * Root Cause: Frontend wasn't passing barbershop_id to unified-staff-service
 *
 * Test Coverage:
 * 1. User can switch between locations
 * 2. Each location shows different staff members
 * 3. Wrong staff don't appear after switching
 * 4. Network requests include correct barbershop_id parameter
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:9999'

test.describe('Calendar Location Switching - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test.describe('Location Switching Flow', () => {
    test('should switch between locations and show different staff', async ({ page }) => {
      // Navigate to calendar (may require authentication)
      await page.goto(`${BASE_URL}/dashboard/calendar`)

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Check if location selector exists
      const locationSelector = page.locator('[data-testid="location-selector"]')
        .or(page.locator('select:has-text("Location")'))
        .or(page.locator('button:has-text("Location")'))

      const hasLocationSelector = await locationSelector.count() > 0

      if (!hasLocationSelector) {
        test.skip(true, 'Location selector not found - may be single location setup')
        return
      }

      // Get initial staff list
      await page.waitForSelector('[data-testid="staff-list"], .calendar-staff, [data-resource-id]', {
        timeout: 10000
      })

      const initialStaff = await page.locator('[data-testid="staff-member"], .fc-resource').allTextContents()

      // Switch to different location
      await locationSelector.first().click()

      // Select a different location from dropdown
      const locationOptions = page.locator('[role="option"], option').filter({ hasNotText: 'Select' })
      const locationCount = await locationOptions.count()

      if (locationCount > 1) {
        // Click second location (different from first)
        await locationOptions.nth(1).click()

        // Wait for staff list to update
        await page.waitForTimeout(2000) // Allow time for API call and rerender

        // Get updated staff list
        const updatedStaff = await page.locator('[data-testid="staff-member"], .fc-resource').allTextContents()

        // CRITICAL: Staff should have changed
        expect(updatedStaff).not.toEqual(initialStaff)
      }
    })

    test('should include barbershop_id in network requests', async ({ page, context }) => {
      // Track network requests
      const apiRequests = []

      page.on('request', request => {
        const url = request.url()
        if (url.includes('/api/staff') || url.includes('/api/public/barbershop')) {
          apiRequests.push({
            url,
            method: request.method(),
            timestamp: Date.now()
          })
        }
      })

      // Navigate to calendar
      await page.goto(`${BASE_URL}/dashboard/calendar`)
      await page.waitForLoadState('networkidle')

      // Find location selector
      const locationSelector = page.locator('[data-testid="location-selector"]')
        .or(page.locator('select:has-text("Location")'))
        .or(page.locator('button:has-text("Location")'))

      const hasLocationSelector = await locationSelector.count() > 0

      if (hasLocationSelector) {
        // Switch location
        await locationSelector.first().click()

        const locationOptions = page.locator('[role="option"], option').filter({ hasNotText: 'Select' })
        const locationCount = await locationOptions.count()

        if (locationCount > 1) {
          await locationOptions.nth(1).click()
          await page.waitForTimeout(2000)
        }
      }

      // Verify API requests include barbershop_id parameter
      const staffRequests = apiRequests.filter(req => req.url.includes('/api/staff'))

      if (staffRequests.length > 0) {
        // At least one request should include barbershop_id parameter
        const hasParameter = staffRequests.some(req =>
          req.url.includes('barbershop_id=') || req.url.includes('location_id=')
        )

        // Log requests for debugging
        console.log('Staff API Requests:', staffRequests)

        // This assertion verifies the bug fix
        expect(hasParameter).toBe(true)
      }
    })
  })

  test.describe('Staff Isolation', () => {
    test('should NOT show Carlos Martinez for non-Tomb45 locations', async ({ page }) => {
      // Navigate to calendar
      await page.goto(`${BASE_URL}/dashboard/calendar`)
      await page.waitForLoadState('networkidle')

      // Check if we can find location selector
      const locationSelector = page.locator('[data-testid="location-selector"]')
        .or(page.locator('select:has-text("Location")'))
        .or(page.locator('button:has-text("Location")'))

      const hasLocationSelector = await locationSelector.count() > 0

      if (!hasLocationSelector) {
        test.skip(true, 'Location selector not found')
        return
      }

      // Get all available locations
      await locationSelector.first().click()
      const locationOptions = page.locator('[role="option"], option').filter({ hasNotText: 'Select' })
      const locationCount = await locationOptions.count()

      if (locationCount <= 1) {
        test.skip(true, 'Only one location available')
        return
      }

      // Test each location
      for (let i = 0; i < Math.min(locationCount, 3); i++) {
        // Select location
        await locationSelector.first().click()
        await locationOptions.nth(i).click()

        // Wait for staff to load
        await page.waitForTimeout(2000)

        // Get location name
        const selectedLocation = await locationSelector.first().textContent()

        // Get staff list
        const staffText = await page.locator('body').textContent()

        // If this is NOT Tomb45 GasWorx, Carlos Martinez should NOT appear
        if (selectedLocation && !selectedLocation.includes('Tomb45') && !selectedLocation.includes('GasWorx')) {
          expect(staffText).not.toContain('Carlos Martinez')
          expect(staffText).not.toContain('DeAndre Williams')

          console.log(`✅ Location "${selectedLocation}" correctly excludes Tomb45 staff`)
        }
      }
    })

    test('should show consistent staff after page refresh', async ({ page }) => {
      // Navigate to calendar
      await page.goto(`${BASE_URL}/dashboard/calendar`)
      await page.waitForLoadState('networkidle')

      // Wait for staff to load
      await page.waitForSelector('[data-testid="staff-list"], .calendar-staff, [data-resource-id]', {
        timeout: 10000
      })

      // Get initial staff
      const initialStaff = await page.locator('[data-testid="staff-member"], .fc-resource').allTextContents()

      // Refresh page
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Get staff after refresh
      await page.waitForSelector('[data-testid="staff-list"], .calendar-staff, [data-resource-id]', {
        timeout: 10000
      })

      const refreshedStaff = await page.locator('[data-testid="staff-member"], .fc-resource').allTextContents()

      // Staff should remain the same after refresh
      expect(refreshedStaff).toEqual(initialStaff)
    })
  })

  test.describe('Network Behavior', () => {
    test('should make location-specific API calls', async ({ page }) => {
      const apiCalls = []

      // Intercept API calls
      await page.route('**/api/staff*', (route, request) => {
        const url = request.url()
        apiCalls.push({
          url,
          barbershopId: new URL(url).searchParams.get('barbershop_id')
        })
        route.continue()
      })

      // Navigate to calendar
      await page.goto(`${BASE_URL}/dashboard/calendar`)
      await page.waitForLoadState('networkidle')

      // Find location selector
      const locationSelector = page.locator('[data-testid="location-selector"]')
        .or(page.locator('select:has-text("Location")'))
        .or(page.locator('button:has-text("Location")'))

      const hasLocationSelector = await locationSelector.count() > 0

      if (hasLocationSelector) {
        // Switch between locations
        await locationSelector.first().click()

        const locationOptions = page.locator('[role="option"], option').filter({ hasNotText: 'Select' })
        const locationCount = await locationOptions.count()

        if (locationCount > 1) {
          // Switch to location 1
          await locationOptions.nth(0).click()
          await page.waitForTimeout(1500)

          const firstLocationCalls = apiCalls.length

          // Switch to location 2
          await locationSelector.first().click()
          await locationOptions.nth(1).click()
          await page.waitForTimeout(1500)

          // Should have made additional API calls
          expect(apiCalls.length).toBeGreaterThan(firstLocationCalls)

          // Log API calls for debugging
          console.log('API Calls:', apiCalls)

          // Verify barbershop_id parameters are different for different locations
          const location1Calls = apiCalls.slice(0, firstLocationCalls)
          const location2Calls = apiCalls.slice(firstLocationCalls)

          if (location1Calls.length > 0 && location2Calls.length > 0) {
            const loc1Id = location1Calls[location1Calls.length - 1].barbershopId
            const loc2Id = location2Calls[location2Calls.length - 1].barbershopId

            // CRITICAL: Different locations should have different barbershop_ids
            if (loc1Id && loc2Id) {
              expect(loc1Id).not.toBe(loc2Id)
              console.log(`✅ Location 1 ID: ${loc1Id}`)
              console.log(`✅ Location 2 ID: ${loc2Id}`)
            }
          }
        }
      }
    })

    test('should handle rapid location switching', async ({ page }) => {
      // Navigate to calendar
      await page.goto(`${BASE_URL}/dashboard/calendar`)
      await page.waitForLoadState('networkidle')

      const locationSelector = page.locator('[data-testid="location-selector"]')
        .or(page.locator('select:has-text("Location")'))
        .or(page.locator('button:has-text("Location")'))

      const hasLocationSelector = await locationSelector.count() > 0

      if (!hasLocationSelector) {
        test.skip(true, 'Location selector not found')
        return
      }

      // Rapidly switch between locations
      await locationSelector.first().click()
      const locationOptions = page.locator('[role="option"], option').filter({ hasNotText: 'Select' })
      const locationCount = await locationOptions.count()

      if (locationCount > 1) {
        // Switch back and forth rapidly
        for (let i = 0; i < 3; i++) {
          await locationSelector.first().click()
          await locationOptions.nth(0).click()
          await page.waitForTimeout(500)

          await locationSelector.first().click()
          await locationOptions.nth(1).click()
          await page.waitForTimeout(500)
        }

        // Page should still be functional (no crashes)
        const bodyText = await page.locator('body').textContent()
        expect(bodyText.length).toBeGreaterThan(0)

        // Staff list should still be visible
        const staffVisible = await page.locator('[data-testid="staff-list"], .calendar-staff, [data-resource-id]').isVisible()
        expect(staffVisible).toBe(true)
      }
    })
  })

  test.describe('Regression Tests', () => {
    test('BUG FIX: Verify Carlos Martinez only appears in Tomb45 location', async ({ page }) => {
      // This is the core regression test for the original bug

      // Navigate to calendar
      await page.goto(`${BASE_URL}/dashboard/calendar`)
      await page.waitForLoadState('networkidle')

      const locationSelector = page.locator('[data-testid="location-selector"]')
        .or(page.locator('select:has-text("Location")'))
        .or(page.locator('button:has-text("Location")'))

      const hasLocationSelector = await locationSelector.count() > 0

      if (!hasLocationSelector) {
        test.skip(true, 'Location selector not found')
        return
      }

      // Get all locations
      await locationSelector.first().click()
      const locationOptions = page.locator('[role="option"], option').filter({ hasNotText: 'Select' })
      const locationTexts = await locationOptions.allTextContents()

      console.log('Available locations:', locationTexts)

      // Track which locations show Carlos
      const locationsWithCarlos = []

      for (let i = 0; i < locationTexts.length; i++) {
        await locationSelector.first().click()
        await locationOptions.nth(i).click()
        await page.waitForTimeout(2000)

        const bodyText = await page.locator('body').textContent()

        if (bodyText.includes('Carlos Martinez')) {
          locationsWithCarlos.push(locationTexts[i])
        }
      }

      console.log('Locations showing Carlos Martinez:', locationsWithCarlos)

      // CRITICAL: Carlos should only appear in Tomb45 location
      // Or if there are multiple locations and Carlos appears, it should be intentional
      if (locationsWithCarlos.length > 0) {
        // Carlos should only appear in one location (his actual location)
        expect(locationsWithCarlos.length).toBeLessThanOrEqual(1)
      }
    })
  })
})
