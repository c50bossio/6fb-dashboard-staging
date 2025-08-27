/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, within } from '@/test-utils/test-utils'
import { createTestUser, createTestProfile, CustomizationTestUtils, A11yTestUtils } from '@/test-utils/test-utils'
import UnifiedCustomizePage from '@/app/(protected)/customize/page'

// Mock the customization components
jest.mock('@/components/customization/BarberProfileCustomization', () => {
  return function MockBarberProfileCustomization({ onUnsavedChanges }) {
    const [hasChanges, setHasChanges] = React.useState(false)
    
    React.useEffect(() => {
      onUnsavedChanges?.(hasChanges)
    }, [hasChanges, onUnsavedChanges])
    
    return (
      <div data-testid="barber-profile-customization">
        <button 
          data-testid="trigger-changes" 
          onClick={() => setHasChanges(!hasChanges)}
        >
          Toggle Changes
        </button>
        <span data-testid="changes-status">{hasChanges ? 'has-changes' : 'no-changes'}</span>
        Barber Profile Customization Content
      </div>
    )
  }
})

jest.mock('@/components/customization/BarbershopWebsiteCustomization', () => {
  return function MockBarbershopWebsiteCustomization({ onUnsavedChanges }) {
    const [hasChanges, setHasChanges] = React.useState(false)
    
    React.useEffect(() => {
      onUnsavedChanges?.(hasChanges)
    }, [hasChanges, onUnsavedChanges])
    
    return (
      <div data-testid="barbershop-website-customization">
        <button 
          data-testid="trigger-changes" 
          onClick={() => setHasChanges(!hasChanges)}
        >
          Toggle Changes
        </button>
        <span data-testid="changes-status">{hasChanges ? 'has-changes' : 'no-changes'}</span>
        Barbershop Website Customization Content
      </div>
    )
  }
})

jest.mock('@/components/customization/EnterpriseWebsiteCustomization', () => {
  return function MockEnterpriseWebsiteCustomization({ onUnsavedChanges }) {
    const [hasChanges, setHasChanges] = React.useState(false)
    
    React.useEffect(() => {
      onUnsavedChanges?.(hasChanges)
    }, [hasChanges, onUnsavedChanges])
    
    return (
      <div data-testid="enterprise-website-customization">
        <button 
          data-testid="trigger-changes" 
          onClick={() => setHasChanges(!hasChanges)}
        >
          Toggle Changes
        </button>
        <span data-testid="changes-status">{hasChanges ? 'has-changes' : 'no-changes'}</span>
        Enterprise Website Customization Content
      </div>
    )
  }
})

