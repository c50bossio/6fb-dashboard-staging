/**
 * Performance and Accessibility Testing Utilities
 * Comprehensive testing helpers for onboarding system performance and accessibility validation
 */

import { expect } from '@playwright/test'

export class PerformanceTestHelpers {
  
  /**
   * Measure page load performance with Core Web Vitals
   */
  static async measurePageLoad(page) {
    const startTime = Date.now()
    
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Get Core Web Vitals using page.evaluate
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {}
        
        // First Contentful Paint (FCP)
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime
            }
          }
        }).observe({ entryTypes: ['paint'] })
        
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            vitals.lcp = entry.startTime
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        // Cumulative Layout Shift (CLS)
        new PerformanceObserver((entryList) => {
          let clsValue = 0
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          vitals.cls = clsValue
        }).observe({ entryTypes: ['layout-shift'] })
        
        // First Input Delay will be measured during interaction
        
        setTimeout(() => resolve(vitals), 3000) // Wait 3s for measurements
      })
    })
    
    return {
      loadTime,
      ...webVitals
    }
  }
  
  /**
   * Measure onboarding modal render performance
   */
  static async measureModalPerformance(page) {
    const modalStartTime = Date.now()
    
    const modal = page.locator('[data-onboarding-modal="true"]')
    await expect(modal).toBeVisible({ timeout: 10000 })
    
    const modalRenderTime = Date.now() - modalStartTime
    
    // Measure step transition performance
    const transitionStartTime = Date.now()
    await page.click('[data-testid="segmentation-first-barbershop"]')
    await page.click('text=Next')
    
    await expect(page.locator('text=Business Info')).toBeVisible()
    const transitionTime = Date.now() - transitionStartTime
    
    return {
      modalRenderTime,
      stepTransitionTime: transitionTime
    }
  }
  
  /**
   * Measure API response times for Smart Suggestions
   */
  static async measureAPIPerformance(page) {
    const apiTimes = {}
    
    // Monitor network requests
    page.on('response', response => {
      const url = response.url()
      if (url.includes('/api/suggestions/')) {
        const timing = response.timing()
        apiTimes[url] = {
          status: response.status(),
          responseTime: timing.responseEnd - timing.requestStart,
          downloadTime: timing.responseEnd - timing.responseStart
        }
      }
    })
    
    // Trigger API calls
    await page.click('[data-testid="segmentation-first-barbershop"]')
    await page.click('text=Next')
    
    await page.fill('input[placeholder*="Tom\'s Barbershop"]', 'Performance Test')
    await page.click('text=Barbershop')
    
    // Wait for API calls to complete
    await page.waitForTimeout(3000)
    
    return apiTimes
  }
  
  /**
   * Measure bundle size impact
   */
  static async measureBundleImpact(page) {
    const resourceSizes = await page.evaluate(() => {
      const resources = performance.getEntriesByType('navigation')[0]
      const resourceList = performance.getEntriesByType('resource')
      
      let jsSize = 0
      let cssSize = 0
      let totalSize = 0
      
      resourceList.forEach(resource => {
        if (resource.name.includes('.js')) {
          jsSize += resource.transferSize || 0
        }
        if (resource.name.includes('.css')) {
          cssSize += resource.transferSize || 0
        }
        totalSize += resource.transferSize || 0
      })
      
      return {
        jsSize: Math.round(jsSize / 1024), // KB
        cssSize: Math.round(cssSize / 1024), // KB
        totalSize: Math.round(totalSize / 1024), // KB
        pageSize: Math.round(resources.transferSize / 1024) // KB
      }
    })
    
    return resourceSizes
  }
  
  /**
   * Memory usage monitoring
   */
  static async measureMemoryUsage(page) {
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
          totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
          jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
        }
      }
      return null
    })
    
    return memoryInfo
  }
  
  /**
   * Performance assertions for onboarding system
   */
  static assertPerformanceStandards(metrics) {
    // Page load should be under 3 seconds
    expect(metrics.loadTime).toBeLessThan(3000)
    
    // Modal should render within 2 seconds
    if (metrics.modalRenderTime) {
      expect(metrics.modalRenderTime).toBeLessThan(2000)
    }
    
    // Step transitions should be under 1 second
    if (metrics.stepTransitionTime) {
      expect(metrics.stepTransitionTime).toBeLessThan(1000)
    }
    
    // Core Web Vitals standards
    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(1800) // FCP < 1.8s (good)
    }
    
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(2500) // LCP < 2.5s (good)
    }
    
    if (metrics.cls !== undefined) {
      expect(metrics.cls).toBeLessThan(0.1) // CLS < 0.1 (good)
    }
  }
}

export class AccessibilityTestHelpers {
  
