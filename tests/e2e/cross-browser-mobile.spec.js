/**
 * CROSS-BROWSER AND MOBILE RESPONSIVE TESTS
 * 
 * Tests nuclear input functionality across different browsers and devices
 * Ensures consistent behavior on mobile, tablet, and desktop viewports
 */

const { test, expect, devices } = require('@playwright/test')

const testDevices = [
  { name: 'Desktop Chrome', ...devices['Desktop Chrome'] },
  { name: 'Desktop Firefox', ...devices['Desktop Firefox'] },
  { name: 'Desktop Safari', ...devices['Desktop Safari'] },
  { name: 'iPhone 13', ...devices['iPhone 13'] },
  { name: 'iPad Pro', ...devices['iPad Pro'] },
  { name: 'Samsung Galaxy S21', ...devices['Galaxy S21'] }
]

testDevices.forEach(device => {
  test.describe(`Nuclear Input Tests - ${device.name}`, () => {
    test.use({ ...device })

    test.beforeEach(async ({ page }) => {
      await page.route('/api/v1/settings/**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              barbershop: {
                name: `${device.name} Test Shop`,
                address: '123 Cross Browser St',
                phone: '+1 (555) 123-4567',
                email: 'crossbrowser@test.com',
                timezone: 'America/New_York'
              },
              notifications: {
                emailEnabled: true,
                smsEnabled: true,
                campaignAlerts: true,
                bookingAlerts: true,
                systemAlerts: true
              }
            })
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          })
        }
      })

      await page.goto('http://localhost:9999/dashboard/settings')
      await page.waitForSelector(`text=${device.name} Test Shop`, { timeout: 15000 })
    })

    test('nuclear input typing works correctly', async ({ page }) => {
      const isMobile = device.name.includes('iPhone') || device.name.includes('Galaxy')
      const isTablet = device.name.includes('iPad')

      await page.click('button:has-text("Edit")')
      await expect(page.locator('button:has-text("Save")')).toBeVisible()

      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()

      const testPhone = '+1 (555) 999-0000'
      
      if (isMobile) {
        await phoneInput.tap()
        await page.keyboard.type(testPhone, { delay: 50 })
      } else {
        await phoneInput.click()
        await phoneInput.type(testPhone, { delay: 30 })
      }

      expect(await phoneInput.inputValue()).toBe(testPhone)
    })

    test('handles viewport-specific interactions', async ({ page }) => {
      const viewport = page.viewportSize()
      const isMobile = viewport.width < 768
      const isTablet = viewport.width >= 768 && viewport.width < 1024

      await page.click('button:has-text("Edit")')

      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      const emailInput = page.locator('input[placeholder="Enter email address"]')

      if (isMobile) {
        await phoneInput.tap()
        await page.keyboard.type('+1 555 MOBILE', { delay: 100 })
        
        await page.tap('body')
        await expect(phoneInput).not.toBeFocused()

        await emailInput.tap()
        await page.keyboard.type('mobile@test.com', { delay: 100 })
        
      } else if (isTablet) {
        await phoneInput.click()
        await phoneInput.type('+1 555 TABLET', { delay: 50 })
        
        await emailInput.click()
        await emailInput.type('tablet@test.com', { delay: 50 })
        
      } else {
        await phoneInput.click()
        await phoneInput.type('+1 555 DESKTOP', { delay: 20 })
        
        await emailInput.click()
        await emailInput.type('desktop@test.com', { delay: 20 })
      }

      if (isMobile) {
        expect(await phoneInput.inputValue()).toBe('+1 555 MOBILE')
        expect(await emailInput.inputValue()).toBe('mobile@test.com')
      } else if (isTablet) {
        expect(await phoneInput.inputValue()).toBe('+1 555 TABLET')
        expect(await emailInput.inputValue()).toBe('tablet@test.com')
      } else {
        expect(await phoneInput.inputValue()).toBe('+1 555 DESKTOP')
        expect(await emailInput.inputValue()).toBe('desktop@test.com')
      }
    })

    test('responsive layout adjustments work correctly', async ({ page }) => {
      const viewport = page.viewportSize()
      
      if (viewport.width < 768) {
        await expect(page.locator('.grid')).toHaveClass(/grid-cols-1/)
      } else if (viewport.width < 1024) {
        await expect(page.locator('.lg\\:grid-cols-2')).toBeVisible()
      } else {
        await expect(page.locator('.lg\\:grid-cols-2')).toBeVisible()
      }
    })

    test('touch interactions work properly on touch devices', async ({ page }) => {
      const isTouchDevice = device.name.includes('iPhone') || 
                           device.name.includes('iPad') || 
                           device.name.includes('Galaxy')

      if (!isTouchDevice) {
        test.skip('Not a touch device')
      }

      await page.click('button:has-text("Edit")')

      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      
      await phoneInput.tap()
      await expect(phoneInput).toBeFocused()

      await page.keyboard.type('+1 555 TOUCH-TEST')
      expect(await phoneInput.inputValue()).toBe('+1 555 TOUCH-TEST')

      await page.tap('body')
      await expect(phoneInput).not.toBeFocused()
    })

    test('handles browser-specific edge cases', async ({ page }) => {
      await page.click('button:has-text("Edit")')

      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()

      if (device.name.includes('Safari')) {
        await phoneInput.type('+1 555 SAFARI-TEST', { delay: 80 })
        
        await page.evaluate(() => {
          const input = document.querySelector('input[placeholder="Enter phone number"]')
          if (input) {
            try {
              input.value = 'safari-interference'
            } catch (e) {
            }
          }
        })
        
        expect(await phoneInput.inputValue()).toBe('+1 555 SAFARI-TEST')
        
      } else if (device.name.includes('Firefox')) {
        await phoneInput.type('+1 555 FIREFOX-TEST', { delay: 60 })
        
        const isProtected = await page.evaluate(() => {
          const input = document.querySelector('input[placeholder="Enter phone number"]')
          try {
            const originalValue = input.value
            input.value = 'firefox-test-change'
            return input.value !== 'firefox-test-change'
          } catch (e) {
            return true
          }
        })
        
        expect(isProtected).toBe(true)
        
      } else if (device.name.includes('Chrome')) {
        await phoneInput.type('+1 555 CHROME-TEST', { delay: 40 })
        
        await page.evaluate(() => {
          const input = document.querySelector('input[placeholder="Enter phone number"]')
          if (input) {
            const event = new Event('input', { bubbles: true })
            input.value = 'autofill-attempt'
            input.dispatchEvent(event)
          }
        })
        
        expect(await phoneInput.inputValue()).toBe('+1 555 CHROME-TEST')
      }
    })

    test('performance remains consistent across devices', async ({ page }) => {
      await page.click('button:has-text("Edit")')

      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()

      const startTime = Date.now()
      
      const testString = '+1 (555) PERFORMANCE-TEST-WITH-LONG-STRING-TO-MEASURE-TYPING-SPEED'
      await phoneInput.type(testString, { delay: 20 })
      
      const endTime = Date.now()
      const typingDuration = endTime - startTime

      expect(await phoneInput.inputValue()).toBe(testString)
      
      const maxTime = device.name.includes('iPhone') || device.name.includes('Galaxy') ? 8000 : 5000
      expect(typingDuration).toBeLessThan(maxTime)
    })

    test('keyboard navigation works correctly', async ({ page }) => {
      const isMobile = device.name.includes('iPhone') || device.name.includes('Galaxy')
      
      if (isMobile) {
        test.skip('Keyboard navigation not applicable for touch-only devices')
      }

      await page.click('button:has-text("Edit")')

      await page.keyboard.press('Tab')
      let focused = await page.locator(':focus').getAttribute('placeholder')
      
      await page.keyboard.press('Tab')
      let nextFocused = await page.locator(':focus').getAttribute('placeholder')
      
      expect(focused).not.toBe(nextFocused)

      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.click()
      await phoneInput.type('12345')
      
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.type('X')
      
      expect(await phoneInput.inputValue()).toBe('123X45')
    })
  })
})

