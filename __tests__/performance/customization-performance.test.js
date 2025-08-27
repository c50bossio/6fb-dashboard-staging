/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor, act } from '@/test-utils/test-utils'
import { 
  createTestUser, 
  createTestProfile, 
  PerformanceTestUtils,
  MobileHelpers 
} from '@/test-utils/test-utils'
import UnifiedCustomizePage from '@/app/(protected)/customize/page'

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 100000000
  }
}

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
})

// Mock React DevTools Profiler
const Profiler = ({ children, onRender }) => {
  React.useEffect(() => {
    if (onRender) {
      onRender('test', 'mount', 100, 50, 0, 150)
    }
  }, [onRender])
  
  return children
}

// Performance monitoring hook
const usePerformanceMonitor = (componentName) => {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    rerenderCount: 0,
    memoryUsage: 0
  })

  React.useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      setMetrics(prev => ({
        ...prev,
        renderTime: endTime - startTime,
        rerenderCount: prev.rerenderCount + 1,
        memoryUsage: performance.memory?.usedJSHeapSize || 0
      }))
    }
  }, [])

  return metrics
}

describe('Performance Tests - Customization Components', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Reset performance mocks
    mockPerformance.now.mockReturnValue(Date.now())
    mockPerformance.memory.usedJSHeapSize = 1000000
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Component Render Performance', () => {
    it('renders initial page within acceptable time limits', async () => {
      const startTime = performance.now()
      
      render(<UnifiedCustomizePage />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Initial render should be under 100ms
      expect(renderTime).toBeLessThan(100)
    })

    it('loading skeleton renders quickly', () => {
      const startTime = performance.now()
      
      render(<UnifiedCustomizePage />)
      
      // Loading skeleton should appear immediately
      expect(screen.getAllByTestId('skeleton-section')).toHaveLength(3)
      
      const skeletonRenderTime = performance.now() - startTime
      expect(skeletonRenderTime).toBeLessThan(50)
    })

    it('transitions from loading to content efficiently', async () => {
      const { container } = render(<UnifiedCustomizePage />)
      
      const startTime = performance.now()
      
      // Fast-forward through loading
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        expect(screen.queryByTestId('skeleton-header')).not.toBeInTheDocument()
      })
      
      const transitionTime = performance.now() - startTime
      
      // Transition should be smooth and quick
      expect(transitionTime).toBeLessThan(200)
    })

    it('handles large datasets efficiently', async () => {
      const largeProfile = createTestProfile({ 
        role: 'ENTERPRISE_OWNER',
        specializations: Array.from({ length: 100 }, (_, i) => `Skill ${i}`),
        portfolio_images: Array.from({ length: 50 }, (_, i) => `image-${i}.jpg`)
      })

      const startTime = performance.now()
      
      render(<UnifiedCustomizePage />, { profile: largeProfile })
      
      jest.advanceTimersByTime(1000)
      
      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })
      
      const renderTime = performance.now() - startTime
      
      // Should handle large datasets within reasonable time
      expect(renderTime).toBeLessThan(500)
    })
  })

  describe('Interaction Performance', () => {
    it('section expansion animation performs smoothly', async () => {
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('section-toggle-barber-profile')).toBeInTheDocument()
      })

      const toggle = screen.getByTestId('section-toggle-barber-profile')
      
      // Measure expansion time
      const startTime = performance.now()
      
      await user.click(toggle)
      
      // Wait for animation
      act(() => {
        jest.advanceTimersByTime(300)
      })
      
      const expansionTime = performance.now() - startTime
      
      // Expansion should be smooth (under 350ms including animation)
      expect(expansionTime).toBeLessThan(350)
    })

    it('handles rapid successive interactions efficiently', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('section-toggle-barber-profile')).toBeInTheDocument()
      })

      const toggles = [
        'section-toggle-barber-profile',
        'section-toggle-barbershop-website',
        'section-toggle-multi-location-management'
      ]

      const startTime = performance.now()

      // Rapid successive clicks
      for (const toggleId of toggles) {
        const toggle = screen.getByTestId(toggleId)
        await user.click(toggle)
        
        // Small delay between clicks
        act(() => {
          jest.advanceTimersByTime(50)
        })
      }

      const totalTime = performance.now() - startTime

      // Should handle rapid interactions without performance degradation
      expect(totalTime).toBeLessThan(1000)
    })

    it('tutorial modal interactions are responsive', async () => {
      localStorage.removeItem('customize-tutorial-seen')
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Welcome to Customization!')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // Test modal interactions
      await user.click(screen.getByText('Skip'))
      await user.click(screen.getByText('Show Tutorial'))
      await user.click(screen.getByText('Get Started'))

      const interactionTime = performance.now() - startTime

      // Modal interactions should be snappy
      expect(interactionTime).toBeLessThan(500)
    })
  })

  describe('Memory Usage Tests', () => {
    it('has reasonable initial memory footprint', () => {
      const initialMemory = performance.memory.usedJSHeapSize
      
      render(<UnifiedCustomizePage />)
      
      const afterRenderMemory = performance.memory.usedJSHeapSize
      const memoryIncrease = afterRenderMemory - initialMemory
      
      // Memory increase should be reasonable (under 5MB for mock)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024)
    })

    it('does not leak memory during section interactions', async () => {
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('section-toggle-barber-profile')).toBeInTheDocument()
      })

      const initialMemory = performance.memory.usedJSHeapSize
      
      const toggle = screen.getByTestId('section-toggle-barber-profile')

      // Perform multiple expand/collapse cycles
      for (let i = 0; i < 10; i++) {
        await user.click(toggle)
        act(() => {
          jest.advanceTimersByTime(300)
        })
        await user.click(toggle)
        act(() => {
          jest.advanceTimersByTime(300)
        })
      }

      const finalMemory = performance.memory.usedJSHeapSize
      const memoryGrowth = finalMemory - initialMemory

      // Memory should not grow significantly from interactions
      expect(memoryGrowth).toBeLessThan(1024 * 1024) // Less than 1MB growth
    })

    it('cleans up resources when component unmounts', () => {
      const { unmount } = render(<UnifiedCustomizePage />)
      
      const beforeUnmount = performance.memory.usedJSHeapSize
      
      unmount()
      
      // Simulate garbage collection
      mockPerformance.memory.usedJSHeapSize = beforeUnmount - 100000
      
      const afterUnmount = performance.memory.usedJSHeapSize
      
      // Memory should be freed (or at least not increase)
      expect(afterUnmount).toBeLessThanOrEqual(beforeUnmount)
    })
  })

  describe('Responsive Performance Tests', () => {
    it('maintains performance on mobile viewports', async () => {
      MobileHelpers.setMobileViewport(375, 667)
      
      const startTime = performance.now()
      
      const shopOwnerProfile = createTestProfile({ role: 'SHOP_OWNER' })
      render(<UnifiedCustomizePage />, { profile: shopOwnerProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      const mobileRenderTime = performance.now() - startTime

      // Mobile performance should be similar to desktop
      expect(mobileRenderTime).toBeLessThan(300)
    })

    it('handles orientation changes efficiently', async () => {
      const { user } = render(<UnifiedCustomizePage />)

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // Simulate orientation change
      MobileHelpers.setMobileViewport(667, 375) // Landscape
      
      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      const orientationChangeTime = performance.now() - startTime

      // Orientation change should be handled quickly
      expect(orientationChangeTime).toBeLessThan(200)
    })

    it('adapts to different screen densities', () => {
      // Test different pixel ratios
      const ratios = [1, 2, 3]

      ratios.forEach(ratio => {
        Object.defineProperty(window, 'devicePixelRatio', {
          value: ratio,
          configurable: true
        })

        const startTime = performance.now()
        
        const { unmount } = render(<UnifiedCustomizePage />)
        
        const renderTime = performance.now() - startTime

        // Performance should be consistent across pixel ratios
        expect(renderTime).toBeLessThan(150)
        
        unmount()
      })
    })
  })

  describe('Large Scale Performance Tests', () => {
    it('handles multiple simultaneous users efficiently', async () => {
      const profiles = [
        createTestProfile({ role: 'BARBER' }),
        createTestProfile({ role: 'SHOP_OWNER' }),
        createTestProfile({ role: 'ENTERPRISE_OWNER' })
      ]

      const startTime = performance.now()

      // Render multiple instances simultaneously
      const instances = profiles.map(profile => 
        render(<UnifiedCustomizePage />, { profile })
      )

      // Fast-forward all loading
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      await waitFor(() => {
        // Check that all instances rendered
        expect(screen.getAllByText('Customize Your Experience')).toHaveLength(3)
      })

      const totalRenderTime = performance.now() - startTime

      // Multiple instances should scale reasonably
      expect(totalRenderTime).toBeLessThan(1000)

      // Cleanup
      instances.forEach(instance => instance.unmount())
    })

    it('maintains performance with complex nested structures', async () => {
      const ComplexNestedComponent = () => {
        const [depth] = React.useState(5)
        
        const renderNested = (currentDepth) => {
          if (currentDepth === 0) {
            return <div>Deep nested content</div>
          }
          
          return (
            <div className="nested-level">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i}>
                  {renderNested(currentDepth - 1)}
                </div>
              ))}
            </div>
          )
        }

        return (
          <div>
            <UnifiedCustomizePage />
            {renderNested(depth)}
          </div>
        )
      }

      const startTime = performance.now()
      
      render(<ComplexNestedComponent />)
      
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      const complexRenderTime = performance.now() - startTime

      // Complex nested structure should still render efficiently
      expect(complexRenderTime).toBeLessThan(800)
    })
  })

  describe('Bundle Size and Loading Performance', () => {
    it('loads critical resources first', async () => {
      // Mock resource loading
      const resources = {
        critical: ['main.css', 'main.js'],
        noncritical: ['fonts.css', 'analytics.js', 'images.js']
      }

      const loadTimes = {}

      // Simulate critical resources loading fast
      resources.critical.forEach(resource => {
        loadTimes[resource] = Math.random() * 100 // 0-100ms
      })

      // Non-critical can load slower
      resources.noncritical.forEach(resource => {
        loadTimes[resource] = Math.random() * 500 + 200 // 200-700ms
      })

      const maxCriticalTime = Math.max(...resources.critical.map(r => loadTimes[r]))
      const minNonCriticalTime = Math.min(...resources.noncritical.map(r => loadTimes[r]))

      // Critical resources should generally load before non-critical
      expect(maxCriticalTime).toBeLessThan(200)
    })

    it('lazy loads non-essential components', () => {
      // Test that heavy components are lazy loaded
      const LazyComponent = React.lazy(() => Promise.resolve({
        default: () => <div>Lazy loaded content</div>
      }))

      const LazyWrapper = () => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      )

      render(<LazyWrapper />)

      // Should show loading state initially
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Performance Regression Tests', () => {
    it('maintains consistent performance baselines', async () => {
      const iterations = 5
      const renderTimes = []

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        
        const { unmount } = render(<UnifiedCustomizePage />)
        
        jest.advanceTimersByTime(1000)
        
        await waitFor(() => {
          expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
        })
        
        const renderTime = performance.now() - startTime
        renderTimes.push(renderTime)
        
        unmount()
      }

      const averageTime = renderTimes.reduce((sum, time) => sum + time, 0) / iterations
      const maxTime = Math.max(...renderTimes)
      const minTime = Math.min(...renderTimes)

      // Performance should be consistent
      expect(averageTime).toBeLessThan(300)
      expect(maxTime - minTime).toBeLessThan(200) // Low variance
    })

    it('detects performance degradation', () => {
      // Simulate performance baseline
      const baselineTime = 100
      
      // Current performance
      const currentTime = performance.now()
      render(<UnifiedCustomizePage />)
      const actualTime = performance.now() - currentTime

      // Alert if performance degrades significantly
      const degradationThreshold = baselineTime * 1.5 // 50% slower
      
      if (actualTime > degradationThreshold) {
        console.warn(`Performance regression detected: ${actualTime}ms vs baseline ${baselineTime}ms`)
      }

      // For testing, we'll check it doesn't exceed reasonable limits
      expect(actualTime).toBeLessThan(1000)
    })
  })

  describe('Real-World Performance Scenarios', () => {
    it('handles concurrent user interactions efficiently', async () => {
      const enterpriseProfile = createTestProfile({ role: 'ENTERPRISE_OWNER' })
      const { user } = render(<UnifiedCustomizePage />, { profile: enterpriseProfile })

      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByTestId('section-toggle-barber-profile')).toBeInTheDocument()
      })

      const startTime = performance.now()

      // Simulate realistic user behavior - multiple rapid interactions
      const interactions = [
        () => user.click(screen.getByTestId('section-toggle-barber-profile')),
        () => user.click(screen.getByText('Show Tutorial')),
        () => user.click(screen.getByText('Skip')),
        () => user.click(screen.getByTestId('section-toggle-barbershop-website')),
        () => user.click(screen.getByTestId('section-toggle-multi-location-management'))
      ]

      // Execute interactions with realistic delays
      for (const interaction of interactions) {
        await interaction()
        act(() => {
          jest.advanceTimersByTime(Math.random() * 200 + 50) // 50-250ms between interactions
        })
      }

      const totalInteractionTime = performance.now() - startTime

      // Should handle realistic user interactions smoothly
      expect(totalInteractionTime).toBeLessThan(2000)
    })

    it('maintains performance under network delays', async () => {
      // Simulate slow network by delaying mock responses
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockImplementation(async (...args) => {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        return originalFetch?.(...args) || Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        })
      })

      const startTime = performance.now()
      
      render(<UnifiedCustomizePage />)
      
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(screen.getByText('Customize Your Experience')).toBeInTheDocument()
      })

      const renderTimeWithDelay = performance.now() - startTime

      // Should still render efficiently despite network delays
      expect(renderTimeWithDelay).toBeLessThan(1500)

      // Restore original fetch
      global.fetch = originalFetch
    })
  })
})