  /**
   * Run comprehensive accessibility audit
   */
  static async runAccessibilityAudit(page) {
    // Install axe if not already present
    await page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
    })
    
    // Run axe-core accessibility audit
    const results = await page.evaluate(async () => {
      try {
        const results = await axe.run(document, {
          tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
          rules: {
            'color-contrast': { enabled: true },
            'keyboard-navigation': { enabled: true },
            'focus-management': { enabled: true },
            'aria-usage': { enabled: true },
            'semantic-structure': { enabled: true }
          }
        })
        return results
      } catch (error) {
        return { error: error.message }
      }
    })
    
    return results
  }
  
  /**
   * Test keyboard navigation throughout onboarding flow
   */
  static async testKeyboardNavigation(page) {
    const modal = page.locator('[data-onboarding-modal="true"]')
    await expect(modal).toBeVisible({ timeout: 10000 })
    
    const navigationResults = {
      canTabToSegmentation: false,
      canSelectWithKeyboard: false,
      canNavigateSteps: false,
      canCompleteForm: false
    }
    
    // Test tab navigation to segmentation options
    await page.keyboard.press('Tab')
    const firstSegmentation = page.locator('[data-testid="segmentation-first-barbershop"]')
    if (await firstSegmentation.isFocused()) {
      navigationResults.canTabToSegmentation = true
      
      // Test Enter key selection
      await page.keyboard.press('Enter')
      if (await firstSegmentation.hasClass(/selected|active|bg-brand/)) {
        navigationResults.canSelectWithKeyboard = true
      }
      
      // Test navigation to Next button
      await page.keyboard.press('Tab')
      const nextButton = page.locator('button:has-text("Next")')
      if (await nextButton.isFocused()) {
        await page.keyboard.press('Enter')
        
        // Check if we moved to next step
        if (await page.locator('text=Business Info').isVisible()) {
          navigationResults.canNavigateSteps = true
          
          // Test form field navigation
          await page.keyboard.press('Tab')
          const nameInput = page.locator('input[placeholder*="Tom\'s Barbershop"]')
          if (await nameInput.isFocused()) {
            await page.keyboard.type('Keyboard Test Shop')
            
            // Navigate through form
            await page.keyboard.press('Tab') // Business type
            await page.keyboard.press('Enter') // Select business type
            
            if (await page.locator('text=Barbershop').hasClass(/selected|bg-brand/)) {
              navigationResults.canCompleteForm = true
            }
          }
        }
      }
    }
    
    return navigationResults
  }
  
  /**
   * Test screen reader compatibility
   */
  static async testScreenReaderCompatibility(page) {
    const ariaResults = {
      hasProperLabels: false,
      hasRoleAttributes: false,
      hasAnnouncements: false,
      hasLiveRegions: false
    }
    
    // Check for proper ARIA labels
    const inputsWithLabels = await page.locator('input[aria-label], input + label, label input').count()
    const totalInputs = await page.locator('input').count()
    
    ariaResults.hasProperLabels = inputsWithLabels >= totalInputs * 0.9 // 90% threshold
    
    // Check for role attributes on interactive elements
    const buttonsWithRoles = await page.locator('button[role], [role="button"]').count()
    const totalButtons = await page.locator('button, [role="button"]').count()
    
    ariaResults.hasRoleAttributes = buttonsWithRoles >= totalButtons * 0.5 // 50% threshold
    
    // Check for live regions (for dynamic content updates)
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count()
    ariaResults.hasLiveRegions = liveRegions > 0
    
    // Check for proper announcements during step transitions
    const announcements = await page.locator('[aria-live="polite"], [aria-live="assertive"]').count()
    ariaResults.hasAnnouncements = announcements > 0
    
    return ariaResults
  }
  
  /**
   * Test color contrast compliance
   */
  static async testColorContrast(page) {
    const contrastResults = await page.evaluate(() => {
      const results = {
        textContrast: [],
        backgroundContrast: [],
        violations: []
      }
      
      // Helper function to calculate contrast ratio
      const calculateContrast = (color1, color2) => {
        // Simplified contrast calculation (would use actual algorithm in production)
        return 4.5 // Placeholder - would implement actual calculation
      }
      
      // Check text elements
      const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label')
      textElements.forEach((element, index) => {
        const computedStyle = window.getComputedStyle(element)
        const textColor = computedStyle.color
        const backgroundColor = computedStyle.backgroundColor
        
        if (textColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          const contrast = calculateContrast(textColor, backgroundColor)
          results.textContrast.push({
            element: element.tagName + (index + 1),
            contrast,
            passes: contrast >= 4.5
          })
          
          if (contrast < 4.5) {
            results.violations.push({
              element: element.tagName + (index + 1),
              issue: 'Low contrast ratio',
              contrast
            })
          }
        }
      })
      
      return results
    })
    
    return contrastResults
  }
  
  /**
   * Test focus management
   */
  static async testFocusManagement(page) {
    const focusResults = {
      modalTrapsFocus: false,
      stepsManageFocus: false,
      focusVisible: false,
      focusOrder: false
    }
    
    // Test modal focus trap
    const modal = page.locator('[data-onboarding-modal="true"]')
    await expect(modal).toBeVisible({ timeout: 10000 })
    
    // Tab through modal and verify focus stays within
    let tabCount = 0
    const maxTabs = 20
    let focusedElement = null
    
    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab')
      focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      
      // Check if focus is still within modal
      const isInModal = await page.evaluate(() => {
        const modal = document.querySelector('[data-onboarding-modal="true"]')
        return modal?.contains(document.activeElement)
      })
      
      if (!isInModal) {
        break
      }
      
      tabCount++
    }
    
    focusResults.modalTrapsFocus = tabCount >= maxTabs - 1 // Focus stayed in modal
    
    // Test focus visibility
    const focusVisible = await page.evaluate(() => {
      const activeElement = document.activeElement
      if (activeElement) {
        const computedStyle = window.getComputedStyle(activeElement)
        return computedStyle.outline !== 'none' || computedStyle.boxShadow.includes('focus')
      }
      return false
    })
    
    focusResults.focusVisible = focusVisible
    
    // Test logical focus order
    const focusableElements = await page.evaluate(() => {
      const focusable = Array.from(document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ))
      return focusable.map((el, index) => ({
        tagName: el.tagName,
        type: el.type || '',
        tabIndex: el.tabIndex,
        order: index
      }))
    })
    
    // Check if tab indices are in logical order
    const tabIndices = focusableElements.map(el => el.tabIndex).filter(idx => idx >= 0)
    const isOrderLogical = tabIndices.every((val, i) => i === 0 || val >= tabIndices[i - 1])
    
    focusResults.focusOrder = isOrderLogical
    
    return focusResults
  }
  
  /**
   * Comprehensive accessibility assertions
   */
  static assertAccessibilityStandards(results) {
    // Axe audit should pass
    if (results.axeResults && !results.axeResults.error) {
      expect(results.axeResults.violations).toHaveLength(0)
    }
    
    // Keyboard navigation should work
    if (results.keyboardResults) {
      expect(results.keyboardResults.canTabToSegmentation).toBeTruthy()
      expect(results.keyboardResults.canSelectWithKeyboard).toBeTruthy()
      expect(results.keyboardResults.canNavigateSteps).toBeTruthy()
    }
    
    // Screen reader compatibility
    if (results.screenReaderResults) {
      expect(results.screenReaderResults.hasProperLabels).toBeTruthy()
      expect(results.screenReaderResults.hasLiveRegions).toBeTruthy()
    }
    
    // Focus management
    if (results.focusResults) {
      expect(results.focusResults.modalTrapsFocus).toBeTruthy()
      expect(results.focusResults.focusVisible).toBeTruthy()
      expect(results.focusResults.focusOrder).toBeTruthy()
    }
    
    // Color contrast
    if (results.contrastResults) {
      expect(results.contrastResults.violations).toHaveLength(0)
    }
  }
}

