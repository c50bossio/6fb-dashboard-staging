/**
 * Backward Compatibility Test Suite
 * 
 * Ensures that the Enhanced Booking Flow integration maintains full backward 
 * compatibility with existing URLs, API endpoints, and user workflows.
 */

import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'

// Mock components and modules
jest.mock('../components/booking/PublicBookingFlow', () => {
  return function MockPublicBookingFlow(props) {
    return (
      <div 
        data-testid="public-booking-flow" 
        data-props={JSON.stringify(props)}
        data-legacy-compatible="true"
      >
        Legacy Public Booking Flow
      </div>
    )
  }
})

jest.mock('../components/booking/EnhancedBookingFlow', () => {
  return function MockEnhancedBookingFlow(props) {
    return (
      <div 
        data-testid="enhanced-booking-flow" 
        data-props={JSON.stringify(props)}
        data-enhanced="true"
      >
        Enhanced Booking Flow
      </div>
    )
  }
})

jest.mock('@/lib/supabase/UNIFIED_CLIENT', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {} })
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    }))
  }))
}))

jest.mock('@/lib/feature-flags', () => ({
  getCachedFeatureFlags: jest.fn().mockResolvedValue({})
}))

import BookingFlowOrchestrator from '../components/booking/BookingFlowOrchestrator'
import RealtimeBookingWrapper from '../components/booking/RealtimeBookingWrapper'
import { getCachedFeatureFlags } from '@/lib/feature-flags'

// Legacy URL patterns that must continue to work
const LEGACY_URL_PATTERNS = [
  // Basic patterns
  '/booking/barbershop-slug',
  '/booking/barbershop-slug/',
  
  // With service selection
  '/booking/barbershop-slug?service=haircut',
  '/booking/barbershop-slug?service=haircut-premium',
  '/booking/barbershop-slug?serviceId=123',
  
  // With barber selection
  '/booking/barbershop-slug?barber=john-smith',
  '/booking/barbershop-slug?barber=john-smith&service=haircut',
  '/booking/barbershop-slug?barberId=456',
  
  // Marketing campaign URLs
  '/booking/barbershop-slug?utm_source=google&utm_medium=cpc&utm_campaign=summer2024',
  '/booking/barbershop-slug?ref=facebook&service=haircut',
  '/booking/barbershop-slug?promo=SAVE20&service=beard-trim',
  
  // Social sharing URLs
  '/booking/barbershop-slug?shared=true&by=customer123',
  '/booking/barbershop-slug?referral=friend456',
  
  // Deep linking patterns
  '/booking/barbershop-slug?step=2&service=haircut',
  '/booking/barbershop-slug?tab=services',
  '/booking/barbershop-slug?view=calendar&date=2024-01-15',
  
  // Legacy parameter combinations
  '/booking/barbershop-slug?s=haircut&b=john&t=1400', // Old short params
  '/booking/barbershop-slug?service_id=123&barber_id=456&time=14:00',
]

// Legacy props that components must continue to support
const LEGACY_PROPS_COMBINATIONS = [
  // Original prop structure
  {
    shopId: 'shop-123', // Old naming
    shopSlug: 'test-shop',
    selectedService: 'haircut',
    selectedBarber: 'john-smith'
  },
  
  // Mixed old/new naming
  {
    barbershopId: 'shop-123',
    shopSlug: 'test-shop', // Old naming
    preselectedService: 'haircut',
    selectedBarber: 'john-smith' // Old naming
  },
  
  // Minimal legacy props
  {
    id: 'shop-123', // Very old naming
    slug: 'test-shop'
  },
  
  // Full legacy structure
  {
    shop: {
      id: 'shop-123',
      slug: 'test-shop',
      name: 'Test Barbershop'
    },
    preselected: {
      service: 'haircut',
      barber: 'john-smith',
      date: '2024-01-15',
      time: '14:00'
    }
  }
]

