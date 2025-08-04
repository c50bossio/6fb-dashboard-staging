/**
 * TEST UTILITIES AND HELPERS FOR NUCLEAR INPUT TESTING
 * 
 * Reusable utilities for testing nuclear input components across different test suites
 * Provides common patterns, mocks, and helper functions
 */

import { act, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Nuclear Input Test Utilities
 */
export class NuclearInputTestUtils {
  
  /**
   * Creates a user event instance with proper setup
   */
  static createUser() {
    return userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    })
  }

  /**
   * Types text character by character with configurable delay
   * @param {HTMLElement} input - The input element
   * @param {string} text - Text to type
   * @param {number} delay - Delay between characters (ms)
   * @param {UserEvent} user - UserEvent instance
   */
  static async typeSlowly(input, text, delay = 100, user = null) {
    if (!user) user = this.createUser()
    
    for (const char of text) {
      await user.type(input, char, { delay })
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  /**
   * Types text rapidly to test for corruption
   * @param {HTMLElement} input - The input element
   * @param {string} text - Text to type
   * @param {UserEvent} user - UserEvent instance
   */
  static async typeRapidly(input, text, user = null) {
    if (!user) user = this.createUser()
    await user.type(input, text, { delay: 1 })
  }

  /**
   * Simulates paste operation
   * @param {HTMLElement} input - The input element
   * @param {string} text - Text to paste
   */
  static async simulatePaste(input, text) {
    await act(async () => {
      fireEvent.paste(input, {
        clipboardData: {
          getData: () => text
        }
      })
      fireEvent.change(input, { target: { value: text } })
    })
  }

  /**
   * Tests for value corruption during typing
   * @param {HTMLElement} input - The input element
   * @param {string} expectedText - Expected final text
   * @param {UserEvent} user - UserEvent instance
   */
  static async testValueStability(input, expectedText, user = null) {
    if (!user) user = this.createUser()
    
    await this.typeSlowly(input, expectedText, 50, user)
    
    // Verify no corruption occurred
    expect(input.value).toBe(expectedText)
    
    // Test rapid typing
    await user.clear(input)
    await this.typeRapidly(input, expectedText, user)
    expect(input.value).toBe(expectedText)
  }

  /**
   * Tests focus retention during typing
   * @param {HTMLElement} input - The input element
   * @param {string} text - Text to type
   * @param {UserEvent} user - UserEvent instance
   */
  static async testFocusRetention(input, text, user = null) {
    if (!user) user = this.createUser()
    
    input.focus()
    expect(input).toHaveFocus()
    
    await user.type(input, text)
    expect(input).toHaveFocus()
    expect(input.value).toBe(text)
  }

  /**
   * Tests blur event triggering
   * @param {HTMLElement} input - The input element
   * @param {Function} onBlur - Blur handler function
   * @param {UserEvent} user - UserEvent instance
   */
  static async testBlurEvent(input, onBlur, user = null) {
    if (!user) user = this.createUser()
    
    input.focus()
    await user.type(input, 'test value')
    
    expect(onBlur).not.toHaveBeenCalled()
    
    await user.tab() // Trigger blur
    
    expect(onBlur).toHaveBeenCalledTimes(1)
    expect(onBlur).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'test value'
        })
      })
    )
  }

  /**
   * Tests external interference resistance
   * @param {HTMLElement} input - The input element
   * @param {string} userValue - Value typed by user
   * @param {string} interferenceValue - Value attempted by external interference
   */
  static async testInterferenceResistance(input, userValue, interferenceValue) {
    input.focus()
    
    // Simulate user typing
    fireEvent.change(input, { target: { value: userValue } })
    
    // Attempt external interference
    await act(async () => {
      try {
        input.value = interferenceValue
      } catch (e) {
        // Expected to fail due to nuclear protection
      }
    })
    
    // User value should be preserved
    expect(input.value).toBe(userValue)
  }

  /**
   * Creates mock console for testing protection logging
   */
  static createMockConsole() {
    return {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
  }

  /**
   * Verifies protection logging
   * @param {Object} mockConsole - Mock console object
   * @param {string} expectedLogType - Expected log type ('log', 'warn', 'error')
   * @param {string} expectedMessage - Expected message pattern
   */
  static verifyProtectionLogging(mockConsole, expectedLogType, expectedMessage) {
    expect(mockConsole[expectedLogType]).toHaveBeenCalledWith(
      expect.stringContaining(expectedMessage),
      expect.any(Object)
    )
  }
}