describe('UnifiedCustomizePage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Loading State', () => {
    it('shows loading skeleton initially', () => {
      render(<UnifiedCustomizePage />)

      // Should show loading skeleton
      expect(screen.getByTestId('skeleton-header')).toBeInTheDocument()
      expect(screen.getAllByTestId('skeleton-section')).toHaveLength(3)
    })

    it('transitions from loading to content', async () => {
      render(<UnifiedCustomizePage />)

      // Initially loading
      expect(screen.getByTestId('skeleton-header')).toBeInTheDocument()

      // Fast-forward past loading time
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-header')).not.toBeInTheDocument()
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })
    })
  })

  describe('Role-based Section Visibility', () => {
    it('shows correct sections for BARBER role', async () => {
      const barberProfile = createTestProfile({ role: 'BARBER' })
      render(<UnifiedCustomizePage />, { profile: barberProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
        expect(screen.queryByTestId('customization-section-barbershop-website')).not.toBeInTheDocument()
        expect(screen.queryByTestId('customization-section-multi-location-management')).not.toBeInTheDocument()
      })
    })

    it('shows correct sections for SHOP_OWNER role', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
        expect(screen.getByTestId('customization-section-barbershop-website')).toBeInTheDocument()
        expect(screen.queryByTestId('customization-section-multi-location-management')).not.toBeInTheDocument()
      })
    })

    it('shows correct sections for ENTERPRISE_OWNER role', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
        expect(screen.getByTestId('customization-section-barbershop-website')).toBeInTheDocument()
        expect(screen.getByTestId('customization-section-multi-location-management')).toBeInTheDocument()
      })
    })

    it('shows correct sections for SUPER_ADMIN role', async () => {
      const adminProfile = createTestProfile({ role: 'SUPER_ADMIN' })
      render(<UnifiedCustomizePage />, { profile: adminProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
        expect(screen.getByTestId('customization-section-barbershop-website')).toBeInTheDocument()
        expect(screen.getByTestId('customization-section-multi-location-management')).toBeInTheDocument()
      })
    })

    it('shows primary badge for user main role section', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        const shopSection = screen.getByTestId('customization-section-barbershop-website')
        expect(within(shopSection).getByTestId('section-badge')).toHaveTextContent('Primary')
        
        const barberSection = screen.getByTestId('customization-section-barber-profile')
        expect(within(barberSection).queryByTestId('section-badge')).not.toBeInTheDocument()
      })
    })
  })

  describe('Section Auto-expansion Logic', () => {
    it('auto-expands barber section for BARBER role', async () => {
      const barberProfile = createTestProfile({ role: 'BARBER' })
      render(<UnifiedCustomizePage />, { profile: barberProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        const toggle = screen.getByTestId('section-toggle-barber-profile')
        expect(toggle).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('auto-expands barbershop section for SHOP_OWNER role', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        const toggle = screen.getByTestId('section-toggle-barbershop-website')
        expect(toggle).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('auto-expands enterprise section for ENTERPRISE_OWNER role', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        const toggle = screen.getByTestId('section-toggle-multi-location-management')
        expect(toggle).toHaveAttribute('aria-expanded', 'true')
      })
    })
  })

  describe('Section Expansion/Collapse', () => {
    it('allows manual section expansion and collapse', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        const toggle = screen.getByTestId('section-toggle-barber-profile')
        expect(toggle).toHaveAttribute('aria-expanded', 'false')
      })

      const toggle = screen.getByTestId('section-toggle-barber-profile')
      await user.click(toggle)

      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('allows multiple sections to be expanded simultaneously', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByTestId('section-toggle-barber-profile')
      })

      // Expand barber and barbershop sections
      await user.click(screen.getByTestId('section-toggle-barber-profile'))
      await user.click(screen.getByTestId('section-toggle-barbershop-website'))

      // All three sections should be expanded
      expect(screen.getByTestId('section-toggle-barber-profile')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('section-toggle-barbershop-website')).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByTestId('section-toggle-multi-location-management')).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Unsaved Changes Tracking', () => {
    it('tracks unsaved changes from child components', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      // Trigger changes in barber profile
      const triggerButton = within(screen.getByTestId('barber-profile-customization')).getByTestId('trigger-changes')
      await user.click(triggerButton)

      // Should show unsaved changes indicator
      const section = screen.getByTestId('customization-section-barber-profile')
      expect(within(section).getByTestId('unsaved-changes-indicator')).toBeInTheDocument()
      expect(within(section).getByTestId('unsaved-changes-badge')).toBeInTheDocument()
    })

    it('updates progress calculation when changes occur', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByText('100%') // Initially 100% complete
      })

      // Trigger changes
      const triggerButton = within(screen.getByTestId('barber-profile-customization')).getByTestId('trigger-changes')
      await user.click(triggerButton)

      // Progress should decrease
      expect(screen.getByText('50%')).toBeInTheDocument() // 1 of 2 sections has changes
    })

    it('shows count of unsaved sections in quick actions', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      // Trigger changes in multiple sections
      const barberTrigger = within(screen.getByTestId('barber-profile-customization')).getByTestId('trigger-changes')
      const shopTrigger = within(screen.getByTestId('barbershop-website-customization')).getByTestId('trigger-changes')
      
      await user.click(barberTrigger)
      await user.click(shopTrigger)

      // Should show count of unsaved sections
      expect(screen.getByText('2 Unsaved Sections')).toBeInTheDocument()
    })
  })

  describe('Tutorial System', () => {
    it('shows tutorial for new users', async () => {
      // Clear tutorial seen flag
      localStorage.removeItem('customize-tutorial-seen')
      
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
        expect(screen.getByText(/Six Figure Barber methodology/)).toBeInTheDocument()
      })
    })

    it('does not show tutorial for returning users', async () => {
      localStorage.setItem('customize-tutorial-seen', 'true')
      
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.queryByText('Welcome to Customization!')).not.toBeInTheDocument()
      })
    })

    it('allows dismissing tutorial with Get Started button', async () => {
      localStorage.removeItem('customize-tutorial-seen')
      
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByText('Get Started')
      })

      await user.click(screen.getByText('Get Started'))

      expect(screen.queryByText('Welcome to Customization!')).not.toBeInTheDocument()
      expect(localStorage.getItem('customize-tutorial-seen')).toBe('true')
    })

    it('allows dismissing tutorial with Skip button', async () => {
      localStorage.removeItem('customize-tutorial-seen')
      
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByText('Skip')
      })

      await user.click(screen.getByText('Skip'))

      expect(screen.queryByText('Welcome to Customization!')).not.toBeInTheDocument()
      expect(localStorage.getItem('customize-tutorial-seen')).toBe('true')
    })

    it('allows reopening tutorial from quick actions', async () => {
      localStorage.setItem('customize-tutorial-seen', 'true')
      
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByText('Show Tutorial')
      })

      await user.click(screen.getByText('Show Tutorial'))

      expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
    })
  })

  describe('Quick Actions Bar', () => {
    it('renders quick actions with correct buttons', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByText('Quick Actions:')).toBeInTheDocument()
        expect(screen.getByText('Show Tutorial')).toBeInTheDocument()
        expect(screen.getByText('Save All Changes')).toBeInTheDocument()
      })
    })

    it('shows unsaved changes count when there are changes', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      // Trigger changes
      const triggerButton = within(screen.getByTestId('barber-profile-customization')).getByTestId('trigger-changes')
      await user.click(triggerButton)

      expect(screen.getByText('1 Unsaved Section')).toBeInTheDocument()
    })

    it('does not show unsaved changes count when no changes', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.queryByText(/Unsaved Section/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Progress Indicator', () => {
    it('shows correct initial progress', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument() // No unsaved changes initially
      })
    })

    it('updates progress when changes occur', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      // Initial progress should be 100%
      expect(screen.getByText('100%')).toBeInTheDocument()

      // Trigger changes in one section
      const triggerButton = within(screen.getByTestId('barber-profile-customization')).getByTestId('trigger-changes')
      await user.click(triggerButton)

      // Progress should decrease (2 completed out of 3 total = 67%)
      expect(screen.getByText('67%')).toBeInTheDocument()
    })

    it('shows progress bar with correct width', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByTestId('barber-profile-customization')
      })

      const progressBar = document.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-600')
      expect(progressBar).toHaveStyle({ width: '100%' })

      // Trigger changes
      const triggerButton = within(screen.getByTestId('barber-profile-customization')).getByTestId('trigger-changes')
      await user.click(triggerButton)

      expect(progressBar).toHaveStyle({ width: '50%' })
    })
  })

  describe('Help Section', () => {
    it('renders help section with Six Figure Barber messaging', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByText('Need Help Getting Started?')).toBeInTheDocument()
        expect(screen.getByText(/Six Figure Barber methodology/)).toBeInTheDocument()
      })
    })

    it('has working tutorial button in help section', async () => {
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByText('Watch Tutorial')
      })

      await user.click(screen.getByText('Watch Tutorial'))

      expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
    })

    it('includes contact support button', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByText('Contact Support')).toBeInTheDocument()
      })
    })
  })

  describe('Footer', () => {
    it('displays Six Figure Barber methodology attribution', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByText(/Built with the.*Six Figure Barber.*methodology/)).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1, name: /Customize Your Experience/ })
        expect(mainHeading).toBeInTheDocument()

        const sectionHeadings = screen.getAllByRole('heading', { level: 3 })
        expect(sectionHeadings.length).toBeGreaterThan(0)
      })
    })

    it('has proper landmark regions', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        // Main content should be in main landmark
        expect(screen.getByText('Customize Your Experience').closest('main') || 
               screen.getByText('Customize Your Experience').closest('[role="main"]')).toBeTruthy()
      })
    })

    it('supports keyboard navigation', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        screen.getByTestId('section-toggle-barber-profile')
      })

      // Test tab navigation through interactive elements
      await user.tab() // First focusable element
      expect(document.activeElement).toBeTruthy()

      // Should be able to navigate to section toggles
      let foundSectionToggle = false
      for (let i = 0; i < 10; i++) {
        await user.tab()
        if (document.activeElement?.getAttribute('data-testid')?.includes('section-toggle')) {
          foundSectionToggle = true
          break
        }
      }
      expect(foundSectionToggle).toBe(true)
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        const container = screen.getByText('Customize Your Experience').closest('.max-w-7xl')
        expect(container).toHaveClass('px-4', 'sm:px-6', 'lg:px-8', 'py-6', 'sm:py-8')
      })
    })

    it('has responsive text sizing', async () => {
      render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        const heading = screen.getByText('Customize Your Experience')
        expect(heading).toHaveClass('text-2xl', 'sm:text-3xl', 'lg:text-4xl')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles missing user gracefully', async () => {
      render(<UnifiedCustomizePage />, { user: null, profile: null })

      jest.advanceTimersByTime(1000) // Skip loading

      // Should not crash and should render something
      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })
    })

    it('handles invalid role gracefully', async () => {
      const invalidProfile = createTestProfile({ role: 'INVALID_ROLE' })
      render(<UnifiedCustomizePage />, { profile: invalidProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      // Should default to showing barber section
      await waitFor(() => {
        expect(screen.getByTestId('customization-section-barber-profile')).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('renders within acceptable time limits', async () => {
      const start = performance.now()
      
      render(<UnifiedCustomizePage />)
      
      const end = performance.now()
      const renderTime = end - start
      
      // Should render within 100ms for good performance
      expect(renderTime).toBeLessThan(100)
    })

    it('handles role changes efficiently', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { rerender } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000) // Skip initial loading

      await waitFor(() => {
        screen.getByTestId('customization-section-barbershop-website')
      })

      // Change role
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      
      const start = performance.now()
      rerender(<UnifiedCustomizePage />, { profile: enterpriseProfile })
      const end = performance.now()
      
      expect(end - start).toBeLessThan(50) // Should handle role changes quickly
    })
  })
})