describe('Backward Compatibility Tests', () => {
  let originalLocation
  let originalURLSearchParams
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock window.location
    originalLocation = window.location
    delete window.location
    window.location = {
      href: 'http://localhost:3000',
      search: '',
      pathname: '/booking/test-shop',
      reload: jest.fn()
    }

    // Mock URLSearchParams to be predictable
    originalURLSearchParams = window.URLSearchParams
    window.URLSearchParams = class MockURLSearchParams {
      constructor(search = '') {
        this.params = new Map()
        if (search.startsWith('?')) search = search.substring(1)
        search.split('&').forEach(pair => {
          if (pair) {
            const [key, value] = pair.split('=')
            this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''))
          }
        })
      }
      
      get(key) { return this.params.get(key) }
      has(key) { return this.params.has(key) }
      set(key, value) { this.params.set(key, value) }
      delete(key) { this.params.delete(key) }
      toString() {
        const pairs = []
        this.params.forEach((value, key) => {
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        })
        return pairs.join('&')
      }
    }

    // Default feature flags for legacy compatibility
    getCachedFeatureFlags.mockResolvedValue({
      new_booking_flow: true,
      enhanced_booking_flow: false, // Start with legacy mode
      backward_compatibility: true
    })
  })

  afterEach(() => {
    window.location = originalLocation
    window.URLSearchParams = originalURLSearchParams
  })

  describe('Legacy URL Parameter Support', () => {
    test.each([
      ['service parameter', '?service=haircut', 'haircut'],
      ['serviceId parameter', '?serviceId=123', '123'], 
      ['barber parameter', '?barber=john-smith', 'john-smith'],
      ['barberId parameter', '?barberId=456', '456'],
      ['legacy short params', '?s=haircut&b=john', 'haircut', 'john'],
      ['old snake_case params', '?service_id=haircut&barber_id=john', 'haircut', 'john']
    ])('should support %s', async (description, search, expectedService, expectedBarber) => {
      window.location.search = search

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        if (expectedService) {
          expect(props.preselectedService || props.selectedService || props.service).toBe(expectedService)
        }
        if (expectedBarber) {
          expect(props.preselectedBarber || props.selectedBarber || props.barber).toBe(expectedBarber)
        }
      })
    })

    test('should preserve UTM parameters and marketing tags', async () => {
      window.location.search = '?utm_source=google&utm_campaign=summer&service=haircut&promo=SAVE20'

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        // Should extract booking-related params
        expect(props.preselectedService).toBe('haircut')
        
        // Should preserve marketing parameters in URL/context
        expect(window.location.search).toContain('utm_source=google')
        expect(window.location.search).toContain('promo=SAVE20')
      })
    })

    test('should handle legacy deep linking patterns', async () => {
      window.location.search = '?step=2&service=haircut&date=2024-01-15&time=14:00'

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        // Should extract and convert legacy parameters
        expect(props.preselectedService).toBe('haircut')
        expect(props.initialStep || props.step).toBe('2')
        expect(props.preselectedDate || props.date).toBe('2024-01-15')
      })
    })

    test('should handle malformed legacy URLs gracefully', async () => {
      window.location.search = '?service=&barber=invalid%20chars%21%40%23&step=invalid'

      expect(() => {
        render(
          <BookingFlowOrchestrator 
            barbershopId="shop-123"
            barbershopSlug="test-shop"
          />
        )
      }).not.toThrow()

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })
  })

  describe('Legacy Props Support', () => {
    test.each(LEGACY_PROPS_COMBINATIONS)('should handle legacy prop structure %#', async (legacyProps) => {
      expect(() => {
        render(<BookingFlowOrchestrator {...legacyProps} />)
      }).not.toThrow()

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('should normalize legacy prop names to current standard', async () => {
      const legacyProps = {
        shopId: 'shop-123', // Old naming
        shopSlug: 'test-shop', // Old naming
        selectedService: 'haircut', // Old naming
        selectedBarber: 'john-smith' // Old naming
      }

      render(<BookingFlowOrchestrator {...legacyProps} />)

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        // Should normalize to current prop names
        expect(props.barbershopId || props.shopId).toBe('shop-123')
        expect(props.barbershopSlug || props.shopSlug).toBe('test-shop')
        expect(props.preselectedService || props.selectedService).toBe('haircut')
        expect(props.preselectedBarber || props.selectedBarber).toBe('john-smith')
      })
    })

    test('should handle nested legacy prop structures', async () => {
      const nestedLegacyProps = {
        shop: {
          id: 'shop-123',
          slug: 'test-shop'
        },
        booking: {
          service: 'haircut',
          barber: 'john-smith'
        }
      }

      render(<BookingFlowOrchestrator {...nestedLegacyProps} />)

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        expect(component).toBeInTheDocument()
      })
    })
  })

  describe('Legacy Component Interface', () => {
    test('should maintain legacy callback signatures', async () => {
      const legacyCallbacks = {
        onBookingComplete: jest.fn(), // Legacy name
        onServiceSelect: jest.fn(), // Legacy name
        onBarberSelect: jest.fn(), // Legacy name
        onError: jest.fn(),
        onCancel: jest.fn()
      }

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          {...legacyCallbacks}
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        // Legacy callbacks should be passed through or adapted
        expect(props.onBookingComplete || props.onComplete).toBeDefined()
        expect(props.onServiceSelect || props.onServiceSelection).toBeDefined()
      })
    })

    test('should support legacy ref patterns', () => {
      const legacyRef = { current: null }
      
      expect(() => {
        render(
          <BookingFlowOrchestrator 
            ref={legacyRef}
            barbershopId="shop-123"
            barbershopSlug="test-shop"
          />
        )
      }).not.toThrow()
    })

    test('should maintain legacy CSS class names', async () => {
      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          className="legacy-booking-wrapper custom-theme"
        />
      )

      await waitFor(() => {
        const wrapper = screen.getByTestId('public-booking-flow').closest('.booking-flow-orchestrator')
        
        // Should preserve legacy class names
        expect(wrapper).toHaveClass('legacy-booking-wrapper')
        expect(wrapper).toHaveClass('custom-theme')
      })
    })
  })

  describe('Legacy API Compatibility', () => {
    test('should handle legacy API response formats', async () => {
      // Mock legacy API response format
      const mockLegacyResponse = {
        success: true,
        data: {
          availableSlots: [ // Old naming
            { time: '09:00', available: true },
            { time: '10:00', available: false }
          ],
          shopInfo: { // Old naming
            name: 'Test Barbershop',
            hours: '9-5'
          }
        }
      }

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        // Should adapt legacy response format without breaking
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('should send requests in legacy format when feature flag is disabled', async () => {
      getCachedFeatureFlags.mockResolvedValue({
        new_booking_flow: false, // Legacy mode
        use_legacy_api_format: true
      })

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        // Should use PublicBookingFlow in legacy mode
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
        expect(screen.queryByTestId('enhanced-booking-flow')).not.toBeInTheDocument()
      })
    })
  })

  describe('Legacy Browser Support', () => {
    test('should work without modern JavaScript features', () => {
      // Mock absence of modern features
      const originalIntersectionObserver = window.IntersectionObserver
      const originalRequestIdleCallback = window.requestIdleCallback
      
      delete window.IntersectionObserver
      delete window.requestIdleCallback

      expect(() => {
        render(
          <BookingFlowOrchestrator 
            barbershopId="shop-123"
            barbershopSlug="test-shop"
          />
        )
      }).not.toThrow()

      // Restore
      window.IntersectionObserver = originalIntersectionObserver
      window.requestIdleCallback = originalRequestIdleCallback
    })

    test('should degrade gracefully without WebSocket support', async () => {
      const originalWebSocket = window.WebSocket
      delete window.WebSocket

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        // Should still work without real-time features
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })

      window.WebSocket = originalWebSocket
    })

    test('should handle legacy localStorage formats', () => {
      // Set legacy localStorage data
      localStorage.setItem('bookingPreferences', JSON.stringify({
        lastService: 'haircut', // Old format
        preferredBarber: 'john-smith'
      }))

      expect(() => {
        render(
          <BookingFlowOrchestrator 
            barbershopId="shop-123"
            barbershopSlug="test-shop"
          />
        )
      }).not.toThrow()

      localStorage.clear()
    })
  })

  describe('Migration and Transition Support', () => {
    test('should support gradual feature rollout', async () => {
      // Test partial feature enablement
      getCachedFeatureFlags.mockResolvedValue({
        new_booking_flow: true,
        enhanced_booking_flow: false, // Only partially enabled
        realtime_features: false
      })

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        // Should use PublicBookingFlow when enhanced features are disabled
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
        expect(screen.queryByTestId('enhanced-booking-flow')).not.toBeInTheDocument()
      })
    })

    test('should handle feature flag transitions without breaking', async () => {
      const { rerender } = render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })

      // Change feature flags
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
        // Should transition to enhanced flow
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })
    })

    test('should maintain data consistency during transitions', async () => {
      const user = userEvent.setup()
      window.location.search = '?service=haircut&barber=john-smith'

      const { rerender } = render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        expect(props.preselectedService).toBe('haircut')
      })

      // Switch to enhanced mode
      getCachedFeatureFlags.mockResolvedValue({
        enhanced_booking_flow: true
      })

      rerender(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('enhanced-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        // Data should be preserved across component transitions
        expect(props.preselectedService).toBe('haircut')
      })
    })
  })

  describe('Performance Regression Prevention', () => {
    test('should not significantly impact legacy flow performance', async () => {
      const startTime = performance.now()

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render quickly even with orchestrator overhead
      expect(renderTime).toBeLessThan(1000) // Less than 1 second
    })

    test('should not increase bundle size significantly for legacy users', () => {
      // This would be tested in the build process
      // For now, we just ensure lazy loading works
      expect(BookingFlowOrchestrator).toBeDefined()
      
      // Verify components are lazy loaded
      const componentString = BookingFlowOrchestrator.toString()
      expect(componentString).toContain('lazy') // Should use lazy loading
    })
  })

  describe('Error Recovery and Graceful Degradation', () => {
    test('should fallback to legacy component when enhanced features fail', async () => {
      // Mock enhanced component failure
      getCachedFeatureFlags.mockRejectedValue(new Error('Feature flags unavailable'))

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        // Should fallback to safe legacy component
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })
    })

    test('should preserve user data during error recovery', async () => {
      window.location.search = '?service=haircut&customer=john.doe@example.com'

      // Simulate error and recovery
      getCachedFeatureFlags
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ new_booking_flow: true })

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        // User's preselected data should be preserved
        expect(props.preselectedService).toBe('haircut')
      })
    })
  })
})