/**
 * Test Data Generators
 */
export class TestDataGenerator {
  
  /**
   * Generates test phone numbers
   */
  static getTestPhoneNumbers() {
    return [
      '+1 (555) 123-4567',
      '+1-555-123-4567',
      '555.123.4567',
      '(555) 123-4567 ext 123',
      '+44 20 1234 5678',
      '+33 1 42 86 83 26',
      '+81 3-1234-5678',
      '+49 30 12345678'
    ]
  }

  /**
   * Generates test email addresses
   */
  static getTestEmails() {
    return [
      'test@example.com',
      'user.name@domain.co.uk',
      'test+tag@example.org',
      'user123@test-domain.com',
      'complex.email_with-symbols@subdomain.example.net',
      'numeric123@test123.com',
      'special.chars+filter@domain-with-hyphens.org'
    ]
  }

  /**
   * Generates invalid email formats for validation testing
   */
  static getInvalidEmails() {
    return [
      'invalid-email',
      '@domain.com',
      'user@',
      'user..double.dot@domain.com',
      'user@domain',
      'user name@domain.com', // space
      'user@domain@domain.com', // double @
    ]
  }

  /**
   * Generates special character test strings
   */
  static getSpecialCharacterStrings() {
    return [
      'café naïve résumé',
      'ñoño español',
      '中文测试',
      'Русский текст',
      'עברית',
      '🚀 emoji test 💯',
      'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?',
      'Mixed: café 123 🎉 test@domain.com'
    ]
  }

  /**
   * Generates long test strings for performance testing
   */
  static getLongTestStrings() {
    return [
      'A'.repeat(1000),
      'Test string that is very long and contains many words to test performance under heavy load scenarios with extended typing sessions',
      '+1 (555) 123-4567 extension 1234567890 with additional information that makes this phone number very long for testing purposes',
      'very.long.email.address.with.multiple.dots.and.plus.signs+tag+another.tag@very-long-domain-name.subdomain.example.co.uk'
    ]
  }
}

/**
 * Mock API Response Factory
 */
export class MockAPIFactory {
  
  /**
   * Creates mock barbershop settings response
   */
  static createBarbershopResponse(overrides = {}) {
    return {
      ok: true,
      json: async () => ({
        barbershop: {
          name: 'Test Barbershop',
          address: '123 Test Street',
          phone: '+1 (555) 123-4567',
          email: 'test@barbershop.com',
          timezone: 'America/New_York',
          ...overrides.barbershop
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: true,
          campaignAlerts: true,
          bookingAlerts: true,
          systemAlerts: true,
          ...overrides.notifications
        }
      })
    }
  }

  /**
   * Creates mock API error response
   */
  static createErrorResponse(status = 400, message = 'API Error') {
    return {
      ok: false,
      status,
      json: async () => ({
        detail: message
      })
    }
  }

  /**
   * Creates mock successful save response
   */
  static createSaveResponse() {
    return {
      ok: true,
      json: async () => ({ success: true })
    }
  }

  /**
   * Sets up fetch mocks for settings page
   */
  static setupSettingsMocks(mockResponses = {}) {
    const mocks = {
      get: mockResponses.get || this.createBarbershopResponse(),
      put: mockResponses.put || this.createSaveResponse(),
      error: mockResponses.error || null
    }

    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (mocks.error) {
        return Promise.resolve(mocks.error)
      }

      if (options?.method === 'PUT') {
        return Promise.resolve(mocks.put)
      }
      
      return Promise.resolve(mocks.get)
    })

    return global.fetch
  }
}

/**
 * Playwright Helper Functions
 */
export class PlaywrightHelpers {
  
