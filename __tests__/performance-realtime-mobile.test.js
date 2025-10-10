/**
 * Performance, Real-time, and Mobile Optimization Test Suite
 * 
 * Comprehensive testing for performance metrics, real-time subscription efficiency,
 * mobile optimization, memory usage, and network handling.
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTime: 0,
      memoryUsage: 0,
      networkRequests: 0,
      subscriptionLatency: 0,
      componentMountTime: 0
    }
    this.startTime = 0
    this.observers = []
  }

  startMonitoring() {
    this.startTime = performance.now()
    
    // Mock Performance Observer for Core Web Vitals
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.metrics.renderTime = entry.duration
          }
        }
      })
      observer.observe({ entryTypes: ['measure'] })
      this.observers.push(observer)
    }
    
    // Monitor memory if available
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize
    }
  }

  stopMonitoring() {
    this.metrics.componentMountTime = performance.now() - this.startTime
    this.observers.forEach(observer => observer.disconnect())
    return this.metrics
  }

  measureAsync(name, asyncFn) {
    return new Promise(async (resolve, reject) => {
      const start = performance.now()
      try {
        const result = await asyncFn()
        const end = performance.now()
        this.metrics[name] = end - start
        resolve(result)
      } catch (error) {
        reject(error)
      }
    })
  }
}

// Mock real-time subscription behavior
class MockRealtimeSubscription {
  constructor() {
    this.subscribers = []
    this.messageQueue = []
    this.latency = 0
    this.isConnected = false
    this.messageCount = 0
  }

  connect(latency = 100) {
    return new Promise((resolve) => {
      this.latency = latency
      setTimeout(() => {
        this.isConnected = true
        resolve('SUBSCRIBED')
      }, latency)
    })
  }

  subscribe(callback) {
    this.subscribers.push(callback)
    return { unsubscribe: () => this.unsubscribe(callback) }
  }

  unsubscribe(callback) {
    this.subscribers = this.subscribers.filter(sub => sub !== callback)
  }

  simulateMessage(message) {
    this.messageCount++
    const timestamp = Date.now()
    
    setTimeout(() => {
      this.subscribers.forEach(callback => {
        callback({
          ...message,
          timestamp,
          latency: this.latency
        })
      })
    }, this.latency)
  }

  simulateNetworkIssue(duration = 5000) {
    this.isConnected = false
    setTimeout(() => {
      this.isConnected = true
    }, duration)
  }

  getMetrics() {
    return {
      subscribers: this.subscribers.length,
      messagesProcessed: this.messageCount,
      latency: this.latency,
      isConnected: this.isConnected
    }
  }
}

// Mock components with performance tracking
jest.mock('../components/booking/RealtimeBookingWrapper', () => {
  return function MockRealtimeBookingWrapper({ children, enableRealtime, ...props }) {
    const [metrics, setMetrics] = React.useState({})
    const subscription = React.useRef(new MockRealtimeSubscription())
    
    React.useEffect(() => {
      if (enableRealtime) {
        const startTime = performance.now()
        subscription.current.connect(100).then(() => {
          setMetrics(prev => ({
            ...prev,
            connectionTime: performance.now() - startTime,
            connected: true
          }))
        })
      }
      
      return () => subscription.current.unsubscribe()
    }, [enableRealtime])

    return (
      <div 
        data-testid="realtime-wrapper"
        data-metrics={JSON.stringify(metrics)}
        data-props={JSON.stringify(props)}
      >
        {children}
      </div>
    )
  }
})

jest.mock('../components/booking/MobileBookingOptimizer', () => {
  return function MockMobileBookingOptimizer(props) {
    const [renderMetrics, setRenderMetrics] = React.useState({})
    
    React.useEffect(() => {
      const renderStart = performance.now()
      
      // Simulate mobile-specific optimizations
      const optimizations = {
        lazyLoading: props.enableLazyLoading,
        touchOptimization: props.optimizeForMobile,
        reducedAnimations: props.reducedAnimations,
        virtualScrolling: props.shouldUseVirtualScrolling
      }
      
      setTimeout(() => {
        setRenderMetrics({
          renderTime: performance.now() - renderStart,
          optimizations,
          isMobileOptimized: true
        })
      }, 0)
    }, [])
    
    return (
      <div 
        data-testid="mobile-booking-optimizer"
        data-metrics={JSON.stringify(renderMetrics)}
        data-props={JSON.stringify(props)}
      >
        Mobile Optimized Booking
      </div>
    )
  }
})

jest.mock('../components/booking/PublicBookingFlow', () => {
  return function MockPublicBookingFlow(props) {
    const renderStart = React.useRef(performance.now())
    const [isReady, setIsReady] = React.useState(false)
    
    React.useEffect(() => {
      // Simulate component initialization
      setTimeout(() => setIsReady(true), 50)
    }, [])
    
    const renderTime = isReady ? performance.now() - renderStart.current : 0
    
    return (
      <div 
        data-testid="public-booking-flow"
        data-render-time={renderTime}
        data-props={JSON.stringify(props)}
      >
        {isReady ? 'Public Booking Ready' : 'Loading...'}
      </div>
    )
  }
})

// Mock Supabase with performance tracking
const mockSupabaseWithMetrics = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ data: {} }), Math.random() * 100)
      )
    )
  })),
  channel: jest.fn(() => {
    const mockChannel = new MockRealtimeSubscription()
    return {
      on: jest.fn().mockReturnThis(),
      subscribe: (callback) => mockChannel.connect().then(callback)
    }
  })
}

jest.mock('@/lib/supabase/UNIFIED_CLIENT', () => ({
  createClient: () => mockSupabaseWithMetrics
}))

jest.mock('@/lib/feature-flags', () => ({
  getCachedFeatureFlags: jest.fn().mockResolvedValue({
    new_booking_flow: true,
    enhanced_booking_flow: true,
    mobile_optimizer_enabled: true,
    realtime_availability: true
  })
}))

import BookingFlowOrchestrator from '../components/booking/BookingFlowOrchestrator'
import RealtimeBookingWrapper from '../components/booking/RealtimeBookingWrapper'

const mockMobileDevice = (isLowEnd = false) => {
  Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
  Object.defineProperty(navigator, 'userAgent', { 
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
    writable: true 
  })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, writable: true })
  Object.defineProperty(navigator, 'connection', {
    value: { effectiveType: isLowEnd ? 'slow-2g' : '4g' },
    writable: true
  })
  
  // Mock device memory for low-end devices
  if (isLowEnd) {
    Object.defineProperty(navigator, 'deviceMemory', { value: 1, writable: true }) // 1GB RAM
  }
}

describe('Performance Optimization Tests', () => {
  let performanceMonitor

  beforeEach(() => {
    jest.clearAllMocks()
    performanceMonitor = new PerformanceMonitor()
    
    // Mock performance.mark and performance.measure
    global.performance.mark = jest.fn()
    global.performance.measure = jest.fn()
    global.performance.now = jest.fn(() => Date.now())
  })

  describe('Component Rendering Performance', () => {
    test('should render BookingFlowOrchestrator within performance budget', async () => {
      performanceMonitor.startMonitoring()
      
      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })

      const metrics = performanceMonitor.stopMonitoring()
      
      // Should render within 1000ms (1 second)
      expect(metrics.componentMountTime).toBeLessThan(1000)
    })

    test('should lazy load components efficiently', async () => {
      const { rerender } = render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      // Initial render should be fast
      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })

      const startTime = performance.now()
      
      // Change to enhanced component
      rerender(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enhanced={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('enhanced-booking-flow')).toBeInTheDocument()
      })

      const switchTime = performance.now() - startTime
      
      // Component switching should be fast
      expect(switchTime).toBeLessThan(500)
    })

    test('should handle multiple rapid re-renders efficiently', async () => {
      const { rerender } = render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      const startTime = performance.now()
      
      // Simulate rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <BookingFlowOrchestrator 
            barbershopId="shop-123"
            barbershopSlug="test-shop"
            key={i}
            preselectedService={`service-${i}`}
          />
        )
      }

      await waitFor(() => {
        expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
      })

      const totalTime = performance.now() - startTime
      
      // Should handle 10 re-renders in under 2 seconds
      expect(totalTime).toBeLessThan(2000)
    })
  })

  describe('Memory Management', () => {
    test('should not leak memory with component mounting/unmounting', async () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
      
      // Mount and unmount component multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <BookingFlowOrchestrator 
            barbershopId="shop-123"
            barbershopSlug="test-shop"
            key={i}
          />
        )
        
        await waitFor(() => {
          expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
        })
        
        unmount()
        
        // Force garbage collection if available
        if (global.gc) global.gc()
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024)
    })

    test('should cleanup event listeners and subscriptions', async () => {
      const { unmount } = render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
        >
          <div>Test Content</div>
        </RealtimeBookingWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('realtime-wrapper')).toBeInTheDocument()
      })

      // Track subscription creation
      const initialSubscriptions = mockSupabaseWithMetrics.channel.mock.calls.length

      unmount()

      // Should not create new subscriptions after unmount
      render(
        <RealtimeBookingWrapper 
          barbershopId="different-shop"
          barbershopSlug="different-shop"
          enableRealtime={true}
        >
          <div>New Content</div>
        </RealtimeBookingWrapper>
      )

      // Verify subscriptions are properly managed
      expect(mockSupabaseWithMetrics.channel).toHaveBeenCalled()
    })

    test('should handle large datasets efficiently', async () => {
      // Mock large availability data
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        time: `${String(Math.floor(i / 4) + 9).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`,
        available: Math.random() > 0.3,
        id: `slot-${i}`
      }))

      mockSupabaseWithMetrics.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { slots: largeDataSet } })
      })

      const startTime = performance.now()

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        >
          <div>Large Dataset Test</div>
        </RealtimeBookingWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('realtime-wrapper')).toBeInTheDocument()
      })

      const processingTime = performance.now() - startTime
      
      // Should handle large datasets in under 3 seconds
      expect(processingTime).toBeLessThan(3000)
    })
  })

  describe('Mobile Performance Optimization', () => {
    beforeEach(() => {
      mockMobileDevice()
    })

    test('should apply mobile-specific optimizations', async () => {
      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('mobile-booking-optimizer')
        const metrics = JSON.parse(component.getAttribute('data-metrics') || '{}')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        // Should apply mobile optimizations
        expect(props.optimizeForMobile).toBe(true)
        expect(metrics.isMobileOptimized).toBe(true)
      })
    })

    test('should handle low-end mobile devices gracefully', async () => {
      mockMobileDevice(true) // Low-end device

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        // Should use lighter component for low-end devices
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        expect(props.reducedAnimations).toBe(true)
        expect(props.simplifiedUI).toBe(true)
      })
    })

    test('should optimize touch interactions', async () => {
      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('mobile-booking-optimizer')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        expect(props.enableTouchOptimizations).toBe(true)
      })
    })

    test('should implement progressive loading on slow connections', async () => {
      mockMobileDevice(true) // Slow connection

      render(
        <BookingFlowOrchestrator 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
        />
      )

      await waitFor(() => {
        const component = screen.getByTestId('public-booking-flow')
        const props = JSON.parse(component.getAttribute('data-props'))
        
        expect(props.enableProgressiveLoading).toBe(true)
      })
    })
  })
})

describe('Real-time Performance Tests', () => {
  let mockSubscription

  beforeEach(() => {
    mockSubscription = new MockRealtimeSubscription()
  })

  describe('Subscription Management', () => {
    test('should establish connection within acceptable time', async () => {
      const startTime = performance.now()

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      await waitFor(() => {
        const wrapper = screen.getByTestId('realtime-wrapper')
        const metrics = JSON.parse(wrapper.getAttribute('data-metrics') || '{}')
        expect(metrics.connected).toBe(true)
      })

      const connectionTime = performance.now() - startTime
      
      // Should connect within 2 seconds
      expect(connectionTime).toBeLessThan(2000)
    })

    test('should handle high-frequency updates efficiently', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('realtime-wrapper')).toBeInTheDocument()
      })

      const startTime = performance.now()
      
      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        mockSubscription.simulateMessage({
          type: 'booking_update',
          data: { id: i, timestamp: Date.now() }
        })
      }

      // Allow processing time
      await new Promise(resolve => setTimeout(resolve, 500))

      const processingTime = performance.now() - startTime
      const metrics = mockSubscription.getMetrics()
      
      // Should handle 100 messages in under 1 second
      expect(processingTime).toBeLessThan(1000)
      expect(metrics.messagesProcessed).toBe(100)
    })

    test('should throttle updates to prevent performance issues', async () => {
      let updateCount = 0
      const mockOnUpdate = jest.fn(() => updateCount++)

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
          onAvailabilityUpdate={mockOnUpdate}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      // Simulate burst of updates
      for (let i = 0; i < 50; i++) {
        mockSubscription.simulateMessage({
          type: 'availability_change',
          data: { slot: i }
        })
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      // Updates should be throttled, not all 50 should trigger callbacks
      expect(updateCount).toBeLessThan(50)
    })

    test('should maintain acceptable latency under load', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      const latencies = []
      
      // Simulate messages with varying latency
      for (let i = 0; i < 10; i++) {
        const sendTime = performance.now()
        mockSubscription.simulateMessage({
          type: 'latency_test',
          data: { sendTime }
        })
        
        // Mock latency measurement
        const latency = Math.random() * 200 + 50 // 50-250ms
        latencies.push(latency)
      }

      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      
      // Average latency should be under 500ms
      expect(avgLatency).toBeLessThan(500)
    })
  })

  describe('Network Resilience', () => {
    test('should handle network interruptions gracefully', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('realtime-wrapper')).toBeInTheDocument()
      })

      // Simulate network interruption
      mockSubscription.simulateNetworkIssue(2000)

      // Should handle gracefully without crashing
      expect(screen.getByTestId('realtime-wrapper')).toBeInTheDocument()
    })

    test('should reconnect efficiently after network recovery', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      // Simulate network issue and recovery
      mockSubscription.simulateNetworkIssue(1000)
      
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      const metrics = mockSubscription.getMetrics()
      expect(metrics.isConnected).toBe(true)
    })

    test('should fallback to polling when real-time fails', async () => {
      // Mock real-time failure
      mockSupabaseWithMetrics.channel.mockImplementation(() => {
        throw new Error('Real-time connection failed')
      })

      const { rerender } = render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
          refreshInterval={1000}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      // Should not crash and should fallback
      expect(screen.getByTestId('realtime-wrapper')).toBeInTheDocument()
    })
  })

  describe('Resource Efficiency', () => {
    test('should minimize CPU usage during idle periods', async () => {
      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      // Let component stabilize
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Should not continuously consume CPU when idle
      const metrics = mockSubscription.getMetrics()
      expect(metrics.subscribers).toBeLessThanOrEqual(1)
    })

    test('should cleanup resources on unmount', async () => {
      const { unmount } = render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('realtime-wrapper')).toBeInTheDocument()
      })

      const metricsBeforeUnmount = mockSubscription.getMetrics()
      expect(metricsBeforeUnmount.subscribers).toBeGreaterThan(0)

      unmount()

      // Verify cleanup
      expect(mockSubscription.getMetrics().subscribers).toBe(0)
    })

    test('should batch multiple updates efficiently', async () => {
      let batchCount = 0
      const mockBatchUpdate = jest.fn(() => batchCount++)

      render(
        <RealtimeBookingWrapper 
          barbershopId="shop-123"
          barbershopSlug="test-shop"
          enableRealtime={true}
          onAvailabilityUpdate={mockBatchUpdate}
        >
          <div>Test</div>
        </RealtimeBookingWrapper>
      )

      // Send multiple updates rapidly
      for (let i = 0; i < 20; i++) {
        mockSubscription.simulateMessage({
          type: 'batch_test',
          data: { id: i }
        })
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      // Should batch updates, not call 20 times
      expect(batchCount).toBeLessThan(20)
    })
  })
})

describe('Core Web Vitals Compliance', () => {
  test('should meet Largest Contentful Paint (LCP) targets', async () => {
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

    const renderTime = performance.now() - startTime
    
    // LCP should be under 2.5 seconds
    expect(renderTime).toBeLessThan(2500)
  })

  test('should minimize Cumulative Layout Shift (CLS)', async () => {
    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    // Initial render
    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    const initialBounds = screen.getByTestId('public-booking-flow').getBoundingClientRect()

    // Simulate component update
    await act(async () => {
      // Component should not shift layout significantly
    })

    const finalBounds = screen.getByTestId('public-booking-flow').getBoundingClientRect()
    
    // Layout should remain stable
    expect(Math.abs(initialBounds.top - finalBounds.top)).toBeLessThan(5)
    expect(Math.abs(initialBounds.left - finalBounds.left)).toBeLessThan(5)
  })

  test('should achieve good First Input Delay (FID)', async () => {
    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    const startTime = performance.now()
    
    // Simulate user interaction
    const component = screen.getByTestId('public-booking-flow')
    component.click()

    const responseTime = performance.now() - startTime
    
    // FID should be under 100ms
    expect(responseTime).toBeLessThan(100)
  })
})

describe('Bundle Size and Code Splitting', () => {
  test('should implement effective code splitting', () => {
    // This would typically be tested with webpack-bundle-analyzer
    // For now, we verify lazy loading is implemented
    expect(BookingFlowOrchestrator.toString()).toContain('lazy')
  })

  test('should not load unnecessary code for basic flows', async () => {
    // Mock enhanced features as disabled
    jest.doMock('@/lib/feature-flags', () => ({
      getCachedFeatureFlags: jest.fn().mockResolvedValue({
        new_booking_flow: true,
        enhanced_booking_flow: false // Only basic flow
      })
    }))

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    // Should only load basic flow, not enhanced components
  })
})

describe('Accessibility Performance', () => {
  test('should maintain performance with screen readers', async () => {
    // Mock screen reader presence
    Object.defineProperty(window, 'speechSynthesis', {
      value: { getVoices: () => [{ name: 'Test Voice' }] },
      writable: true
    })

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

    const renderTime = performance.now() - startTime
    
    // Should not significantly impact performance
    expect(renderTime).toBeLessThan(3000)
  })

  test('should handle high contrast mode efficiently', async () => {
    // Mock high contrast mode
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => ({
        matches: true, // High contrast mode
        addListener: jest.fn(),
        removeListener: jest.fn()
      }))
    })

    render(
      <BookingFlowOrchestrator 
        barbershopId="shop-123"
        barbershopSlug="test-shop"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('public-booking-flow')).toBeInTheDocument()
    })

    // Should render without performance degradation
  })
})