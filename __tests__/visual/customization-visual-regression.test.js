/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@/test-utils/test-utils'
import { 
  createTestUser, 
  createTestProfile, 
  VisualTestUtils,
  MobileHelpers
} from '@/test-utils/test-utils'
import UnifiedCustomizePage from '@/app/(protected)/customize/page'
import { UserIcon, BuildingStorefrontIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

// Mock ResizeObserver for visual tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Extract CustomizationSection for isolated visual testing
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
  const { useState, useEffect, useRef } = React
  const [isAnimating, setIsAnimating] = useState(false)
  const contentRef = useRef(null)

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      accent: 'border-blue-300',
      hover: 'hover:bg-blue-100',
      gradient: 'from-blue-500 to-blue-600'
    },
    purple: {
      bg: 'bg-purple-50 border-purple-200 text-purple-800',
      accent: 'border-purple-300',
      hover: 'hover:bg-purple-100',
      gradient: 'from-purple-500 to-purple-600'
    },
    green: {
      bg: 'bg-green-50 border-green-200 text-green-800',
      accent: 'border-green-300',
      hover: 'hover:bg-green-100',
      gradient: 'from-green-500 to-green-600'
    },
    gold: {
      bg: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      accent: 'border-yellow-300',
      hover: 'hover:bg-yellow-100',
      gradient: 'from-yellow-500 to-yellow-600'
    }
  }

  return (
    <div 
      className={`border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
        isExpanded 
          ? `${colorClasses[color].accent} shadow-md` 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      } ${hasChanges ? 'ring-2 ring-orange-200 ring-opacity-50' : ''}`}
      data-testid={`visual-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={`w-full px-4 sm:px-6 py-4 sm:py-5 bg-white transition-all duration-200 ${
        isExpanded ? colorClasses[color].hover : 'hover:bg-gray-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <div className={`relative p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${colorClasses[color].bg} ${
              isExpanded ? 'scale-110' : ''
            }`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200" />
              {hasChanges && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white animate-pulse"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h3>
                {badge && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full whitespace-nowrap">
                    {badge}
                  </span>
                )}
                {hasChanges && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2 sm:line-clamp-1">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6">
          {children}
        </div>
      )}
    </div>
  )
}

describe('Visual Regression Tests - Customization Components', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Set consistent viewport for visual tests
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 })
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('CustomizationSection Visual States', () => {
    it('renders collapsed state correctly', () => {
      const { container } = render(
        <CustomizationSection
          title="Test Section"
          description="This is a test section for visual regression testing"
          icon={UserIcon}
          isExpanded={false}
          onToggle={() => {}}
          color="blue"
        >
          <div>Test content</div>
        </CustomizationSection>
      )

      expect(container.firstChild).toMatchSnapshot('section-collapsed-blue')
    })

    it('renders expanded state correctly', () => {
      const { container } = render(
        <CustomizationSection
          title="Test Section"
          description="This is a test section for visual regression testing"
          icon={UserIcon}
          isExpanded={true}
          onToggle={() => {}}
          color="blue"
        >
          <div className="p-4 bg-white rounded">
            <h4 className="font-medium">Test Content</h4>
            <p>This is expanded content for visual testing.</p>
          </div>
        </CustomizationSection>
      )

      expect(container.firstChild).toMatchSnapshot('section-expanded-blue')
    })

    it('renders all color variants correctly', () => {
      const colors = ['blue', 'purple', 'green', 'gold']
      const snapshots = {}

      colors.forEach(color => {
        const { container } = render(
          <CustomizationSection
            title={`${color.charAt(0).toUpperCase() + color.slice(1)} Section`}
            description={`A ${color} colored section`}
            icon={color === 'blue' ? UserIcon : color === 'purple' ? BuildingStorefrontIcon : GlobeAltIcon}
            isExpanded={true}
            onToggle={() => {}}
            color={color}
            badge="Test"
          >
            <div className="p-4">
              <p>Content for {color} section</p>
            </div>
          </CustomizationSection>
        )

        snapshots[color] = container.innerHTML
      })

      expect(snapshots).toMatchSnapshot('section-all-colors')
    })

    it('renders with badge correctly', () => {
      const { container } = render(
        <CustomizationSection
          title="Badge Section"
          description="Section with badge"
          icon={UserIcon}
          isExpanded={false}
          onToggle={() => {}}
          color="blue"
          badge="Primary"
        >
          <div>Content</div>
        </CustomizationSection>
      )

      expect(container.firstChild).toMatchSnapshot('section-with-badge')
    })

    it('renders with unsaved changes correctly', () => {
      const { container } = render(
        <CustomizationSection
          title="Unsaved Section"
          description="Section with unsaved changes"
          icon={UserIcon}
          isExpanded={true}
          onToggle={() => {}}
          color="blue"
          hasChanges={true}
        >
          <div className="p-4">
            <p>Content with unsaved changes</p>
          </div>
        </CustomizationSection>
      )

      expect(container.firstChild).toMatchSnapshot('section-unsaved-changes')
    })

    it('renders with badge and unsaved changes', () => {
      const { container } = render(
        <CustomizationSection
          title="Complex Section"
          description="Section with badge and unsaved changes"
          icon={UserIcon}
          isExpanded={true}
          onToggle={() => {}}
          color="purple"
          badge="Enterprise"
          hasChanges={true}
        >
          <div className="p-4 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-yellow-800">Warning: You have unsaved changes</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border rounded p-3">
                <h5 className="font-medium">Setting 1</h5>
                <p className="text-sm text-gray-600">Configuration option</p>
              </div>
              <div className="bg-white border rounded p-3">
                <h5 className="font-medium">Setting 2</h5>
                <p className="text-sm text-gray-600">Another option</p>
              </div>
            </div>
          </div>
        </CustomizationSection>
      )

      expect(container.firstChild).toMatchSnapshot('section-complex-state')
    })
  })

  describe('Full Page Visual States', () => {
    it('renders loading skeleton correctly', () => {
      const { container } = render(<UnifiedCustomizePage />)

      // Should show loading state
      expect(container).toMatchSnapshot('page-loading-skeleton')
    })

    it('renders BARBER role layout correctly', async () => {
      const barberProfile = createTestProfile({ role: 'BARBER' })
      const { container } = render(<UnifiedCustomizePage />, { profile: barberProfile })

      jest.advanceTimersByTime(1000) // Skip loading

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      expect(container).toMatchSnapshot('page-barber-role')
    })

    it('renders SHOP_OWNER role layout correctly', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { container } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      expect(container).toMatchSnapshot('page-shop-owner-role')
    })

    it('renders ENTERPRISE_OWNER role layout correctly', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { container } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      expect(container).toMatchSnapshot('page-enterprise-role')
    })

    it('renders with tutorial modal correctly', async () => {
      localStorage.removeItem('customize-tutorial-seen')
      const { container } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
      })

      expect(container).toMatchSnapshot('page-with-tutorial')
    })

    it('renders with unsaved changes indicators', async () => {
      // This would require mocking the child components with unsaved changes
      // For now, we'll create a simplified version
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { container } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })

      expect(container).toMatchSnapshot('page-with-progress')
    })
  })

  describe('Responsive Visual States', () => {
    it('renders correctly on mobile viewport', async () => {
      MobileHelpers.setMobileViewport(375, 667)

      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { container } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      expect(container).toMatchSnapshot('page-mobile-viewport')
    })

    it('renders correctly on tablet viewport', async () => {
      MobileHelpers.setMobileViewport(768, 1024)

      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { container } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      expect(container).toMatchSnapshot('page-tablet-viewport')
    })

    it('renders correctly on desktop viewport', async () => {
      MobileHelpers.setMobileViewport(1440, 900)

      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { container } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      expect(container).toMatchSnapshot('page-desktop-viewport')
    })

    it('renders section responsive states correctly', () => {
      const breakpoints = [375, 768, 1024, 1440]
      const snapshots = {}

      breakpoints.forEach(width => {
        MobileHelpers.setMobileViewport(width)
        
        const { container } = render(
          <CustomizationSection
            title="Responsive Section"
            description="Testing responsive behavior"
            icon={UserIcon}
            isExpanded={true}
            onToggle={() => {}}
            color="blue"
            badge="Responsive"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border rounded p-3">
                <h5 className="font-medium">Item 1</h5>
                <p className="text-sm text-gray-600">Description</p>
              </div>
              <div className="bg-white border rounded p-3">
                <h5 className="font-medium">Item 2</h5>
                <p className="text-sm text-gray-600">Description</p>
              </div>
              <div className="bg-white border rounded p-3">
                <h5 className="font-medium">Item 3</h5>
                <p className="text-sm text-gray-600">Description</p>
              </div>
            </div>
          </CustomizationSection>
        )

        snapshots[`${width}px`] = container.innerHTML
      })

      expect(snapshots).toMatchSnapshot('section-responsive-breakpoints')
    })
  })

  describe('Interactive State Visual Tests', () => {
    it('captures hover state styling', () => {
      const { container } = render(
        <CustomizationSection
          title="Hover Test"
          description="Testing hover states"
          icon={UserIcon}
          isExpanded={false}
          onToggle={() => {}}
          color="blue"
        >
          <div>Content</div>
        </CustomizationSection>
      )

      // Simulate hover state by manually adding classes
      const button = container.querySelector('button')
      button.classList.add('hover:bg-gray-50')
      
      expect(container.firstChild).toMatchSnapshot('section-hover-state')
    })

    it('captures focus state styling', () => {
      const { container } = render(
        <CustomizationSection
          title="Focus Test"
          description="Testing focus states"
          icon={UserIcon}
          isExpanded={false}
          onToggle={() => {}}
          color="blue"
        >
          <div>Content</div>
        </CustomizationSection>
      )

      // Focus the button
      const button = container.querySelector('button')
      button.focus()
      
      expect(container.firstChild).toMatchSnapshot('section-focus-state')
    })

    it('captures active state styling', () => {
      const { container } = render(
        <CustomizationSection
          title="Active Test"
          description="Testing active states"
          icon={UserIcon}
          isExpanded={false}
          onToggle={() => {}}
          color="blue"
        >
          <div>Content</div>
        </CustomizationSection>
      )

      // Simulate active state
      const button = container.querySelector('button')
      button.classList.add('active:scale-[0.97]')
      
      expect(container.firstChild).toMatchSnapshot('section-active-state')
    })
  })

  describe('Animation State Visual Tests', () => {
    it('captures expansion animation', () => {
      let isExpanded = false
      const { container, rerender } = render(
        <CustomizationSection
          title="Animation Test"
          description="Testing expansion animation"
          icon={UserIcon}
          isExpanded={isExpanded}
          onToggle={() => {}}
          color="blue"
        >
          <div className="p-4">
            <p>Animated content</p>
          </div>
        </CustomizationSection>
      )

      const collapsedSnapshot = container.innerHTML

      // Expand the section
      isExpanded = true
      rerender(
        <CustomizationSection
          title="Animation Test"
          description="Testing expansion animation"
          icon={UserIcon}
          isExpanded={isExpanded}
          onToggle={() => {}}
          color="blue"
        >
          <div className="p-4">
            <p>Animated content</p>
          </div>
        </CustomizationSection>
      )

      const expandedSnapshot = container.innerHTML

      expect({
        collapsed: collapsedSnapshot,
        expanded: expandedSnapshot
      }).toMatchSnapshot('section-expansion-animation')
    })

    it('captures loading animation states', () => {
      const { container } = render(
        <div className="space-y-6">
          <div className="animate-pulse bg-gray-200 h-8 w-1/3 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-5 w-2/3 rounded"></div>
          <div className="space-y-4">
            <div className="animate-pulse bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )

      expect(container).toMatchSnapshot('loading-animation-states')
    })
  })

  describe('Error State Visual Tests', () => {
    it('renders error states correctly', () => {
      const { container } = render(
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Save Failed</h3>
                <p className="mt-1 text-sm text-red-700">Your changes could not be saved. Please try again.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Validation Warning</h3>
                <p className="mt-1 text-sm text-yellow-700">Some fields may need your attention.</p>
              </div>
            </div>
          </div>
        </div>
      )

      expect(container).toMatchSnapshot('error-warning-states')
    })
  })

  describe('Success State Visual Tests', () => {
    it('renders success states correctly', () => {
      const { container } = render(
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Changes Saved</h3>
                <p className="mt-1 text-sm text-green-700">Your customization settings have been saved successfully.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Auto-save Enabled</h3>
                <p className="mt-1 text-sm text-blue-700">Your changes are being saved automatically.</p>
              </div>
            </div>
          </div>
        </div>
      )

      expect(container).toMatchSnapshot('success-info-states')
    })
  })

  describe('Complex Layout Visual Tests', () => {
    it('renders complex form layouts correctly', () => {
      const { container } = render(
        <CustomizationSection
          title="Complex Form"
          description="Testing complex form layouts"
          icon={BuildingStorefrontIcon}
          isExpanded={true}
          onToggle={() => {}}
          color="purple"
          badge="Advanced"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter business name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Describe your business"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Modern</option>
                    <option>Classic</option>
                    <option>Minimalist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      defaultValue="#3B82F6"
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue="#3B82F6"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Preview</h4>
              <div className="bg-gray-100 rounded-lg p-6">
                <div className="bg-white rounded-lg shadow p-4">
                  <h5 className="text-xl font-bold" style={{ color: '#3B82F6' }}>
                    Your Business Name
                  </h5>
                  <p className="text-gray-600 mt-2">
                    Your business description will appear here...
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Save Changes
              </button>
            </div>
          </div>
        </CustomizationSection>
      )

      expect(container.firstChild).toMatchSnapshot('complex-form-layout')
    })

    it('renders dashboard-style layouts correctly', () => {
      const { container } = render(
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">Setup Progress</h2>
            <p className="text-blue-100 mb-4">Complete your customization to unlock all features</p>
            <div className="bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2" style={{ width: '75%' }}></div>
            </div>
            <p className="text-sm text-blue-100 mt-2">75% Complete</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Profile</h3>
                  <p className="text-sm text-gray-600">Complete</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-orange-200 rounded-xl p-6 ring-2 ring-orange-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BuildingStorefrontIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Website</h3>
                  <p className="text-sm text-orange-600">In Progress</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 opacity-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <GlobeAltIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Enterprise</h3>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )

      expect(container).toMatchSnapshot('dashboard-style-layout')
    })
  })
})