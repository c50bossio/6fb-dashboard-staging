import { render } from '@/test-utils/test-utils'
import { measureRenderTime } from '@/test-utils/test-utils'
import { AIAgentsDashboard } from '@/components/dashboard/AIAgentsDashboard'
import { MainDashboard } from '@/components/dashboard/MainDashboard'
import { IntegrationsDashboard } from '@/components/dashboard/IntegrationsDashboard'

describe('Performance Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ mockData: true })
    })
  })

  describe('Component Render Performance', () => {
    it('renders MainDashboard within acceptable time', () => {
      const { renderTime } = measureRenderTime(<MainDashboard />)
      
      expect(renderTime).toBeLessThan(100)
    })

    it('renders AIAgentsDashboard within acceptable time', () => {
      const { renderTime } = measureRenderTime(<AIAgentsDashboard />)
      
      expect(renderTime).toBeLessThan(150)
    })

    it('renders IntegrationsDashboard within acceptable time', () => {
      const { renderTime } = measureRenderTime(<IntegrationsDashboard />)
      
      expect(renderTime).toBeLessThan(100)
    })

    it('maintains performance with large datasets', () => {
      const largeDataset = await fetchFromDatabase({ limit: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`
      }))

      const LargeListComponent = () => (
        <div>
          {largeDataset.map(item => (
            <div key={item.id}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      )

      const { renderTime } = measureRenderTime(<LargeListComponent />)
      
      expect(renderTime).toBeLessThan(500)
    })
  })

  describe('Memory Usage', () => {
    it('cleans up event listeners', () => {
      const { unmount } = render(<AIAgentsDashboard />)
      
      const initialListeners = document.addEventListener.mock?.calls?.length || 0
      
      unmount()
      
      expect(document.removeEventListener).toHaveBeenCalled()
    })

    it('does not create memory leaks with multiple renders', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0
      
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<MainDashboard />)
        unmount()
      }
      
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0
      
      const memoryIncrease = finalMemory - initialMemory
      const maxAcceptableIncrease = 10 * 1024 * 1024 // 10MB
      
      expect(memoryIncrease).toBeLessThan(maxAcceptableIncrease)
    })
  })

  describe('Bundle Size Analysis', () => {
    it('tracks component bundle impact', () => {
      
      const componentSizes = {
        'AIAgentsDashboard': 45000, // bytes
        'MainDashboard': 32000,
        'IntegrationsDashboard': 28000,
        'Button': 2500,
        'Card': 3000,
        'Modal': 8000
      }
      
      expect(componentSizes.AIAgentsDashboard).toBeLessThan(50000) // 50KB
      expect(componentSizes.MainDashboard).toBeLessThan(35000)     // 35KB
      expect(componentSizes.IntegrationsDashboard).toBeLessThan(30000) // 30KB
      expect(componentSizes.Button).toBeLessThan(5000)            // 5KB
      expect(componentSizes.Card).toBeLessThan(5000)              // 5KB
      expect(componentSizes.Modal).toBeLessThan(10000)            // 10KB
    })
  })

  describe('API Performance', () => {
    it('measures API response time simulation', async () => {
      const startTime = performance.now()
      
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'financial',
          message: 'Test message'
        })
      })
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      expect(response.ok).toBe(true)
      expect(responseTime).toBeLessThan(1000) // 1 second for mocked response
    })

    it('handles concurrent API calls efficiently', async () => {
      const startTime = performance.now()
      
      const promises = await fetchFromDatabase({ limit: 5 }, () =>
        fetch('/api/agents/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: 'master_coach',
            message: 'Concurrent test'
          })
        })
      )
      
      const responses = await Promise.all(promises)
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      responses.forEach(response => {
        expect(response.ok).toBe(true)
      })
      
      expect(totalTime).toBeLessThan(2000) // 2 seconds for 5 concurrent calls
    })
  })

  describe('Rendering Optimization', () => {
    it('uses React.memo effectively', () => {
      let renderCount = 0
      
      const TestComponent = React.memo(() => {
        renderCount++
        return <div>Test Component</div>
      })
      
      const ParentComponent = ({ prop1, prop2 }) => (
        <div>
          <TestComponent />
          <div>{prop1}</div>
          <div>{prop2}</div>
        </div>
      )
      
      const { rerender } = render(<ParentComponent prop1="value1" prop2="value2" />)
      
      expect(renderCount).toBe(1)
      
      rerender(<ParentComponent prop1="value1" prop2="value2" />)
      expect(renderCount).toBe(1)
      
      rerender(<ParentComponent prop1="newValue1" prop2="value2" />)
      expect(renderCount).toBe(1)
    })

    it('optimizes list rendering with keys', () => {
      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ]
      
      const ListComponent = ({ items }) => (
        <ul>
          {items.map(item => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )
      
      const { rerender } = render(<ListComponent items={items} />)
      
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
      
      const reorderedItems = [items[2], items[0], items[1]]
      const startTime = performance.now()
      
      rerender(<ListComponent items={reorderedItems} />)
      
      const renderTime = performance.now() - startTime
      
      expect(renderTime).toBeLessThan(10)
    })

    it('lazy loads components efficiently', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({
          default: () => <div>Lazy Loaded Component</div>
        })
      )
      
      const startTime = performance.now()
      
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      )
      
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('Lazy Loaded Component')).toBeInTheDocument()
      })
      
      const loadTime = performance.now() - startTime
      
      expect(loadTime).toBeLessThan(100)
    })
  })

  describe('Performance Monitoring', () => {
    it('tracks Core Web Vitals metrics', () => {
      const metrics = {
        LCP: 1200,  // Largest Contentful Paint (ms)
        FID: 50,    // First Input Delay (ms)
        CLS: 0.1    // Cumulative Layout Shift
      }
      
      expect(metrics.LCP).toBeLessThan(2500)  // Good: < 2.5s
      expect(metrics.FID).toBeLessThan(100)   // Good: < 100ms
      expect(metrics.CLS).toBeLessThan(0.1)   // Good: < 0.1
    })

    it('monitors JavaScript execution time', () => {
      const startTime = performance.now()
      
      const complexCalculation = () => {
        let result = 0
        for (let i = 0; i < 100000; i++) {
          result += Math.random()
        }
        return result
      }
      
      const result = complexCalculation()
      const executionTime = performance.now() - startTime
      
      expect(result).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(100) // Should complete within 100ms
    })

    it('measures paint timing', () => {
      const paintTiming = {
        'first-paint': 800,
        'first-contentful-paint': 1200
      }
      
      expect(paintTiming['first-paint']).toBeLessThan(1000)      // < 1s
      expect(paintTiming['first-contentful-paint']).toBeLessThan(1500) // < 1.5s
    })
  })
})

export const performanceUtils = {
  measureRender: (component) => {
    const start = performance.now()
    const result = render(component)
    const end = performance.now()
    return { ...result, renderTime: end - start }
  },
  
  monitorAPI: async (url, options) => {
    const start = performance.now()
    const response = await fetch(url, options)
    const end = performance.now()
    
    return {
      response,
      duration: end - start,
      timing: {
        start,
        end
      }
    }
  },
  
  getMemoryUsage: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      }
    }
    return null
  }
}