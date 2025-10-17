/**
 * Cache Performance and Stress Tests
 * Tests caching system under various load conditions and edge cases
 */

import contextAwareCache from '@/lib/context-aware-cache'

describe('Cache Performance Tests', () => {
  beforeEach(() => {
    contextAwareCache.clear()
  })

  describe('High Load Scenarios', () => {
    test('handles concurrent cache operations', async () => {
      const operations = []
      const contexts = Array.from({ length: 50 }, (_, i) => ({
        locationId: `bb-${i % 5}`, // 5 different locations
        contextType: ['executive', 'manager', 'personal'][i % 3],
        userId: `user-${i}`
      }))

      // Create 200 concurrent cache operations
      for (let i = 0; i < 200; i++) {
        const context = contexts[i % contexts.length]
        const operation = i % 4 === 0 ? 'set' : 'get' // 25% writes, 75% reads

        if (operation === 'set') {
          operations.push(
            Promise.resolve().then(() => {
              contextAwareCache.set('contextualData', context, { 
                id: i, 
                data: `test-data-${i}`,
                timestamp: Date.now()
              })
            })
          )
        } else {
          operations.push(
            Promise.resolve().then(() => {
              return contextAwareCache.get('contextualData', context)
            })
          )
        }
      }

      // Execute all operations concurrently
      const start = performance.now()
      const results = await Promise.all(operations)
      const end = performance.now()

      expect(end - start).toBeLessThan(1000) // Should complete within 1 second
      expect(results.length).toBe(200)
      
      // Verify cache state is consistent
      const stats = contextAwareCache.getStats()
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.size).toBeLessThanOrEqual(100) // Cleanup should have occurred
    })

    test('cache key generation performance', () => {
      const context = {
        locationId: 'bb-1',
        contextType: 'executive',
        userId: 'user-123',
        role: 'OWNER'
      }

      const params = {
        timeRange: { start: '2025-01-01', end: '2025-01-31' },
        filters: { status: 'active', type: 'premium' }
      }

      const iterations = 10000
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        contextAwareCache.generateCacheKey('contextualData', context, params)
      }

      const end = performance.now()
      const timePerKey = (end - start) / iterations

      // Should generate keys quickly (< 0.01ms per key)
      expect(timePerKey).toBeLessThan(0.01)
    })

    test('predictive preloading under load', async () => {
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        locationId: `bb-${i}`,
        contextType: 'executive',
        displayName: `Location ${i}`,
        locationName: `Location ${i}`
      }))

      // Mock data loader with delay to simulate real API
      const dataLoader = jest.fn().mockImplementation(async (context) => {
        await new Promise(resolve => setTimeout(resolve, 10)) // 10ms delay
        return { preloaded: true, context: context.locationId }
      })

      // Trigger preloading for all contexts simultaneously
      const start = performance.now()
      const preloadPromises = contexts.map(context => 
        contextAwareCache.preloadPredictedContexts(context, dataLoader)
      )

      await Promise.all(preloadPromises)
      const end = performance.now()

      // Should complete reasonably quickly despite concurrent operations
      expect(end - start).toBeLessThan(500) // 500ms max for all preloads
      
      // Verify all predictions were attempted
      expect(dataLoader).toHaveBeenCalled()
      
      // Check cache contains preloaded data
      const stats = contextAwareCache.getStats()
      expect(stats.size).toBeGreaterThan(0)
    })
  })

  describe('Memory Management', () => {
    test('prevents memory leaks with large datasets', () => {
      const initialHeapUsed = process.memoryUsage().heapUsed

      // Create large cache entries
      for (let i = 0; i < 500; i++) {
        const context = { locationId: `bb-${i}`, contextType: 'executive' }
        const largeData = {
          appointments: Array.from({ length: 1000 }, (_, j) => ({
            id: `apt-${i}-${j}`,
            data: `large-data-string-${i}-${j}`.repeat(10)
          })),
          analytics: {
            revenue: Math.random() * 10000,
            bookings: Math.random() * 500,
            details: Array.from({ length: 100 }, () => Math.random())
          }
        }
        
        contextAwareCache.set('contextualData', context, largeData)
      }

      // Force garbage collection if available
      if (global.gc) global.gc()

      const finalHeapUsed = process.memoryUsage().heapUsed
      const heapGrowth = finalHeapUsed - initialHeapUsed

      // Memory growth should be reasonable (< 100MB)
      expect(heapGrowth).toBeLessThan(100 * 1024 * 1024)

      // Cache should have auto-cleaned to stay under limits
      const stats = contextAwareCache.getStats()
      expect(stats.size).toBeLessThanOrEqual(100)
    })

    test('efficient cleanup of expired entries', () => {
      // Create entries with different expiration times
      for (let i = 0; i < 100; i++) {
        const context = { locationId: `bb-${i}`, contextType: 'executive' }
        contextAwareCache.set('contextualData', context, { data: i })

        // Make half of them expired
        if (i < 50) {
          const key = contextAwareCache.generateCacheKey('contextualData', context)
          const metadata = contextAwareCache.metadata.get(key)
          metadata.expiresAt = Date.now() - 1000 // Expired 1 second ago
        }
      }

      expect(contextAwareCache.getStats().size).toBe(100)

      const start = performance.now()
      contextAwareCache.cleanup()
      const end = performance.now()

      // Cleanup should be fast
      expect(end - start).toBeLessThan(50) // < 50ms

      // Should have removed expired entries
      const stats = contextAwareCache.getStats()
      expect(stats.size).toBeLessThanOrEqual(50)
    })
  })

  describe('Cache Statistics Accuracy', () => {
    test('hit rate calculation accuracy', () => {
      const contexts = [
        { locationId: 'bb-1', contextType: 'executive' },
        { locationId: 'bb-1', contextType: 'manager' },
        { locationId: 'bb-2', contextType: 'executive' }
      ]

      // Set initial data
      contexts.forEach((context, i) => {
        contextAwareCache.set('contextualData', context, { id: i })
      })

      // Simulate different access patterns
      // Context 0: 5 hits, Context 1: 3 hits, Context 2: 1 hit
      for (let i = 0; i < 5; i++) contextAwareCache.get('contextualData', contexts[0])
      for (let i = 0; i < 3; i++) contextAwareCache.get('contextualData', contexts[1])
      for (let i = 0; i < 1; i++) contextAwareCache.get('contextualData', contexts[2])

      const stats = contextAwareCache.getStats()

      expect(stats.size).toBe(3)
      expect(stats.hitRate).toBeCloseTo(66.67, 1) // 2 out of 3 entries have multiple hits
    })

    test('type breakdown accuracy', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }

      contextAwareCache.set('barbershops', context, [])
      contextAwareCache.set('appointments', context, [])
      contextAwareCache.set('analytics', context, {})
      contextAwareCache.set('contextualData', context, {})

      const stats = contextAwareCache.getStats()

      expect(stats.typeBreakdown).toEqual({
        barbershops: 1,
        appointments: 1,
        analytics: 1,
        contextualData: 1
      })

      expect(stats.priorities.high).toBe(3) // barbershops, appointments, contextualData
      expect(stats.priorities.low).toBe(1)  // analytics
    })
  })

  describe('Edge Cases and Error Handling', () => {
    test('handles corrupted cache metadata', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      const key = contextAwareCache.generateCacheKey('contextualData', context)

      // Set valid cache data
      contextAwareCache.set('contextualData', context, { valid: true })
      
      // Corrupt the metadata
      contextAwareCache.metadata.set(key, {
        // Missing required fields
        expiresAt: 'invalid-date',
        accessCount: 'not-a-number'
      })

      // Should handle gracefully
      const result = contextAwareCache.get('contextualData', context)
      expect(result).toBeNull()

      // Should clean up corrupted entry
      expect(contextAwareCache.cache.has(key)).toBeFalsy()
    })

    test('handles cache key generation with null values', () => {
      const invalidContexts = [
        null,
        undefined,
        {},
        { locationId: null, contextType: undefined },
        { locationId: '', contextType: '' }
      ]

      invalidContexts.forEach(context => {
        // Should not throw errors
        expect(() => {
          const key = contextAwareCache.generateCacheKey('test', context)
          expect(typeof key).toBe('string')
        }).not.toThrow()
      })
    })

    test('handles circular references in data', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      // Create circular reference
      const circularData = { name: 'test' }
      circularData.self = circularData

      // Should handle gracefully (not throw JSON stringify errors)
      expect(() => {
        contextAwareCache.set('contextualData', context, circularData)
        contextAwareCache.get('contextualData', context)
      }).not.toThrow()
    })

    test('handles extremely large cache keys', () => {
      const context = {
        locationId: 'bb-1',
        contextType: 'executive',
        userId: 'x'.repeat(1000), // Very long user ID
        role: 'OWNER'
      }

      const params = {
        filters: {
          // Large filter object
          complexFilter: 'x'.repeat(5000)
        }
      }

      expect(() => {
        const key = contextAwareCache.generateCacheKey('test', context, params)
        expect(key.length).toBeGreaterThan(0)
        
        // Should be able to use the key
        contextAwareCache.set('test', context, { test: true }, params)
        const result = contextAwareCache.get('test', context, params)
        expect(result).toEqual({ test: true })
      }).not.toThrow()
    })
  })

  describe('Cross-Context Dependencies', () => {
    test('invalidation cascades correctly', () => {
      const context1 = { locationId: 'bb-1', contextType: 'executive' }
      const context2 = { locationId: 'bb-1', contextType: 'manager' }

      // Set up dependent data
      contextAwareCache.set('staff', context1, [{ id: 1 }])
      contextAwareCache.set('contextualData', context2, { computed: true }) // Depends on staff
      contextAwareCache.set('appointments', context1, [{ id: 1 }]) // Depends on staff
      contextAwareCache.set('analytics', context1, { revenue: 1000 }) // Depends on appointments

      expect(contextAwareCache.getStats().size).toBe(4)

      // Invalidate staff - should cascade
      contextAwareCache.invalidate('staff', { locationId: 'bb-1' })

      // Should invalidate staff and its dependents
      const remainingKeys = Array.from(contextAwareCache.cache.keys())
      expect(contextAwareCache.getStats().size).toBeLessThan(4)
      
      // Analytics should be gone (depends on appointments which depends on staff)
      expect(contextAwareCache.get('analytics', context1)).toBeNull()
    })

    test('context isolation works correctly', () => {
      const context1 = { locationId: 'bb-1', contextType: 'executive' }
      const context2 = { locationId: 'bb-2', contextType: 'executive' }

      contextAwareCache.set('appointments', context1, [{ location: 'bb-1' }])
      contextAwareCache.set('appointments', context2, [{ location: 'bb-2' }])

      // Invalidate appointments for bb-1 only
      contextAwareCache.invalidate('appointments', { locationId: 'bb-1' })

      // bb-2 data should remain
      const bb2Data = contextAwareCache.get('appointments', context2)
      expect(bb2Data).not.toBeNull()
      expect(bb2Data[0].location).toBe('bb-2')

      // bb-1 data should be gone
      const bb1Data = contextAwareCache.get('appointments', context1)
      expect(bb1Data).toBeNull()
    })
  })

  describe('Time-based Cache Behavior', () => {
    test('TTL expiration works correctly', async () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      
      // Set data with custom short TTL
      contextAwareCache.set('test-data', context, { test: true })
      
      // Manually set short expiration
      const key = contextAwareCache.generateCacheKey('test-data', context)
      const metadata = contextAwareCache.metadata.get(key)
      metadata.expiresAt = Date.now() + 100 // Expire in 100ms

      // Should be available immediately
      expect(contextAwareCache.get('test-data', context)).not.toBeNull()

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be expired and return null
      expect(contextAwareCache.get('test-data', context)).toBeNull()
    })

    test('different data types have appropriate TTLs', () => {
      const context = { locationId: 'bb-1', contextType: 'executive' }
      const now = Date.now()

      // Set different data types
      contextAwareCache.set('barbershops', context, [])    // 30 min TTL
      contextAwareCache.set('appointments', context, [])   // 2 min TTL  
      contextAwareCache.set('analytics', context, {})      // 5 min TTL

      // Check TTLs are set correctly
      const barbershopsKey = contextAwareCache.generateCacheKey('barbershops', context)
      const appointmentsKey = contextAwareCache.generateCacheKey('appointments', context)
      const analyticsKey = contextAwareCache.generateCacheKey('analytics', context)

      const barbershopsMeta = contextAwareCache.metadata.get(barbershopsKey)
      const appointmentsMeta = contextAwareCache.metadata.get(appointmentsKey)
      const analyticsMeta = contextAwareCache.metadata.get(analyticsKey)

      const barbershopsTTL = barbershopsMeta.expiresAt - now
      const appointmentsTTL = appointmentsMeta.expiresAt - now
      const analyticsTTL = analyticsMeta.expiresAt - now

      expect(barbershopsTTL).toBeGreaterThan(appointmentsTTL)
      expect(barbershopsTTL).toBeGreaterThan(analyticsTTL)
      expect(analyticsTTL).toBeGreaterThan(appointmentsTTL)
    })
  })
})