import { http, HttpResponse } from 'msw'
import { 
  mockUser, 
  mockBarbershop, 
  mockAppointment, 
  mockService, 
  mockAgentResponse,
  mockTrafftData 
} from './test-utils'

export const handlers = [
  http.get('/api/auth/me', () => {
    return HttpResponse.json(mockUser)
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json()
    
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        user: mockUser,
        token: 'mock-jwt-token'
      })
    }
    
    return new HttpResponse('Invalid credentials', { status: 401 })
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const userData = await request.json()
    
    return HttpResponse.json({
      user: { ...mockUser, ...userData },
      token: 'mock-jwt-token'
    })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  http.post('/api/agents/chat', async ({ request }) => {
    const { agentId, message } = await request.json()
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return HttpResponse.json({
      ...mockAgentResponse,
      agentId,
      response: `Mock response from ${agentId}: ${message}`
    })
  }),

  http.get('/api/integrations/trafft/auth', ({ request }) => {
    const url = new URL(request.url)
    const barbershopId = url.searchParams.get('barbershopId')
    
    return HttpResponse.json({
      isConnected: true,
      barbershopId,
      lastSync: new Date().toISOString()
    })
  }),

  http.post('/api/integrations/trafft/auth', async ({ request }) => {
    const { apiKey, barbershopId } = await request.json()
    
    if (apiKey === 'valid-api-key') {
      return HttpResponse.json({
        success: true,
        barbershopId,
        message: 'Trafft integration configured successfully'
      })
    }
    
    return new HttpResponse('Invalid API key', { status: 400 })
  }),

  http.get('/api/integrations/trafft/sync', ({ request }) => {
    const url = new URL(request.url)
    const barbershopId = url.searchParams.get('barbershopId')
    
    return HttpResponse.json({
      syncHistory: [
        {
          id: 'sync-1',
          barbershopId,
          syncedAt: new Date().toISOString(),
          status: 'completed',
          summary: {
            appointments: 45,
            customers: 32,
            services: 8,
            employees: 3,
            totalRevenue: 2840.50,
            avgTicket: 63.12
          }
        }
      ]
    })
  }),

  http.post('/api/integrations/trafft/sync', async ({ request }) => {
    const { barbershopId } = await request.json()
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return HttpResponse.json({
      success: true,
      barbershopId,
      syncId: 'sync-' + Date.now(),
      data: mockTrafftData
    })
  }),

  http.post('/api/integrations/trafft/webhooks', async ({ request }) => {
    const webhookData = await request.json()
    
    return HttpResponse.json({
      success: true,
      processed: true,
      webhookId: 'webhook-' + Date.now()
    })
  }),

  http.get('/api/integrations/list', () => {
    return HttpResponse.json({
      integrations: [
        {
          id: 'trafft',
          name: 'Trafft',
          description: 'Booking platform integration',
          isActive: true,
          lastSync: new Date().toISOString()
        },
        {
          id: 'google-calendar',
          name: 'Google Calendar',
          description: 'Calendar synchronization',
          isActive: false,
          lastSync: null
        }
      ]
    })
  }),

  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return new HttpResponse(null, { status: 404 })
  })
]

export const errorHandlers = [
  http.post('/api/agents/chat', () => {
    return new HttpResponse('Internal Server Error', { status: 500 })
  }),

  http.get('/api/auth/me', () => {
    return new HttpResponse('Unauthorized', { status: 401 })
  }),

  http.post('/api/integrations/trafft/sync', () => {
    return new HttpResponse('Sync failed', { status: 500 })
  })
]

export const networkErrorHandlers = [
  http.all('*', () => {
    return HttpResponse.error()
  })
]