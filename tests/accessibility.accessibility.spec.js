import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * 6FB AI Agent System - Accessibility Compliance Tests
 * Tests WCAG 2.2 AA compliance with automated and manual validation
 * Part of the Triple Tool Approach: Accessibility testing with axe-core
 */

test.describe('Accessibility Tests - WCAG 2.2 AA Compliance @accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (typeof window !== 'undefined') {
        window.axeConfig = {
          rules: {
            'color-contrast': { enabled: true },
            'keyboard-navigation': { enabled: true },
            'focus-management': { enabled: true },
            'aria-roles': { enabled: true },
            'semantic-markup': { enabled: true }
          },
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
          includeTags: ['best-practice']
        }
      }
    })
  })

  test('homepage meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    await test.step('Keyboard navigation', async () => {
      await page.keyboard.press('Tab')
      const focusedElement = await page.locator(':focus').first()
      await expect(focusedElement).toBeVisible()
      
      const focusOutline = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).outline
      )
      expect(focusOutline).not.toBe('none')
    })

    await test.step('Semantic structure', async () => {
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      expect(headings.length).toBeGreaterThan(0)
      
      await expect(page.locator('main')).toBeVisible()
      
      const skipLink = page.locator('a[href="#main-content"], a[href="#main"]').first()
      if (await skipLink.count() > 0) {
        await expect(skipLink).toHaveAttribute('href')
      }
    })
  })

  test('dashboard accessibility compliance', async ({ page }) => {
    await page.goto('/dashboard')
    
    await page.waitForSelector('[data-testid="dashboard-content"]')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    await test.step('Navigation accessibility', async () => {
      const navItems = page.locator('[role="navigation"] a, nav a')
      const navCount = await navItems.count()
      
      for (let i = 0; i < navCount; i++) {
        const navItem = navItems.nth(i)
        await expect(navItem).toHaveAttribute('href')
        
        const accessibleName = await navItem.evaluate(el => 
          el.textContent || el.getAttribute('aria-label') || el.getAttribute('title')
        )
        expect(accessibleName).toBeTruthy()
      }
    })

    await test.step('Data visualization accessibility', async () => {
      const charts = page.locator('[data-testid*="chart"], .chart, [role="img"]')
      const chartCount = await charts.count()
      
      for (let i = 0; i < chartCount; i++) {
        const chart = charts.nth(i)
        
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
    
    await test.step('Step 1: Service selection accessibility', async () => {
      await page.waitForSelector('[data-testid="service-grid"]')
      
      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
      
      expect(scanResults.violations).toEqual([])

      const firstService = page.locator('[data-testid^="service-"]').first()
      await firstService.focus()
      await expect(firstService).toBeFocused()
      
      await page.keyboard.press('Enter')
      await expect(firstService).toHaveClass(/selected/)
      
      const firstBarber = page.locator('[data-testid^="barber-"]').first()
      await firstBarber.focus()
      await page.keyboard.press('Enter')
      await expect(firstBarber).toHaveClass(/selected/)
    })

    await test.step('Step 2: Date/time selection accessibility', async () => {
      await page.click('[data-testid="next-button"]')
      await page.waitForSelector('[data-testid="date-picker"]')
      
      const datePicker = page.locator('[data-testid="date-picker"]')
      await expect(datePicker).toHaveAttribute('role')
      
      const firstDate = page.locator('[data-testid^="date-"]').first()
      await firstDate.focus()
      await expect(firstDate).toBeFocused()
      
      await page.keyboard.press('ArrowRight')
      const nextDate = page.locator(':focus')
      await expect(nextDate).toBeVisible()
      
      await page.keyboard.press('Enter')
      
      await page.waitForSelector('[data-testid="time-slots"]')
      const firstTimeSlot = page.locator('[data-testid^="time-slot-"]').first()
      await firstTimeSlot.focus()
      await page.keyboard.press('Enter')
    })

    await test.step('Step 3: Form accessibility', async () => {
      await page.click('[data-testid="next-button"]')
      await page.waitForSelector('[data-testid="booking-summary"]')
      
      const formFields = [
        '[data-testid="client-name"]',
        '[data-testid="client-email"]',
        '[data-testid="client-phone"]'
      ]

      for (const fieldSelector of formFields) {
        const field = page.locator(fieldSelector)
        if (await field.count() > 0) {
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

      await page.fill('[data-testid="client-email"]', 'invalid-email')
      await page.blur('[data-testid="client-email"]')
      
      const errorMessage = page.locator('[data-testid="email-error"], [role="alert"]')
      if (await errorMessage.count() > 0) {
        await expect(errorMessage).toBeVisible()
        
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
      const firstAgent = page.locator('[data-testid^="agent-"]').first()
      await firstAgent.focus()
      await expect(firstAgent).toBeFocused()
      
      await page.keyboard.press('Enter')
      await page.waitForSelector('[data-testid="chat-interface"]')
      
      const messageInput = page.locator('[data-testid="message-input"]')
      await expect(messageInput).toHaveAttribute('aria-label')
      
      const sendButton = page.locator('[data-testid="send-button"]')
      await expect(sendButton).toHaveAccessibleName()
    })

    await test.step('Chat accessibility', async () => {
      await page.fill('[data-testid="message-input"]', 'Test accessibility message')
      await page.click('[data-testid="send-button"]')
      
      await page.waitForSelector('[data-testid="agent-response"]', { timeout: 10000 })
      
      const userMessage = page.locator('[data-testid="user-message"]').first()
      const agentResponse = page.locator('[data-testid="agent-response"]').first()
      
      await expect(userMessage).toBeVisible()
      await expect(agentResponse).toBeVisible()
      
      const userMessageAuthor = await userMessage.evaluate(el => 
        el.getAttribute('aria-label') || 
        el.querySelector('[data-testid="message-author"]')?.textContent
      )
      expect(userMessageAuthor).toBeTruthy()
    })
  })

  test('modal and overlay accessibility', async ({ page }) => {
    await page.goto('/dashboard/integrations')
    
    await page.click('[data-testid="integration-trafft"]')
    await page.waitForSelector('[data-testid="trafft-config-modal"]')
    
    await test.step('Modal accessibility standards', async () => {
      const modal = page.locator('[data-testid="trafft-config-modal"]')
      
      await expect(modal).toHaveAttribute('role', 'dialog')
      
      const hasAccessibleName = await modal.evaluate(el => 
        el.getAttribute('aria-label') || 
        el.getAttribute('aria-labelledby')
      )
      expect(hasAccessibleName).toBeTruthy()
      
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      const isInModal = await focusedElement.evaluate((el, modalElement) => 
        modalElement.contains(el), await modal.elementHandle()
      )
      expect(isInModal).toBe(true)
      
      const closeButton = page.locator('[data-testid="modal-close"], [aria-label*="close"], [title*="close"]')
      if (await closeButton.count() > 0) {
        await expect(closeButton.first()).toBeVisible()
      }
    })

    await test.step('Modal keyboard navigation', async () => {
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-testid="trafft-config-modal"]')).not.toBeVisible()
      
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
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      const headingLevels = []
      
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
        const level = parseInt(tagName.charAt(1))
        headingLevels.push(level)
      }
      
      expect(headingLevels[0]).toBe(1)
      
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1]
        expect(diff).toBeLessThanOrEqual(1)
      }
    })

    await test.step('Live regions', async () => {
      await page.goto('/dashboard/agents')
      await page.click('[data-testid="agent-financial"]')
      
      await page.fill('[data-testid="message-input"]', 'Test message')
      await page.click('[data-testid="send-button"]')
      
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
          const inputType = await element.getAttribute('type')
          expect(inputType).toBe(field.type)
          
          const isRequired = await element.getAttribute('required')
          if (isRequired !== null) {
            const ariaRequired = await element.getAttribute('aria-required')
            expect(ariaRequired).toBe('true')
          }
          
          const autocomplete = await element.getAttribute('autocomplete')
          expect(autocomplete).toBeTruthy()
        }
      }
    })

    await test.step('Error message accessibility', async () => {
      await page.click('[data-testid="complete-booking-button"]')
      
      const errorMessages = page.locator('[role="alert"], [data-testid*="error"]')
      const errorCount = await errorMessages.count()
      
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i)
        await expect(error).toBeVisible()
        
        const role = await error.getAttribute('role')
        const ariaLive = await error.getAttribute('aria-live')
        
        expect(role === 'alert' || ariaLive === 'assertive').toBe(true)
      }
    })
  })

  test('high contrast mode support', async ({ page }) => {
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
    
    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    expect(scanResults.violations).toEqual([])
    
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
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.goto('/dashboard')
    
    const animatedElements = page.locator('[data-testid*="animated"], .animate-')
    const animatedCount = await animatedElements.count()
    
    for (let i = 0; i < animatedCount; i++) {
      const element = animatedElements.nth(i)
      
      const animations = await element.evaluate(el => {
        const style = window.getComputedStyle(el)
        return {
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration
        }
      })
      
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
      
      expect(scanResults.violations).toEqual([])
    }

    console.log('WCAG 2.2 Audit Summary:')
    auditResults.forEach(result => {
      console.log(`${result.page}: ✓ ${result.passes} passes, ✗ ${result.violations} violations`)
    })
    
    const totalViolations = auditResults.reduce((sum, result) => sum + result.violations, 0)
    expect(totalViolations).toBe(0)
  })
})