/**
 * Context Testing Utilities
 * Helper functions and mocks for testing the unified context system
 */

import { render } from '@testing-library/react'
import { GlobalDashboardProvider } from '@/contexts/GlobalDashboardContext'
import contextAwareCache from '@/lib/context-aware-cache'

// Mock Supabase client with comprehensive responses
export const createMockSupabase = (customResponses = {}) => {
  const defaultResponses = {
    barbershops: {
      data: [
        { id: 'bb-1', name: 'Downtown Cuts', address: '123 Main St', city: 'Downtown' },
        { id: 'bb-2', name: 'Uptown Styles', address: '456 Oak Ave', city: 'Uptown' },
        { id: 'bb-3', name: 'Midtown Barbers', address: '789 Pine St', city: 'Midtown' }
      ],
      error: null
    },
    barbershop_staff: {
      data: [
        { id: 'staff-1', user_id: 'user-1', barbershop_id: 'bb-1', role: 'BARBER', is_active: true },
        { id: 'staff-2', user_id: 'user-2', barbershop_id: 'bb-1', role: 'MANAGER', is_active: true },
        { id: 'staff-3', user_id: 'user-3', barbershop_id: 'bb-2', role: 'OWNER', is_active: true },
        { id: 'staff-4', user_id: 'user-4', barbershop_id: 'bb-3', role: 'BARBER', is_active: true }
      ],
      error: null
    },
    profiles: {
      data: [
        { id: 'user-1', full_name: 'John Barber', email: 'john@example.com', barbershop_id: 'bb-1' },
        { id: 'user-2', full_name: 'Jane Manager', email: 'jane@example.com', barbershop_id: 'bb-1' },
        { id: 'user-3', full_name: 'Bob Owner', email: 'bob@example.com', barbershop_id: 'bb-2' },
        { id: 'user-4', full_name: 'Alice Stylist', email: 'alice@example.com', barbershop_id: 'bb-3' }
      ],
      error: null
    },
    appointments: {
      data: [
        { id: 'apt-1', barbershop_id: 'bb-1', barber_id: 'staff-1', date: '2025-01-15', status: 'confirmed' },
        { id: 'apt-2', barbershop_id: 'bb-1', barber_id: 'staff-2', date: '2025-01-16', status: 'pending' },
        { id: 'apt-3', barbershop_id: 'bb-2', barber_id: 'staff-3', date: '2025-01-17', status: 'confirmed' }
      ],
      error: null
    },
    services: {
      data: [
        { id: 'svc-1', barbershop_id: 'bb-1', name: 'Haircut', price: 25, duration: 30 },
        { id: 'svc-2', barbershop_id: 'bb-1', name: 'Beard Trim', price: 15, duration: 15 },
        { id: 'svc-3', barbershop_id: 'bb-2', name: 'Full Service', price: 40, duration: 60 }
      ],
      error: null
    },
    customers: {
      data: [
        { id: 'cust-1', barbershop_id: 'bb-1', name: 'Customer One', email: 'c1@example.com' },
        { id: 'cust-2', barbershop_id: 'bb-2', name: 'Customer Two', email: 'c2@example.com' }
      ],
      error: null
    }
  }

  const responses = { ...defaultResponses, ...customResponses }

  return {
    from: jest.fn().mockImplementation((table) => ({
      select: jest.fn().mockImplementation((columns) => ({
        eq: jest.fn().mockImplementation((column, value) => 
          Promise.resolve(responses[table] || { data: [], error: null })
        ),
        in: jest.fn().mockImplementation((column, values) => 
          Promise.resolve(responses[table] || { data: [], error: null })
        ),
        single: jest.fn().mockImplementation(() => 
          Promise.resolve(responses[table]?.data?.[0] ? 
            { data: responses[table].data[0], error: null } : 
            { data: null, error: { code: 'PGRST116', message: 'No rows found' } }
          )
        )
      })),
      eq: jest.fn().mockImplementation((column, value) => ({
        select: jest.fn().mockImplementation(() => 
          Promise.resolve(responses[table] || { data: [], error: null })
        )
      })),
      in: jest.fn().mockImplementation((column, values) => ({
        select: jest.fn().mockImplementation(() => 
          Promise.resolve(responses[table] || { data: [], error: null })
        )
      }))
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null
      })
    }
  }
}

