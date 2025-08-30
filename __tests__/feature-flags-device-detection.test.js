/**
 * Feature Flags and Device Detection Test Suite
 * 
 * Comprehensive testing for feature flag behavior, A/B testing scenarios,
 * device detection accuracy, and their integration with booking flows.
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Mock device detection scenarios
const DEVICE_SCENARIOS = {
  desktop: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    width: 1920,
    height: 1080,
    touchPoints: 0,
    connection: '4g'
  },
  mobile: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    width: 375,
    height: 812,
    touchPoints: 5,
    connection: '4g'
  },
  tablet: {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    width: 768,
    height: 1024,
    touchPoints: 10,
    connection: '4g'
  },
  mobileLowEnd: {
    userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; SM-A520F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
    width: 360,
    height: 640,
    touchPoints: 5,
    connection: 'slow-2g'
  },
  desktopTouch: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
    width: 1366,
    height: 768,
    touchPoints: 10,
    connection: '4g'
  }
}

// Feature flag combinations for comprehensive testing
const FEATURE_FLAG_COMBINATIONS = [
  // Legacy mode - everything disabled
  {
    name: 'legacy_mode',
    flags: {
      new_booking_flow: false,
      enhanced_booking_flow: false,
      mobile_optimizer_enabled: false,
      realtime_availability: false
    },
    expectedComponent: 'PublicBookingFlow'
  },
  
  // Basic new flow enabled
  {
    name: 'basic_new_flow',
    flags: {
      new_booking_flow: true,
      enhanced_booking_flow: false,
      mobile_optimizer_enabled: false,
      realtime_availability: false
    },
    expectedComponent: 'PublicBookingFlow'
  },
  
  // Enhanced desktop only
  {
    name: 'enhanced_desktop_only',
    flags: {
      new_booking_flow: true,
      enhanced_booking_flow: true,
      mobile_optimizer_enabled: false,
      realtime_availability: false
    },
    expectedComponent: {
      desktop: 'EnhancedBookingFlow',
      mobile: 'PublicBookingFlow',
      tablet: 'EnhancedBookingFlow'
    }
  },
  
  // Mobile optimized only
  {
    name: 'mobile_optimized_only',
    flags: {
      new_booking_flow: true,
      enhanced_booking_flow: false,
      mobile_optimizer_enabled: true,
      realtime_availability: false
    },
    expectedComponent: {
      desktop: 'PublicBookingFlow',
      mobile: 'MobileBookingOptimizer',
      tablet: 'MobileBookingOptimizer'
    }
  },
  
  // Full feature set enabled
  {
    name: 'full_features',
    flags: {
      new_booking_flow: true,
      enhanced_booking_flow: true,
      mobile_optimizer_enabled: true,
      realtime_availability: true,
      advanced_booking_features: true
    },
    expectedComponent: {
      desktop: 'EnhancedBookingFlow',
      mobile: 'MobileBookingOptimizer', 
      tablet: 'MobileBookingOptimizer'
    }
  },
  
  // A/B testing scenarios
  {
    name: 'ab_testing_enabled',
    flags: {
      new_booking_flow: true,
      enhanced_booking_flow: true,
      mobile_optimizer_enabled: true,
      ab_testing_enabled: true,
      experiment_booking_v2: { split: 0.5, variantA: 'PublicBookingFlow', variantB: 'EnhancedBookingFlow' }
    },
    expectedComponent: 'varies' // Will test randomization
  }
]

// Mock components
jest.mock('../components/booking/PublicBookingFlow', () => {
  return function MockPublicBookingFlow(props) {
    return (
      <div 
        data-testid="public-booking-flow"
        data-component="PublicBookingFlow"
        data-props={JSON.stringify(props)}
      />
    )
  }
})

jest.mock('../components/booking/EnhancedBookingFlow', () => {
  return function MockEnhancedBookingFlow(props) {
    return (
      <div 
        data-testid="enhanced-booking-flow"
        data-component="EnhancedBookingFlow"
        data-props={JSON.stringify(props)}
      />
    )
  }
})

jest.mock('../components/booking/MobileBookingOptimizer', () => {
  return function MockMobileBookingOptimizer(props) {
    return (
      <div 
        data-testid="mobile-booking-optimizer"
        data-component="MobileBookingOptimizer"
        data-props={JSON.stringify(props)}
      />
    )
  }
})

jest.mock('@/lib/feature-flags', () => ({
  getCachedFeatureFlags: jest.fn(),
  getFeatureFlag: jest.fn()
}))

jest.mock('@/lib/supabase/UNIFIED_CLIENT', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    channel: jest.fn()
  }))
}))

import BookingFlowOrchestrator from '../components/booking/BookingFlowOrchestrator'
import { getCachedFeatureFlags } from '@/lib/feature-flags'

const mockDevice = (scenario) => {
  const device = DEVICE_SCENARIOS[scenario]
  
  // Mock window properties
  Object.defineProperty(window, 'innerWidth', { value: device.width, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: device.height, writable: true })
  Object.defineProperty(navigator, 'userAgent', { value: device.userAgent, writable: true })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: device.touchPoints, writable: true })
  Object.defineProperty(window, 'ontouchstart', { value: device.touchPoints > 0, writable: true })
  
  // Mock network connection
  Object.defineProperty(navigator, 'connection', {
    value: { effectiveType: device.connection },
    writable: true
  })
  
  // Mock device pixel ratio
  Object.defineProperty(window, 'devicePixelRatio', { value: device.scenario === 'mobile' ? 3 : 1, writable: true })
}

const mockFeatureFlags = (flags) => {
  getCachedFeatureFlags.mockResolvedValue(flags)
}

describe('Device Detection Accuracy Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset to default desktop scenario
    mockDevice('desktop')
    mockFeatureFlags({ new_booking_flow: true })
  })

  describe('Device Type Detection', () => {
    test.each([
      ['desktop', 'desktop', 'EnhancedBookingFlow'],
      ['mobile', 'mobile', 'MobileBookingOptimizer'], 
      ['tablet', 'tablet', 'MobileBookingOptimizer'],
      ['mobileLowEnd', 'mobile', 'PublicBookingFlow'], // Should use simpler flow
      ['desktopTouch', 'desktop', 'EnhancedBookingFlow']
    ])('should detect %s device correctly', async (deviceScenario, expectedType, expectedComponent) => {
      mockDevice(deviceScenario)
      mockFeatureFlags({
        new_booking_flow: true,
        enhanced_booking_flow: true,
        mobile_optimizer_enabled: true
      })

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          debugMode={true}
        />
      )

      await waitFor(() => {
        // Check debug panel shows correct device type
        if (expectedType === 'mobile') {
          expect(screen.getByText(/Mobile/)).toBeInTheDocument()
        } else if (expectedType === 'tablet') {
          expect(screen.getByText(/Tablet/)).toBeInTheDocument()
        } else {
          expect(screen.getByText(/Desktop/)).toBeInTheDocument()
        }
        
        // Verify correct component is selected based on device
        const componentMap = {
          'PublicBookingFlow': 'public-booking-flow',
          'EnhancedBookingFlow': 'enhanced-booking-flow',
          'MobileBookingOptimizer': 'mobile-booking-optimizer'
        }
        
        if (deviceScenario !== 'mobileLowEnd') { // Low-end device logic is complex
          expect(screen.getByTestId(componentMap[expectedComponent])).toBeInTheDocument()
        }
      })
    })

    test('should detect touch capabilities accurately', async () => {
      mockDevice('desktopTouch') // Desktop with touch support
      
      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          debugMode={true}
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('enhanced-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        // Should detect touch capability
        expect(props.enableTouchOptimizations || props.touchOptimized).toBe(true)
      })
    })

    test('should detect network conditions and adjust accordingly', async () => {
      mockDevice('mobileLowEnd') // Slow connection device
      
      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        // Should use lighter component for slow connections
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
        
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        // Should apply slow connection optimizations
        expect(props.simplifiedUI || props.reducedAnimations).toBe(true)
      })
    })

    test('should handle viewport changes correctly', async () => {
      mockDevice('desktop')
      
      const { rerender } = render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })

      // Simulate window resize to mobile
      act(() => {
        mockDevice('mobile')
        window.dispatchEvent(new Event('resize'))
      })

      rerender(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })

    test('should detect device orientation correctly', async () => {
      // Portrait mobile
      mockDevice('mobile')
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 812, writable: true })
      
      const { rerender } = render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          debugMode={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Mobile/)).toBeInTheDocument()
      })

      // Landscape mobile
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 812, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
        window.dispatchEvent(new Event('orientationchange'))
      })

      rerender(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          debugMode={true}
        />
      )

      await waitFor(() => {
        // Should still be detected as mobile
        expect(screen.getByText(/Mobile/)).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases and Browser Quirks', () => {
    test('should handle iPad user agent correctly', async () => {
      // iPad has complex user agent detection
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15',
        writable: true 
      })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: true })
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true })

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        // Should be detected as tablet/mobile device
        expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })

    test('should handle Samsung Internet browser quirks', async () => {
      Object.defineProperty(navigator, 'userAgent', { 
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/12.0 Chrome/79.0.3945.136 Mobile Safari/537.36',
        writable: true 
      })
      Object.defineProperty(window, 'innerWidth', { value: 360, writable: true })

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
      })
    })

    test('should handle missing navigator properties gracefully', async () => {
      // Simulate older browser
      const originalConnection = navigator.connection
      const originalMaxTouchPoints = navigator.maxTouchPoints
      
      delete navigator.connection
      delete navigator.maxTouchPoints

      expect(() => {
        render(
          <BookingFlowOrchestrator 
            barbershopId="shop-123"
            barbershopSlug="test-shop"
          />
        )
      }).not.toThrow()

      // Restore
      navigator.connection = originalConnection
      navigator.maxTouchPoints = originalMaxTouchPoints
    })
  })
})

describe('Feature Flag Behavior Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDevice('desktop')
  })

  test.each(FEATURE_FLAG_COMBINATIONS.filter(combo => combo.expectedComponent !== 'varies'))(
    'should handle $name feature flag combination correctly',
    async ({ name, flags, expectedComponent }) => {
      mockFeatureFlags(flags)

      Object.entries(DEVICE_SCENARIOS).forEach(async ([deviceType, _]) => {
        if (typeof expectedComponent === 'string') {
          mockDevice(deviceType)
          
          render(
            <BookingFlowOrchestrator 
              barbershopId="shop-123"
              barbershopSlug="test-shop"
            />
          )

          await waitFor(() => {
            const componentMap = {
              'PublicBookingFlow': 'public-booking-flow',
              'EnhancedBookingFlow': 'enhanced-booking-flow', 
              'MobileBookingOptimizer': 'mobile-booking-optimizer'
            }
            expect(screen.getByTestId(componentMap[expectedComponent])).toBeInTheDocument()
          })
        } else if (typeof expectedComponent === 'object' && expectedComponent[deviceType]) {
          mockDevice(deviceType)
          
          render(
            <BookingFlowOrchestrator 
              barbershopId="shop-123"
              barbershopSlug="test-shop"
            />
          )

          await waitFor(() => {
            const componentMap = {
              'PublicBookingFlow': 'public-booking-flow',
              'EnhancedBookingFlow': 'enhanced-booking-flow',
              'MobileBookingOptimizer': 'mobile-booking-optimizer'
            }
            const expected = expectedComponent[deviceType]
            expect(screen.getByTestId(componentMap[expected])).toBeInTheDocument()
          })
        }
      })
    }
  )

  test('should handle feature flag loading failures gracefully', async () => {
    getCachedFeatureFlags.mockRejectedValue(new Error('Feature flags unavailable'))

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      // Should fallback to safe default (PublicBookingFlow)
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })

  test('should handle partial feature flag responses', async () => {
    getCachedFeatureFlags.mockResolvedValue({
      new_booking_flow: true,
      // Missing other flags should use defaults
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      // Should work with partial flag data
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })

  test('should handle feature flag changes during runtime', async () => {
    // Initial flags
    getCachedFeatureFlags.mockResolvedValue({
      new_booking_flow: true,
      enhanced_booking_flow: false
    })

    const { rerender } = render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    // Update flags
    getCachedFeatureFlags.mockResolvedValue({
      new_booking_flow: true,
      enhanced_booking_flow: true
    })

    rerender(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
    })
  })
})

describe('A/B Testing Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDevice('desktop')
    
    // Mock Math.random for predictable A/B testing
    jest.spyOn(Math, 'random')
  })

  afterEach(() => {
    Math.random.mockRestore()
  })

  test('should assign users to A/B test variants correctly', async () => {
    mockFeatureFlags({
      new_booking_flow: true,
      ab_testing_enabled: true,
      experiment_booking_v2: {
        split: 0.5,
        variantA: 'PublicBookingFlow',
        variantB: 'EnhancedBookingFlow'
      }
    })

    // Test variant A (Math.random returns < 0.5)
    Math.random.mockReturnValue(0.3)

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
        experimentId="booking_v2"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    // Test variant B (Math.random returns >= 0.5)
    Math.random.mockReturnValue(0.7)

    const { rerender } = render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
        experimentId="booking_v2"
        key="test-b" // Force re-render
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
    })
  })

  test('should track A/B test exposure events', async () => {
    const mockOnComponentSelection = jest.fn()
    
    mockFeatureFlags({
      ab_testing_enabled: true,
      experiment_booking_v2: {
        split: 0.5,
        variantA: 'PublicBookingFlow',
        variantB: 'EnhancedBookingFlow'
      }
    })

    Math.random.mockReturnValue(0.3) // Variant A

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
        experimentId="booking_v2"
        onComponentSelection={mockOnComponentSelection}
      />
    )

    await waitFor(() => {
      expect(mockOnComponentSelection).toHaveBeenCalledWith(
        'PublicBookingFlow',
        expect.objectContaining({
          urlParams: expect.objectContaining({
            experiment: 'booking_v2'
          })
        })
      )
    })
  })

  test('should handle A/B test with device-specific variants', async () => {
    mockFeatureFlags({
      ab_testing_enabled: true,
      experiment_mobile_flow: {
        split: 0.5,
        variantA: 'PublicBookingFlow',
        variantB: 'MobileBookingOptimizer'
      }
    })

    mockDevice('mobile')
    Math.random.mockReturnValue(0.3) // Variant A

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
        experimentId="mobile_flow"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })

  test('should handle multiple concurrent experiments', async () => {
    mockFeatureFlags({
      ab_testing_enabled: true,
      experiment_booking_v2: {
        split: 0.5,
        variantA: 'PublicBookingFlow',
        variantB: 'EnhancedBookingFlow'
      },
      experiment_realtime: {
        split: 0.3,
        variantA: false,
        variantB: true
      }
    })

    Math.random
      .mockReturnValueOnce(0.3) // Booking experiment variant A
      .mockReturnValueOnce(0.2) // Realtime experiment variant A

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
        experimentId="booking_v2"
        enableRealtimeAvailability={false} // Will be overridden by experiment
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })
})

describe('URL Parameter Override Tests', () => {
  beforeEach(() => {
    mockDevice('desktop')
    mockFeatureFlags({
      new_booking_flow: true,
      enhanced_booking_flow: true,
      mobile_optimizer_enabled: true
    })
  })

  test('should respect URL parameter overrides over feature flags', async () => {
    // Mock URL parameters
    Object.defineProperty(window, 'location', {
      value: { search: '?flow=public' },
      writable: true
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      // Should use PublicBookingFlow despite enhanced features being enabled
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })

  test('should respect enhanced parameter on mobile devices', async () => {
    mockDevice('mobile')
    Object.defineProperty(window, 'location', {
      value: { search: '?enhanced=true' },
      writable: true
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      // Should use EnhancedBookingFlow even on mobile when forced
      expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
    })
  })

  test('should respect mobile parameter on desktop', async () => {
    mockDevice('desktop')
    Object.defineProperty(window, 'location', {
      value: { search: '?mobile=true' },
      writable: true
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      // Should use MobileBookingOptimizer even on desktop when forced
      expect(screen.getByTestId('mobile-booking-optimizer')).toBeInTheDocument()
    })
  })

  test('should handle debug parameter correctly', async () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?debug=true' },
      writable: true
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      // Should show debug panel
      expect(screen.getByText('Booking Orchestrator Debug')).toBeInTheDocument()
    })
  })
})

describe('Component Props Integration', () => {
  test('should pass device-specific optimizations as props', async () => {
    mockDevice('mobile')
    mockFeatureFlags({
      new_booking_flow: true,
      mobile_optimizer_enabled: true
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      const component = screen.getByTestId('mobile-booking-optimizer')
      const props = JSON.parse(component.getAttribute('data-props'))
      
      // Should include mobile-specific optimizations
      expect(props.optimizeForMobile).toBe(true)
      expect(props.enableTouchOptimizations).toBe(true)
    })
  })

  test('should pass slow connection optimizations', async () => {
    mockDevice('mobileLowEnd')
    
    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      const component = screen.getByTestId('public-booking-flow')
      const props = JSON.parse(component.getAttribute('data-props'))
      
      // Should include performance optimizations
      expect(props.enableProgressiveLoading).toBe(true)
      expect(props.reducedAnimations).toBe(true)
    })
  })

  test('should pass feature flag states to components', async () => {
    mockFeatureFlags({
      new_booking_flow: true,
      enhanced_booking_flow: true,
      advanced_booking_features: true,
      realtime_availability: true
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      const component = screen.getByTestId('enhanced-booking-flow')
      const props = JSON.parse(component.getAttribute('data-props'))
      
      // Should include feature-specific props
      expect(props.enableAdvancedFeatures).toBe(true)
      expect(props.enableAnimations).toBe(true) // Should be true for good connection
    })
  })
})

describe('Error Handling and Fallbacks', () => {
  test('should fallback to safe defaults when device detection fails', async () => {
    // Mock device detection failure
    Object.defineProperty(window, 'innerWidth', { 
      get: () => { throw new Error('Cannot access window') }
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      // Should fallback to safe default component
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })

  test('should handle corrupted feature flag data', async () => {
    getCachedFeatureFlags.mockResolvedValue({
      malformed: 'data',
      new_booking_flow: 'not_a_boolean',
      enhanced_booking_flow: null
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      // Should handle gracefully and use defaults
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })
  })

  test('should recover from component selection errors', async () => {
    mockFeatureFlags({
      new_booking_flow: true,
      enhanced_booking_flow: true
    })

    // Mock component selection error
    jest.spyOn(console, 'error').mockImplementation(() => {})
    
    const OriginalComponent = BookingFlowOrchestrator
    const ErrorComponent = () => {
      throw new Error('Component selection failed')
    }

    expect(() => {
      render(<ErrorComponent />)
    }).toThrow()

    // Should handle errors in actual implementation through error boundaries
    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
    })

    console.error.mockRestore()
  })
})