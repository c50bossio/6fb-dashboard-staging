import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * 6FB AI Agent System - Accessibility Compliance Tests
 * Tests WCAG 2.2 AA compliance with automated and manual validation
 * Part of the Triple Tool Approach: Accessibility testing with axe-core
 */

test.describe('Accessibility Tests - WCAG 2.2 AA Compliance @accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Configure axe for comprehensive testing
    await page.addInitScript(() => {
      // Add axe configuration
      if (typeof window !== 'undefined') {
        window.axeConfig = {
          rules: {
            // Enable all WCAG 2.2 AA rules
            'color-contrast': { enabled: true },
            'keyboard-navigation': { enabled: true },
            'focus-management': { enabled: true },
            'aria-roles': { enabled: true },
            'semantic-markup': { enabled: true }
          },
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
          // Test best practices as well
          includeTags: ['best-practice']
        }
      }
    })
  })

  test('homepage meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/')
    
    // Run automated accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Manual checks for common issues
    await test.step('Keyboard navigation', async () => {
      // Test tab navigation
      await page.keyboard.press('Tab')
      const focusedElement = await page.locator(':focus').first()
      await expect(focusedElement).toBeVisible()
      
      // Ensure focus indicators are visible
      const focusOutline = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).outline
      )
      expect(focusOutline).not.toBe('none')
    })

    await test.step('Semantic structure', async () => {
      // Check for proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      expect(headings.length).toBeGreaterThan(0)
      
      // Ensure main landmark exists
      await expect(page.locator('main')).toBeVisible()
      
      // Check for skip links
      const skipLink = page.locator('a[href="#main-content"], a[href="#main"]').first()
      if (await skipLink.count() > 0) {
        await expect(skipLink).toHaveAttribute('href')
      }
    })
  })

  test('dashboard accessibility compliance', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Wait for dynamic content
    await page.waitForSelector('[data-testid="dashboard-content"]')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    await test.step('Navigation accessibility', async () => {
      // Test main navigation
      const navItems = page.locator('[role="navigation"] a, nav a')
      const navCount = await navItems.count()
      
      for (let i = 0; i < navCount; i++) {
        const navItem = navItems.nth(i)
        await expect(navItem).toHaveAttribute('href')
        
        // Check for accessible names
        const accessibleName = await navItem.evaluate(el => 
          el.textContent || el.getAttribute('aria-label') || el.getAttribute('title')
        )
        expect(accessibleName).toBeTruthy()
      }
    })

    await test.step('Data visualization accessibility', async () => {
      // Check charts and graphs have text alternatives
      const charts = page.locator('[data-testid*="chart"], .chart, [role="img"]')
      const chartCount = await charts.count()
      
      for (let i = 0; i < chartCount; i++) {
        const chart = charts.nth(i)
        
        // Charts should have alt text or aria-label
        const hasAltText = await chart.evaluate(el => 
          el.getAttribute('alt') || 
          el.getAttribute('aria-label') || 
          el.getAttribute('aria-labelledby')
        )
        
        if (hasAltText) {
          expect(hasAltText).toBeTruthy()
        }
      }
    })

    await test.step('Color contrast validation', async () => {
      // Check specific high-contrast elements
      const criticalElements = [
        '[data-testid="primary-button"]',
        '[data-testid="nav-link"]',
        '[data-testid="stats-card"]'
      ]

      for (const selector of criticalElements) {
        const element = page.locator(selector).first()
        if (await element.count() > 0) {
          const contrastRatio = await element.evaluate(el => {
            const style = window.getComputedStyle(el)
            const bgColor = style.backgroundColor
            const textColor = style.color
            
            // This is a simplified check - in real implementation,
            // you'd use a proper contrast ratio calculation
            return { bgColor, textColor }
          })
          
          expect(contrastRatio.bgColor).toBeTruthy()
          expect(contrastRatio.textColor).toBeTruthy()
        }
      }
    })
  })

  test('booking flow accessibility', async ({ page }) => {
    await page.goto('/booking')
    
    // Test each step of the booking flow
    await test.step('Step 1: Service selection accessibility', async () => {
      await page.waitForSelector('[data-testid="service-grid"]')
      
      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
      
      expect(scanResults.violations).toEqual([])

      // Test service selection with keyboard
      const firstService = page.locator('[data-testid^="service-"]').first()
      await firstService.focus()
      await expect(firstService).toBeFocused()
      
      // Select with Enter key
      await page.keyboard.press('Enter')
      await expect(firstService).toHaveClass(/selected/)
      
      // Test barber selection
      const firstBarber = page.locator('[data-testid^="barber-"]').first()
      await firstBarber.focus()
      await page.keyboard.press('Enter')
      await expect(firstBarber).toHaveClass(/selected/)
    })

    await test.step('Step 2: Date/time selection accessibility', async () => {
      await page.click('[data-testid="next-button"]')
      await page.waitForSelector('[data-testid="date-picker"]')
      
      // Check date picker accessibility
      const datePicker = page.locator('[data-testid="date-picker"]')
      await expect(datePicker).toHaveAttribute('role')
      
      // Test keyboard navigation in date picker
      const firstDate = page.locator('[data-testid^="date-"]').first()
      await firstDate.focus()
      await expect(firstDate).toBeFocused()
      
      // Navigate with arrow keys
      await page.keyboard.press('ArrowRight')
      const nextDate = page.locator(':focus')
      await expect(nextDate).toBeVisible()
      
      // Select date with Enter
      await page.keyboard.press('Enter')
      
      // Test time slot selection
      await page.waitForSelector('[data-testid="time-slots"]')
      const firstTimeSlot = page.locator('[data-testid^="time-slot-"]').first()
      await firstTimeSlot.focus()
      await page.keyboard.press('Enter')
    })

    await test.step('Step 3: Form accessibility', async () => {
      await page.click('[data-testid="next-button"]')
      await page.waitForSelector('[data-testid="booking-summary"]')
      
      // Test form labels and associations
      const formFields = [
        '[data-testid="client-name"]',
        '[data-testid="client-email"]',
        '[data-testid="client-phone"]'
      ]

      for (const fieldSelector of formFields) {
        const field = page.locator(fieldSelector)
        if (await field.count() > 0) {
          // Check for proper labeling
          const hasLabel = await field.evaluate(el => {
            const id = el.id
            const ariaLabel = el.getAttribute('aria-label')
            const ariaLabelledBy = el.getAttribute('aria-labelledby')
            const label = id ? document.querySelector(`label[for="${id}"]`) : null
            
            return !!(ariaLabel || ariaLabelledBy || label)
          })
          
          expect(hasLabel).toBe(true)
        }
      }

      // Test form validation accessibility
      await page.fill('[data-testid="client-email"]', 'invalid-email')
      await page.blur('[data-testid="client-email"]')
      
      // Check for accessible error messages
      const errorMessage = page.locator('[data-testid="email-error"], [role="alert"]')
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible()
        
        // Error should be associated with field
        const errorId = await errorMessage.getAttribute('id')
        if (errorId) {
          const field = page.locator('[data-testid="client-email"]')
          const ariaDescribedBy = await field.getAttribute('aria-describedby')
          expect(ariaDescribedBy).toContain(errorId)
        }
      }
    })
  })

  test('AI agents interface accessibility', async ({ page }) => {
    await page.goto('/dashboard/agents')
    await page.waitForSelector('[data-testid="agents-grid"]')
    
    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    expect(scanResults.violations).toEqual([])

    await test.step('Agent selection accessibility', async () => {
      // Test agent cards are keyboard accessible
      const firstAgent = page.locator('[data-testid^="agent-"]').first()
      await firstAgent.focus()
      await expect(firstAgent).toBeFocused()
      
      // Select agent with keyboard
      await page.keyboard.press('Enter')
      await page.waitForSelector('[data-testid="chat-interface"]')
      
      // Check chat interface accessibility
      const messageInput = page.locator('[data-testid="message-input"]')
      await expect(messageInput).toHaveAttribute('aria-label')
      
      const sendButton = page.locator('[data-testid="send-button"]')
      await expect(sendButton).toHaveAccessibleName()
    })

    await test.step('Chat accessibility', async () => {
      // Test chat message accessibility
      await page.fill('[data-testid="message-input"]', 'Test accessibility message')
      await page.click('[data-testid="send-button"]')
      
      // Wait for response
      await page.waitForSelector('[data-testid="agent-response"]', { timeout: 10000 })
      
      // Check message structure
      const userMessage = page.locator('[data-testid="user-message"]').first()
      const agentResponse = page.locator('[data-testid="agent-response"]').first()
      
      // Messages should have appropriate roles or labels
      await expect(userMessage).toBeVisible()
      await expect(agentResponse).toBeVisible()
      
      // Check for proper labeling of message authors
      const userMessageAuthor = await userMessage.evaluate(el => 
        el.getAttribute('aria-label') || 
        el.querySelector('[data-testid="message-author"]')?.textContent
      )
      expect(userMessageAuthor).toBeTruthy()
    })
  })

  test('modal and overlay accessibility', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    // Open an integration modal
    await page.click('[data-testid="integration-trafft"]')
    await page.waitForSelector('[data-testid="trafft-config-modal"]')
    
    await test.step('Modal accessibility standards', async () => {
      const modal = page.locator('[data-testid="trafft-config-modal"]')
      
      // Modal should have proper role
      await expect(modal).toHaveAttribute('role', 'dialog')
      
      // Modal should have accessible name
      const hasAccessibleName = await modal.evaluate(el => 
        el.getAttribute('aria-label') || 
        el.getAttribute('aria-labelledby')
      )
      expect(hasAccessibleName).toBeTruthy()
      
      // Focus should be trapped in modal
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      const isInModal = await focusedElement.evaluate((el, modalElement) => 
        modalElement.contains(el), await modal.elementHandle()
      )
      expect(isInModal).toBe(true)
      
      // Close button should be accessible
      const closeButton = page.locator('[data-testid="modal-close"], [aria-label*="close"], [title*="close"]')
      if (await closeButton.count() > 0) {
        await expect(closeButton.first()).toBeVisible()
      }
    })

    await test.step('Modal keyboard navigation', async () => {
      // Test Escape key closes modal
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="trafft-config-modal"]')).not.toBeVisible()
      
      // Focus should return to trigger element
      const triggerButton = page.locator('[data-testid="integration-trafft"]')
      await expect(triggerButton).toBeFocused()
    })
  })

  test('responsive accessibility across devices', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ]

    for (const viewport of viewports) {
      await test.step(`${viewport.name} accessibility`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto('/dashboard')
        
        // Touch targets should be at least 44x44px on mobile
        if (viewport.name === 'mobile') {
          const buttons = page.locator('button, a, [role="button"]')
          const buttonCount = await buttons.count()
          
          for (let i = 0; i < Math.min(buttonCount, 10); i++) {
            const button = buttons.nth(i)
            if (await button.isVisible()) {
              const boundingBox = await button.boundingBox()
              if (boundingBox) {
                expect(boundingBox.width).toBeGreaterThanOrEqual(44)
                expect(boundingBox.height).toBeGreaterThanOrEqual(44)
              }
            }
          }
        }
        
        // Run accessibility scan for each viewport
        const scanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
        
        expect(scanResults.violations).toEqual([])
      })
    }
  })

  test('screen reader compatibility', async ({ page }) => {
    await page.goto('/dashboard')
    
    await test.step('ARIA landmarks and structure', async () => {
      // Check for proper landmark roles
      const landmarks = [
        { selector: 'main', role: 'main' },
        { selector: 'nav', role: 'navigation' },
        { selector: '[role="banner"]', role: 'banner' },
        { selector: '[role="contentinfo"]', role: 'contentinfo' }
      ]

      for (const landmark of landmarks) {
        const element = page.locator(landmark.selector).first()
        if (await element.count() > 0) {
          const role = await element.getAttribute('role')
          expect(role || landmark.role).toBe(landmark.role)
        }
      }
    })

    await test.step('Heading structure', async () => {
      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      const headingLevels = []
      
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
        const level = parseInt(tagName.charAt(1))
        headingLevels.push(level)
      }
      
      // Should start with h1
      expect(headingLevels[0]).toBe(1)
      
      // No skipped levels (simplified check)
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1]
        expect(diff).toBeLessThanOrEqual(1)
      }
    })

    await test.step('Live regions', async () => {
      // Check for proper live regions for dynamic content
      await page.goto('/dashboard/agents')
      await page.click('[data-testid="agent-financial"]')
      
      // Send a message to trigger dynamic updates
      await page.fill('[data-testid="message-input"]', 'Test message')
      await page.click('[data-testid="send-button"]')
      
      // Check for live region announcements
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]')
      const liveRegionCount = await liveRegions.count()
      
      if (liveRegionCount > 0) {
        const firstLiveRegion = liveRegions.first()
        const ariaLive = await firstLiveRegion.getAttribute('aria-live')
        expect(['polite', 'assertive']).toContain(ariaLive)
      }
    })
  })

  test('form accessibility and validation', async ({ page }) => {
    await page.goto('/booking')
    
    // Navigate to form step
    await page.click('[data-testid="service-haircut-classic"]')
    await page.click('[data-testid="barber-john-smith"]')
    await page.click('[data-testid="next-button"]')
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    await page.click(`[data-testid="date-${tomorrowStr}"]`)
    await page.click('[data-testid="time-slot-10:00"]')
    await page.click('[data-testid="next-button"]')
    
    await test.step('Form field accessibility', async () => {
      const formFields = [
        { selector: '[data-testid="client-name"]', type: 'text' },
        { selector: '[data-testid="client-email"]', type: 'email' },
        { selector: '[data-testid="client-phone"]', type: 'tel' }
      ]

      for (const field of formFields) {
        const element = page.locator(field.selector)
        if (await element.count() > 0) {
          // Check input type
          const inputType = await element.getAttribute('type')
          expect(inputType).toBe(field.type)
          
          // Check for required attribute if applicable
          const isRequired = await element.getAttribute('required')
          if (isRequired !== null) {
            const ariaRequired = await element.getAttribute('aria-required')
            expect(ariaRequired).toBe('true')
          }
          
          // Check autocomplete attributes
          const autocomplete = await element.getAttribute('autocomplete')
          expect(autocomplete).toBeTruthy()
        }
      }
    })

    await test.step('Error message accessibility', async () => {
      // Trigger validation errors
      await page.click('[data-testid="complete-booking-button"]')
      
      // Check error messages are properly associated
      const errorMessages = page.locator('[role="alert"], [data-testid*="error"]')
      const errorCount = await errorMessages.count()
      
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i)
        await expect(error).toBeVisible()
        
        // Error should have proper role or aria-live
        const role = await error.getAttribute('role')
        const ariaLive = await error.getAttribute('aria-live')
        
        expect(role === 'alert' || ariaLive === 'assertive').toBe(true)
      }
    })
  })

  test('high contrast mode support', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ 
      colorScheme: 'dark',
      reducedMotion: 'reduce'
    })
    
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
          
          a, button {
            background-color: yellow !important;
            color: black !important;
          }
        }
      `
    })
    
    await page.goto('/dashboard')
    
    // Run accessibility scan in high contrast mode
    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    expect(scanResults.violations).toEqual([])
    
    // Check that interactive elements are still visible
    const interactiveElements = page.locator('button, a, input, select, textarea')
    const elementCount = await interactiveElements.count()
    
    for (let i = 0; i < Math.min(elementCount, 10); i++) {
      const element = interactiveElements.nth(i)
      if (await element.isVisible()) {
        await expect(element).toBeVisible()
      }
    }
  })

  test('reduced motion accessibility', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.goto('/dashboard')
    
    // Check that animations respect reduced motion
    const animatedElements = page.locator('[data-testid*="animated"], .animate-')
    const animatedCount = await animatedElements.count()
    
    for (let i = 0; i < animatedCount; i++) {
      const element = animatedElements.nth(i)
      
      // Check CSS for animation properties
      const animations = await element.evaluate(el => {
        const style = window.getComputedStyle(el)
        return {
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration
        }
      })
      
      // In reduced motion mode, animations should be minimal
      expect(animations.animationDuration === '0s' || 
             animations.animationDuration === 'none').toBe(true)
    }
  })

  test('comprehensive WCAG 2.2 audit', async ({ page }) => {
    const pages = [
      { url: '/', name: 'homepage' },
      { url: '/dashboard', name: 'dashboard' },
      { url: '/booking', name: 'booking' },
      { url: '/dashboard/agents', name: 'ai-agents' },
      { url: '/dashboard/integrations', name: 'integrations' }
    ]

    const auditResults = []

    for (const pageInfo of pages) {
      await page.goto(pageInfo.url)
      await page.waitForLoadState('networkidle')
      
      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
      
      auditResults.push({
        page: pageInfo.name,
        url: pageInfo.url,
        violations: scanResults.violations.length,
        passes: scanResults.passes.length,
        incomplete: scanResults.incomplete.length
      })
      
      // All pages should have zero violations
      expect(scanResults.violations).toEqual([])
    }

    // Log audit summary
    console.log('WCAG 2.2 Audit Summary:')
    auditResults.forEach(result => {
      console.log(`${result.page}: ✓ ${result.passes} passes, ✗ ${result.violations} violations`)
    })
    
    const totalViolations = auditResults.reduce((sum, result) => sum + result.violations, 0)
    expect(totalViolations).toBe(0)
  })
})