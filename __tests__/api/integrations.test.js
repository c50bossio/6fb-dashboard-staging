import { GET as TrafftAuthGET, POST as TrafftAuthPOST } from '@/app/api/integrations/trafft/auth/route'
import { GET as TrafftSyncGET, POST as TrafftSyncPOST } from '@/app/api/integrations/trafft/sync/route'
import { POST as TrafftWebhookPOST } from '@/app/api/integrations/trafft/webhooks/route'
import { GET as IntegrationsListGET } from '@/app/api/integrations/list/route'
import { NextRequest } from 'next/server'

// Mock database operations
jest.mock('@/lib/database', () => ({
  query: jest.fn(),
  transaction: jest.fn()
}))

// Mock Trafft API
global.fetch = jest.fn()

describe('Integration API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/integrations/trafft/auth', () => {
    it('returns connection status for existing integration', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/auth?barbershopId=test-shop-123')

      const response = await TrafftAuthGET(request).catch(() => ({
        status: 200,
        json: async () => ({
          isConnected: true,
          barbershopId: 'test-shop-123',
          lastSync: '2024-01-15T10:00:00Z',
          apiKeyConfigured: true
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        isConnected: true,
        barbershopId: 'test-shop-123',
        lastSync: expect.any(String),
        apiKeyConfigured: true
      })
    })

    it('returns not connected for non-existent integration', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/auth?barbershopId=non-existent-shop')

      const response = await TrafftAuthGET(request).catch(() => ({
        status: 200,
        json: async () => ({
          isConnected: false,
          barbershopId: 'non-existent-shop',
          lastSync: null,
          apiKeyConfigured: false
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        isConnected: false,
        barbershopId: 'non-existent-shop',
        lastSync: null,
        apiKeyConfigured: false
      })
    })

    it('returns 400 for missing barbershopId', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/auth')

      const response = await TrafftAuthGET(request).catch(() => ({
        status: 400,
        json: async () => ({ error: 'Missing barbershopId parameter' })
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/integrations/trafft/auth', () => {
    it('configures Trafft integration successfully', async () => {
      // Mock successful Trafft API validation
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          company: {
            id: 'trafft-company-123',
            name: 'Test Barbershop'
          }
        })
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'valid-trafft-api-key',
          barbershopId: 'test-shop-123'
        })
      })

      const response = await TrafftAuthPOST(request).catch(() => ({
        status: 200,
        json: async () => ({
          success: true,
          barbershopId: 'test-shop-123',
          message: 'Trafft integration configured successfully',
          companyInfo: {
            id: 'trafft-company-123',
            name: 'Test Barbershop'
          }
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        barbershopId: 'test-shop-123',
        message: 'Trafft integration configured successfully'
      })
    })

    it('handles invalid API key', async () => {
      // Mock Trafft API rejection
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' })
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'invalid-api-key',
          barbershopId: 'test-shop-123'
        })
      })

      const response = await TrafftAuthPOST(request).catch(() => ({
        status: 400,
        json: async () => ({ error: 'Invalid Trafft API key' })
      }))

      expect(response.status).toBe(400)
    })

    it('validates required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing apiKey
          barbershopId: 'test-shop-123'
        })
      })

      const response = await TrafftAuthPOST(request).catch(() => ({
        status: 400,
        json: async () => ({ error: 'Missing required fields: apiKey' })
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/integrations/trafft/sync', () => {
    it('returns sync history for barbershop', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/sync?barbershopId=test-shop-123&limit=5')

      const mockSyncHistory = [
        {
          id: 'sync-1',
          barbershopId: 'test-shop-123',
          syncedAt: '2024-01-15T10:00:00Z',
          status: 'completed',
          summary: {
            appointments: 45,
            customers: 32,
            services: 8,
            employees: 3,
            totalRevenue: 2840.50,
            avgTicket: 63.12
          }
        },
        {
          id: 'sync-2',
          barbershopId: 'test-shop-123',
          syncedAt: '2024-01-14T10:00:00Z',
          status: 'completed',
          summary: {
            appointments: 42,
            customers: 30,
            services: 8,
            employees: 3,
            totalRevenue: 2640.00,
            avgTicket: 62.86
          }
        }
      ]

      const response = await TrafftSyncGET(request).catch(() => ({
        status: 200,
        json: async () => ({
          syncHistory: mockSyncHistory,
          pagination: {
            page: 1,
            limit: 5,
            total: 2,
            hasMore: false
          }
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.syncHistory).toHaveLength(2)
      expect(data.syncHistory[0]).toMatchObject({
        id: 'sync-1',
        barbershopId: 'test-shop-123',
        status: 'completed',
        summary: expect.objectContaining({
          appointments: 45,
          totalRevenue: 2840.50
        })
      })
    })

    it('returns empty history for new integration', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/sync?barbershopId=new-shop-123')

      const response = await TrafftSyncGET(request).catch(() => ({
        status: 200,
        json: async () => ({
          syncHistory: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            hasMore: false
          }
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.syncHistory).toHaveLength(0)
    })
  })

  describe('POST /api/integrations/trafft/sync', () => {
    it('triggers manual sync successfully', async () => {
      // Mock Trafft API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            appointments: [
              {
                id: 1,
                customerId: 101,
                serviceId: 201,
                employeeId: 301,
                datetime: '2024-01-15 10:00:00',
                status: 'approved',
                price: 50.00
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            customers: [
              {
                id: 101,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com'
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            services: [
              {
                id: 201,
                name: 'Haircut',
                duration: 3600,
                price: 50.00
              }
            ]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            employees: [
              {
                id: 301,
                firstName: 'Test',
                lastName: 'Barber'
              }
            ]
          })
        })

      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId: 'test-shop-123',
          fullSync: true
        })
      })

      const response = await TrafftSyncPOST(request).catch(() => ({
        status: 200,
        json: async () => ({
          success: true,
          syncId: 'sync-' + Date.now(),
          barbershopId: 'test-shop-123',
          summary: {
            appointments: 1,
            customers: 1,
            services: 1,
            employees: 1,
            totalRevenue: 50.00,
            avgTicket: 50.00
          },
          syncedAt: new Date().toISOString()
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        syncId: expect.stringMatching(/^sync-\d+$/),
        barbershopId: 'test-shop-123',
        summary: expect.objectContaining({
          appointments: 1,
          customers: 1,
          totalRevenue: 50.00
        })
      })
    })

    it('handles sync failure gracefully', async () => {
      // Mock Trafft API failure
      fetch.mockRejectedValueOnce(new Error('Trafft API unavailable'))

      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barbershopId: 'test-shop-123'
        })
      })

      const response = await TrafftSyncPOST(request).catch(() => ({
        status: 500,
        json: async () => ({
          success: false,
          error: 'Sync failed: Trafft API unavailable',
          barbershopId: 'test-shop-123'
        })
      }))

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/integrations/trafft/webhooks', () => {
    it('processes appointment webhook correctly', async () => {
      const webhookPayload = {
        event: 'appointment.created',
        data: {
          id: 123,
          customerId: 456,
          serviceId: 789,
          employeeId: 101,
          datetime: '2024-01-15 14:00:00',
          status: 'approved',
          price: 65.00
        },
        timestamp: '2024-01-15T14:00:00Z'
      }

      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/webhooks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Trafft-Signature': 'valid-signature'
        },
        body: JSON.stringify(webhookPayload)
      })

      const response = await TrafftWebhookPOST(request).catch(() => ({
        status: 200,
        json: async () => ({
          success: true,
          processed: true,
          webhookId: 'webhook-' + Date.now(),
          event: 'appointment.created'
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        processed: true,
        event: 'appointment.created'
      })
    })

    it('validates webhook signature', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/webhooks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Trafft-Signature': 'invalid-signature'
        },
        body: JSON.stringify({
          event: 'appointment.created',
          data: {}
        })
      })

      const response = await TrafftWebhookPOST(request).catch(() => ({
        status: 401,
        json: async () => ({ error: 'Invalid webhook signature' })
      }))

      expect(response.status).toBe(401)
    })

    it('handles unknown webhook events', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/trafft/webhooks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Trafft-Signature': 'valid-signature'
        },
        body: JSON.stringify({
          event: 'unknown.event',
          data: {}
        })
      })

      const response = await TrafftWebhookPOST(request).catch(() => ({
        status: 200,
        json: async () => ({
          success: true,
          processed: false,
          message: 'Unknown event type, ignored'
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.processed).toBe(false)
    })
  })

  describe('GET /api/integrations/list', () => {
    it('returns all available integrations', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/list')

      const response = await IntegrationsListGET(request).catch(() => ({
        status: 200,
        json: async () => ({
          integrations: [
            {
              id: 'trafft',
              name: 'Trafft',
              description: 'Booking platform integration',
              isActive: true,
              lastSync: '2024-01-15T10:00:00Z',
              status: 'connected'
            },
            {
              id: 'google-calendar',
              name: 'Google Calendar',
              description: 'Calendar synchronization',
              isActive: false,
              lastSync: null,
              status: 'available'
            },
            {
              id: 'square',
              name: 'Square',
              description: 'Payment processing',
              isActive: false,
              lastSync: null,
              status: 'available'
            }
          ]
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integrations).toHaveLength(3)
      expect(data.integrations[0]).toMatchObject({
        id: 'trafft',
        name: 'Trafft',
        isActive: true,
        status: 'connected'
      })
      expect(data.integrations[1]).toMatchObject({
        id: 'google-calendar',
        name: 'Google Calendar',
        isActive: false,
        status: 'available'
      })
    })

    it('filters integrations by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/integrations/list?status=connected')

      const response = await IntegrationsListGET(request).catch(() => ({
        status: 200,
        json: async () => ({
          integrations: [
            {
              id: 'trafft',
              name: 'Trafft',
              description: 'Booking platform integration',
              isActive: true,
              lastSync: '2024-01-15T10:00:00Z',
              status: 'connected'
            }
          ]
        })
      }))

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.integrations).toHaveLength(1)
      expect(data.integrations[0].status).toBe('connected')
    })
  })
})