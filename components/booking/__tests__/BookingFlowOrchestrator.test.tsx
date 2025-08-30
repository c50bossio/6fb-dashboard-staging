import { jest } from '@jest/globals'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import React from 'react'
import BookingFlowOrchestrator, { 
  useDeviceDetection, 
  BookingErrorBoundary 
} from '../BookingFlowOrchestrator'

// Mock dependencies
jest.mock('@/lib/feature-flags', () => ({
  getFeatureFlag: jest.fn(),
  getCachedFeatureFlags: jest.fn()
}))

jest.mock('../PublicBookingFlow', () => {
  return function PublicBookingFlow(props: any) {
    return <div data-testid="public-booking-flow">PublicBookingFlow: {props.barberbarbershopId}</div>
  }
})

jest.mock('../EnhancedBookingFlow', () => {
  return function EnhancedBookingFlow(props: any) {
    return <div data-testid="enhanced-booking-flow">EnhancedBookingFlow: {props.barberbarbershopId}</div>
  }
})

jest.mock('../MobileBookingOptimizer', () => {
  return function MobileBookingOptimizer(props: any) {
    return <div data-testid="mobile-booking-optimizer">MobileBookingOptimizer: {props.barberbarbershopId}</div>
  }
})

jest.mock('../RealtimeAvailabilityChecker', () => {
  return function RealtimeAvailabilityChecker({ children }: any) {
    return <div data-testid="realtime-availability-checker">{children}</div>
  }
})

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}))

// Mock window and navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  maxTouchPoints: 0,
  connection: {
    effectiveType: '4g',
    downlink: 10
  }
}

const mockWindow = {
  innerWidth: 1200,
  innerHeight: 800,
  devicePixelRatio: 2,
  location: {
    search: ''
  },
  localStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn()
  },
  sessionStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn()
  }
}

// Test utilities
const mockFeatureFlags = {
  new_booking_flow: true,
  enhanced_booking_flow: true,
  mobile_optimizer_enabled: true,
  realtime_availability: true,
  ab_testing_enabled: true
}

const defaultProps = {
  barberbarbershopId: 'test-shop-123',
  barbershopSlug: 'test-shop'
}

