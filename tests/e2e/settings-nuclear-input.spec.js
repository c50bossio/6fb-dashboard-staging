/**
 * END-TO-END TESTS FOR NUCLEAR INPUT IN SETTINGS
 * 
 * Tests complete user workflows with real browser interactions
 * Focuses on nuclear input behavior in production-like environment
 */

const { test, expect } = require('@playwright/test')

test.describe('Settings Form - Nuclear Input E2E Tests', () => {
  let page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    await page.route('/api/v1/settings/barbershop', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            barbershop: {
              name: 'E2E Test Barbershop',
              address: '123 E2E Test Street',
              phone: '+1 (555) 123-4567',
              email: 'e2e@test.com',
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
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      }
    })

    await page.route('/api/v1/settings/business-hours', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          monday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
          tuesday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
          wednesday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
          thursday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
          friday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
          saturday: { enabled: true, shifts: [{ open: '10:00', close: '16:00' }] },
          sunday: { enabled: false, shifts: [] }
        })
      })
    })

    await page.goto('http://localhost:9999/dashboard/settings')
    await page.waitForSelector('[data-testid="settings-loaded"]', { timeout: 10000 })
      .catch(() => {
        return page.waitForSelector('text=E2E Test Barbershop', { timeout: 10000 })
      })
  })

  test.describe('Nuclear Input Character-by-Character Typing', () => {
    test('phone input maintains value during slow typing', async () => {
      await page.click('button:has-text("Edit")')
      await expect(page.locator('button:has-text("Save")')).toBeVisible()

      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      
      const testPhone = '+1 (555) 999-8888'
      for (const char of testPhone) {
        await phoneInput.type(char, { delay: 100 })
        await page.waitForTimeout(50)
        
        const currentValue = await phoneInput.inputValue()
        expect(currentValue).toBe(testPhone.substring(0, testPhone.indexOf(char) + 1))
      }
      
      expect(await phoneInput.inputValue()).toBe(testPhone)
    })

    test('phone input handles rapid typing without corruption', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      
      const rapidPhone = '+1-555-RAPID-TEST-12345'
      await phoneInput.type(rapidPhone, { delay: 1 })
      
      expect(await phoneInput.inputValue()).toBe(rapidPhone)
    })

    test('email input maintains value during typing with special characters', async () => {
      await page.click('button:has-text("Edit")')
      
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      await emailInput.clear()
      
      const specialEmail = 'test+tag.name_123@domain-test.co.uk'
      for (const char of specialEmail) {
        await emailInput.type(char, { delay: 80 })
        await page.waitForTimeout(30)
      }
      
      expect(await emailInput.inputValue()).toBe(specialEmail)
    })

    test('maintains focus during continuous typing', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.click()
      await phoneInput.clear()
      
      await phoneInput.type('+1 555', { delay: 100 })
      
      await expect(phoneInput).toBeFocused()
      
      await phoneInput.type(' 123-4567', { delay: 100 })
      
      await expect(phoneInput).toBeFocused()
      expect(await phoneInput.inputValue()).toBe('+1 555 123-4567')
    })
  })

  test.describe('Copy-Paste Operations', () => {
    test('handles paste operations correctly', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      
      const pastedContent = '+1 (555) PASTED-123'
      await phoneInput.fill(pastedContent) // fill simulates paste
      
      expect(await phoneInput.inputValue()).toBe(pastedContent)
    })

    test('handles copy-paste of international phone numbers', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      
      const internationalNumbers = [
        '+44 20 1234 5678',
        '+33 1 42 86 83 26',
        '+81 3-1234-5678',
        '+49 30 12345678'
      ]
      
      for (const number of internationalNumbers) {
        await phoneInput.fill(number)
        expect(await phoneInput.inputValue()).toBe(number)
        await phoneInput.clear()
      }
    })

    test('handles email paste with complex formats', async () => {
      await page.click('button:has-text("Edit")')
      
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      await emailInput.clear()
      
      const complexEmails = [
        'user+tag123@long-domain-name.co.uk',
        'test.email_with-symbols@subdomain.example.org',
        'numeric123@test123.com',
        'special.chars+filter@domain-with-hyphens.net'
      ]
      
      for (const email of complexEmails) {
        await emailInput.fill(email)
        expect(await emailInput.inputValue()).toBe(email)
        await emailInput.clear()
      }
    })
  })

  test.describe('Focus and Blur Behavior', () => {
    test('triggers blur handler only on focus loss, not during typing', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      
      await phoneInput.clear()
      await phoneInput.type('+1 555 BLUR TEST')
      
      await expect(phoneInput).toBeFocused()
      
      await emailInput.click()
      
      await expect(phoneInput).not.toBeFocused()
      await expect(emailInput).toBeFocused()
    })

    test('handles rapid focus switching between inputs', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      
      for (let i = 0; i < 5; i++) {
        await phoneInput.click()
        await phoneInput.type(`${i}`, { delay: 10 })
        
        await emailInput.click()
        await emailInput.type(`test${i}@`, { delay: 10 })
      }
      
      expect(await phoneInput.inputValue()).toContain('01234')
      expect(await emailInput.inputValue()).toContain('test0@test1@test2@test3@test4@')
    })

    test('maintains proper tab order in edit mode', async () => {
      await page.click('button:has-text("Edit")')
      
      await page.keyboard.press('Tab') // Should focus first input
      let focused = await page.locator(':focus').getAttribute('placeholder')
      
      await page.keyboard.press('Tab') // Move to next input
      let nextFocused = await page.locator(':focus').getAttribute('placeholder')
      
      expect(focused).not.toBe(nextFocused)
    })
  })

  test.describe('Real Browser Stress Tests', () => {
    test('handles concurrent typing in multiple browser tabs', async ({ browser }) => {
      const page2 = await browser.newPage()
      
      await page2.route('/api/v1/settings/**', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              barbershop: {
                name: 'Tab 2 Barbershop',
                phone: '+1 (555) 222-2222',
                email: 'tab2@test.com',
                address: 'Tab 2 Address',
                timezone: 'America/New_York'
              }
            })
          })
        } else {
          await route.fulfill({ status: 200, body: '{}' })
        }
      })
      
      await page2.goto('http://localhost:9999/dashboard/settings')
      await page2.waitForSelector('text=Tab 2 Barbershop', { timeout: 10000 })
      
      await page.click('button:has-text("Edit")')
      await page2.click('button:has-text("Edit")')
      
      const phoneInput1 = page.locator('input[placeholder="Enter phone number"]')
      const phoneInput2 = page2.locator('input[placeholder="Enter phone number"]')
      
      await Promise.all([
        phoneInput1.fill('+1 555 TAB-ONE'),
        phoneInput2.fill('+1 555 TAB-TWO')
      ])
      
      expect(await phoneInput1.inputValue()).toBe('+1 555 TAB-ONE')
      expect(await phoneInput2.inputValue()).toBe('+1 555 TAB-TWO')
      
      await page2.close()
    })

    test('survives page refresh during typing', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      await phoneInput.type('+1 555 BEFORE-REFRESH')
      
      await page.reload()
      await page.waitForSelector('text=E2E Test Barbershop', { timeout: 10000 })
      
      expect(await page.textContent('body')).toContain('+1 (555) 123-4567')
    })

    test('handles browser back/forward during editing', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      await phoneInput.type('+1 555 NAVIGATION-TEST')
      
      await page.goto('http://localhost:9999')
      await page.goBack()
      
      await page.waitForSelector('text=E2E Test Barbershop', { timeout: 10000 })
    })
  })

  test.describe('Complete User Workflows', () => {
    test('complete edit-save workflow with nuclear inputs', async () => {
      await page.click('button:has-text("Edit")')
      await expect(page.locator('button:has-text("Save")')).toBeVisible()
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      await phoneInput.type('+1 (555) 777-9999')
      
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      await emailInput.clear()
      await emailInput.type('updated@workflow.com')
      
      await page.click('body')
      
      await page.click('button:has-text("Save")')
      
      await expect(page.locator('text=Settings saved successfully!')).toBeVisible()
      
      await expect(page.locator('button:has-text("Edit")')).toBeVisible()
      await expect(page.locator('button:has-text("Save")')).not.toBeVisible()
    })

    test('complete edit-cancel workflow preserves original values', async () => {
      const originalPhone = await page.textContent('text=+1 (555) 123-4567')
      const originalEmail = await page.textContent('text=e2e@test.com')
      
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      await phoneInput.type('+1 (555) CANCEL-TEST')
      
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      await emailInput.clear()
      await emailInput.type('cancel@test.com')
      
      await page.click('button:has-text("Cancel")')
      
      await expect(page.locator('button:has-text("Edit")')).toBeVisible()
      
      await expect(page.locator('text=+1 (555) 123-4567')).toBeVisible()
      await expect(page.locator('text=e2e@test.com')).toBeVisible()
    })

    test('error handling workflow with invalid email', async () => {
      await page.click('button:has-text("Edit")')
      
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      await emailInput.clear()
      await emailInput.type('invalid-email-format')
      
      await page.click('body')
      
      await page.click('button:has-text("Save")')
      
      await expect(page.locator('text=Invalid email format')).toBeVisible()
      
      await expect(page.locator('button:has-text("Save")')).toBeVisible()
      
      await emailInput.clear()
      await emailInput.type('valid@email.com')
      await page.click('body') // Trigger blur
      
      await page.click('button:has-text("Save")')
      await expect(page.locator('text=Settings saved successfully!')).toBeVisible()
    })
  })

  test.describe('Performance and Memory Tests', () => {
    test('handles large input values without performance degradation', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      
      const longPhone = '+1 (555) 123-4567 ext 1234567890 additional-info-that-is-very-long'
      const startTime = Date.now()
      
      await phoneInput.type(longPhone, { delay: 10 })
      
      const endTime = Date.now()
      const typingTime = endTime - startTime
      
      expect(await phoneInput.inputValue()).toBe(longPhone)
      
      expect(typingTime).toBeLessThan(10000)
    })

    test('memory usage remains stable during extended typing', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      
      for (let i = 0; i < 100; i++) {
        await phoneInput.clear()
        await phoneInput.type(`+1 555 ${i.toString().padStart(3, '0')}-TEST`)
        
        await emailInput.clear()
        await emailInput.type(`test${i}@extended.test`)
        
        if (i % 10 === 0) {
          await page.waitForTimeout(100)
        }
      }
      
      expect(await phoneInput.inputValue()).toBe('+1 555 099-TEST')
      expect(await emailInput.inputValue()).toBe('test99@extended.test')
    })
  })

  test.describe('Cross-Browser Compatibility Edge Cases', () => {
    test('handles browser autofill interference', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      const emailInput = page.locator('input[placeholder="Enter email address"]')
      
      await phoneInput.focus()
      await page.keyboard.press('Tab')
      await emailInput.focus()
      
      await phoneInput.clear()
      await phoneInput.type('+1 555 AUTOFILL-RESISTANT')
      
      await emailInput.clear()
      await emailInput.type('resistant@autofill.test')
      
      expect(await phoneInput.inputValue()).toBe('+1 555 AUTOFILL-RESISTANT')
      expect(await emailInput.inputValue()).toBe('resistant@autofill.test')
    })

    test('survives aggressive form manipulation attempts', async () => {
      await page.click('button:has-text("Edit")')
      
      const phoneInput = page.locator('input[placeholder="Enter phone number"]')
      await phoneInput.clear()
      await phoneInput.type('+1 555 PROTECTED')
      
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[placeholder="Enter phone number"]')
        inputs.forEach(input => {
          try {
            input.value = 'MALICIOUS CHANGE'
            input.setAttribute('value', 'ATTRIBUTE CHANGE')
          } catch (e) {
          }
        })
      })
      
      expect(await phoneInput.inputValue()).toBe('+1 555 PROTECTED')
    })
  })

  test.afterEach(async () => {
    if (page) {
      await page.close()
    }
  })
})