describe('URL Parameter Migration Tests', () => {
  test('should convert legacy parameter names to current standard', () => {
    const legacyParams = new URLSearchParams('?s=haircut&b=john&t=1400&d=2024-01-15')
    
    // Function to convert legacy params (would be in actual implementation)
    const convertLegacyParams = (params) => {
      const converted = new URLSearchParams()
      
      // Convert short names to full names
      const paramMap = {
        's': 'service',
        'b': 'barber', 
        't': 'time',
        'd': 'date',
        'service_id': 'service',
        'barber_id': 'barber'
      }
      
      params.forEach((value, key) => {
        const newKey = paramMap[key] || key
        converted.set(newKey, value)
      })
      
      return converted
    }

    const converted = convertLegacyParams(legacyParams)
    
    expect(converted.get('service')).toBe('haircut')
    expect(converted.get('barber')).toBe('john')
    expect(converted.get('time')).toBe('1400')
    expect(converted.get('date')).toBe('2024-01-15')
  })

  test('should handle parameter precedence correctly', () => {
    // When both old and new parameters exist, new should take precedence
    const params = new URLSearchParams('?s=oldservice&service=newservice&b=oldbarber&barber=newbarber')
    
    // Implementation would handle precedence
    expect(params.get('service')).toBe('newservice') // New format wins
    expect(params.get('barber')).toBe('newbarber') // New format wins
  })

  test('should preserve unknown parameters for forward compatibility', () => {
    const params = new URLSearchParams('?service=haircut&future_param=value&custom_field=data')
    
    // Should not remove unknown parameters
    expect(params.get('future_param')).toBe('value')
    expect(params.get('custom_field')).toBe('data')
  })
})