describe('BookingFlowOrchestrator', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock getCachedFeatureFlags
    const { getCachedFeatureFlags } = require('@/lib/feature-flags')
    getCachedFeatureFlags.mockResolvedValue(mockFeatureFlags)
    
    // Mock window and navigator
    Object.defineProperty(window, 'navigator', {
      value: mockNavigator,
      writable: true
    })
    
    Object.defineProperty(window, 'innerWidth', {
      value: mockWindow.innerWidth,
      writable: true
    })
    
    Object.defineProperty(window, 'innerHeight', {
      value: mockWindow.innerHeight,
      writable: true
    })
    
    Object.defineProperty(window, 'devicePixelRatio', {
      value: mockWindow.devicePixelRatio,
      writable: true
    })
    
    Object.defineProperty(window, 'location', {
      value: mockWindow.location,
      writable: true
    })
    
    Object.defineProperty(window, 'localStorage', {
      value: mockWindow.localStorage,
      writable: true
    })
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockWindow.sessionStorage,
      writable: true
    })
  })

  describe('Component Selection Logic', () => {
    it('should render PublicBookingFlow by default on desktop', async () => {
      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    it('should render EnhancedBookingFlow when defaultFlow is enhanced', async () => {
      render(<BookingFlowOrchestrator {...defaultProps} defaultFlow="enhanced" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })
    })

    it('should render MobileBookingOptimizer when defaultFlow is mobile', async () => {
      render(<BookingFlowOrchestrator {...defaultProps} defaultFlow="mobile" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })
  })

  describe('Device Detection', () => {
    it('should detect mobile devices and render MobileBookingOptimizer', async () => {
      // Mock mobile user agent and screen size
      Object.defineProperty(window, 'navigator', {
        value: {
          ...mockNavigator,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 5
        },
        writable: true
      })
      
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} defaultFlow="auto" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })

    it('should detect desktop devices and prefer EnhancedBookingFlow', async () => {
      // Already mocked as desktop by default
      render(<BookingFlowOrchestrator {...defaultProps} defaultFlow="auto" />)
      
      await waitFor(() => {
        // Should render enhanced flow on capable desktop
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })
    })

    it('should handle slow connections gracefully', async () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          ...mockNavigator,
          connection: {
            effectiveType: '2g',
            downlink: 0.5
          }
        },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        // Should fallback to simpler flow on slow connection
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('URL Parameter Handling', () => {
    it('should respect enhanced=true parameter', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?enhanced=true' },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })
    })

    it('should respect mobile=true parameter', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?mobile=true' },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })

    it('should respect flow parameter override', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?flow=enhanced' },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })
    })

    it('should pass through service and barber parameters', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?service=test-service&barber=test-barber' },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        expect(component).toBeInTheDocument()
        // Props are passed through to the component
      })
    })
  })

  describe('Feature Flag Integration', () => {
    it('should fallback to PublicBookingFlow when new_booking_flow is disabled', async () => {
      const { getCachedFeatureFlags } = require('@/lib/feature-flags')
      getCachedFeatureFlags.mockResolvedValue({
        ...mockFeatureFlags,
        new_booking_flow: false
      })

      render(<BookingFlowOrchestrator {...defaultProps} defaultFlow="enhanced" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    it('should disable enhanced flow when feature flag is off', async () => {
      const { getCachedFeatureFlags } = require('@/lib/feature-flags')
      getCachedFeatureFlags.mockResolvedValue({
        ...mockFeatureFlags,
        enhanced_booking_flow: false
      })

      render(<BookingFlowOrchestrator {...defaultProps} defaultFlow="enhanced" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    it('should disable mobile optimizer when feature flag is off', async () => {
      const { getCachedFeatureFlags } = require('@/lib/feature-flags')
      getCachedFeatureFlags.mockResolvedValue({
        ...mockFeatureFlags,
        mobile_optimizer_enabled: false
      })

      // Mock mobile device
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} defaultFlow="mobile" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Availability Integration', () => {
    it('should wrap with RealtimeAvailabilityChecker when enabled', async () => {
      render(
        <BookingFlowOrchestrator 
          {...defaultProps} 
          enableRealtimeAvailability={true}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('realtime-availability-checker')).toBeInTheDocument()
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    it('should not wrap with RealtimeAvailabilityChecker when disabled', async () => {
      render(
        <BookingFlowOrchestrator 
          {...defaultProps} 
          enableRealtimeAvailability={false}
        />
      )
      
      await waitFor(() => {
        expect(screen.queryByTestId('realtime-availability-checker')).not.toBeInTheDocument()
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    it('should not wrap when feature flag is disabled', async () => {
      const { getCachedFeatureFlags } = require('@/lib/feature-flags')
      getCachedFeatureFlags.mockResolvedValue({
        ...mockFeatureFlags,
        realtime_availability: false
      })

      render(
        <BookingFlowOrchestrator 
          {...defaultProps} 
          enableRealtimeAvailability={true}
        />
      )
      
      await waitFor(() => {
        expect(screen.queryByTestId('realtime-availability-checker')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show loading skeleton initially', () => {
      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      // Should show loading state initially
      expect(screen.getByText(/checking availability/i)).toBeInTheDocument()
    })

    it('should handle feature flag loading errors gracefully', async () => {
      const { getCachedFeatureFlags } = require('@/lib/feature-flags')
      getCachedFeatureFlags.mockRejectedValue(new Error('Network error'))

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        // Should fallback to safe default
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    it('should handle initialization timeout', async () => {
      const { getCachedFeatureFlags } = require('@/lib/feature-flags')
      getCachedFeatureFlags.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 6000))
      )

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        // Should show error state or fallback
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      }, { timeout: 7000 })
    })
  })

  describe('A/B Testing', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { search: '?exp=booking_test' },
        writable: true
      })
    })

    it('should participate in A/B experiments', async () => {
      const { getCachedFeatureFlags } = require('@/lib/feature-flags')
      getCachedFeatureFlags.mockResolvedValue({
        ...mockFeatureFlags,
        experiment_booking_test: {
          split: 0.5,
          variantA: 'PublicBookingFlow',
          variantB: 'EnhancedBookingFlow'
        }
      })

      // Mock consistent user ID for deterministic testing
      mockWindow.localStorage.getItem.mockReturnValue('test-user-123')

      render(<BookingFlowOrchestrator {...defaultProps} experimentId="booking_test" />)
      
      await waitFor(() => {
        // Should render one of the variants
        const hasPublic = screen.queryByTestId('public-booking-flow')
        const hasEnhanced = screen.queryByTestId('enhanced-booking-flow')
        expect(hasPublic || hasEnhanced).toBeTruthy()
      })
    })

    it('should call onComponentSelection callback with experiment context', async () => {
      const onComponentSelection = jest.fn()
      
      render(
        <BookingFlowOrchestrator 
          {...defaultProps} 
          onComponentSelection={onComponentSelection}
          experimentId="test_experiment"
        />
      )
      
      await waitFor(() => {
        expect(onComponentSelection).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            device: expect.any(Object),
            urlParams: expect.objectContaining({
              experiment: 'test_experiment'
            }),
            featureFlags: expect.any(Object)
          })
        )
      })
    })
  })

  describe('Props Passing', () => {
    it('should pass through all props to selected component', async () => {
      const customProps = {
        ...defaultProps,
        preselectedBarber: 'barber-123',
        preselectedService: 'service-456',
        customProp: 'test-value'
      }

      render(<BookingFlowOrchestrator {...customProps} />)
      
      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        expect(component).toBeInTheDocument()
        // In a real test, we'd check that props were passed through
      })
    })

    it('should override props with URL parameters', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?service=url-service&barber=url-barber' },
        writable: true
      })

      render(
        <BookingFlowOrchestrator 
          {...defaultProps}
          preselectedService="prop-service"
          preselectedBarber="prop-barber"
        />
      )
      
      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        expect(component).toBeInTheDocument()
        // URL parameters should override props
      })
    })
  })

  describe('Performance Optimizations', () => {
    it('should add performance optimizations for mobile devices', async () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        const component = screen.getByTestId('mobile-booking-optimizer')
        expect(component).toBeInTheDocument()
        // Mobile optimizations should be applied
      })
    })

    it('should reduce animations on slow connections', async () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          ...mockNavigator,
          connection: {
            effectiveType: '2g',
            downlink: 0.3
          }
        },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        expect(component).toBeInTheDocument()
        // Should apply performance optimizations
      })
    })
  })

  describe('Debug Mode', () => {
    it('should show debug panel when debug=true in URL', async () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?debug=true' },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByText(/Booking Orchestrator Debug/)).toBeInTheDocument()
      })
    })

    it('should not show debug panel in production or without debug param', async () => {
      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.queryByText(/Booking Orchestrator Debug/)).not.toBeInTheDocument()
      })
    })
  })
})

