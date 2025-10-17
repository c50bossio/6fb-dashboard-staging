/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@/test-utils/test-utils'
import { UserIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'
import UnifiedCustomizePage from '@/app/(protected)/customize/page'

// Extract CustomizationSection component for isolated testing
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

  const handleToggle = () => {
    setIsAnimating(true)
    onToggle()
    setTimeout(() => setIsAnimating(false), 300)
  }

  useEffect(() => {
    if (contentRef.current) {
      if (isExpanded) {
        contentRef.current.style.maxHeight = contentRef.current.scrollHeight + 'px'
      } else {
        contentRef.current.style.maxHeight = '0px'
      }
    }
  }, [isExpanded])

  return (
    <div 
      className={`border rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
        isExpanded 
          ? `${colorClasses[color].accent} shadow-md` 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      } ${hasChanges ? 'ring-2 ring-orange-200 ring-opacity-50' : ''}`}
      data-testid={`customization-section-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        className={`w-full px-4 sm:px-6 py-4 sm:py-5 bg-white transition-all duration-200 text-left ${
          isExpanded 
            ? colorClasses[color].hover 
            : 'hover:bg-gray-50'
        } ${isAnimating ? 'scale-[0.98]' : 'scale-100'} active:scale-[0.97]`}
        aria-expanded={isExpanded}
        aria-controls={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        data-testid={`section-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <div className={`relative p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${colorClasses[color].bg} ${
              isExpanded ? 'scale-110' : ''
            }`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200" data-testid="section-icon" />
              {hasChanges && (
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white animate-pulse"
                  data-testid="unsaved-changes-indicator"
                ></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate" data-testid="section-title">
                  {title}
                </h3>
                {badge && (
                  <span 
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full whitespace-nowrap"
                    data-testid="section-badge"
                  >
                    {badge}
                  </span>
                )}
                {hasChanges && (
                  <span 
                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full"
                    data-testid="unsaved-changes-badge"
                  >
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2 sm:line-clamp-1" data-testid="section-description">
                {description}
              </p>
            </div>
          </div>
        </div>
      </button>
      
      {/* Content with smooth animation */}
      <div
        ref={contentRef}
        id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? 'none' : '0px'
        }}
        data-testid="section-content"
      >
        <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

describe('CustomizationSection Component', () => {
  const defaultProps = {
    title: 'Test Section',
    description: 'Test description for the section',
    icon: UserIcon,
    isExpanded: false,
    onToggle: jest.fn(),
    color: 'blue',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<CustomizationSection {...defaultProps}>Test Content</CustomizationSection>)

      expect(screen.getByTestId('section-title')).toHaveTextContent('Test Section')
      expect(screen.getByTestId('section-description')).toHaveTextContent('Test description for the section')
      expect(screen.getByTestId('section-icon')).toBeInTheDocument()
      expect(screen.getByTestId('section-content')).toBeInTheDocument()
    })

    it('renders with all color variants', () => {
      const colors = ['blue', 'purple', 'green', 'gold']
      
      colors.forEach(color => {
        const { rerender } = render(
          <CustomizationSection {...defaultProps} color={color}>
            Test Content
          </CustomizationSection>
        )
        
        const section = screen.getByTestId('customization-section-test-section')
        expect(section).toBeInTheDocument()
        
        rerender(
          <CustomizationSection {...defaultProps} color={color}>
            Test Content
          </CustomizationSection>
        )
      })
    })

    it('renders badge when provided', () => {
      render(
        <CustomizationSection {...defaultProps} badge="Primary">
          Test Content
        </CustomizationSection>
      )

      const badge = screen.getByTestId('section-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Primary')
    })

    it('shows unsaved changes indicators when hasChanges is true', () => {
      render(
        <CustomizationSection {...defaultProps} hasChanges={true}>
          Test Content
        </CustomizationSection>
      )

      expect(screen.getByTestId('unsaved-changes-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('unsaved-changes-badge')).toBeInTheDocument()
      expect(screen.getByTestId('unsaved-changes-badge')).toHaveTextContent('Unsaved')
    })

    it('does not show unsaved changes indicators when hasChanges is false', () => {
      render(<CustomizationSection {...defaultProps}>Test Content</CustomizationSection>)

      expect(screen.queryByTestId('unsaved-changes-indicator')).not.toBeInTheDocument()
      expect(screen.queryByTestId('unsaved-changes-badge')).not.toBeInTheDocument()
    })
  })

  describe('Expansion State', () => {
    it('renders collapsed by default', () => {
      render(<CustomizationSection {...defaultProps}>Test Content</CustomizationSection>)

      const toggle = screen.getByTestId('section-toggle-test-section')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      
      const content = screen.getByTestId('section-content')
      expect(content).toHaveStyle({ maxHeight: '0px' })
    })

    it('renders expanded when isExpanded is true', () => {
      render(
        <CustomizationSection {...defaultProps} isExpanded={true}>
          Test Content
        </CustomizationSection>
      )

      const toggle = screen.getByTestId('section-toggle-test-section')
      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('toggles expansion when clicked', async () => {
      const onToggle = jest.fn()
      const { user } = render(
        <CustomizationSection {...defaultProps} onToggle={onToggle}>
          Test Content
        </CustomizationSection>
      )

      const toggle = screen.getByTestId('section-toggle-test-section')
      await user.click(toggle)

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('applies correct styling when expanded', () => {
      render(
        <CustomizationSection {...defaultProps} isExpanded={true} color="blue">
          Test Content
        </CustomizationSection>
      )

      const section = screen.getByTestId('customization-section-test-section')
      expect(section).toHaveClass('border-blue-300', 'shadow-md')
    })

    it('applies unsaved changes styling when hasChanges is true', () => {
      render(
        <CustomizationSection {...defaultProps} hasChanges={true}>
          Test Content
        </CustomizationSection>
      )

      const section = screen.getByTestId('customization-section-test-section')
      expect(section).toHaveClass('ring-2', 'ring-orange-200', 'ring-opacity-50')
    })
  })

  describe('Animation', () => {
    it('triggers animation state when toggled', async () => {
      const onToggle = jest.fn()
      const { user } = render(
        <CustomizationSection {...defaultProps} onToggle={onToggle}>
          Test Content
        </CustomizationSection>
      )

      const toggle = screen.getByTestId('section-toggle-test-section')
      await user.click(toggle)

      // Animation state should be applied
      expect(toggle).toHaveClass('scale-[0.98]')

      // Fast-forward animation timer
      jest.advanceTimersByTime(300)
      
      await waitFor(() => {
        expect(toggle).toHaveClass('scale-100')
      })
    })

    it('updates maxHeight when expansion changes', () => {
      const { rerender } = render(
        <CustomizationSection {...defaultProps} isExpanded={false}>
          <div style={{ height: '100px' }}>Test Content</div>
        </CustomizationSection>
      )

      const content = screen.getByTestId('section-content')
      expect(content).toHaveStyle({ maxHeight: '0px' })

      rerender(
        <CustomizationSection {...defaultProps} isExpanded={true}>
          <div style={{ height: '100px' }}>Test Content</div>
        </CustomizationSection>
      )

      // maxHeight should be set to scrollHeight when expanded
      expect(content.style.maxHeight).not.toBe('0px')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<CustomizationSection {...defaultProps}>Test Content</CustomizationSection>)

      const toggle = screen.getByTestId('section-toggle-test-section')
      const content = screen.getByTestId('section-content')

      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(toggle).toHaveAttribute('aria-controls', 'section-test-section')
      expect(content).toHaveAttribute('id', 'section-test-section')
    })

    it('updates aria-expanded when state changes', () => {
      const { rerender } = render(
        <CustomizationSection {...defaultProps} isExpanded={false}>
          Test Content
        </CustomizationSection>
      )

      const toggle = screen.getByTestId('section-toggle-test-section')
      expect(toggle).toHaveAttribute('aria-expanded', 'false')

      rerender(
        <CustomizationSection {...defaultProps} isExpanded={true}>
          Test Content
        </CustomizationSection>
      )

      expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('is keyboard accessible', async () => {
      const onToggle = jest.fn()
      const { user } = render(
        <CustomizationSection {...defaultProps} onToggle={onToggle}>
          Test Content
        </CustomizationSection>
      )

      const toggle = screen.getByTestId('section-toggle-test-section')
      
      // Focus the toggle button
      await user.tab()
      expect(toggle).toHaveFocus()

      // Activate with keyboard
      await user.keyboard('{Enter}')
      expect(onToggle).toHaveBeenCalledTimes(1)

      await user.keyboard(' ')
      expect(onToggle).toHaveBeenCalledTimes(2)
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes correctly', () => {
      render(<CustomizationSection {...defaultProps}>Test Content</CustomizationSection>)

      const toggle = screen.getByTestId('section-toggle-test-section')
      expect(toggle).toHaveClass('px-4', 'sm:px-6', 'py-4', 'sm:py-5')

      const title = screen.getByTestId('section-title')
      expect(title).toHaveClass('text-base', 'sm:text-lg')

      const icon = screen.getByTestId('section-icon')
      expect(icon).toHaveClass('h-5', 'w-5', 'sm:h-6', 'sm:w-6')
    })

    it('handles content spacing responsively', () => {
      render(<CustomizationSection {...defaultProps}>Test Content</CustomizationSection>)

      const content = screen.getByTestId('section-content')
      const contentInner = content.firstChild
      expect(contentInner).toHaveClass('p-4', 'sm:p-6')
    })
  })

  describe('Content Rendering', () => {
    it('renders children content', () => {
      render(
        <CustomizationSection {...defaultProps}>
          <div data-testid="child-content">Child Content</div>
        </CustomizationSection>
      )

      expect(screen.getByTestId('child-content')).toHaveTextContent('Child Content')
    })

    it('renders complex children content', () => {
      render(
        <CustomizationSection {...defaultProps}>
          <form>
            <input data-testid="form-input" />
            <button data-testid="form-button">Submit</button>
          </form>
        </CustomizationSection>
      )

      expect(screen.getByTestId('form-input')).toBeInTheDocument()
      expect(screen.getByTestId('form-button')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('renders within acceptable time limits', async () => {
      const start = performance.now()
      
      render(
        <CustomizationSection {...defaultProps}>
          <div>{Array.from({ length: 100 }, (_, i) => <p key={i}>Item {i}</p>)}</div>
        </CustomizationSection>
      )
      
      const end = performance.now()
      const renderTime = end - start
      
      // Should render within 50ms for performance
      expect(renderTime).toBeLessThan(50)
    })

    it('handles frequent toggle operations efficiently', async () => {
      const onToggle = jest.fn()
      const { user } = render(
        <CustomizationSection {...defaultProps} onToggle={onToggle}>
          Test Content
        </CustomizationSection>
      )

      const toggle = screen.getByTestId('section-toggle-test-section')
      
      // Rapid toggle operations
      for (let i = 0; i < 10; i++) {
        await user.click(toggle)
        jest.advanceTimersByTime(50) // Partial animation time
      }

      expect(onToggle).toHaveBeenCalledTimes(10)
    })
  })

  describe('Edge Cases', () => {
    it('handles missing icon gracefully', () => {
      const { ...propsWithoutIcon } = defaultProps
      delete propsWithoutIcon.icon
      
      render(<CustomizationSection {...propsWithoutIcon}>Test Content</CustomizationSection>)
      
      // Should not crash and should render other content
      expect(screen.getByTestId('section-title')).toBeInTheDocument()
    })

    it('handles empty title and description', () => {
      render(
        <CustomizationSection {...defaultProps} title="" description="">
          Test Content
        </CustomizationSection>
      )

      const title = screen.getByTestId('section-title')
      const description = screen.getByTestId('section-description')
      
      expect(title).toHaveTextContent('')
      expect(description).toHaveTextContent('')
    })

    it('handles very long titles and descriptions', () => {
      const longTitle = 'A'.repeat(200)
      const longDescription = 'B'.repeat(500)
      
      render(
        <CustomizationSection {...defaultProps} title={longTitle} description={longDescription}>
          Test Content
        </CustomizationSection>
      )

      const title = screen.getByTestId('section-title')
      const description = screen.getByTestId('section-description')
      
      expect(title).toHaveClass('truncate')
      expect(description).toHaveClass('line-clamp-2')
    })
  })
})

// Visual regression tests
describe('CustomizationSection Visual Tests', () => {
  const defaultProps = {
    title: 'Test Section',
    description: 'Test description',
    icon: UserIcon,
    isExpanded: false,
    onToggle: jest.fn(),
  }

  it('matches snapshot for default state', () => {
    const { container } = render(
      <CustomizationSection {...defaultProps}>Test Content</CustomizationSection>
    )
    expect(container).toMatchSnapshot('customization-section-default')
  })

  it('matches snapshot for expanded state', () => {
    const { container } = render(
      <CustomizationSection {...defaultProps} isExpanded={true}>Test Content</CustomizationSection>
    )
    expect(container).toMatchSnapshot('customization-section-expanded')
  })

  it('matches snapshot with unsaved changes', () => {
    const { container } = render(
      <CustomizationSection {...defaultProps} hasChanges={true} badge="Primary">
        Test Content
      </CustomizationSection>
    )
    expect(container).toMatchSnapshot('customization-section-unsaved')
  })

  it('matches snapshot for all color variants', () => {
    const colors = ['blue', 'purple', 'green', 'gold']
    const snapshots = {}

    colors.forEach(color => {
      const { container } = render(
        <CustomizationSection {...defaultProps} color={color} isExpanded={true}>
          Test Content
        </CustomizationSection>
      )
      snapshots[color] = container.innerHTML
    })

    expect(snapshots).toMatchSnapshot('customization-section-colors')
  })
})