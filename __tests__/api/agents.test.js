import { POST } from '@/app/api/agents/chat/route'
import { NextRequest } from 'next/server'

// Mock fetch globally
global.fetch = jest.fn()

// Mock environment variables
process.env.FASTAPI_BASE_URL = 'http://localhost:8000'
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'

describe('/api/agents/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/agents/chat', () => {
    it('handles valid agent chat request successfully', async () => {
      const FastApiResponse = {
        session_id: 'test-session-123',
        agent_id: 'financial',
        agent_name: '💰 Financial Agent',
        response: 'Test response from financial agent',
        recommendations: [
          {
            id: 'rec-1',
            type: 'pricing',
            priority: 'high',
            title: 'Optimize Pricing Strategy',
            description: 'Implement dynamic pricing',
            estimatedImpact: '+25%',
            confidence: 0.9,
            timeToImplement: '1 week'
          }
        ],
        confidence: 0.95
      }

      // Mock successful FastAPI response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFastApiResponse
      })

      const request = new NextRequest('http://localhost:3000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'financial',
          message: 'How can I increase revenue?',
          userId: 'test-user-123',
          barbershopId: 'test-shop-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        sessionId: 'test-session-123',
        agentId: 'financial',
        agentName: '💰 Financial Agent',
        response: 'Test response from financial agent',
        recommendations: expect.arrayContaining([
          expect.objectContaining({
            id: 'rec-1',
            type: 'pricing',
            priority: 'high'
          })
        ]),
        metadata: expect.objectContaining({
          confidence: 0.95,
          ragEnhanced: true,
          businessContextApplied: true
        })
      })

      // Verify FastAPI was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai-agents/chat',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            agent_id: 'financial',
            message: 'How can I increase revenue?',
            context: {
              user_id: 'test-user-123',
              barbershop_id: 'test-shop-123',
              timestamp: expect.any(String),
              business_context: expect.any(Object)
            }
          })
        })
      )
    })

    it('returns 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing agentId and message
          userId: 'test-user-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Missing required fields: agentId and message'
      })

      expect(fetch).not.toHaveBeenCalled()
    })

    it('falls back to mock response when FastAPI is unavailable', async () => {
      // Mock FastAPI failure
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const request = new NextRequest('http://localhost:3000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'master_coach',
          message: 'Help me grow my business',
          userId: 'test-user-123',
          barbershopId: 'test-shop-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        sessionId: expect.stringMatching(/^session_\d+$/),
        agentId: 'master_coach',
        agentName: '🎯 Master Coach',
        response: expect.stringMatching(/Master Coach/),
        recommendations: expect.any(Array),
        metadata: expect.objectContaining({
          confidence: 0.95,
          ragEnhanced: false, // Mock response
          businessContextApplied: true,
          mockResponse: true
        })
      })
    })

    it('handles network errors gracefully', async () => {
      // Mock network error
      fetch.mockRejectedValueOnce(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'financial',
          message: 'Test message',
          userId: 'test-user-123'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        agentId: 'financial',
        agentName: '💰 Financial Agent',
        metadata: expect.objectContaining({
          mockResponse: true
        })
      })
    })

    it('uses default values for missing optional fields', async () => {
      const FastApiResponse = {
        session_id: 'test-session-456',
        agent_id: 'operations',
        response: 'Operations response',
        recommendations: []
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFastApiResponse
      })

      const request = new NextRequest('http://localhost:3000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'operations',
          message: 'Optimize my schedule'
          // Missing userId and barbershopId
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify default values were used
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/ai-agents/chat',
        expect.objectContaining({
          body: JSON.stringify({
            agent_id: 'operations',
            message: 'Optimize my schedule',
            context: {
              user_id: 'demo_user',
              barbershop_id: 'demo_barbershop_001',
              timestamp: expect.any(String),
              business_context: expect.any(Object)
            }
          })
        })
      )
    })

    it('includes business context in requests', async () => {
      const FastApiResponse = {
        session_id: 'test-session-789',
        agent_id: 'client_acquisition',
        response: 'Client acquisition response'
      }

      fetch
        // Mock Trafft integration check (successful)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isConnected: true })
        })
        // Mock Trafft sync data
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            syncHistory: [{
              syncedAt: '2024-01-15T10:00:00Z',
              summary: {
                appointments: 50,
                customers: 40,
                services: 10,
                employees: 3,
                totalRevenue: 3000,
                avgTicket: 60
              }
            }]
          })
        })
        // Mock FastAPI response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockFastApiResponse
        })

      const request = new NextRequest('http://localhost:3000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'client_acquisition',
          message: 'How do I get more clients?',
          barbershopId: 'trafft-connected-shop'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify business context was included
      const fastApiCall = fetch.mock.calls.find(call => 
        call[0] === 'http://localhost:8000/api/v1/ai-agents/chat'
      )
      
      expect(fastApiCall).toBeDefined()
      const requestBody = JSON.parse(fastApiCall[1].body)
      expect(requestBody.context.business_context).toMatchObject({
        source: 'trafft',
        metrics: expect.objectContaining({
          totalAppointments: 50,
          totalCustomers: 40,
          totalRevenue: 3000,
          avgTicket: 60
        }),
        insights: expect.objectContaining({
          financial: expect.any(Object),
          operations: expect.any(Object),
          client_acquisition: expect.any(Object)
        })
      })
    })

    it('handles invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error'
      })
    })

    it('transforms FastAPI response correctly', async () => {
      const FastApiResponse = {
        session_id: 'fastapi-session-123',
        agent_id: 'brand',
        agent_name: 'Custom Brand Agent',
        response: 'Brand development response',
        recommendations: [
          {
            id: 'brand-rec-1',
            type: 'branding',
            priority: 'medium',
            title: 'Brand Identity',
            description: 'Develop brand identity'
          }
        ],
        confidence: 0.87
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFastApiResponse
      })

      const request = new NextRequest('http://localhost:3000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'brand',
          message: 'Help with branding'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toMatchObject({
        sessionId: 'fastapi-session-123',
        agentId: 'brand',
        agentName: 'Custom Brand Agent',
        response: 'Brand development response',
        recommendations: [
          {
            id: 'brand-rec-1',
            type: 'branding',
            priority: 'medium',
            title: 'Brand Identity',
            description: 'Develop brand identity'
          }
        ],
        metadata: {
          confidence: 0.87,
          ragEnhanced: true,
          businessContextApplied: true,
          timestamp: expect.any(String)
        }
      })
    })
  })
})