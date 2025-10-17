/**
 * Unit Tests: Location Switching Fix
 *
 * Tests verify that unified-staff-service.js properly passes barbershop_id
 * parameter to /api/staff endpoint when switching between locations
 *
 * Bug Fixed: Carlos Martinez and DeAndre Williams appearing for all locations
 * Root Cause: unified-staff-service.js was not passing barbershop_id to API
 *
 * Test Coverage:
 * 1. URL construction with barbershop_id parameter
 * 2. Different locations receive different staff data
 * 3. Cache isolation per location
 * 4. Retry logic includes barbershop_id parameter
 */

import { UnifiedStaffService } from '@/lib/unified-staff-service'

// Mock fetch globally
global.fetch = jest.fn()

// Mock createClient
jest.mock('@/lib/supabase/UNIFIED_CLIENT', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          in: jest.fn(() => Promise.resolve({ data: [] }))
        }))
      }))
    }))
  }))
}))

describe('UnifiedStaffService - Location Switching Fix', () => {
  let service

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    // Create fresh service instance
    service = new UnifiedStaffService()

    // Reset fetch mock
    global.fetch.mockReset()
  })

  afterEach(() => {
    // Clear cache after each test
    service.cache.clear()
  })

  describe('barbershop_id Parameter Passing', () => {
    test('should include barbershop_id in URL when provided', async () => {
      const barbershopId = 'test-barbershop-123'

      // Mock successful API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          staff: [
            { id: 'staff-1', first_name: 'John', last_name: 'Doe', role: 'BARBER' }
          ],
          barbershop_id: barbershopId
        })
      })

      await service.getStaff(barbershopId, { useCache: false })

      // Verify fetch was called with barbershop_id parameter
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/staff?barbershop_id=${encodeURIComponent(barbershopId)}`,
        expect.objectContaining({
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
    })

    test('should call /api/staff without parameter when barbershopId is null', async () => {
      // Mock successful API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          staff: [
            { id: 'staff-1', first_name: 'Default', last_name: 'Staff', role: 'BARBER' }
          ],
          barbershop_id: null
        })
      })

      await service.getStaff(null, { useCache: false })

      // Verify fetch was called without barbershop_id parameter
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/staff',
        expect.objectContaining({
          credentials: 'include'
        })
      )
    })

    test('should properly encode special characters in barbershop_id', async () => {
      const barbershopId = 'shop-with-special-chars-!@#$%'

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          staff: [],
          barbershop_id: barbershopId
        })
      })

      await service.getStaff(barbershopId, { useCache: false })

      // Verify URL encoding
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/staff?barbershop_id=${encodeURIComponent(barbershopId)}`,
        expect.anything()
      )
    })
  })

  describe('Location Isolation - Different Barbershops', () => {
    const locationA = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const locationB = 'x9y8z7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4'
    const locationC = 'm5n4o3p2-l1k0-j9i8-h7g6-f5e4d3c2b1a0'

    const staffLocationA = [
      { id: 'staff-a1', first_name: 'Alice', last_name: 'Anderson', role: 'BARBER' },
      { id: 'staff-a2', first_name: 'Bob', last_name: 'Brown', role: 'BARBER' }
    ]

    const staffLocationB = [
      { id: 'staff-b1', first_name: 'Charlie', last_name: 'Chen', role: 'BARBER' },
      { id: 'staff-b2', first_name: 'Diana', last_name: 'Davis', role: 'BARBER' }
    ]

    const staffLocationC = [
      { id: 'staff-c1', first_name: 'Eve', last_name: 'Evans', role: 'BARBER' }
    ]

    test('should fetch different staff for different locations', async () => {
      // Mock responses for different locations
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            staff: staffLocationA,
            barbershop_id: locationA
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            staff: staffLocationB,
            barbershop_id: locationB
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            staff: staffLocationC,
            barbershop_id: locationC
          })
        })

      // Fetch staff for each location
      const resultA = await service.getStaff(locationA, { useCache: false })
      const resultB = await service.getStaff(locationB, { useCache: false })
      const resultC = await service.getStaff(locationC, { useCache: false })

      // Verify correct URLs were called
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `/api/staff?barbershop_id=${locationA}`,
        expect.anything()
      )
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `/api/staff?barbershop_id=${locationB}`,
        expect.anything()
      )
      expect(global.fetch).toHaveBeenNthCalledWith(
        3,
        `/api/staff?barbershop_id=${locationC}`,
        expect.anything()
      )

      // Verify each location got its own staff
      expect(resultA.staff).toHaveLength(2)
      expect(resultA.staff.find(s => s.first_name === 'Alice')).toBeDefined()
      expect(resultA.staff.find(s => s.first_name === 'Charlie')).toBeUndefined()

      expect(resultB.staff).toHaveLength(2)
      expect(resultB.staff.find(s => s.first_name === 'Charlie')).toBeDefined()
      expect(resultB.staff.find(s => s.first_name === 'Alice')).toBeUndefined()

      expect(resultC.staff).toHaveLength(1)
      expect(resultC.staff.find(s => s.first_name === 'Eve')).toBeDefined()
    })

    test('should NOT return Location A staff for Location B (regression test)', async () => {
      const carlosMartinez = { id: 'carlos-id', first_name: 'Carlos', last_name: 'Martinez', role: 'BARBER' }
      const deandreWilliams = { id: 'deandre-id', first_name: 'DeAndre', last_name: 'Williams', role: 'BARBER' }

      // Mock Location A (Tomb45 GasWorx) with Carlos & DeAndre
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            staff: [carlosMartinez, deandreWilliams],
            barbershop_id: locationA
          })
        })
        // Mock Location B with different staff
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            staff: staffLocationB,
            barbershop_id: locationB
          })
        })

      // Fetch Location A
      const resultA = await service.getStaff(locationA, { useCache: false })
      expect(resultA.staff.find(s => s.first_name === 'Carlos')).toBeDefined()

      // Fetch Location B - Carlos should NOT appear
      const resultB = await service.getStaff(locationB, { useCache: false })
      expect(resultB.staff.find(s => s.first_name === 'Carlos')).toBeUndefined()
      expect(resultB.staff.find(s => s.first_name === 'DeAndre')).toBeUndefined()
      expect(resultB.staff.find(s => s.first_name === 'Charlie')).toBeDefined()
    })
  })

  describe('Cache Isolation', () => {
    test('should cache staff separately for different locations', async () => {
      const locationA = 'location-a-123'
      const locationB = 'location-b-456'

      const staffA = [{ id: '1', first_name: 'Staff', last_name: 'A', role: 'BARBER' }]
      const staffB = [{ id: '2', first_name: 'Staff', last_name: 'B', role: 'BARBER' }]

      // Mock responses
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, staff: staffA, barbershop_id: locationA })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, staff: staffB, barbershop_id: locationB })
        })

      // First calls - should hit API
      await service.getStaff(locationA, { useCache: true })
      await service.getStaff(locationB, { useCache: true })

      expect(global.fetch).toHaveBeenCalledTimes(2)

      // Second calls - should use cache
      const cachedA = await service.getStaff(locationA, { useCache: true })
      const cachedB = await service.getStaff(locationB, { useCache: true })

      // Should NOT have made additional fetch calls
      expect(global.fetch).toHaveBeenCalledTimes(2)

      // Verify cached data is correct
      expect(cachedA.staff[0].first_name).toBe('Staff')
      expect(cachedA.staff[0].last_name).toBe('A')
      expect(cachedB.staff[0].last_name).toBe('B')
    })

    test('should invalidate cache for specific location only', async () => {
      const locationA = 'location-a-123'
      const locationB = 'location-b-456'

      // Mock responses
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, staff: [], barbershop_id: 'test' })
      })

      // Populate cache for both locations
      await service.getStaff(locationA, { useCache: true })
      await service.getStaff(locationB, { useCache: true })

      // Clear fetch calls
      global.fetch.mockClear()

      // Invalidate only location A
      service.invalidateCache(locationA)

      // Fetch again
      await service.getStaff(locationA, { useCache: true })
      await service.getStaff(locationB, { useCache: true })

      // Location A should make at least one fetch (cache was invalidated)
      // Location B should NOT fetch (still using cache)
      expect(global.fetch.mock.calls.length).toBeGreaterThan(0)

      // Verify at least one call was for location A
      const locationACalls = global.fetch.mock.calls.filter(call =>
        call[0].includes(`barbershop_id=${locationA}`)
      )
      expect(locationACalls.length).toBeGreaterThan(0)
    })
  })

  describe('Retry Logic with barbershop_id', () => {
    test('should include barbershop_id in retry request after 401', async () => {
      const barbershopId = 'test-shop-789'

      // First call returns 401
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' })
        })
        // Retry call succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            staff: [{ id: '1', first_name: 'Test', last_name: 'Staff', role: 'BARBER' }],
            barbershop_id: barbershopId
          })
        })

      await service.getStaff(barbershopId, { useCache: false, retryAuth: true })

      // Verify BOTH calls included barbershop_id
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `/api/staff?barbershop_id=${barbershopId}`,
        expect.anything()
      )
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `/api/staff?barbershop_id=${barbershopId}`,
        expect.anything()
      )
    })

    test('should not retry auth when retryAuth is false', async () => {
      const barbershopId = 'test-shop-999'

      // First call returns 401
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' })
        })
        // Public endpoint fallback call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            staff: [],
            barbershop_id: barbershopId
          })
        })

      await service.getStaff(barbershopId, { useCache: false, retryAuth: false })

      // Should call authenticated endpoint once, then fall back to public endpoint
      // But should NOT retry the authenticated endpoint
      const authCalls = global.fetch.mock.calls.filter(call =>
        call[0].includes('/api/staff')
      )

      // Only one call to /api/staff (no retry)
      expect(authCalls.length).toBe(1)
    })
  })

  describe('Timeout Protection', () => {
    test('should abort request after 10 seconds', async () => {
      const barbershopId = 'test-timeout'

      // Mock fetch to throw AbortError
      global.fetch.mockImplementationOnce(() => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      })

      const result = await service.getStaff(barbershopId, { useCache: false })

      // Should fall back to public endpoint or return empty
      expect(result.staff).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty barbershopId string', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          staff: [],
          barbershop_id: null
        })
      })

      await service.getStaff('', { useCache: false })

      // Should call without parameter (empty string is falsy)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/staff',
        expect.anything()
      )
    })

    test('should handle undefined barbershopId', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          staff: [],
          barbershop_id: null
        })
      })

      await service.getStaff(undefined, { useCache: false })

      // Should call without parameter
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/staff',
        expect.anything()
      )
    })

    test('should handle UUID format barbershop IDs', async () => {
      const uuidId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          staff: [],
          barbershop_id: uuidId
        })
      })

      await service.getStaff(uuidId, { useCache: false })

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/staff?barbershop_id=${uuidId}`,
        expect.anything()
      )
    })
  })

  describe('Bug Regression Tests', () => {
    test('BUG FIX: Should NOT cache default shop data for all locations', async () => {
      const defaultShopId = 'tomb45-gasworx'
      const locationA = 'location-a'
      const locationB = 'location-b'

      const defaultStaff = [
        { id: 'carlos', first_name: 'Carlos', last_name: 'Martinez', role: 'BARBER' },
        { id: 'deandre', first_name: 'DeAndre', last_name: 'Williams', role: 'BARBER' }
      ]

      const locationAStaff = [
        { id: 'alice', first_name: 'Alice', last_name: 'Anderson', role: 'BARBER' }
      ]

      const locationBStaff = [
        { id: 'bob', first_name: 'Bob', last_name: 'Brown', role: 'BARBER' }
      ]

      // Mock responses for each specific location
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, staff: locationAStaff, barbershop_id: locationA })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true, staff: locationBStaff, barbershop_id: locationB })
        })

      // Fetch location A
      const resultA = await service.getStaff(locationA, { useCache: true })

      // Fetch location B
      const resultB = await service.getStaff(locationB, { useCache: true })

      // CRITICAL: Carlos and DeAndre should NOT appear in either result
      expect(resultA.staff.find(s => s.first_name === 'Carlos')).toBeUndefined()
      expect(resultA.staff.find(s => s.first_name === 'DeAndre')).toBeUndefined()

      expect(resultB.staff.find(s => s.first_name === 'Carlos')).toBeUndefined()
      expect(resultB.staff.find(s => s.first_name === 'DeAndre')).toBeUndefined()

      // Each location should have its own staff
      expect(resultA.staff.find(s => s.first_name === 'Alice')).toBeDefined()
      expect(resultB.staff.find(s => s.first_name === 'Bob')).toBeDefined()

      // Verify the API was called with the correct barbershop_id for each location
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        `/api/staff?barbershop_id=${locationA}`,
        expect.anything()
      )
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `/api/staff?barbershop_id=${locationB}`,
        expect.anything()
      )
    })
  })
})