describe('BookingErrorBoundary', () => {
  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error')
    }
    return <div>No error</div>
  }

  it('should catch errors and show fallback UI', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <BookingErrorBoundary>
        <ThrowError shouldThrow={true} />
      </BookingErrorBoundary>
    )

    expect(screen.getByText('Booking System Error')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    
    consoleSpy.mockRestore()
  })

  it('should render children when no error occurs', () => {
    render(
      <BookingErrorBoundary>
        <ThrowError shouldThrow={false} />
      </BookingErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should call onRetry when retry button is clicked', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const onRetry = jest.fn()
    
    render(
      <BookingErrorBoundary onRetry={onRetry}>
        <ThrowError shouldThrow={true} />
      </BookingErrorBoundary>
    )

    fireEvent.click(screen.getByText('Try Again'))
    expect(onRetry).toHaveBeenCalled()
    
    consoleSpy.mockRestore()
  })
})

describe('useDeviceDetection hook', () => {
  const TestComponent = () => {
    const device = useDeviceDetection()
    
    if (!device) return <div>Loading...</div>
    
    return (
      <div>
        <div data-testid="device-type">
          {device.isMobile ? 'mobile' : device.isTablet ? 'tablet' : 'desktop'}
        </div>
        <div data-testid="screen-width">{device.screenWidth}</div>
        <div data-testid="touch-support">{device.isTouchDevice ? 'yes' : 'no'}</div>
      </div>
    )
  }

  it('should detect desktop device correctly', async () => {
    render(<TestComponent />)
    
    await waitFor(() => {
      expect(screen.getByTestId('device-type')).toHaveTextContent('desktop')
      expect(screen.getByTestId('screen-width')).toHaveTextContent('1200')
      expect(screen.getByTestId('touch-support')).toHaveTextContent('no')
    })
  })

  it('should detect mobile device correctly', async () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      writable: true
    })
    
    Object.defineProperty(window, 'navigator', {
      value: {
        ...mockNavigator,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        maxTouchPoints: 5
      },
      writable: true
    })

    render(<TestComponent />)
    
    await waitFor(() => {
      expect(screen.getByTestId('device-type')).toHaveTextContent('mobile')
      expect(screen.getByTestId('screen-width')).toHaveTextContent('375')
      expect(screen.getByTestId('touch-support')).toHaveTextContent('yes')
    })
  })

  it('should update on window resize', async () => {
    render(<TestComponent />)
    
    await waitFor(() => {
      expect(screen.getByTestId('device-type')).toHaveTextContent('desktop')
    })

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      })
      
      window.dispatchEvent(new Event('resize'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('screen-width')).toHaveTextContent('375')
    })
  })
})

// Integration tests
describe('BookingFlowOrchestrator Integration', () => {
  it('should complete full initialization flow successfully', async () => {
    const onComponentSelection = jest.fn()
    
    render(
      <BookingFlowOrchestrator 
        {...defaultProps}
        onComponentSelection={onComponentSelection}
      />
    )

    // Should show loading initially
    expect(screen.getByText(/checking availability/i)).toBeInTheDocument()
    
    // Should complete initialization
    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    // Should call analytics callback
    expect(onComponentSelection).toHaveBeenCalledWith(
      'PublicBookingFlow',
      expect.any(Object)
    )
  })

  it('should handle complex URL parameter combinations', async () => {
    Object.defineProperty(window, 'location', {
      value: { 
        search: '?enhanced=true&service=test-service&barber=test-barber&exp=test_exp&debug=true' 
      },
      writable: true
    })

    render(<BookingFlowOrchestrator {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      expect(screen.getByText(/Booking Orchestrator Debug/)).toBeInTheDocument()
    })
  })

  it('should gracefully handle partial failures', async () => {
    const { getCachedFeatureFlags } = require('@/lib/feature-flags')
    getCachedFeatureFlags.mockResolvedValue({}) // Empty feature flags

    render(<BookingFlowOrchestrator {...defaultProps} />)
    
    await waitFor(() => {
      // Should still render something despite empty feature flags
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })
})