// Test context configurations
export const testContexts = {
  executive: {
    locationId: 'bb-1',
    contextType: 'executive',
    displayName: 'Downtown Cuts - Executive Dashboard',
    locationName: 'Downtown Cuts',
    userId: 'user-3',
    role: 'OWNER',
    primaryView: 'analytics'
  },
  manager: {
    locationId: 'bb-1',
    contextType: 'manager',
    displayName: 'Downtown Cuts - Manager Dashboard',
    locationName: 'Downtown Cuts',
    userId: 'user-2',
    role: 'MANAGER',
    primaryView: 'shop-calendar'
  },
  personal: {
    locationId: 'bb-1',
    contextType: 'personal',
    displayName: 'Downtown Cuts - My Schedule',
    locationName: 'Downtown Cuts',
    userId: 'user-1',
    role: 'BARBER',
    primaryView: 'my-schedule'
  },
  multiLocation: {
    locationId: 'bb-2',
    contextType: 'executive',
    displayName: 'Uptown Styles - Executive Dashboard',
    locationName: 'Uptown Styles',
    userId: 'user-3',
    role: 'OWNER',
    primaryView: 'analytics'
  }
}

// Render component with context provider and mocks
export const renderWithContext = (component, options = {}) => {
  const {
    mockSupabaseResponses = {},
    initialContext = null,
    ...renderOptions
  } = options

  // Setup Supabase mock
  const mockSupabase = createMockSupabase(mockSupabaseResponses)
  
  // Mock the Supabase client module
  jest.doMock('@/lib/supabase/UNIFIED_CLIENT', () => ({
    createClient: () => mockSupabase
  }))

  // Clear cache before each test
  contextAwareCache.clear()

  const WrappedComponent = () => (
    <GlobalDashboardProvider initialContext={initialContext}>
      {component}
    </GlobalDashboardProvider>
  )

  return {
    ...render(<WrappedComponent />, renderOptions),
    mockSupabase
  }
}

// Cache state helpers
export const cacheHelpers = {
  // Set up cache with test data
  populateCache: (contexts = [testContexts.executive, testContexts.manager]) => {
    contexts.forEach((context, index) => {
      contextAwareCache.set('contextualData', context, {
        appointments: [
          { id: `apt-${index}-1`, barbershop_id: context.locationId, status: 'confirmed' },
          { id: `apt-${index}-2`, barbershop_id: context.locationId, status: 'pending' }
        ],
        staff: [
          { id: `staff-${index}`, barbershop_id: context.locationId, role: context.role }
        ],
        analytics: {
          revenue: 1000 + (index * 500),
          bookings: 50 + (index * 10)
        }
      })
    })
  },

  // Get current cache statistics
  getCacheStats: () => contextAwareCache.getStats(),

  // Clear all cache data
  clearCache: () => contextAwareCache.clear(),

  // Check if specific data is cached
  isCached: (dataType, context) => {
    return contextAwareCache.get(dataType, context) !== null
  },

  // Force expire cache entries
  expireEntries: (keys = []) => {
    if (keys.length === 0) {
      // Expire all entries
      for (const [key, metadata] of contextAwareCache.metadata.entries()) {
        metadata.expiresAt = Date.now() - 1000
      }
    } else {
      // Expire specific keys
      keys.forEach(key => {
        const metadata = contextAwareCache.metadata.get(key)
        if (metadata) {
          metadata.expiresAt = Date.now() - 1000
        }
      })
    }
  }
}

