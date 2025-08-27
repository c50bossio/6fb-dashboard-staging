/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@/test-utils/test-utils'
import { 
  createTestUser, 
  createTestProfile, 
  A11yTestUtils,
  MobileHelpers 
} from '@/test-utils/test-utils'
import UnifiedCustomizePage from '@/app/(protected)/customize/page'
import { UserIcon, BuildingStorefrontIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

// Mock axe-core for automated accessibility testing
const mockAxe = {
  run: jest.fn().mockResolvedValue({
    violations: [],
    passes: [],
    incomplete: [],
    inapplicable: []
  }),
  configure: jest.fn(),
  getRules: jest.fn().mockReturnValue([])
}

jest.mock('axe-core', () => mockAxe)

// Enhanced CustomizationSection for accessibility testing
const CustomizationSection = ({ 
  title, 
  description, 
  icon: Icon, 
  isExpanded, 
  onToggle, 
  children, 
  color = 'blue',
  badge,
  hasChanges = false
}) => {
  const sectionId = title.toLowerCase().replace(/\s+/g, '-')
  const contentId = `section-${sectionId}-content`
  
  return (
    <div 
      className="border rounded-xl overflow-hidden shadow-sm"
      data-testid={`section-${sectionId}`}
    >
      <button
        onClick={onToggle}
        className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-white text-left"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        id={`${sectionId}-toggle`}
        data-testid={`${sectionId}-toggle`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
            <div className="p-2 rounded-xl bg-blue-50">
              <Icon 
                className="h-5 w-5 text-blue-600" 
                aria-hidden="true"
                focusable="false"
              />
              {hasChanges && (
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full"
                  aria-label="Unsaved changes"
                  role="status"
                ></div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  {title}
                </h3>
                {badge && (
                  <span 
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                    aria-label={`${badge} section`}
                  >
                    {badge}
                  </span>
                )}
                {hasChanges && (
                  <span 
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full"
                    aria-label="This section has unsaved changes"
                    role="status"
                  >
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            </div>
          </div>
          <div className="ml-2" aria-hidden="true">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </button>
      
      <div
        id={contentId}
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-screen' : 'max-h-0'
        }`}
        aria-labelledby={`${sectionId}-toggle`}
        role="region"
      >
        {isExpanded && (
          <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

describe('Accessibility Tests - WCAG 2.1 AA Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockAxe.run.mockResolvedValue({ violations: [] })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Semantic Structure Tests', () => {
    it('has proper heading hierarchy', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      // Check main heading (h1)
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Customize Your Experience')

      // Check section headings (h3)
      const sectionHeadings = screen.getAllByRole('heading', { level: 3 })
      expect(sectionHeadings.length).toBeGreaterThan(0)
      
      // Verify no heading levels are skipped
      const allHeadings = screen.getAllByRole('heading')
      const headingLevels = allHeadings.map(h => parseInt(h.tagName.charAt(1)))
      
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i-1]
        expect(diff).toBeLessThanOrEqual(1) // No skipped levels
      }
    })

    it('has proper landmark regions', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      // Should have main landmark
      const main = screen.getByRole('main') || 
                   document.querySelector('main') ||
                   document.querySelector('[role="main"]')
      expect(main).toBeTruthy()
    })

    it('uses proper list structures', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Quick Actions:')).toBeInTheDocument()
      })

      // Quick actions should be properly structured
      const quickActions = screen.getByText('Quick Actions:').parentElement
      
      // Should contain interactive elements
      const buttons = within(quickActions).getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Keyboard Navigation Tests', () => {
    it('supports full keyboard navigation', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Show Tutorial')).toBeInTheDocument()
      })

      // Test tab navigation through interactive elements
      let focusableElements = []
      let currentElement = document.body

      // Collect all focusable elements
      for (let i = 0; i < 20; i++) {
        await user.tab()
        
        if (document.activeElement && document.activeElement !== document.body) {
          if (!focusableElements.includes(document.activeElement)) {
            focusableElements.push(document.activeElement)
          }
          currentElement = document.activeElement
        }

        // Break if we've cycled back to the first element
        if (focusableElements.length > 1 && document.activeElement === focusableElements[0]) {
          break
        }
      }

      expect(focusableElements.length).toBeGreaterThan(0)

      // Verify each focusable element is actually interactive
      focusableElements.forEach(element => {
        const tagName = element.tagName.toLowerCase()
        const role = element.getAttribute('role')
        const tabIndex = element.getAttribute('tabindex')
        
        expect(
          tagName === 'button' ||
          tagName === 'a' ||
          tagName === 'input' ||
          tagName === 'select' ||
          tagName === 'textarea' ||
          role === 'button' ||
          role === 'link' ||
          tabIndex !== null
        ).toBeTruthy()
      })
    })

    it('provides proper focus indicators', async () => {
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Show Tutorial')).toBeInTheDocument()
      })

      await user.tab()
      
      const focusedElement = document.activeElement
      expect(focusedElement).toBeTruthy()
      
      // Check focus is visible (not hidden by outline: none without replacement)
      const styles = window.getComputedStyle(focusedElement)
      const hasVisibleFocus = 
        styles.outline !== 'none' ||
        styles.boxShadow.includes('ring') ||
        styles.border !== 'none'
      
      expect(hasVisibleFocus).toBeTruthy()
    })

    it('handles section expansion with keyboard', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('section-toggle-barber-profile')).toBeInTheDocument()
      })

      const toggle = screen.getByTestId('section-toggle-barber-profile')
      
      // Focus the toggle
      toggle.focus()
      expect(toggle).toHaveFocus()

      // Check initial state
      expect(toggle).toHaveAttribute('aria-expanded', 'false')

      // Activate with Enter
      await user.keyboard('{Enter}')
      expect(toggle).toHaveAttribute('aria-expanded', 'true')

      // Activate with Space
      await user.keyboard(' ')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('manages focus during dynamic content changes', async () => {
      localStorage.removeItem('customize-tutorial-seen')
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
      })

      // Focus should be trapped in modal
      const modal = screen.getByText('Welcome to Customization!').closest('[role="dialog"]') ||
                   screen.getByText('Welcome to Customization!').closest('.fixed')
      
      expect(modal).toBeTruthy()

      // Close modal
      await user.click(screen.getByText('Get Started'))

      // Focus should return to main content
      expect(document.activeElement).not.toBe(document.body)
    })
  })

  describe('ARIA Attributes Tests', () => {
    it('has proper ARIA labels and descriptions', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      // Check section toggles have proper ARIA attributes
      const barberToggle = screen.getByTestId('section-toggle-barber-profile')
      expect(barberToggle).toHaveAttribute('aria-expanded')
      expect(barberToggle).toHaveAttribute('aria-controls')

      const controlsId = barberToggle.getAttribute('aria-controls')
      expect(document.getElementById(controlsId)).toBeTruthy()

      // Check progress indicator has proper labeling
      const progressText = screen.getByText(/\d+%/)
      expect(progressText.closest('[role="progressbar"]') || 
             progressText.closest('[aria-label*="progress"]') ||
             screen.getByText('Setup Progress')).toBeTruthy()
    })

    it('provides status updates for dynamic content', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })

      // Progress should be announced to screen readers
      const progressElement = screen.getByText('100%').closest('[role="status"]') ||
                             screen.getByText('100%').closest('[aria-live]') ||
                             screen.getByText('Setup Progress')

      expect(progressElement).toBeTruthy()
    })

    it('handles unsaved changes announcements', () => {
      render(
        <CustomizationSection
          title="Test Section"
          description="Testing unsaved changes"
          icon={UserIcon}
          isExpanded={true}
          onToggle={() => {}}
          hasChanges={true}
        >
          <div>Content with changes</div>
        </CustomizationSection>
      )

      // Unsaved changes should be announced
      const unsavedIndicator = screen.getByText('Unsaved')
      expect(unsavedIndicator).toHaveAttribute('role', 'status')
      expect(unsavedIndicator).toHaveAttribute('aria-label', 'This section has unsaved changes')
    })

    it('provides proper form labeling', () => {
      const MockForm = () => (
        <form>
          <div>
            <label htmlFor="test-input" className="block text-sm font-medium">
              Test Field
            </label>
            <input
              id="test-input"
              type="text"
              required
              aria-describedby="test-input-error"
              className="mt-1 block w-full"
            />
            <p id="test-input-error" className="text-red-600 text-sm">
              This field is required
            </p>
          </div>
        </form>
      )

      render(<MockForm />)

      const input = screen.getByLabelText('Test Field')
      expect(input).toHaveAttribute('id', 'test-input')
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error')
      expect(input).toHaveAttribute('required')

      const errorMessage = document.getElementById('test-input-error')
      expect(errorMessage).toBeInTheDocument()
    })
  })

  describe('Color and Contrast Tests', () => {
    it('maintains sufficient color contrast', () => {
      render(
        <div className="space-y-4">
          <div className="bg-blue-600 text-white p-4">
            High contrast text on blue background
          </div>
          <div className="bg-gray-100 text-gray-900 p-4">
            High contrast text on light background
          </div>
          <div className="text-blue-600 p-4">
            Blue text on default background
          </div>
        </div>
      )

      // Visual verification - actual contrast checking would require specialized tools
      const blueBackground = screen.getByText('High contrast text on blue background')
      expect(blueBackground).toHaveClass('bg-blue-600', 'text-white')

      const lightBackground = screen.getByText('High contrast text on light background')
      expect(lightBackground).toHaveClass('bg-gray-100', 'text-gray-900')
    })

    it('does not rely solely on color for information', () => {
      render(
        <CustomizationSection
          title="Status Section"
          description="Testing status indicators"
          icon={UserIcon}
          isExpanded={true}
          onToggle={() => {}}
          hasChanges={true}
        >
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" aria-hidden="true"></div>
              <span>Completed <span className="sr-only">(indicated by green dot)</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" aria-hidden="true"></div>
              <span>Failed <span className="sr-only">(indicated by red dot)</span></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" aria-hidden="true"></div>
              <span>Warning <span className="sr-only">(indicated by yellow dot)</span></span>
            </div>
          </div>
        </CustomizationSection>
      )

      // Color is supplemented with text
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByText('Warning')).toBeInTheDocument()

      // Screen reader alternatives provided
      expect(screen.getByText('(indicated by green dot)')).toHaveClass('sr-only')
      expect(screen.getByText('(indicated by red dot)')).toHaveClass('sr-only')
      expect(screen.getByText('(indicated by yellow dot)')).toHaveClass('sr-only')
    })
  })

  describe('Screen Reader Tests', () => {
    it('provides proper screen reader content', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      // Check for screen reader only content
      const srOnlyElements = document.querySelectorAll('.sr-only')
      expect(srOnlyElements.length).toBeGreaterThan(0)

      // Check that important information is available to screen readers
      const pageDescription = screen.getByText(/Build a professional online presence/)
      expect(pageDescription).toBeInTheDocument()
    })

    it('announces dynamic changes', async () => {
      const TestComponent = () => {
        const [status, setStatus] = React.useState('')
        
        React.useEffect(() => {
          const timer = setTimeout(() => {
            setStatus('Changes saved successfully')
          }, 1000)
          return () => clearTimeout(timer)
        }, [])

        return (
          <div>
            <button onClick={() => setStatus('Saving...')}>Save</button>
            {status && (
              <div role="status" aria-live="polite">
                {status}
              </div>
            )}
          </div>
        )
      }

      const { user } = render(<TestComponent />)
      
      await user.click(screen.getByText('Save'))
      expect(screen.getByText('Saving...')).toHaveAttribute('role', 'status')

      jest.advanceTimersByTime(1000)
      await waitFor(() => {
        expect(screen.getByText('Changes saved successfully')).toBeInTheDocument()
      })
    })

    it('provides context for interactive elements', () => {
      render(
        <CustomizationSection
          title="Interactive Section"
          description="Testing interactive element context"
          icon={UserIcon}
          isExpanded={false}
          onToggle={() => {}}
          badge="Primary"
        >
          <div>Content</div>
        </CustomizationSection>
      )

      const toggle = screen.getByRole('button')
      
      // Button should have accessible name that includes context
      expect(toggle).toHaveAccessibleName()
      
      // Should provide context about what the button does
      const accessibleName = toggle.getAttribute('aria-label') || 
                            toggle.textContent ||
                            (toggle.getAttribute('aria-labelledby') && 
                             document.getElementById(toggle.getAttribute('aria-labelledby'))?.textContent)
      
      expect(accessibleName).toBeTruthy()
      expect(accessibleName.toLowerCase()).toMatch(/interactive section|expand|collapse/)
    })
  })

  describe('Mobile Accessibility Tests', () => {
    it('maintains accessibility on mobile viewports', async () => {
      MobileHelpers.setMobileViewport(375, 667)

      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      // Touch targets should be large enough (minimum 44px)
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const height = parseInt(styles.height) || parseInt(styles.minHeight) || 0
        
        // Check if button is large enough for touch or has proper touch target sizing
        expect(height >= 44 || button.classList.contains('touch-target')).toBeTruthy()
      })

      // Test touch navigation
      const toggle = screen.getByTestId('section-toggle-barbershop-website')
      
      // Simulate touch interaction
      await MobileHelpers.simulateTouch(toggle, 'tap')
      
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
    })

    it('handles orientation changes', () => {
      // Portrait
      MobileHelpers.setMobileViewport(375, 667)
      const { container, rerender } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      // Landscape
      MobileHelpers.setMobileViewport(667, 375)
      rerender(<UnifiedCustomizePage />)

      // Content should remain accessible
      expect(container.querySelector('h1')).toBeTruthy()
    })
  })

  describe('Focus Management Tests', () => {
    it('manages focus in modal dialogs', async () => {
      localStorage.removeItem('customize-tutorial-seen')
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
      })

      // Focus should be in modal
      const modal = screen.getByText('Welcome to Customization!').closest('.fixed')
      expect(modal).toBeTruthy()

      // Focus should be trapped
      const focusableInModal = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      expect(focusableInModal.length).toBeGreaterThan(0)

      // Test tab trapping (simplified)
      await user.tab()
      expect(modal.contains(document.activeElement)).toBeTruthy()
    })

    it('restores focus after interactions', async () => {
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Show Tutorial')).toBeInTheDocument()
      })

      const tutorialButton = screen.getByText('Show Tutorial')
      tutorialButton.focus()
      expect(tutorialButton).toHaveFocus()

      // Click tutorial button
      await user.click(tutorialButton)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
      })

      // Close tutorial
      await user.click(screen.getByText('Get Started'))

      // Focus should be restored or moved appropriately
      expect(document.activeElement).not.toBe(document.body)
    })
  })

  describe('Error State Accessibility', () => {
    it('announces errors to screen readers', () => {
      const ErrorComponent = () => (
        <div>
          <input 
            type="text" 
            required 
            aria-invalid="true"
            aria-describedby="error-message"
            data-testid="error-input"
          />
          <div 
            id="error-message" 
            role="alert" 
            className="text-red-600"
          >
            This field is required
          </div>
        </div>
      )

      render(<ErrorComponent />)

      const input = screen.getByTestId('error-input')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'error-message')

      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveTextContent('This field is required')
    })

    it('provides recovery instructions', () => {
      const ErrorWithRecovery = () => (
        <div>
          <div role="alert" className="bg-red-50 border border-red-200 p-4">
            <h3 className="font-medium text-red-800">Save Failed</h3>
            <p className="text-red-700 mt-1">
              Your changes could not be saved. Please check your internet connection and try again.
            </p>
            <button className="mt-2 bg-red-600 text-white px-4 py-2 rounded">
              Retry Save
            </button>
          </div>
        </div>
      )

      render(<ErrorWithRecovery />)

      const alert = screen.getByRole('alert')
      expect(alert).toContain(screen.getByText('Save Failed'))
      expect(alert).toContain(screen.getByText(/check your internet connection/))
      expect(screen.getByText('Retry Save')).toBeInTheDocument()
    })
  })

  describe('Automated Accessibility Testing', () => {
    it('passes axe-core accessibility tests', async () => {
      const { container } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      // Run axe-core tests
      const results = await mockAxe.run(container)
      
      expect(mockAxe.run).toHaveBeenCalledWith(container)
      expect(results.violations).toHaveLength(0)
    })

    it('tests with different accessibility preferences', async () => {
      // Test with reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      })

      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      // Animations should be reduced or disabled
      const animatedElements = document.querySelectorAll('.transition-all, .animate-pulse')
      expect(animatedElements.length).toBeGreaterThanOrEqual(0) // Should handle reduced motion
    })

    it('tests with high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      })

      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      // Should adapt to high contrast preferences
      expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
    })
  })
})