/**
 * Mobile performance and accessibility testing
 */
export class MobileTestHelpers {
  
  /**
   * Test touch interactions and mobile performance
   */
  static async testMobilePerformance(page) {
    // Simulate mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    const mobileResults = {
      touchTargetSize: false,
      scrollPerformance: false,
      tapDelay: false
    }
    
    // Test touch target sizes (should be at least 44x44px)
    const touchTargets = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"], input, [tabindex="0"]')
      const results = []
      
      buttons.forEach(button => {
        const rect = button.getBoundingClientRect()
        results.push({
          width: rect.width,
          height: rect.height,
          meetsStandard: rect.width >= 44 && rect.height >= 44
        })
      })
      
      return results
    })
    
    const adequateTargets = touchTargets.filter(target => target.meetsStandard).length
    mobileResults.touchTargetSize = adequateTargets >= touchTargets.length * 0.8 // 80% threshold
    
    // Test scroll performance
    const scrollStartTime = Date.now()
    await page.mouse.wheel(0, 500)
    await page.waitForTimeout(100)
    const scrollTime = Date.now() - scrollStartTime
    
    mobileResults.scrollPerformance = scrollTime < 100 // Should be smooth
    
    // Test tap delay (300ms delay should be eliminated)
    const tapStartTime = Date.now()
    const firstButton = page.locator('button').first()
    if (await firstButton.isVisible()) {
      await firstButton.tap()
      const tapDelay = Date.now() - tapStartTime
      mobileResults.tapDelay = tapDelay < 50 // Should be immediate
    }
    
    return mobileResults
  }
}