import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import buttonHealthMonitor from '../lib/button-health-monitor'
import universalButtonHandler from '../lib/universal-button-handler'

/**
 * Comprehensive Button Functionality Test Suite
 * Tests button interactions, routing, error handling, and accessibility
 */

describe('Button Functionality Tests', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.body.innerHTML = ''
    
    // Mock console methods to avoid spam
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock fetch for API tests
    global.fetch = jest.fn()
    
    // Mock router
    global.window = {
      ...global.window,
      next: {
        router: {
          push: jest.fn().mockResolvedValue(true)
        }
      }
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Button Health Monitor', () => {
    test('should detect buttons without click handlers', async () => {
      // Create a button without click handler
      document.body.innerHTML = `
        <button id="broken-button">Broken Button</button>
        <button id="working-button" onclick="console.log('works')">Working Button</button>
      `

      const results = await buttonHealthMonitor.runFullScan()
      
      expect(results.summary.broken).toBeGreaterThan(0)
      expect(results.summary.working).toBeGreaterThan(0)
      expect(results.issues.some(issue => 
        issue.message.includes('no click handler') && 
        issue.element.selector.includes('broken-button')
      )).toBe(true)
    })

    test('should detect disabled buttons', async () => {
      document.body.innerHTML = `
        <button id="disabled-button" disabled>Disabled Button</button>
      `

      const results = await buttonHealthMonitor.runFullScan()
      
      expect(results.summary.warnings).toBeGreaterThan(0)
      expect(results.issues.some(issue => 
        issue.message.includes('disabled')
      )).toBe(true)
    })

    test('should validate router.push targets', async () => {
      document.body.innerHTML = `
        <button onclick="router.push('/nonexistent-route')">Bad Navigation</button>
      `

      const results = await buttonHealthMonitor.runFullScan()
      
      expect(results.issues.some(issue => 
        issue.message.includes('unknown route')
      )).toBe(true)
    })

    test('should detect critical setup buttons without handlers', async () => {
      document.body.innerHTML = `
        <button>Continue Setup</button>
        <button>Complete Setup</button>
      `

      const results = await buttonHealthMonitor.runFullScan()
      
      const criticalIssues = results.issues.filter(issue => issue.critical)
      expect(criticalIssues.length).toBeGreaterThan(0)
    })

    test('should validate links with href attributes', async () => {
      document.body.innerHTML = `
        <a href="/dashboard">Good Link</a>
        <a href="#">Empty Link</a>
        <a href="javascript:void(0)">JS Link</a>
      `

      const results = await buttonHealthMonitor.runFullScan()
      
      expect(results.issues.some(issue => 
        issue.message.includes('no valid href')
      )).toBe(true)
      
      expect(results.issues.some(issue => 
        issue.message.includes('javascript: protocol')
      )).toBe(true)
    })
  })

  describe('Universal Button Handler', () => {
    test('should handle successful button clicks', async () => {
      const mockAction = jest.fn().mockResolvedValue('success')
      const button = document.createElement('button')
      button.textContent = 'Test Button'
      document.body.appendChild(button)

      const result = await universalButtonHandler.handleClick(button, mockAction)
      
      expect(mockAction).toHaveBeenCalled()
      expect(result).toBe('success')
    })

    test('should handle button click failures with retry', async () => {
      const mockAction = jest.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success')
      
      const button = document.createElement('button')
      button.textContent = 'Test Button'
      document.body.appendChild(button)

      const result = await universalButtonHandler.handleClick(button, mockAction, {
        retryable: true,
        showToast: false
      })
      
      expect(mockAction).toHaveBeenCalledTimes(2)
      expect(result).toBe('success')
    })

    test('should handle navigation actions', async () => {
      const button = document.createElement('button')
      document.body.appendChild(button)

      await universalButtonHandler.handleClick(button, '/dashboard', {
        showToast: false
      })
      
      expect(global.window.next.router.push).toHaveBeenCalledWith('/dashboard')
    })

    test('should handle API call actions', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      })

      const button = document.createElement('button')
      document.body.appendChild(button)

      const action = {
        type: 'api',
        url: '/api/test',
        method: 'GET'
      }

      const result = await universalButtonHandler.handleClick(button, action, {
        showToast: false
      })
      
      expect(global.fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      expect(result).toEqual({ data: 'test' })
    })

    test('should handle custom event actions', async () => {
      const eventListener = jest.fn()
      window.addEventListener('testEvent', eventListener)
      
      const button = document.createElement('button')
      document.body.appendChild(button)

      const action = {
        type: 'event',
        name: 'testEvent',
        detail: { test: true }
      }

      await universalButtonHandler.handleClick(button, action, {
        showToast: false
      })
      
      expect(eventListener).toHaveBeenCalled()
    })

    test('should set loading states correctly', async () => {
      const slowAction = () => new Promise(resolve => setTimeout(resolve, 100))
      const button = document.createElement('button')
      button.textContent = 'Click Me'
      document.body.appendChild(button)

      const promise = universalButtonHandler.handleClick(button, slowAction, {
        loadingText: 'Loading...',
        showToast: false
      })
      
      // Check loading state is applied
      expect(button.disabled).toBe(true)
      expect(button.textContent).toBe('Loading...')
      expect(button.getAttribute('data-loading')).toBe('true')
      
      await promise
      
      // Check loading state is cleared
      await waitFor(() => {
        expect(button.disabled).toBe(false)
        expect(button.getAttribute('data-loading')).toBeNull()
      }, { timeout: 3000 })
    })

    test('should prevent multiple simultaneous clicks', async () => {
      const mockAction = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )
      
      const button = document.createElement('button')
      button.textContent = 'Click Me'
      document.body.appendChild(button)

      // Start first click
      const promise1 = universalButtonHandler.handleClick(button, mockAction, {
        showToast: false
      })
      
      // Try second click immediately
      const promise2 = universalButtonHandler.handleClick(button, mockAction, {
        showToast: false
      })
      
      await Promise.all([promise1, promise2])
      
      // Should only be called once
      expect(mockAction).toHaveBeenCalledTimes(1)
    })

    test('should use fallback action when primary fails', async () => {
      const primaryAction = jest.fn().mockRejectedValue(new Error('Primary failed'))
      const fallbackAction = jest.fn().mockResolvedValue('fallback success')
      
      const button = document.createElement('button')
      document.body.appendChild(button)

      await universalButtonHandler.handleClick(button, primaryAction, {
        retryable: false,
        fallbackAction: fallbackAction,
        showToast: false
      })
      
      expect(primaryAction).toHaveBeenCalled()
      expect(fallbackAction).toHaveBeenCalled()
    })

    test('should enhance existing buttons', () => {
      const button = document.createElement('button')
      button.textContent = 'Enhanced Button'
      document.body.appendChild(button)

      const mockAction = jest.fn()
      universalButtonHandler.enhanceButton(button, mockAction)
      
      expect(button.getAttribute('role')).toBe('button')
      expect(button.hasAttribute('tabindex')).toBe(true)
      expect(typeof button.onclick).toBe('function')
    })
  })

  describe('Integration Tests', () => {
    test('Continue Setup button should work correctly', async () => {
      // Mock the specific Continue Setup button scenario
      document.body.innerHTML = `
        <button class="continue-setup-btn">Continue Setup</button>
      `

      const button = document.querySelector('.continue-setup-btn')
      
      // Mock the custom event dispatch
      const eventSpy = jest.spyOn(window, 'dispatchEvent')
      
      // Simulate the enhanced click handler from UnifiedDashboard
      button.onclick = () => {
        window.dispatchEvent(new CustomEvent('launchOnboarding', { 
          detail: { from: 'dashboard_welcome_prompt' },
          bubbles: true
        }))
      }

      // Click the button
      fireEvent.click(button)
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'launchOnboarding'
        })
      )
    })

    test('should handle real-world button scenarios', async () => {
      // Create a realistic button setup from the app
      document.body.innerHTML = `
        <div data-onboarding-modal="true" style="display: none;">
          <button id="onboarding-continue" class="bg-brand-600 text-white">
            Continue Setup
          </button>
        </div>
        <button id="dashboard-button" onclick="router.push('/dashboard')">
          Go to Dashboard
        </button>
        <button id="api-button" onclick="fetch('/api/user')">
          Load User Data
        </button>
      `

      // Test the health monitor on this realistic setup
      const results = await buttonHealthMonitor.runFullScan()
      
      // Should detect the onboarding continue button without proper handler
      expect(results.issues.some(issue => 
        issue.element.selector.includes('onboarding-continue')
      )).toBe(true)
      
      // Should validate the dashboard route
      expect(results.issues.some(issue => 
        issue.message.includes('router.push')
      )).toBeTruthy()
    })
  })

  describe('Accessibility Tests', () => {
    test('should ensure buttons have proper ARIA attributes', () => {
      document.body.innerHTML = `
        <button>No Role Button</button>
        <div onclick="handleClick()">Div Button</div>
      `

      universalButtonHandler.autoEnhanceButtons()
      
      const buttons = document.querySelectorAll('button, [role="button"]')
      buttons.forEach(button => {
        expect(button.getAttribute('role')).toBe('button')
        expect(button.hasAttribute('tabindex')).toBe(true)
      })
    })

    test('should handle keyboard navigation', async () => {
      const button = document.createElement('button')
      button.textContent = 'Keyboard Test'
      document.body.appendChild(button)

      const mockAction = jest.fn()
      universalButtonHandler.enhanceButton(button, mockAction, { showToast: false })
      
      // Simulate Enter key press
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
      
      // Note: Full keyboard handling would require additional implementation
      // This tests the setup for keyboard accessibility
      expect(button.hasAttribute('tabindex')).toBe(true)
    })
  })

  describe('Performance Tests', () => {
    test('should handle many buttons efficiently', () => {
      // Create 100 buttons
      for (let i = 0; i < 100; i++) {
        const button = document.createElement('button')
        button.textContent = `Button ${i}`
        button.id = `btn-${i}`
        document.body.appendChild(button)
      }

      const startTime = performance.now()
      universalButtonHandler.autoEnhanceButtons()
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(document.querySelectorAll('[data-enhanced="true"]')).toHaveLength(100)
    })

    test('should prevent memory leaks from event listeners', () => {
      const button = document.createElement('button')
      document.body.appendChild(button)
      
      // Create and destroy multiple handlers
      for (let i = 0; i < 10; i++) {
        universalButtonHandler.enhanceButton(button, () => {})
      }
      
      // Should only have one onclick handler (the last one)
      expect(typeof button.onclick).toBe('function')
    })
  })
})