test.describe('Cross-Browser Feature Detection', () => {
  test('detects and handles missing browser features gracefully', async ({ page, browserName }) => {
    await page.goto('http://localhost:9999/dashboard/settings')
    
    const hasFeatureSupport = await page.evaluate(() => {
      return {
        mutationObserver: typeof MutationObserver !== 'undefined',
        propertyDescriptors: typeof Object.getOwnPropertyDescriptor === 'function',
        customElements: typeof customElements !== 'undefined'
      }
    })

    expect(hasFeatureSupport.mutationObserver).toBe(true)
    expect(hasFeatureSupport.propertyDescriptors).toBe(true)

    await page.route('/api/v1/settings/**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            barbershop: {
              name: 'Feature Test Shop',
              phone: '+1 555 123-4567',
              email: 'feature@test.com',
              address: 'Test Address',
              timezone: 'America/New_York'
            }
          })
        })
      } else {
        await route.fulfill({ status: 200, body: '{}' })
      }
    })

    await page.reload()
    await page.waitForSelector('text=Feature Test Shop')
    
    await page.click('button:has-text("Edit")')
    const phoneInput = page.locator('input[placeholder="Enter phone number"]')
    await phoneInput.clear()
    await phoneInput.type(`+1 555 ${browserName.toUpperCase()}`)
    
    expect(await phoneInput.inputValue()).toBe(`+1 555 ${browserName.toUpperCase()}`)
  })

  test('handles different JavaScript engine behaviors', async ({ page, browserName }) => {
    await page.route('/api/v1/settings/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          barbershop: {
            name: 'Engine Test Shop',
            phone: '+1 555 123-4567',
            email: 'engine@test.com',
            address: 'Test Address',
            timezone: 'America/New_York'
          }
        })
      })
    })

    await page.goto('http://localhost:9999/dashboard/settings')
    await page.waitForSelector('text=Engine Test Shop')
    
    await page.click('button:has-text("Edit")')
    
    const engineBehavior = await page.evaluate((browser) => {
      const input = document.createElement('input')
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
      
      return {
        browser: browser,
        hasDescriptor: !!descriptor,
        hasSet: !!descriptor?.set,
        hasGet: !!descriptor?.get,
        canOverride: true
      }
    }, browserName)

    expect(engineBehavior.hasDescriptor).toBe(true)
    expect(engineBehavior.hasSet).toBe(true)
    expect(engineBehavior.hasGet).toBe(true)

    const phoneInput = page.locator('input[placeholder="Enter phone number"]')
    await phoneInput.clear()
    await phoneInput.type(`ENGINE-${browserName.toUpperCase()}-TEST`)
    
    expect(await phoneInput.inputValue()).toBe(`ENGINE-${browserName.toUpperCase()}-TEST`)
  })
})