/**
 * Basic Cache System Tests
 * Tests core functionality of the context-aware cache without complex React components
 */

import contextAwareCache from '../lib/context-aware-cache.js'

describe('Context-Aware Cache System', () => {
  beforeEach(() => {
    contextAwareCache.clear()
    jest.clearAllMocks()
  })

  describe('Basic Cache Operations', () => {
    test('stores and retrieves data correctly', () => {
      const context = {
        locationId: 'bb-1',
        contextType: 'executive',
        userId: 'user-1',
        role: 'OWNER'
      }

      const testData = {
        appointments: [{ id: 1, status: 'confirmed' }],
        revenue: 1500
      }

      // Set data
      contextAwareCache.set('contextualData', context, testData)

      // Retrieve data
      const retrieved = contextAwareCache.get('contextualData', context)
      
      expect(retrieved).toEqual(testData)
    })

    test('returns null for non-existent data', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      const result = contextAwareCache.get('nonexistent', context)
      
      expect(result).toBeNull()
    })

    test('respects TTL expiration', async () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      const testData = { test: true }

      // Set data
      contextAwareCache.set('shortLived', context, testData)

      // Manually expire the entry
      const key = contextAwareCache.generateCacheKey('shortLived', context)
      const metadata = contextAwareCache.metadata.get(key)
      metadata.expiresAt = Date.now() - 1000 // Expired 1 second ago

      // Should return null for expired data
      const result = contextAwareCache.get('shortLived', context)
      expect(result).toBeNull()
    })
  })

  describe('Cache Key Generation', () => {
    test('generates unique keys for different contexts', () => {
      const context1 = { locationId: 'bb-1', contextType: 'executive' }
      const context2 = { locationId: 'bb-2', contextType: 'executive' }
      const context3 = { locationId: 'bb-1', contextType: 'manager' }

      const key1 = contextAwareCache.generateCacheKey('data', context1)
      const key2 = contextAwareCache.generateCacheKey('data', context2)
      const key3 = contextAwareCache.generateCacheKey('data', context3)

      expect(key1).not.toBe(key2)
      expect(key1).not.toBe(key3)
      expect(key2).not.toBe(key3)
    })

    test('includes parameters in cache key', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      const params1 = { timeRange: { start: '2025-01-01', end: '2025-01-31' } }
      const params2 = { timeRange: { start: '2025-02-01', end: '2025-02-28' } }

      const key1 = contextAwareCache.generateCacheKey('data', context, params1)
      const key2 = contextAwareCache.generateCacheKey('data', context, params2)

      expect(key1).not.toBe(key2)
      expect(key1).toContain('2025-01-01-2025-01-31')
      expect(key2).toContain('2025-02-01-2025-02-28')
    })
  })

  describe('Cache Invalidation', () => {
    test('invalidates direct data type matches', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      contextAwareCache.set('appointments', context, [{ id: 1 }])
      contextAwareCache.set('analytics', context, { revenue: 1000 })
      
      expect(contextAwareCache.getStats().size).toBe(2)
      
      // Invalidate appointments only
      contextAwareCache.invalidate('appointments', context)
      
      expect(contextAwareCache.get('appointments', context)).toBeNull()
      expect(contextAwareCache.get('analytics', context)).not.toBeNull()
      expect(contextAwareCache.getStats().size).toBe(1)
    })

    test('invalidates dependent data types', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      // Set up data with dependencies
      contextAwareCache.set('staff', context, [{ id: 1 }])
      contextAwareCache.set('appointments', context, [{ id: 1 }]) // Depends on staff
      contextAwareCache.set('analytics', context, { revenue: 1000 }) // Depends on appointments
      
      expect(contextAwareCache.getStats().size).toBe(3)
      
      // Invalidate staff - should cascade to appointments and analytics
      contextAwareCache.invalidate('staff', context)
      
      const stats = contextAwareCache.getStats()
      expect(stats.size).toBeLessThan(3) // Some entries should be invalidated
    })

    test('respects location-based invalidation', () => {
      const context1 = { locationId: 'bb-1', contextType: 'executive' }
      const context2 = { locationId: 'bb-2', contextType: 'executive' }
      
      contextAwareCache.set('appointments', context1, [{ id: 1, location: 'bb-1' }])
      contextAwareCache.set('appointments', context2, [{ id: 2, location: 'bb-2' }])
      
      expect(contextAwareCache.getStats().size).toBe(2)
      
      // Invalidate appointments for bb-1 only
      contextAwareCache.invalidate('appointments', { locationId: 'bb-1' })
      
      expect(contextAwareCache.get('appointments', context1)).toBeNull()
      expect(contextAwareCache.get('appointments', context2)).not.toBeNull()
    })
  })

  describe('Cache Statistics', () => {
    test('provides accurate cache statistics', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      // Empty cache initially
      let stats = contextAwareCache.getStats()
      expect(stats.size).toBe(0)
      expect(stats.hitRate).toBe(0)
      
      // Add some data
      contextAwareCache.set('barbershops', context, [])    // High priority
      contextAwareCache.set('appointments', context, [])   // High priority
      contextAwareCache.set('analytics', context, {})      // Low priority
      
      stats = contextAwareCache.getStats()
      expect(stats.size).toBe(3)
      expect(stats.typeBreakdown.barbershops).toBe(1)
      expect(stats.typeBreakdown.appointments).toBe(1)
      expect(stats.typeBreakdown.analytics).toBe(1)
      expect(stats.priorities.high).toBe(2)
      expect(stats.priorities.low).toBe(1)
    })

    test('calculates hit rate correctly', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      // Set some data
      contextAwareCache.set('data1', context, { test: 1 })
      contextAwareCache.set('data2', context, { test: 2 })
      
      // Access data1 multiple times (creates hits)
      contextAwareCache.get('data1', context)
      contextAwareCache.get('data1', context)
      contextAwareCache.get('data1', context)
      
      // Access data2 once
      contextAwareCache.get('data2', context)
      
      const stats = contextAwareCache.getStats()
      expect(stats.hitRate).toBeGreaterThan(0)
      expect(stats.hitRate).toBeLessThanOrEqual(100)
    })
  })

  describe('Cache Cleanup', () => {
    test('cleanup removes expired entries', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      // Add entries
      contextAwareCache.set('data1', context, { test: 1 })
      contextAwareCache.set('data2', context, { test: 2 })
      
      expect(contextAwareCache.getStats().size).toBe(2)
      
      // Manually expire first entry
      const key1 = contextAwareCache.generateCacheKey('data1', context)
      const metadata = contextAwareCache.metadata.get(key1)
      metadata.expiresAt = Date.now() - 1000
      
      // Run cleanup
      contextAwareCache.cleanup()
      
      expect(contextAwareCache.getStats().size).toBe(1)
      expect(contextAwareCache.get('data1', context)).toBeNull()
      expect(contextAwareCache.get('data2', context)).not.toBeNull()
    })

    test('cleanup respects cache size limits', () => {
      // Fill cache beyond reasonable limit (cache auto-cleans at 100 entries)
      for (let i = 0; i < 90; i++) {
        const context = { locationId: `bb-${i}`, contextType: 'executive' }
        contextAwareCache.set('data', context, { id: i })
      }
      
      const initialSize = contextAwareCache.getStats().size
      expect(initialSize).toBeLessThanOrEqual(100) // Cache may clean during filling
      
      // Trigger cleanup by adding more entries
      for (let i = 90; i < 110; i++) {
        const context = { locationId: `bb-${i}`, contextType: 'executive' }
        contextAwareCache.set('data', context, { id: i })
      }
      
      // Should have triggered automatic cleanup
      const finalSize = contextAwareCache.getStats().size
      expect(finalSize).toBeLessThanOrEqual(100) // Should respect max size
    })
  })

  describe('Predictive Preloading', () => {
    test('predicts next contexts correctly', () => {
      const executiveContext = {
        locationId: 'bb-1',
        contextType: 'executive',
        locationName: 'Downtown Cuts'
      }
      
      const predictions = contextAwareCache.getPredictedContexts(executiveContext)
      
      expect(predictions).toHaveLength(1) // Should predict manager view
      expect(predictions[0]).toMatchObject({
        locationId: 'bb-1',
        contextType: 'manager',
        displayName: 'Downtown Cuts - Manager Dashboard'
      })
    })

    test('preloading works with mock data loader', async () => {
      const context = {
        locationId: 'bb-1',
        contextType: 'executive',
        locationName: 'Downtown Cuts'
      }
      
      const mockDataLoader = jest.fn().mockResolvedValue({
        preloaded: true,
        timestamp: Date.now()
      })
      
      await contextAwareCache.preloadPredictedContexts(context, mockDataLoader)
      
      expect(mockDataLoader).toHaveBeenCalled()
      
      // Check that predicted context was cached
      const managerContext = {
        locationId: 'bb-1',
        contextType: 'manager'
      }
      const preloadedData = contextAwareCache.get('contextualData', managerContext)
      expect(preloadedData).toEqual(expect.objectContaining({ preloaded: true }))
    })
  })

  describe('Error Handling', () => {
    test('handles null context gracefully', () => {
      expect(() => {
        contextAwareCache.generateCacheKey('data', null)
      }).not.toThrow()
      
      expect(() => {
        contextAwareCache.set('data', null, { test: true })
      }).not.toThrow()
      
      expect(() => {
        contextAwareCache.get('data', null)
      }).not.toThrow()
    })

    test('handles undefined values gracefully', () => {
      const context = { locationId: undefined, contextType: undefined }
      
      expect(() => {
        const key = contextAwareCache.generateCacheKey('data', context)
        expect(typeof key).toBe('string')
      }).not.toThrow()
    })

    test('clears cache completely', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      contextAwareCache.set('data1', context, { test: 1 })
      contextAwareCache.set('data2', context, { test: 2 })
      
      expect(contextAwareCache.getStats().size).toBe(2)
      
      contextAwareCache.clear()
      
      expect(contextAwareCache.getStats().size).toBe(0)
    })
  })

  describe('Configuration and TTL', () => {
    test('different data types have appropriate TTL configurations', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      const now = Date.now()
      
      contextAwareCache.set('barbershops', context, [])    // 30 min TTL
      contextAwareCache.set('appointments', context, [])   // 2 min TTL
      contextAwareCache.set('analytics', context, {})      // 5 min TTL
      
      // Check metadata for TTL differences
      const barbershopsKey = contextAwareCache.generateCacheKey('barbershops', context)
      const appointmentsKey = contextAwareCache.generateCacheKey('appointments', context)
      const analyticsKey = contextAwareCache.generateCacheKey('analytics', context)
      
      const barbershopsMeta = contextAwareCache.metadata.get(barbershopsKey)
      const appointmentsMeta = contextAwareCache.metadata.get(appointmentsKey)
      const analyticsMeta = contextAwareCache.metadata.get(analyticsKey)
      
      // Barbershops should have longest TTL
      expect(barbershopsMeta.expiresAt - now).toBeGreaterThan(appointmentsMeta.expiresAt - now)
      expect(barbershopsMeta.expiresAt - now).toBeGreaterThan(analyticsMeta.expiresAt - now)
      
      // Analytics should have longer TTL than appointments
      expect(analyticsMeta.expiresAt - now).toBeGreaterThan(appointmentsMeta.expiresAt - now)
    })
  })
})