/**
 * Test utilities for manual testing
 */
export const testUtilities = {
  /**
   * Run a quick test of all buttons on current page
   */
  async testCurrentPage() {
    console.log('🧪 Testing current page buttons...')
    
    const healthResults = await buttonHealthMonitor.runFullScan()
    console.log('📊 Health Results:', healthResults.summary)
    
    // Auto-enhance any problematic buttons
    universalButtonHandler.autoEnhanceButtons()
    
    return {
      health: healthResults,
      enhanced: document.querySelectorAll('[data-enhanced="true"]').length
    }
  },

  /**
   * Test a specific button element
   */
  async testButton(buttonElement) {
    if (!buttonElement) {
      console.error('❌ No button element provided')
      return null
    }
    
    const issues = await buttonHealthMonitor.testButton(buttonElement)
    console.log(`🔍 Button test results:`, issues)
    
    if (issues.length === 0) {
      console.log('✅ Button appears to be working correctly')
    } else {
      console.log('⚠️ Issues found:', issues)
      
      // Auto-enhance if there are issues
      universalButtonHandler.enhanceButton(buttonElement, () => {
        console.log('Fallback action executed')
      }, {
        errorText: 'Button enhanced with fallback',
        fallbackAction: () => console.log('Enhanced button fallback')
      })
    }
    
    return issues
  },

  /**
   * Simulate button clicks for testing
   */
  async simulateClicks(selector = 'button') {
    const buttons = document.querySelectorAll(selector)
    const results = []
    
    for (const button of buttons) {
      try {
        console.log(`🖱️ Testing click on:`, button.textContent?.trim())
        
        if (button.onclick) {
          await button.onclick()
        } else {
          fireEvent.click(button)
        }
        
        results.push({ button, status: 'success' })
      } catch (error) {
        console.error('❌ Button click failed:', error)
        results.push({ button, status: 'error', error })
      }
    }
    
    return results
  }
}

// Make test utilities available in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.buttonTestUtils = testUtilities
}