// Integration tests with child components
describe('UnifiedCustomizePage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('properly communicates with child components', async () => {
    const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
    const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

    jest.advanceTimersByTime(1000) // Skip loading

    await waitFor(() => {
      screen.getByTestId('barber-profile-customization')
    })

    // Child component should receive onUnsavedChanges callback
    const triggerButton = within(screen.getByTestId('barber-profile-customization')).getByTestId('trigger-changes')
    await user.click(triggerButton)

    // Parent should respond to changes from child
    const section = screen.getByTestId('customization-section-barber-profile')
    expect(within(section).getByTestId('unsaved-changes-indicator')).toBeInTheDocument()
  })

  it('maintains state consistency across sections', async () => {
    const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
    const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

    jest.advanceTimersByTime(1000) // Skip loading

    await waitFor(() => {
      screen.getByTestId('barber-profile-customization')
    })

    // Trigger changes in multiple sections
    const barberTrigger = within(screen.getByTestId('barber-profile-customization')).getByTestId('trigger-changes')
    const shopTrigger = within(screen.getByTestId('barbershop-website-customization')).getByTestId('trigger-changes')
    
    await user.click(barberTrigger)
    await user.click(shopTrigger)

    // State should be consistent across all indicators
    expect(screen.getByText('33%')).toBeInTheDocument() // 1 of 3 sections complete
    expect(screen.getByText('2 Unsaved Sections')).toBeInTheDocument()
    
    // Both sections should show indicators
    expect(within(screen.getByTestId('customization-section-barber-profile')).getByTestId('unsaved-changes-indicator')).toBeInTheDocument()
    expect(within(screen.getByTestId('customization-section-barbershop-website')).getByTestId('unsaved-changes-indicator')).toBeInTheDocument()
  })
})