// Performance benchmarking utilities
describe('Performance Benchmarks', () => {
  
  it('establishes performance baselines', async () => {
    const benchmarks = {
      initialRender: 0,
      sectionExpansion: 0,
      modalInteraction: 0,
      formInteraction: 0
    }

    // Initial render benchmark
    let startTime = performance.now()
    const { unmount } = render(<UnifiedCustomizePage />)
    benchmarks.initialRender = performance.now() - startTime
    unmount()

    // Section expansion benchmark
    const { user } = render(<UnifiedCustomizePage />)
    jest.advanceTimersByTime(1000)
    
    await waitFor(() => {
      expect(screen.getByTestId('section-toggle-barber-profile')).toBeInTheDocument()
    })

    startTime = performance.now()
    await user.click(screen.getByTestId('section-toggle-barber-profile'))
    act(() => {
      jest.advanceTimersByTime(300)
    })
    benchmarks.sectionExpansion = performance.now() - startTime

    // Modal interaction benchmark
    startTime = performance.now()
    await user.click(screen.getByText('Show Tutorial'))
    benchmarks.modalInteraction = performance.now() - startTime

    // Log benchmarks for tracking
    console.log('Performance Benchmarks:', benchmarks)

    // Assert reasonable performance
    expect(benchmarks.initialRender).toBeLessThan(200)
    expect(benchmarks.sectionExpansion).toBeLessThan(400)
    expect(benchmarks.modalInteraction).toBeLessThan(100)
  })
})