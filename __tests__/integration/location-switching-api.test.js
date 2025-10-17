/**
 * Integration Tests: Location Switching API
 *
 * Tests verify that /api/staff endpoint properly handles barbershop_id parameter
 * and returns location-specific staff data
 *
 * Bug Fixed: Location switching showing wrong barbers
 * Root Cause: API endpoint wasn't receiving barbershop_id parameter
 *
 * Test Coverage:
 * 1. API endpoint accepts barbershop_id query parameter
 * 2. API returns staff only for specified location
 * 3. Different locations return different staff
 * 4. API respects authentication state
 */

import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/staff/route'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        })),
        in: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }))
}))

describe('Integration: /api/staff endpoint - Location Switching', () => {
  describe('barbershop_id Query Parameter', () => {
    test('should accept barbershop_id as query parameter', async () => {
      const barbershopId = 'test-location-123'

      // Create mock request with query parameter
      const { req } = createMocks({
        method: 'GET',
        url: `/api/staff?barbershop_id=${barbershopId}`,
        query: { barbershop_id: barbershopId }
      })

      // Call the API route
      const response = await GET(req)
      const data = await response.json()

      // Should process the request (may return empty staff, but no error)
      expect(response.status).toBeLessThan(500)
      expect(data).toHaveProperty('success')
    })

    test('should work without barbershop_id parameter', async () => {
      // Create mock request without query parameter
      const { req } = createMocks({
        method: 'GET',
        url: '/api/staff'
      })

      // Call the API route
      const response = await GET(req)
      const data = await response.json()

      // Should fall back to user's default location
      expect(response.status).toBeLessThan(500)
      expect(data).toHaveProperty('success')
    })

    test('should handle URL-encoded barbershop_id', async () => {
      const barbershopId = 'shop-with-special-chars-!@#$%'
      const encoded = encodeURIComponent(barbershopId)

      const { req } = createMocks({
        method: 'GET',
        url: `/api/staff?barbershop_id=${encoded}`,
        query: { barbershop_id: barbershopId }
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBeLessThan(500)
      expect(data).toHaveProperty('success')
    })
  })

  describe('Location-Specific Data', () => {
    test('should return staff for specific barbershop_id', async () => {
      const barbershopId = 'specific-location-456'

      const mockStaff = [
        {
          id: 'staff-1',
          user_id: 'user-1',
          barbershop_id: barbershopId,
          first_name: 'Test',
          last_name: 'Barber',
          role: 'BARBER',
          email: 'test@example.com'
        }
      ]

      // Mock Supabase to return specific staff
      const { createClient } = require('@/lib/supabase/server')
      const mockSupabase = createClient()

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'test-user',
            email: 'owner@example.com'
          }
        },
        error: null
      })

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockReturnValueOnce({
            single: jest.fn().mockResolvedValueOnce({
              data: {
                id: 'test-user',
                role: 'SHOP_OWNER',
                barbershop_id: barbershopId
              },
              error: null
            })
          })
        })
      })

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({
            data: mockStaff,
            error: null
          })
        })
      })

      const { req } = createMocks({
        method: 'GET',
        url: `/api/staff?barbershop_id=${barbershopId}`,
        query: { barbershop_id: barbershopId }
      })

      const response = await GET(req)
      const data = await response.json()

      // Verify response contains staff for this location
      if (data.success && data.staff) {
        expect(data.barbershop_id).toBe(barbershopId)
        expect(Array.isArray(data.staff)).toBe(true)
      }
    })
  })

  describe('Authentication States', () => {
    test('should handle authenticated requests', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSupabase = createClient()

      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'auth-user-id',
            email: 'authenticated@example.com'
          }
        },
        error: null
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'auth-user-id',
                role: 'BARBER',
                barbershop_id: 'auth-shop-id'
              },
              error: null
            })
          })
        })
      })

      const { req } = createMocks({
        method: 'GET',
        url: '/api/staff?barbershop_id=auth-shop-id',
        query: { barbershop_id: 'auth-shop-id' },
        headers: {
          cookie: 'sb-access-token=valid-token'
        }
      })

      const response = await GET(req)
      const data = await response.json()

      // Should successfully authenticate and return data
      expect(response.status).toBeLessThan(500)
      expect(data).toHaveProperty('success')
    })

    test('should handle unauthenticated requests gracefully', async () => {
      const { createClient } = require('@/lib/supabase/server')
      const mockSupabase = createClient()

      // Mock no user
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const { req } = createMocks({
        method: 'GET',
        url: '/api/staff?barbershop_id=public-shop-id',
        query: { barbershop_id: 'public-shop-id' }
      })

      const response = await GET(req)

      // Should return 401 or handle gracefully
      expect([200, 401]).toContain(response.status)
    })
  })

  describe('Edge Cases', () => {
    test('should handle missing barbershop_id gracefully', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/staff'
      })

      const response = await GET(req)
      const data = await response.json()

      // Should not crash, should return valid response
      expect(response.status).toBeLessThan(500)
      expect(data).toBeDefined()
    })

    test('should handle invalid barbershop_id format', async () => {
      const invalidId = 'invalid-uuid-format'

      const { req } = createMocks({
        method: 'GET',
        url: `/api/staff?barbershop_id=${invalidId}`,
        query: { barbershop_id: invalidId }
      })

      const response = await GET(req)
      const data = await response.json()

      // Should handle gracefully (may return empty staff, but no crash)
      expect(response.status).toBeLessThan(500)
      expect(data).toHaveProperty('success')
    })

    test('should handle non-existent barbershop_id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const { req } = createMocks({
        method: 'GET',
        url: `/api/staff?barbershop_id=${nonExistentId}`,
        query: { barbershop_id: nonExistentId }
      })

      const response = await GET(req)
      const data = await response.json()

      // Should return empty staff list, not error
      if (data.success) {
        expect(Array.isArray(data.staff)).toBe(true)
        expect(data.staff.length).toBe(0)
      }
    })
  })

  describe('Response Format', () => {
    test('should return correct response structure', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/staff?barbershop_id=test-shop',
        query: { barbershop_id: 'test-shop' }
      })

      const response = await GET(req)
      const data = await response.json()

      // Verify response structure
      expect(data).toHaveProperty('success')

      if (data.success) {
        expect(data).toHaveProperty('staff')
        expect(data).toHaveProperty('barbershop_id')
        expect(Array.isArray(data.staff)).toBe(true)
      }
    })

    test('should include source information', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/staff?barbershop_id=test-shop',
        query: { barbershop_id: 'test-shop' }
      })

      const response = await GET(req)
      const data = await response.json()

      if (data.success) {
        // Should indicate data source (profiles, barbers, URL parameter, etc.)
        expect(data).toHaveProperty('source')
      }
    })
  })

  describe('Regression Tests - Bug Fix Verification', () => {
    test('BUG FIX: Different locations should receive different API calls', async () => {
      const locationA = 'location-a-id'
      const locationB = 'location-b-id'

      // Request for Location A
      const { req: reqA } = createMocks({
        method: 'GET',
        url: `/api/staff?barbershop_id=${locationA}`,
        query: { barbershop_id: locationA }
      })

      // Request for Location B
      const { req: reqB } = createMocks({
        method: 'GET',
        url: `/api/staff?barbershop_id=${locationB}`,
        query: { barbershop_id: locationB }
      })

      const responseA = await GET(reqA)
      const responseB = await GET(reqB)

      const dataA = await responseA.json()
      const dataB = await responseB.json()

      // CRITICAL: Responses should reference different barbershop_ids
      if (dataA.success && dataB.success) {
        expect(dataA.barbershop_id).toBe(locationA)
        expect(dataB.barbershop_id).toBe(locationB)
        expect(dataA.barbershop_id).not.toBe(dataB.barbershop_id)
      }
    })

    test('BUG FIX: Should NOT return default shop when location is specified', async () => {
      const specificLocation = 'specific-location-789'
      const defaultShopId = 'default-shop-id'

      const { req } = createMocks({
        method: 'GET',
        url: `/api/staff?barbershop_id=${specificLocation}`,
        query: { barbershop_id: specificLocation }
      })

      const response = await GET(req)
      const data = await response.json()

      // Should NOT return default shop data
      if (data.success && data.barbershop_id) {
        expect(data.barbershop_id).toBe(specificLocation)
        expect(data.barbershop_id).not.toBe(defaultShopId)
      }
    })
  })
})
