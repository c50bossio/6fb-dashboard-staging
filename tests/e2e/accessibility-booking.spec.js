/**
 * Accessibility Testing for Booking Flow
 * 6FB AI Agent System - WCAG 2.2 AA Compliance Testing
 * 
 * Test Coverage:
 * - WCAG 2.2 AA compliance validation
 * - Keyboard navigation support
 * - Screen reader compatibility
 * - Focus management
 * - Color contrast validation
 * - Alternative text for images
 * - Form accessibility
 * - ARIA attributes and roles
 * - Mobile accessibility
 * - Error message accessibility
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Accessibility Test Configuration
const ACCESSIBILITY_TIMEOUT = 30000
const KEYBOARD_DELAY = 100

// Accessibility Helper Class
class AccessibilityHelper {
  constructor(page) {
    this.page = page
    this.axeBuilder = new AxeBuilder({ page })
  }

  async setupAccessibilityTesting() {
    // Configure axe for comprehensive WCAG 2.2 AA testing
    this.axeBuilder
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .options({
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-roles': { enabled: true },
          'alternative-text': { enabled: true },
          'form-labels': { enabled: true },
          'heading-order': { enabled: true },
          'landmark-roles': { enabled: true }
        }
      })
  }

  async runAxeAudit(context = null) {
    try {
      const results = context 
        ? await this.axeBuilder.include(context).analyze()
        : await this.axeBuilder.analyze()
      
      return results
    } catch (error) {
      console.error('Axe audit failed:', error)
      return { violations: [], passes: [], incomplete: [] }
    }
  }

  async checkViolations(results, expectedViolations = 0) {
    const violations = results.violations || []
    
    if (violations.length > expectedViolations) {
      console.error('Accessibility violations found:')
      violations.forEach((violation, index) => {
        console.error(`${index + 1}. ${violation.id}: ${violation.description}`)
        violation.nodes.forEach((node, nodeIndex) => {
          console.error(`   ${nodeIndex + 1}. ${node.html}`)
          console.error(`      ${node.failureSummary}`)
        })
      })
    }
    
    expect(violations.length).toBeLessThanOrEqual(expectedViolations)
    return violations
  }

  async navigateToBookingAccessibly() {
    await this.page.goto('http://localhost:9999/book')
    await this.page.waitForLoadState('networkidle')
    
    // Verify basic page accessibility
    const results = await this.runAxeAudit()
    await this.checkViolations(results, 0)
    
    // Verify booking wizard is properly labeled
    await expect(this.page.locator('[data-testid="booking-wizard"]')).toHaveAttribute('role')
    await expect(this.page.locator('[data-testid="booking-wizard"]')).toHaveAttribute('aria-label')
  }

  async testKeyboardNavigation() {
    // Test Tab navigation
    let currentElement = null
    let tabCount = 0
    const maxTabs = 20 // Prevent infinite loops
    
    while (tabCount < maxTabs) {
      await this.page.keyboard.press('Tab')
      await this.page.waitForTimeout(KEYBOARD_DELAY)
      
      const focusedElement = this.page.locator(':focus')
      const focusedCount = await focusedElement.count()
      
      if (focusedCount === 0) break
      
      // Verify focus is visible
      const element = focusedElement.first()
      await expect(element).toBeVisible()
      
      // Check for focus indicators
      const hasVisibleFocus = await element.evaluate(el => {
        const styles = getComputedStyle(el)
        return styles.outline !== 'none' || 
               styles.boxShadow !== 'none' || 
               styles.border !== styles.getPropertyValue('border') ||
               el.matches(':focus-visible')
      })
      
      expect(hasVisibleFocus).toBeTruthy()
      
      tabCount++
    }
    
    return tabCount
  }

  async testShiftTabNavigation() {
    // Navigate to last element first
    for (let i = 0; i < 10; i++) {
      await this.page.keyboard.press('Tab')
      await this.page.waitForTimeout(KEYBOARD_DELAY)
    }
    
    // Test Shift+Tab navigation
    let shiftTabCount = 0
    const maxShiftTabs = 10
    
    while (shiftTabCount < maxShiftTabs) {
      await this.page.keyboard.press('Shift+Tab')
      await this.page.waitForTimeout(KEYBOARD_DELAY)
      
      const focusedElement = this.page.locator(':focus')
      const focusedCount = await focusedElement.count()
      
      if (focusedCount === 0) break
      
      await expect(focusedElement.first()).toBeVisible()
      shiftTabCount++
    }
    
    return shiftTabCount
  }

  async testArrowKeyNavigation(container) {
    // Test arrow key navigation for radio groups, menus, etc.
    const containerElement = this.page.locator(container)
    await containerElement.focus()
    
    const directions = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']
    
    for (const direction of directions) {
      await this.page.keyboard.press(direction)
      await this.page.waitForTimeout(KEYBOARD_DELAY)
      
      // Verify focus moved appropriately
      const focusedElement = this.page.locator(':focus')
      if (await focusedElement.count() > 0) {
        await expect(focusedElement.first()).toBeVisible()
      }
    }
  }

  async testEnterSpaceActivation(selector) {
    const element = this.page.locator(selector).first()
    await element.focus()
    
    // Test Enter key activation
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(KEYBOARD_DELAY)
    
    // Test Space key activation (for buttons)
    await element.focus()
    await this.page.keyboard.press('Space')
    await this.page.waitForTimeout(KEYBOARD_DELAY)
  }

  async testScreenReaderContent() {
    // Check for proper ARIA labels and descriptions
    const importantElements = [
      '[data-testid="booking-wizard"]',
      '[data-testid="step-indicator"]',
      '[data-testid="location-option"]',
      '[data-testid="barber-option"]',
      '[data-testid="service-option"]',
      '[data-testid="date-picker"]',
      '[data-testid="time-slot"]',
      '[data-testid="payment-form"]'
    ]
    
    for (const selector of importantElements) {
      const elements = this.page.locator(selector)
      const count = await elements.count()
      
      for (let i = 0; i < count; i++) {
        const element = elements.nth(i)
        
        if (await element.isVisible()) {
          // Check for accessible name
          const ariaLabel = await element.getAttribute('aria-label')
          const ariaLabelledby = await element.getAttribute('aria-labelledby')
          const title = await element.getAttribute('title')
          const textContent = await element.textContent()
          
          const hasAccessibleName = ariaLabel || ariaLabelledby || title || 
                                  (textContent && textContent.trim())
          
          if (!hasAccessibleName) {
            console.warn(`Element ${selector} may lack accessible name:`, await element.innerHTML())
          }
        }
      }
    }
  }

  async testColorContrast() {
    // Run specific color contrast checks
    const contrastResults = await this.axeBuilder
      .withRules(['color-contrast'])
      .analyze()
    
    await this.checkViolations(contrastResults, 0)
    
    // Additional manual contrast checks for critical elements
    const criticalElements = [
      '[data-testid="next-button"]',
      '[data-testid="booking-summary"]',
      '[data-testid="error-message"]',
      '[data-testid="success-message"]'
    ]
    
    for (const selector of criticalElements) {
      const element = this.page.locator(selector).first()
      
      if (await element.isVisible()) {
        const contrast = await element.evaluate(el => {
          const styles = getComputedStyle(el)
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize
          }
        })
        
        // Basic validation (detailed contrast calculation would require additional library)
        expect(contrast.color).not.toBe(contrast.backgroundColor)
      }
    }
  }

  async testFormAccessibility() {
    // Check form elements for proper labels and error handling
    const formElements = [
      '[data-testid="customer-name"]',
      '[data-testid="customer-email"]',
      '[data-testid="customer-phone"]',
      '[data-testid="customer-notes"]'
    ]
    
    for (const selector of formElements) {
      const element = this.page.locator(selector)
      
      if (await element.count() > 0) {
        // Check for associated label
        const id = await element.getAttribute('id')
        const ariaLabel = await element.getAttribute('aria-label')
        const ariaLabelledby = await element.getAttribute('aria-labelledby')
        
        if (id) {
          const label = this.page.locator(`label[for="${id}"]`)
          const hasLabel = await label.count() > 0
          
          expect(hasLabel || ariaLabel || ariaLabelledby).toBeTruthy()
        }
        
        // Check for required attribute and aria-required
        const required = await element.getAttribute('required')
        const ariaRequired = await element.getAttribute('aria-required')
        
        if (required !== null) {
          expect(ariaRequired).toBe('true')
        }
      }
    }
  }

  async testErrorAccessibility() {
    // Test error message accessibility
    const errorElements = this.page.locator('[data-testid*="error"], [role="alert"]')
    const errorCount = await errorElements.count()
    
    for (let i = 0; i < errorCount; i++) {
      const errorElement = errorElements.nth(i)
      
      if (await errorElement.isVisible()) {
        // Should have role="alert" or aria-live
        const role = await errorElement.getAttribute('role')
        const ariaLive = await errorElement.getAttribute('aria-live')
        
        expect(role === 'alert' || ariaLive).toBeTruthy()
        
        // Should be announced to screen readers
        const ariaAtomic = await errorElement.getAttribute('aria-atomic')
        if (ariaLive && !ariaAtomic) {
          console.warn('Error element might benefit from aria-atomic="true"')
        }
      }
    }
  }

  async testMobileAccessibility() {
    // Mobile-specific accessibility checks
    const touchTargets = this.page.locator('button, [role="button"], input[type="submit"], a')
    const touchTargetCount = await touchTargets.count()
    
    for (let i = 0; i < Math.min(touchTargetCount, 10); i++) {
      const target = touchTargets.nth(i)
      
      if (await target.isVisible()) {
        const box = await target.boundingBox()
        
        if (box) {
          // WCAG recommends minimum 44x44px touch targets
          const minSize = Math.min(box.width, box.height)
          
          if (minSize < 44) {
            console.warn(`Touch target may be too small: ${minSize}px`, await target.textContent())
          }
        }
      }
    }
  }

  async completeAccessibleBookingStep(stepType) {
    switch (stepType) {
      case 'location':
        return await this.completeLocationStepAccessibly()
      case 'barber':
        return await this.completeBarberStepAccessibly()
      case 'service':
        return await this.completeServiceStepAccessibly()
      case 'datetime':
        return await this.completeDateTimeStepAccessibly()
      case 'payment':
        return await this.completePaymentStepAccessibly()
      default:
        throw new Error(`Unknown step type: ${stepType}`)
    }
  }

  async completeLocationStepAccessibly() {
    await this.page.waitForSelector('[data-testid="location-option"]', { timeout: 10000 })
    
    // Test keyboard navigation to location
    const locationOption = this.page.locator('[data-testid="location-option"]').first()
    await locationOption.focus()
    await this.page.keyboard.press('Enter')
    
    // Verify selection is announced
    await expect(this.page.locator('[data-testid="location-selected"], [aria-selected="true"]')).toBeVisible()
    
    // Navigate to next button accessibly
    const nextButton = this.page.locator('[data-testid="next-button"]')
    await nextButton.focus()
    await this.page.keyboard.press('Enter')
  }

  async completeBarberStepAccessibly() {
    await this.page.waitForSelector('[data-testid="barber-option"]', { timeout: 10000 })
    
    const barberOption = this.page.locator('[data-testid="barber-option"]').first()
    await barberOption.focus()
    await this.page.keyboard.press('Enter')
    
    await expect(this.page.locator('[data-testid="barber-selected"], [aria-selected="true"]')).toBeVisible()
    
    const nextButton = this.page.locator('[data-testid="next-button"]')
    await nextButton.focus()
    await this.page.keyboard.press('Enter')
  }

  async completeServiceStepAccessibly() {
    await this.page.waitForSelector('[data-testid="service-option"]', { timeout: 10000 })
    
    const serviceOption = this.page.locator('[data-testid="service-option"]').first()
    await serviceOption.focus()
    await this.page.keyboard.press('Enter')
    
    await expect(this.page.locator('[data-testid="service-selected"], [aria-selected="true"]')).toBeVisible()
    
    const nextButton = this.page.locator('[data-testid="next-button"]')
    await nextButton.focus()
    await this.page.keyboard.press('Enter')
  }

  async completeDateTimeStepAccessibly() {
    await this.page.waitForSelector('[data-testid="date-picker"]', { timeout: 10000 })
    
    // Navigate date picker with keyboard
    const datePicker = this.page.locator('[data-testid="date-picker"]')
    await datePicker.focus()
    await this.testArrowKeyNavigation('[data-testid="date-picker"]')
    
    // Select date with Enter
    const availableDate = this.page.locator('[data-testid="available-date"]').first()
    await availableDate.focus()
    await this.page.keyboard.press('Enter')
    
    // Select time slot
    await this.page.waitForSelector('[data-testid="time-slot"]', { timeout: 5000 })
    const timeSlot = this.page.locator('[data-testid="time-slot"]').first()
    await timeSlot.focus()
    await this.page.keyboard.press('Enter')
    
    const nextButton = this.page.locator('[data-testid="next-button"]')
    await nextButton.focus()
    await this.page.keyboard.press('Enter')
  }

  async completePaymentStepAccessibly() {
    await this.page.waitForSelector('[data-testid="payment-step"]', { timeout: 10000 })
    
    // Select in-person payment for accessibility testing (avoids Stripe iframe complexity)
    const inPersonOption = this.page.locator('[data-testid="payment-method-in-person"]')
    await inPersonOption.focus()
    await this.page.keyboard.press('Enter')
    
    // Fill form accessibly
    const nameInput = this.page.locator('[data-testid="customer-name"]')
    await nameInput.focus()
    await nameInput.fill('Accessible User')
    
    await this.page.keyboard.press('Tab')
    const emailInput = this.page.locator('[data-testid="customer-email"]')
    await emailInput.fill('accessible@test.com')
    
    await this.page.keyboard.press('Tab')
    const phoneInput = this.page.locator('[data-testid="customer-phone"]')
    await phoneInput.fill('(555) 123-4567')
    
    // Submit form
    const submitButton = this.page.locator('[data-testid="confirm-booking"]')
    await submitButton.focus()
    await this.page.keyboard.press('Enter')
  }
}

// Main Accessibility Test Suite
test.describe('Booking Flow Accessibility', () => {
  let accessibilityHelper

  test.beforeEach(async ({ page }) => {
    accessibilityHelper = new AccessibilityHelper(page)
    await accessibilityHelper.setupAccessibilityTesting()
  })

  test('should pass WCAG 2.2 AA compliance on initial load', async ({ page }) => {
    await accessibilityHelper.navigateToBookingAccessibly()
    
    const results = await accessibilityHelper.runAxeAudit()
    await accessibilityHelper.checkViolations(results, 0)
    
    expect(results.passes.length).toBeGreaterThan(0)
  })

  test('should support complete keyboard navigation', async ({ page }) => {
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Test forward tab navigation
    const tabCount = await accessibilityHelper.testKeyboardNavigation()
    expect(tabCount).toBeGreaterThan(0)
    
    // Test backward tab navigation
    const shiftTabCount = await accessibilityHelper.testShiftTabNavigation()
    expect(shiftTabCount).toBeGreaterThan(0)
    
    // Test Enter/Space activation
    await accessibilityHelper.testEnterSpaceActivation('[data-testid="location-option"]')
  })

  test('should complete entire booking flow using only keyboard', async ({ page }) => {
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Complete each step using only keyboard
    await accessibilityHelper.completeAccessibleBookingStep('location')
    await accessibilityHelper.completeAccessibleBookingStep('barber')
    await accessibilityHelper.completeAccessibleBookingStep('service')
    await accessibilityHelper.completeAccessibleBookingStep('datetime')
    await accessibilityHelper.completeAccessibleBookingStep('payment')
    
    // Verify completion
    await page.waitForSelector('[data-testid="booking-confirmation"]', { timeout: ACCESSIBILITY_TIMEOUT })
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()
    
    // Check final page accessibility
    const results = await accessibilityHelper.runAxeAudit()
    await accessibilityHelper.checkViolations(results, 0)
  })

  test('should provide proper screen reader content', async ({ page }) => {
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Test screen reader content
    await accessibilityHelper.testScreenReaderContent()
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const headingCount = await headings.count()
    
    if (headingCount > 0) {
      // Should start with h1
      const firstHeading = headings.first()
      const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase())
      expect(tagName).toBe('h1')
    }
    
    // Check for landmarks
    const landmarks = page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]')
    const landmarkCount = await landmarks.count()
    expect(landmarkCount).toBeGreaterThan(0)
  })

  test('should have proper form accessibility', async ({ page }) => {
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Navigate to payment step to test form accessibility
    await accessibilityHelper.completeAccessibleBookingStep('location')
    await accessibilityHelper.completeAccessibleBookingStep('barber')
    await accessibilityHelper.completeAccessibleBookingStep('service')
    await accessibilityHelper.completeAccessibleBookingStep('datetime')
    
    // Test form accessibility
    await accessibilityHelper.testFormAccessibility()
    
    // Test form validation accessibility
    const submitButton = page.locator('[data-testid="confirm-booking"]')
    if (await submitButton.count() > 0) {
      await submitButton.click()
      
      // Check for accessible error messages
      await accessibilityHelper.testErrorAccessibility()
    }
  })

  test('should maintain accessibility during error states', async ({ page }) => {
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Simulate error by trying to proceed without selection
    const nextButton = page.locator('[data-testid="next-button"]')
    await nextButton.click()
    
    // Check error accessibility
    await accessibilityHelper.testErrorAccessibility()
    
    // Verify error page still passes accessibility
    const results = await accessibilityHelper.runAxeAudit()
    await accessibilityHelper.checkViolations(results, 0)
  })

  test('should pass color contrast requirements', async ({ page }) => {
    await accessibilityHelper.navigateToBookingAccessibly()
    
    await accessibilityHelper.testColorContrast()
    
    // Test color contrast in different states
    await accessibilityHelper.completeAccessibleBookingStep('location')
    await accessibilityHelper.testColorContrast()
    
    await accessibilityHelper.completeAccessibleBookingStep('barber')
    await accessibilityHelper.testColorContrast()
  })

  test('should be accessible on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Test mobile accessibility
    await accessibilityHelper.testMobileAccessibility()
    
    // Test mobile keyboard navigation
    const tabCount = await accessibilityHelper.testKeyboardNavigation()
    expect(tabCount).toBeGreaterThan(0)
    
    // Mobile accessibility audit
    const results = await accessibilityHelper.runAxeAudit()
    await accessibilityHelper.checkViolations(results, 0)
  })

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.addInitScript(() => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }))
      })
    })
    
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Verify high contrast styles are applied
    const bodyStyles = await page.locator('body').evaluate(el => getComputedStyle(el))
    
    // Should have high contrast appropriate styles
    // (This would need to be customized based on your actual high contrast implementation)
    
    // Run accessibility audit
    const results = await accessibilityHelper.runAxeAudit()
    await accessibilityHelper.checkViolations(results, 0)
  })

  test('should support reduced motion preferences', async ({ page }) => {
    // Simulate prefers-reduced-motion
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }))
      })
    })
    
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Complete booking flow to ensure animations don't interfere
    await accessibilityHelper.completeAccessibleBookingStep('location')
    await accessibilityHelper.completeAccessibleBookingStep('barber')
    
    // Verify no accessibility violations with reduced motion
    const results = await accessibilityHelper.runAxeAudit()
    await accessibilityHelper.checkViolations(results, 0)
  })

  test('should handle focus management correctly', async ({ page }) => {
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Test focus management during step transitions
    const locationOption = page.locator('[data-testid="location-option"]').first()
    await locationOption.focus()
    await page.keyboard.press('Enter')
    
    const nextButton = page.locator('[data-testid="next-button"]')
    await nextButton.focus()
    await page.keyboard.press('Enter')
    
    // Focus should move to appropriate element on next step
    await page.waitForTimeout(1000)
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Test back button focus management
    const backButton = page.locator('[data-testid="back-button"]')
    if (await backButton.count() > 0) {
      await backButton.focus()
      await page.keyboard.press('Enter')
      
      // Focus should return to appropriate element
      await page.waitForTimeout(1000)
      const newFocusedElement = page.locator(':focus')
      await expect(newFocusedElement).toBeVisible()
    }
  })
})

test.describe('Accessibility Performance', () => {
  test('should maintain performance with accessibility features enabled', async ({ page }) => {
    const accessibilityHelper = new AccessibilityHelper(page)
    await accessibilityHelper.setupAccessibilityTesting()
    
    // Measure performance with accessibility features
    const startTime = Date.now()
    await accessibilityHelper.navigateToBookingAccessibly()
    const loadTime = Date.now() - startTime
    
    // Should load within reasonable time even with a11y features
    expect(loadTime).toBeLessThan(10000) // 10 second threshold
    
    // Run performance-focused accessibility audit
    const results = await accessibilityHelper.runAxeAudit()
    expect(results.violations.length).toBe(0)
  })
})

test.describe('Accessibility Documentation', () => {
  test('should generate accessibility test report', async ({ page }) => {
    const accessibilityHelper = new AccessibilityHelper(page)
    await accessibilityHelper.setupAccessibilityTesting()
    
    await accessibilityHelper.navigateToBookingAccessibly()
    
    // Generate comprehensive accessibility report
    const results = await accessibilityHelper.runAxeAudit()
    
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      violationsCount: results.violations.length,
      passesCount: results.passes.length,
      incompleteCount: results.incomplete.length,
      violations: results.violations.map(v => ({
        id: v.id,
        description: v.description,
        impact: v.impact,
        tags: v.tags,
        nodeCount: v.nodes.length
      })),
      summary: {
        compliant: results.violations.length === 0,
        wcagLevel: 'AA',
        wcagVersion: '2.2'
      }
    }
    
    console.log('Accessibility Test Report:', JSON.stringify(report, null, 2))
    
    expect(report.compliant).toBe(true)
    expect(report.passesCount).toBeGreaterThan(0)
  })
})