  /**
   * Sets up common API routes for Playwright tests
   */
  static async setupAPIRoutes(page, responses = {}) {
    const defaultResponses = {
      barbershop: {
        name: 'Playwright Test Shop',
        address: '123 Playwright St',
        phone: '+1 (555) 123-4567',
        email: 'playwright@test.com',
        timezone: 'America/New_York'
      }
    }

    await page.route('/api/v1/settings/barbershop', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            barbershop: { ...defaultResponses.barbershop, ...responses.barbershop },
            notifications: responses.notifications || {
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
          status: responses.saveStatus || 200,
          contentType: 'application/json',
          body: JSON.stringify(responses.saveResponse || { success: true })
        })
      }
    })

    await page.route('/api/v1/settings/business-hours', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responses.businessHours || {
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
  }

  /**
   * Waits for settings page to load completely
   */
  static async waitForSettingsLoad(page, shopName = null) {
    if (shopName) {
      await page.waitForSelector(`text=${shopName}`, { timeout: 10000 })
    } else {
      // Wait for any shop name to appear
      await page.waitForSelector('[data-testid="settings-loaded"]', { timeout: 10000 })
        .catch(() => {
          // Fallback: wait for edit button
          return page.waitForSelector('button:has-text("Edit")', { timeout: 10000 })
        })
    }
  }

  /**
   * Enters edit mode and returns input locators
   */
  static async enterEditMode(page) {
    await page.click('button:has-text("Edit")')
    await page.waitForSelector('button:has-text("Save")')
    
    return {
      phoneInput: page.locator('input[placeholder="Enter phone number"]'),
      emailInput: page.locator('input[placeholder="Enter email address"]'),
      saveButton: page.locator('button:has-text("Save")'),
      cancelButton: page.locator('button:has-text("Cancel")')
    }
  }

  /**
   * Types text with device-appropriate method
   */
  static async typeWithDevice(page, locator, text, deviceInfo) {
    const isMobile = deviceInfo.name?.includes('iPhone') || 
                    deviceInfo.name?.includes('Galaxy') ||
                    deviceInfo.viewport?.width < 768

    if (isMobile) {
      await locator.tap()
      await page.keyboard.type(text, { delay: 50 })
    } else {
      await locator.click()
      await locator.type(text, { delay: 30 })
    }
  }

  /**
   * Measures typing performance
   */
  static async measureTypingPerformance(page, locator, text) {
    const startTime = Date.now()
    await locator.type(text, { delay: 20 })
    const endTime = Date.now()
    
    return {
      duration: endTime - startTime,
      charactersPerSecond: text.length / ((endTime - startTime) / 1000),
      isWithinExpectedRange: (endTime - startTime) < 5000
    }
  }
}

/**
 * Assertion Helpers
 */
export class AssertionHelpers {
  
  /**
   * Asserts nuclear input behavior
   */
  static assertNuclearBehavior(input, expectedValue, options = {}) {
    expect(input.value).toBe(expectedValue)
    
    if (options.shouldHaveFocus !== undefined) {
      if (options.shouldHaveFocus) {
        expect(input).toHaveFocus()
      } else {
        expect(input).not.toHaveFocus()
      }
    }

    if (options.shouldHaveAttributes) {
      const expectedAttrs = options.shouldHaveAttributes
      Object.keys(expectedAttrs).forEach(attr => {
        expect(input).toHaveAttribute(attr, expectedAttrs[attr])
      })
    }
  }

  /**
   * Asserts form state
   */
  static assertFormState(screen, expectedState) {
    if (expectedState.isEditing) {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    } else {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    }

    if (expectedState.hasError) {
      expect(screen.getByText(expectedState.errorMessage)).toBeInTheDocument()
    }

    if (expectedState.hasSuccess) {
      expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument()
    }
  }

  /**
   * Asserts API call was made correctly
   */
  static assertAPICall(mockFetch, expectedCall) {
    expect(mockFetch).toHaveBeenCalledWith(
      expectedCall.url,
      expect.objectContaining({
        method: expectedCall.method,
        headers: expect.objectContaining(expectedCall.headers),
        body: expectedCall.body ? JSON.stringify(expectedCall.body) : undefined
      })
    )
  }
}

// Export utility instances for convenience
export const nuclearUtils = NuclearInputTestUtils
export const testData = TestDataGenerator
export const mockAPI = MockAPIFactory
export const playwrightUtils = PlaywrightHelpers
export const assertions = AssertionHelpers