// Performance measurement utilities
export const performanceHelpers = {
  // Measure context switching time
  measureContextSwitch: async (switchFunction, targetContext) => {
    const start = performance.now()
    await switchFunction(targetContext)
    const end = performance.now()
    return end - start
  },

  // Measure cache operation times
  measureCacheOperations: (operations = 100) => {
    const context = testContexts.executive
    const results = {
      set: 0,
      get: 0,
      invalidate: 0
    }

    // Measure SET operations
    const setStart = performance.now()
    for (let i = 0; i < operations; i++) {
      contextAwareCache.set('test', context, { id: i })
    }
    const setEnd = performance.now()
    results.set = (setEnd - setStart) / operations

    // Measure GET operations  
    const getStart = performance.now()
    for (let i = 0; i < operations; i++) {
      contextAwareCache.get('test', context)
    }
    const getEnd = performance.now()
    results.get = (getEnd - getStart) / operations

    // Measure INVALIDATE operations
    const invalidateStart = performance.now()
    for (let i = 0; i < operations; i++) {
      contextAwareCache.invalidate('test', context)
      contextAwareCache.set('test', context, { id: i }) // Refill for next invalidation
    }
    const invalidateEnd = performance.now()
    results.invalidate = (invalidateEnd - invalidateStart) / operations

    return results
  },

  // Monitor memory usage during operations
  measureMemoryUsage: (operation) => {
    const before = process.memoryUsage()
    operation()
    const after = process.memoryUsage()

    return {
      heapUsedDelta: after.heapUsed - before.heapUsed,
      heapTotalDelta: after.heapTotal - before.heapTotal,
      externalDelta: after.external - before.external
    }
  }
}

// Data generation utilities for stress testing
export const dataGenerators = {
  // Generate large dataset for cache stress testing
  generateLargeDataset: (size = 1000) => ({
    appointments: Array.from({ length: size }, (_, i) => ({
      id: `apt-${i}`,
      barbershop_id: `bb-${i % 5}`,
      customer_id: `cust-${i % 100}`,
      service_id: `svc-${i % 10}`,
      date: new Date(2025, 0, (i % 30) + 1).toISOString(),
      status: ['confirmed', 'pending', 'completed'][i % 3],
      notes: `Note for appointment ${i}`.repeat(10) // Make it larger
    })),
    analytics: {
      dailyStats: Array.from({ length: 365 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString(),
        revenue: Math.random() * 1000,
        bookings: Math.floor(Math.random() * 20),
        customers: Math.floor(Math.random() * 15)
      })),
      trends: Array.from({ length: 100 }, (_, i) => ({
        metric: `metric_${i}`,
        value: Math.random() * 100,
        change: (Math.random() - 0.5) * 20
      }))
    }
  }),

  // Generate contexts for multi-location testing
  generateContexts: (count = 10) => {
    return Array.from({ length: count }, (_, i) => ({
      locationId: `bb-${i}`,
      contextType: ['executive', 'manager', 'personal'][i % 3],
      displayName: `Location ${i} - Dashboard`,
      locationName: `Location ${i}`,
      userId: `user-${i}`,
      role: ['OWNER', 'MANAGER', 'BARBER'][i % 3],
      primaryView: ['analytics', 'shop-calendar', 'my-schedule'][i % 3]
    }))
  }
}

// Assertion helpers for context testing
export const contextAssertions = {
  // Assert context state matches expected
  expectContextState: (context, expected) => {
    expect(context.activeContext?.locationId).toBe(expected.locationId)
    expect(context.activeContext?.contextType).toBe(expected.contextType)
    expect(context.activeContext?.displayName).toBe(expected.displayName)
  },

  // Assert cache contains expected data
  expectCacheContains: (dataType, context, expectedData = null) => {
    const cached = contextAwareCache.get(dataType, context)
    if (expectedData) {
      expect(cached).toEqual(expectedData)
    } else {
      expect(cached).not.toBeNull()
    }
  },

  // Assert cache statistics match expectations
  expectCacheStats: (expectedStats) => {
    const stats = contextAwareCache.getStats()
    
    if (expectedStats.size !== undefined) {
      expect(stats.size).toBe(expectedStats.size)
    }
    
    if (expectedStats.minHitRate !== undefined) {
      expect(stats.hitRate).toBeGreaterThanOrEqual(expectedStats.minHitRate)
    }
    
    if (expectedStats.typeBreakdown) {
      expect(stats.typeBreakdown).toEqual(
        expect.objectContaining(expectedStats.typeBreakdown)
      )
    }
  },

  // Assert performance meets thresholds
  expectPerformance: (actualTime, maxTime, operation = 'operation') => {
    expect(actualTime).toBeLessThan(maxTime)
    if (actualTime > maxTime * 0.8) {
      console.warn(`${operation} took ${actualTime}ms, approaching limit of ${maxTime}ms`)
    }
  }
}

export default {
  createMockSupabase,
  testContexts,
  renderWithContext,
  cacheHelpers,
  performanceHelpers,
  dataGenerators,
  contextAssertions
}