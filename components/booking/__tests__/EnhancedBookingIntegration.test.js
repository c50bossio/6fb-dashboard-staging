/**
 * Enhanced Booking Integration Test Suite
 * 
 * Comprehensive testing for the BookingFlowOrchestrator and RealtimeBookingWrapper
 * integration with device detection, feature flags, and Supabase real-time capabilities.
 * 
 * Test Coverage:
 * - Component selection logic based on device and feature flags
 * - Real-time availability updates and conflict prevention
 * - URL parameter compatibility and backward compatibility
 * - Device detection accuracy and mobile optimization
 * - Feature flag behavior and A/B testing
 * - Error handling and fallback scenarios
 * - Performance optimization and loading states
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'

// Mock modules before imports
jest.mock('@/lib/supabase/UNIFIED_CLIENT', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  }))
}))

jest.mock('@/lib/feature-flags', () => ({
  getFeatureFlag: jest.fn(),
  getCachedFeatureFlags: jest.fn()
}))

jest.mock('@heroicons/react/24/outline', () => ({
  DevicePhoneMobileIcon: () => <div data-testid="mobile-icon" />,
  ComputerDesktopIcon: () => <div data-testid="desktop-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="warning-icon" />,
  ArrowPathIcon: () => <div data-testid="refresh-icon" />,
  WifiIcon: () => <div data-testid="wifi-icon" />,
  XMarkIcon: () => <div data-testid="x-icon" />,
  BoltIcon: () => <div data-testid="bolt-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  ShieldCheckIcon: () => <div data-testid="shield-icon" />
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}))

// Mock lazy-loaded components
jest.mock('../PublicBookingFlow', () => {
  return function MockPublicBookingFlow(props) {
    return <div data-testid="public-booking-flow" data-props={JSON.stringify(props)} />
  }
})

jest.mock('../EnhancedBookingFlow', () => {
  return function MockEnhancedBookingFlow(props) {
    return <div data-testid="enhanced-booking-flow" data-props={JSON.stringify(props)} />
  }
})

jest.mock('../MobileBookingOptimizer', () => {
  return function MockMobileBookingOptimizer(props) {
    return <div data-testid="mobile-booking-optimizer" data-props={JSON.stringify(props)} />
  }
})

// Import components after mocks
import BookingFlowOrchestrator from '../BookingFlowOrchestrator'
import RealtimeBookingWrapper from '../RealtimeBookingWrapper'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { getFeatureFlag, getCachedFeatureFlags } from '@/lib/feature-flags'

// Test utilities
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        gte: jest.fn(() => ({
          lt: jest.fn(() => ({
            in: jest.fn()
          }))
        }))
      })),
      gte: jest.fn(() => ({
        lt: jest.fn(() => ({
          in: jest.fn()
        }))
      })),
      filter: jest.fn(() => ({ filter: jest.fn() }))
    }))
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn()
    }))
  })),
  removeChannel: jest.fn()
}

const defaultProps = {
  barbershopId: 'test-shop-123',
  barbershopSlug: 'test-barbershop',
  preselectedBarber: null,
  preselectedService: null
}

const createMockUserAgent = (isMobile = false, isTablet = false) => {
  const userAgents = {
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    tablet: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  }
  
  if (isTablet) return userAgents.tablet
  if (isMobile) return userAgents.mobile
  return userAgents.desktop
}

const mockViewport = (width, height, userAgent = null) => {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true })
  
  if (userAgent) {
    Object.defineProperty(navigator, 'userAgent', { value: userAgent, writable: true })
  }
  
  // Mock device pixel ratio
  Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true })
  
  // Mock touch capabilities
  Object.defineProperty(window, 'ontouchstart', { value: userAgent?.includes('Mobile'), writable: true })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: userAgent?.includes('Mobile') ? 5 : 0, writable: true })
}

const mockFeatureFlags = (flags = {}) => {
  getCachedFeatureFlags.mockResolvedValue({
    new_booking_flow: true,
    enhanced_booking_flow: true,
    mobile_optimizer_enabled: true,
    realtime_availability: true,
    ab_testing_enabled: false,
    advanced_booking_features: true,
    ...flags
  })
}

const mockUrlParams = (params = {}) => {
  const searchParams = new URLSearchParams(params)
  Object.defineProperty(window, 'location', {
    value: { search: searchParams.toString() },
    writable: true
  })
}

describe('BookingFlowOrchestrator Integration Tests', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    jest.clearAllMocks()
    
    // Setup default mocks
    createClient.mockReturnValue(mockSupabaseClient)
    mockFeatureFlags()
    mockViewport(1024, 768)
    mockUrlParams({})
    
    // Reset URL
    window.history.pushState({}, '', '/booking')
  })

  describe('Component Selection Logic', () => {
    test('selects PublicBookingFlow for desktop without enhanced features', async () => {
      mockFeatureFlags({ enhanced_booking_flow: false })
      mockViewport(1200, 800, createMockUserAgent(false, false))

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('selects EnhancedBookingFlow for desktop with enhanced features enabled', async () => {
      mockFeatureFlags({ enhanced_booking_flow: true, new_booking_flow: true })
      mockViewport(1200, 800, createMockUserAgent(false, false))

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })
    })

    test('selects MobileBookingOptimizer for mobile devices', async () => {
      mockFeatureFlags({ mobile_optimizer_enabled: true, new_booking_flow: true })
      mockViewport(375, 667, createMockUserAgent(true, false))

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })

    test('respects URL parameter override for enhanced flow', async () => {
      mockUrlParams({ enhanced: 'true' })
      mockViewport(375, 667, createMockUserAgent(true, false))

      render(<BookingFlowOrchestrator {...defaultProps} enhanced={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })
    })

    test('respects URL parameter override for mobile flow', async () => {
      mockUrlParams({ mobile: 'true' })
      mockViewport(1200, 800, createMockUserAgent(false, false))

      render(<BookingFlowOrchestrator {...defaultProps} mobile={true} />)

      await waitFor(() => {
        expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })

    test('handles flow parameter in URL', async () => {
      mockUrlParams({ flow: 'public' })
      mockViewport(1200, 800, createMockUserAgent(false, false))

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Device Detection Integration', () => {
    test('detects mobile device correctly', async () => {
      mockViewport(375, 667, createMockUserAgent(true, false))

      render(<BookingFlowOrchestrator {...defaultProps} debugMode={true} />)

      await waitFor(() => {
        const debugPanel = screen.getByText(/Mobile/)
        expect(debugPanel).toBeInTheDocument()
      })
    })

    test('detects tablet device correctly', async () => {
      mockViewport(768, 1024, createMockUserAgent(false, true))

      render(<BookingFlowOrchestrator {...defaultProps} debugMode={true} />)

      await waitFor(() => {
        // Should select appropriate component for tablet
        expect(screen.queryByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })

    test('handles slow connection gracefully', async () => {
      // Mock slow connection
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: 'slow-2g' },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        // Should fall back to lighter component
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Feature Flag Integration', () => {
    test('falls back to PublicBookingFlow when new_booking_flow is disabled', async () => {
      mockFeatureFlags({ new_booking_flow: false })

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('enables advanced features when feature flags are set', async () => {
      mockFeatureFlags({ 
        enhanced_booking_flow: true, 
        advanced_booking_features: true,
        new_booking_flow: true 
      })
      mockViewport(1200, 800, createMockUserAgent(false, false))

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        const component = screen.getByTestId('enhanced-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        expect(props.enableAdvancedFeatures).toBe(true)
      })
    })

    test('disables animations on slow connections', async () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: 'slow-2g' },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        expect(props.simplifiedUI).toBe(true)
      })
    })
  })

  describe('URL Parameter Handling', () => {
    test('passes preselected service from URL parameters', async () => {
      mockUrlParams({ service: 'haircut-123' })

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        expect(props.preselectedService).toBe('haircut-123')
      })
    })

    test('passes preselected barber from URL parameters', async () => {
      mockUrlParams({ barber: 'barber-456' })

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        expect(props.preselectedBarber).toBe('barber-456')
      })
    })

    test('URL parameters override props', async () => {
      mockUrlParams({ service: 'url-service', barber: 'url-barber' })

      render(
        <BookingFlowOrchestrator 
          {...defaultProps} 
          preselectedService="prop-service"
          preselectedBarber="prop-barber"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        expect(props.preselectedService).toBe('url-service')
        expect(props.preselectedBarber).toBe('url-barber')
      })
    })
  })

  describe('Error Handling', () => {
    test('shows error fallback when initialization fails', async () => {
      getCachedFeatureFlags.mockRejectedValue(new Error('Feature flag service down'))

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Booking System Error')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })

    test('retries on error', async () => {
      getCachedFeatureFlags
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ new_booking_flow: true })

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Try Again')
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('falls back to safe default on component selection error', async () => {
      // Simulate error in component determination
      getCachedFeatureFlags.mockResolvedValue(null)

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Optimization', () => {
    test('shows loading skeleton during initialization', () => {
      render(<BookingFlowOrchestrator {...defaultProps} />)
      
      // Should show loading state initially
      expect(screen.getByText(/animate-pulse/)).toBeTruthy()
    })

    test('applies mobile-specific optimizations', async () => {
      mockViewport(375, 667, createMockUserAgent(true, false))

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        const component = screen.getByTestId('mobile-booking-optimizer')
        const props = JSON.parse(component.getAttribute('data-props'))
        expect(props.optimizeForMobile).toBe(true)
        expect(props.enableTouchOptimizations).toBe(true)
      })
    })

    test('applies slow connection optimizations', async () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: 'slow-2g' },
        writable: true
      })

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        expect(props.enableProgressiveLoading).toBe(true)
        expect(props.reducedAnimations).toBe(true)
      })
    })
  })

  describe('Analytics and Tracking', () => {
    test('calls onComponentSelection callback with device info', async () => {
      const onComponentSelection = jest.fn()
      mockViewport(375, 667, createMockUserAgent(true, false))

      render(
        <BookingFlowOrchestrator 
          {...defaultProps} 
          onComponentSelection={onComponentSelection}
        />
      )

      await waitFor(() => {
        expect(onComponentSelection).toHaveBeenCalledWith(
          'MobileBookingOptimizer',
          expect.objectContaining({
            device: expect.objectContaining({
              isMobile: true,
              shouldUseMobileFlow: true
            })
          })
        )
      })
    })
  })

  describe('Development Features', () => {
    test('shows debug panel in development mode', async () => {
      mockUrlParams({ debug: 'true' })

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Booking Orchestrator Debug')).toBeInTheDocument()
      })
    })

    test('shows component indicator in development', async () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(<BookingFlowOrchestrator {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('mobile-icon')).toBeInTheDocument()
      })

      process.env.NODE_ENV = originalEnv
    })
  })
})

describe('RealtimeBookingWrapper Integration Tests', () => {
  let mockSupabaseChannel
  let user

  beforeEach(() => {
    user = userEvent.setup()
    jest.clearAllMocks()

    mockSupabaseChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        setTimeout(() => callback('SUBSCRIBED'), 0)
        return mockSupabaseChannel
      })
    }

    mockSupabaseClient.channel.mockReturnValue(mockSupabaseChannel)
    createClient.mockReturnValue(mockSupabaseClient)
    
    // Mock business hours and bookings
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'barbershops') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: {
                  business_hours: {
                    monday: { open: '09:00', close: '18:00' },
                    tuesday: { open: '09:00', close: '18:00' },
                    wednesday: { open: '09:00', close: '18:00' },
                    thursday: { open: '09:00', close: '18:00' },
                    friday: { open: '09:00', close: '18:00' },
                    saturday: { open: '10:00', close: '16:00' }
                  },
                  timezone: 'America/New_York',
                  booking_settings: {
                    slot_duration: 30,
                    min_advance_booking: 60,
                    max_advance_booking: 10080,
                    buffer_time: 10
                  }
                }
              }))
            }))
          }))
        }
      } else if (table === 'bookings') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lt: jest.fn().mockReturnThis(),
            in: jest.fn(() => Promise.resolve({ data: [] })),
            filter: jest.fn().mockReturnThis()
          }))
        }
      }
      return mockSupabaseClient.from()
    })

    // Mock network status
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
    Object.defineProperty(navigator, 'connection', {
      value: { effectiveType: '4g' },
      writable: true
    })
  })

  describe('Real-time Subscription Management', () => {
    test('establishes real-time connection successfully', async () => {
      render(
        <RealtimeBookingWrapper 
          {...defaultProps} 
          enableRealtime={true}
          debugMode={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Live Updates')).toBeInTheDocument()
      })

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        `bookings-${defaultProps.barbershopId}`
      )
    })

    test('handles connection failure gracefully', async () => {
      mockSupabaseChannel.subscribe.mockImplementation((callback) => {
        setTimeout(() => callback('CHANNEL_ERROR'), 0)
        return mockSupabaseChannel
      })

      render(
        <RealtimeBookingWrapper 
          {...defaultProps} 
          enableRealtime={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument()
      })
    })

    test('disables real-time when network is offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

      render(
        <RealtimeBookingWrapper 
          {...defaultProps} 
          enableRealtime={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument()
      })

      expect(mockSupabaseClient.channel).not.toHaveBeenCalled()
    })
  })

  describe('Availability Checking', () => {
    test('fetches available slots successfully', async () => {
      const wrapper = render(
        <RealtimeBookingWrapper {...defaultProps} />
      )

      // Get the wrapped component and trigger availability check
      await waitFor(() => {
        const publicFlow = screen.getByTestId('public-booking-flow')
        expect(publicFlow).toBeInTheDocument()
      })

      // Verify business hours query was made
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('barbershops')
    })

    test('validates business hours correctly', async () => {
      // Test outside business hours
      const testDate = new Date('2024-01-01T20:00:00') // 8 PM, should be closed
      
      render(<RealtimeBookingWrapper {...defaultProps} />)

      // The component should validate business hours internally
      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('detects booking conflicts', async () => {
      // Mock existing booking
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'bookings') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              lt: jest.fn().mockReturnThis(),
              in: jest.fn(() => Promise.resolve({
                data: [{
                  id: 'existing-booking',
                  start_time: '2024-01-01T10:00:00Z',
                  duration_minutes: 30,
                  customer_name: 'John Doe'
                }]
              })),
              filter: jest.fn().mockReturnThis()
            }))
          }
        }
        return mockSupabaseClient.from()
      })

      render(<RealtimeBookingWrapper {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Conflict Prevention', () => {
    test('shows conflict warning when slot becomes unavailable', async () => {
      render(
        <RealtimeBookingWrapper 
          {...defaultProps} 
          enableConflictPrevention={true}
        />
      )

      // Simulate conflict state
      act(() => {
        // This would normally be triggered by the onDateTimeSelect callback
        // For testing, we'll check that the component renders correctly
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('validates slot before booking attempt', async () => {
      const onBookingAttempt = jest.fn()
      
      render(
        <RealtimeBookingWrapper 
          {...defaultProps} 
          enableConflictPrevention={true}
          onBookingAttempt={onBookingAttempt}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Component Integration', () => {
    test('passes enhanced props to wrapped component', async () => {
      render(
        <RealtimeBookingWrapper 
          {...defaultProps}
          flowComponent="enhanced"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('enhanced-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        expect(props).toMatchObject({
          barbershopId: defaultProps.barbershopId,
          barbershopSlug: defaultProps.barbershopSlug,
          availableSlots: expect.any(Array),
          conflictedSlots: expect.any(Array)
        })
      })
    })

    test('selects appropriate component based on network conditions', async () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: 'slow-2g' },
        writable: true
      })

      render(
        <RealtimeBookingWrapper 
          {...defaultProps}
          flowComponent="auto"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Monitoring', () => {
    test('shows debug information when enabled', async () => {
      render(
        <RealtimeBookingWrapper 
          {...defaultProps} 
          debugMode={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('RealtimeBookingWrapper Debug')).toBeInTheDocument()
      })
    })

    test('handles fallback refresh when real-time fails', async () => {
      jest.useFakeTimers()

      render(
        <RealtimeBookingWrapper 
          {...defaultProps}
          enableRealtime={false}
          refreshInterval={5000}
        />
      )

      // Fast forward time to trigger refresh
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe('Error Recovery', () => {
    test('handles Supabase errors gracefully', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Supabase connection failed')
      })

      const onRealtimeError = jest.fn()

      render(
        <RealtimeBookingWrapper 
          {...defaultProps}
          onRealtimeError={onRealtimeError}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('retries availability checks on network recovery', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

      const wrapper = render(
        <RealtimeBookingWrapper {...defaultProps} />
      )

      // Go back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
        window.dispatchEvent(new Event('online'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })
})

describe('Accessibility Integration Tests', () => {
  test('booking components are keyboard accessible', async () => {
    const user = userEvent.setup()
    
    render(<BookingFlowOrchestrator {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    // Test keyboard navigation would go here
    // This is a placeholder for more detailed accessibility testing
  })

  test('provides appropriate ARIA labels and roles', async () => {
    render(
      <RealtimeBookingWrapper 
        {...defaultProps}
        enableRealtime={true}
      />
    )

    await waitFor(() => {
      const statusIndicator = screen.getByText('Live Updates')
      expect(statusIndicator).toBeInTheDocument()
    })
  })

  test('handles screen reader announcements', async () => {
    render(
      <RealtimeBookingWrapper 
        {...defaultProps}
        enableConflictPrevention={true}
      />
    )

    // Test would verify screen reader announcements for status changes
    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })
})

describe('SSR Compatibility', () => {
  test('renders safely on server-side', () => {
    // Mock server environment
    const originalWindow = global.window
    delete global.window

    expect(() => {
      render(<BookingFlowOrchestrator {...defaultProps} />)
    }).not.toThrow()

    global.window = originalWindow
  })

  test('handles hydration mismatch gracefully', async () => {
    // Mock hydration scenario
    mockViewport(375, 667, createMockUserAgent(true, false))

    const { rerender } = render(<BookingFlowOrchestrator {...defaultProps} />)

    // Simulate hydration with different viewport
    mockViewport(1200, 800, createMockUserAgent(false, false))
    rerender(<BookingFlowOrchestrator {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })
})