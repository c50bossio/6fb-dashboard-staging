/**
 * Comprehensive Context Switching Tests
 * Validates unified navigation system, intelligent caching, and context synchronization
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { GlobalDashboardProvider } from '@/contexts/GlobalDashboardContext'
import contextAwareCache from '@/lib/context-aware-cache'
import { UnifiedContextSelector } from '@/components/navigation/UnifiedContextSelector'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user', email: 'test@example.com' } },
      error: null
    })
  }
}

jest.mock('@/lib/supabase/UNIFIED_CLIENT', () => ({
  createClient: () => mockSupabase
}))

// Mock data for testing
const mockBarbershops = [
  {
    id: 'bb-1',
    name: 'Downtown Cuts',
    address: '123 Main St',
    city: 'Downtown'
  },
  {
    id: 'bb-2', 
    name: 'Uptown Styles',
    address: '456 Oak Ave',
    city: 'Uptown'
  }
]

const mockStaff = [
  {
    id: 'staff-1',
    user_id: 'user-1',
    barbershop_id: 'bb-1',
    role: 'BARBER',
    full_name: 'John Barber'
  },
  {
    id: 'staff-2',
    user_id: 'user-2',
    barbershop_id: 'bb-1', 
    role: 'MANAGER',
    full_name: 'Jane Manager'
  },
  {
    id: 'staff-3',
    user_id: 'user-3',
    barbershop_id: 'bb-2',
    role: 'OWNER',
    full_name: 'Bob Owner'
  }
]

const mockAppointments = [
  {
    id: 'apt-1',
    barbershop_id: 'bb-1',
    barber_id: 'staff-1',
    date: '2025-01-15',
    status: 'confirmed'
  },
  {
    id: 'apt-2', 
    barbershop_id: 'bb-2',
    barber_id: 'staff-3',
    date: '2025-01-16',
    status: 'pending'
  }
]

// Setup mock API responses
const setupMockApiResponses = () => {
  const mockSelect = jest.fn()
  const mockEq = jest.fn(() => ({ data: [], error: null }))
  const mockIn = jest.fn(() => ({ data: [], error: null }))
  const mockSingle = jest.fn(() => ({ data: null, error: null }))

  mockSelect.mockImplementation((columns) => ({
    eq: mockEq,
    in: mockIn,
    single: mockSingle
  }))

  mockSupabase.from.mockImplementation((table) => {
    const responses = {
      barbershops: { data: mockBarbershops, error: null },
      barbershop_staff: { data: mockStaff, error: null },
      profiles: { data: mockStaff.map(s => ({ id: s.user_id, full_name: s.full_name })), error: null },
      appointments: { data: mockAppointments, error: null }
    }

    return {
      select: () => Promise.resolve(responses[table] || { data: [], error: null }),
      eq: () => ({ 
        select: () => Promise.resolve(responses[table] || { data: [], error: null })
      }),
      in: () => ({
        select: () => Promise.resolve(responses[table] || { data: [], error: null })
      })
    }
  })
}

describe('Context Switching System', () => {
  beforeEach(() => {
    setupMockApiResponses()
    contextAwareCache.clear()
    jest.clearAllMocks()
  })

  describe('Context Generation & Selection', () => {
    test('generates contexts from available barbershops and staff', async () => {
      const TestComponent = () => {
        return (
          <GlobalDashboardProvider>
            <UnifiedContextSelector />
          </GlobalDashboardProvider>
        )
      }

      render(<TestComponent />)

      // Wait for contexts to load
      await waitFor(() => {
        expect(screen.queryByText('Loading contexts...')).not.toBeInTheDocument()
      })

      // Should show contexts for each barbershop
      expect(screen.getByText(/Downtown Cuts/)).toBeInTheDocument()
      expect(screen.getByText(/Uptown Styles/)).toBeInTheDocument()
    })

    test('switches context and updates state correctly', async () => {
      let contextValue
      
      const TestComponent = () => {
        const context = useGlobalDashboard()
        contextValue = context
        
        return (
          <div>
            <UnifiedContextSelector />
            <div data-testid="active-context">
              {context.activeContext?.displayName || 'None'}
            </div>
          </div>
        )
      }

      const { rerender } = render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.queryByText('Loading contexts...')).not.toBeInTheDocument()
      })

      // Click on context dropdown
      const dropdown = screen.getByRole('button', { name: /select context/i })
      fireEvent.click(dropdown)

      // Select a specific context
      const contextOption = screen.getByText(/Downtown Cuts - Executive Dashboard/i)
      fireEvent.click(contextOption)

      // Verify context changed
      await waitFor(() => {
        expect(screen.getByTestId('active-context')).toHaveTextContent('Downtown Cuts - Executive Dashboard')
      })
    })
  })

  describe('Intelligent Caching System', () => {
    test('caches context data with correct TTL and priority', async () => {
      const context = {
        locationId: 'bb-1',
        contextType: 'executive',
        userId: 'test-user',
        role: 'OWNER'
      }

      // Mock cache stats before
      const statsBefore = contextAwareCache.getStats()
      expect(statsBefore.size).toBe(0)

      // Set cache data
      const testData = { appointments: mockAppointments.filter(a => a.barbershop_id === 'bb-1') }
      contextAwareCache.set('contextualData', context, testData)

      // Verify cache entry created
      const statsAfter = contextAwareCache.getStats()
      expect(statsAfter.size).toBe(1)
      expect(statsAfter.typeBreakdown.contextualData).toBe(1)
      expect(statsAfter.priorities.high).toBe(1)

      // Retrieve cached data
      const cachedData = contextAwareCache.get('contextualData', context)
      expect(cachedData).toEqual(testData)
    })

    test('invalidates related cache entries correctly', () => {
      // Setup multiple cache entries
      const context1 = { locationId: 'bb-1', contextType: 'executive' }
      const context2 = { locationId: 'bb-1', contextType: 'manager' }
      const context3 = { locationId: 'bb-2', contextType: 'executive' }

      contextAwareCache.set('appointments', context1, [{ id: 1 }])
      contextAwareCache.set('analytics', context1, { revenue: 1000 })
      contextAwareCache.set('contextualData', context2, { staff: [] })
      contextAwareCache.set('appointments', context3, [{ id: 2 }])

      expect(contextAwareCache.getStats().size).toBe(4)

      // Invalidate appointments for bb-1
      contextAwareCache.invalidate('appointments', { locationId: 'bb-1' })

      // Should invalidate appointments and dependent analytics for bb-1 only
      const stats = contextAwareCache.getStats()
      expect(stats.size).toBe(2) // contextualData + bb-2 appointments remain
      expect(contextAwareCache.get('appointments', context3)).toBeTruthy() // bb-2 unaffected
      expect(contextAwareCache.get('contextualData', context2)).toBeTruthy() // different data type
    })

    test('predictive preloading works correctly', async () => {
      const currentContext = {
        locationId: 'bb-1',
        contextType: 'executive',
        displayName: 'Downtown Cuts - Executive Dashboard',
        locationName: 'Downtown Cuts'
      }

      // Mock data loader
      const mockDataLoader = jest.fn().mockResolvedValue({ preloaded: true })

      // Trigger predictive preloading
      await contextAwareCache.preloadPredictedContexts(currentContext, mockDataLoader)

      // Should predict manager view for same location
      expect(mockDataLoader).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: 'bb-1',
          contextType: 'manager'
        })
      )

      // Verify cache contains preloaded data
      const managerContext = { locationId: 'bb-1', contextType: 'manager' }
      const preloadedData = contextAwareCache.get('contextualData', managerContext)
      expect(preloadedData).toEqual({ preloaded: true })
    })
  })

  describe('Cache Performance & Cleanup', () => {
    test('cache cleanup removes expired entries', async () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }

      // Mock expired entry
      contextAwareCache.set('analytics', context, { old: true })
      
      // Manually expire the entry
      const key = contextAwareCache.generateCacheKey('analytics', context)
      const metadata = contextAwareCache.metadata.get(key)
      metadata.expiresAt = Date.now() - 1000 // Expired 1 second ago

      expect(contextAwareCache.getStats().size).toBe(1)

      // Trigger cleanup
      contextAwareCache.cleanup()

      // Expired entry should be removed
      expect(contextAwareCache.getStats().size).toBe(0)
    })

    test('cache cleanup removes low-usage entries when full', () => {
      // Fill cache to trigger size-based cleanup
      for (let i = 0; i < 85; i++) {
        const context = { locationId: `bb-${i}`, contextType: 'executive' }
        contextAwareCache.set('analytics', context, { data: i })
        
        // Mark some as low usage
        if (i < 40) {
          const key = contextAwareCache.generateCacheKey('analytics', context)
          const metadata = contextAwareCache.metadata.get(key)
          metadata.priority = 'low'
          metadata.accessCount = 1 // Low usage
        }
      }

      const sizeBefore = contextAwareCache.getStats().size
      expect(sizeBefore).toBe(85)

      // Trigger cleanup
      contextAwareCache.cleanup()

      const sizeAfter = contextAwareCache.getStats().size
      expect(sizeAfter).toBeLessThan(sizeBefore) // Should have removed some entries
    })

    test('generates accurate performance statistics', () => {
      // Setup cache with various types and priorities
      contextAwareCache.set('barbershops', { locationId: 'bb-1' }, [])
      contextAwareCache.set('appointments', { locationId: 'bb-1' }, [])
      contextAwareCache.set('analytics', { locationId: 'bb-1' }, {})
      
      // Access some entries multiple times to simulate hit rate
      contextAwareCache.get('barbershops', { locationId: 'bb-1' })
      contextAwareCache.get('barbershops', { locationId: 'bb-1' })
      contextAwareCache.get('appointments', { locationId: 'bb-1' })

      const stats = contextAwareCache.getStats()

      expect(stats.size).toBe(3)
      expect(stats.typeBreakdown).toEqual({
        barbershops: 1,
        appointments: 1,
        analytics: 1
      })
      expect(stats.priorities.high).toBe(2) // barbershops + appointments
      expect(stats.priorities.low).toBe(1)  // analytics
      expect(stats.hitRate).toBeGreaterThan(0) // Should show some hit rate
    })
  })

  describe('Context-Aware Data Loading', () => {
    test('loads appropriate data for each context type', async () => {
      const TestComponent = () => {
        const { contextualData, activeContext } = useGlobalDashboard()
        
        return (
          <div>
            <div data-testid="context-type">{activeContext?.contextType}</div>
            <div data-testid="data-loaded">{contextualData ? 'loaded' : 'loading'}</div>
            {contextualData?.appointments && (
              <div data-testid="appointments-count">{contextualData.appointments.length}</div>
            )}
          </div>
        )
      }

      render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )

      // Wait for context to load
      await waitFor(() => {
        expect(screen.getByTestId('data-loaded')).toHaveTextContent('loaded')
      })

      // Verify appropriate data was loaded based on context
      if (screen.getByTestId('context-type').textContent === 'executive') {
        expect(screen.queryByTestId('appointments-count')).toBeInTheDocument()
      }
    })

    test('handles cache misses and loads fresh data', async () => {
      const context = { locationId: 'bb-1', contextType: 'manager' }
      
      // Ensure cache is empty
      contextAwareCache.clear()
      expect(contextAwareCache.get('contextualData', context)).toBeNull()

      // Simulate context switch that should trigger data load
      const TestComponent = () => {
        const { switchContext } = useGlobalDashboard()
        
        useEffect(() => {
          switchContext({
            ...context,
            displayName: 'Test Context'
          })
        }, [])
        
        return <div data-testid="component">Test</div>
      }

      render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )

      // Wait for data to be fetched and cached
      await waitFor(() => {
        const cachedData = contextAwareCache.get('contextualData', context)
        expect(cachedData).not.toBeNull()
      })
    })
  })

  describe('Cross-Component Context Synchronization', () => {
    test('context changes propagate to all consuming components', async () => {
      const Component1 = () => {
        const { activeContext } = useGlobalDashboard()
        return <div data-testid="comp1">{activeContext?.displayName || 'None'}</div>
      }

      const Component2 = () => {
        const { activeContext } = useGlobalDashboard()
        return <div data-testid="comp2">{activeContext?.contextType || 'none'}</div>
      }

      const ContextSwitcher = () => {
        const { switchContext } = useGlobalDashboard()
        
        const handleSwitch = () => {
          switchContext({
            locationId: 'bb-1',
            contextType: 'manager',
            displayName: 'Downtown Cuts - Manager Dashboard'
          })
        }
        
        return <button onClick={handleSwitch} data-testid="switch-btn">Switch</button>
      }

      render(
        <GlobalDashboardProvider>
          <Component1 />
          <Component2 />
          <ContextSwitcher />
        </GlobalDashboardProvider>
      )

      // Initial state
      expect(screen.getByTestId('comp1')).toHaveTextContent('None')
      expect(screen.getByTestId('comp2')).toHaveTextContent('none')

      // Switch context
      fireEvent.click(screen.getByTestId('switch-btn'))

      // Both components should update
      await waitFor(() => {
        expect(screen.getByTestId('comp1')).toHaveTextContent('Downtown Cuts - Manager Dashboard')
        expect(screen.getByTestId('comp2')).toHaveTextContent('manager')
      })
    })

    test('cache invalidation affects all dependent components', async () => {
      const DataComponent = () => {
        const { contextualData, invalidateStaffCache } = useGlobalDashboard()
        
        return (
          <div>
            <div data-testid="staff-count">
              {contextualData?.staff?.length || 0}
            </div>
            <button onClick={invalidateStaffCache} data-testid="invalidate-btn">
              Invalidate
            </button>
          </div>
        )
      }

      render(
        <GlobalDashboardProvider>
          <DataComponent />
        </GlobalDashboardProvider>
      )

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByTestId('staff-count')).not.toHaveTextContent('0')
      })

      // Invalidate cache
      fireEvent.click(screen.getByTestId('invalidate-btn'))

      // Should trigger re-fetch
      await waitFor(() => {
        // Component should re-render with fresh data
        expect(mockSupabase.from).toHaveBeenCalledWith('barbershop_staff')
      })
    })
  })

  describe('Error Handling & Resilience', () => {
    test('handles API errors gracefully', async () => {
      // Mock API error
      mockSupabase.from.mockImplementation(() => ({
        select: () => Promise.resolve({ data: null, error: { message: 'Network error' } })
      }))

      const TestComponent = () => {
        const { contextualData, error } = useGlobalDashboard()
        return (
          <div>
            <div data-testid="error">{error || 'no error'}</div>
            <div data-testid="data">{contextualData ? 'loaded' : 'not loaded'}</div>
          </div>
        )
      }

      render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no error')
        expect(screen.getByTestId('data')).toHaveTextContent('not loaded')
      })
    })

    test('recovers from cache corruption', () => {
      // Corrupt cache by setting invalid metadata
      const context = { locationId: 'bb-1', contextType: 'executive' }
      const key = contextAwareCache.generateCacheKey('contextualData', context)
      
      contextAwareCache.cache.set(key, { valid: true })
      contextAwareCache.metadata.set(key, null) // Corrupted metadata

      // Should handle gracefully and return null
      const result = contextAwareCache.get('contextualData', context)
      expect(result).toBeNull()

      // Cache should clean itself up
      expect(contextAwareCache.cache.has(key)).toBeFalsy()
    })
  })

  describe('Performance & Memory Management', () => {
    test('cache respects memory limits', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Fill cache with large amounts of data
      for (let i = 0; i < 200; i++) {
        const context = { locationId: `bb-${i}`, contextType: 'executive' }
        const largeData = { data: new Array(1000).fill(`item-${i}`) }
        contextAwareCache.set('contextualData', context, largeData)
      }

      const stats = contextAwareCache.getStats()
      expect(stats.size).toBeLessThanOrEqual(100) // Should trigger cleanup

      const finalMemory = process.memoryUsage().heapUsed
      const memoryGrowth = finalMemory - initialMemory
      
      // Should not grow memory excessively (allow 50MB growth)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024)
    })

    test('context switching performance is acceptable', async () => {
      const TestComponent = () => {
        const { switchContext } = useGlobalDashboard()
        
        return (
          <button 
            data-testid="perf-switch"
            onClick={() => {
              switchContext({
                locationId: 'bb-1',
                contextType: 'manager',
                displayName: 'Test Performance'
              })
            }}
          >
            Switch
          </button>
        )
      }

      render(
        <GlobalDashboardProvider>
          <TestComponent />
        </GlobalDashboardProvider>
      )

      // Measure context switching time
      const start = performance.now()
      
      fireEvent.click(screen.getByTestId('perf-switch'))
      
      await waitFor(() => {
        // Wait for context switch to complete
      })
      
      const end = performance.now()
      const switchTime = end - start
      
      // Context switch should complete within 100ms (excluding API calls)
      expect(switchTime).toBeLessThan(100)
    })
  })
})