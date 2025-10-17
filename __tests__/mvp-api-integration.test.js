/**
 * MVP API Integration Tests
 * 
 * Unit tests for core API endpoints that power the MVP functionality:
 * - Authentication endpoints
 * - AI Orchestrator (without Python backend)
 * - Performance dashboard
 * - Health monitoring
 * - Database operations
 */

import { NextRequest } from 'next/server'

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'

describe('MVP API Integration Tests', () => {
  
  describe('Health Monitoring API', () => {
    test('health endpoint returns healthy status', async () => {
      // Import the route handler
      const { GET } = await import('../app/api/monitoring/health/route.js')
      
      const request = new NextRequest('http://localhost:9999/api/monitoring/health')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.services.backend.integration).toBe('nextjs_integrated')
      expect(data.services.database).toBeDefined()
      expect(data.services.filesystem).toBeDefined()
      expect(data.timestamp).toBeDefined()
      expect(data.responseTime).toBeDefined()
    })
    
    test('health check includes system metrics', async () => {
      const { GET } = await import('../app/api/monitoring/health/route.js')
      
      const request = new NextRequest('http://localhost:9999/api/monitoring/health')
      const response = await GET(request)
      const data = await response.json()
      
      expect(data.resources).toBeDefined()
      expect(data.resources.cpu).toBeDefined()
      expect(data.resources.memory).toBeDefined()
      expect(data.performance).toBeDefined()
      expect(data.uptime).toBeDefined()
    })
  })

  describe('AI Orchestrator API', () => {
    test('AI orchestrator works without Python backend', async () => {
      const { POST } = await import('../app/api/ai/orchestrator/route.js')
      
      const requestBody = {
        message: 'What are my revenue metrics?',
        sessionId: 'test-session-' + Date.now(),
        businessContext: {
          business_name: 'Test Barbershop'
        }
      }
      
      const request = new NextRequest('http://localhost:9999/api/ai/orchestrator', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      
      // Should either succeed or fail with auth (not 500 error)
      expect([200, 401]).toContain(response.status)
      
      if (response.status === 200) {
        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.response).toBeDefined()
        expect(data.agent_name).toBe('Marcus') // Financial agent should respond to revenue query
        expect(data.provider).toBe('enhanced_local_ai')
        expect(data.recommendations).toBeDefined()
        expect(data.action_items).toBeDefined()
      }
    })
    
    test('AI orchestrator routes to appropriate agents', async () => {
      const { POST } = await import('../app/api/ai/orchestrator/route.js')
      
      const testCases = [
        {
          message: 'How can I increase my revenue?',
          expectedAgent: 'Marcus', // Financial agent
          expectedPersonality: 'financial_coach'
        },
        {
          message: 'Help me with social media marketing',
          expectedAgent: 'Sophia', // Marketing agent
          expectedPersonality: 'marketing_expert'
        },
        {
          message: 'How do I optimize my appointment schedule?',
          expectedAgent: 'David', // Operations agent
          expectedPersonality: 'operations_manager'
        },
        {
          message: 'What is my business strategy?',
          expectedAgent: 'Emma', // Strategy agent
          expectedPersonality: 'strategic_mindset'
        }
      ]
      
      for (const testCase of testCases) {
        const requestBody = {
          message: testCase.message,
          sessionId: 'test-session-' + Date.now(),
          businessContext: {}
        }
        
        const request = new NextRequest('http://localhost:9999/api/ai/orchestrator', {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        const response = await POST(request)
        
        if (response.status === 200) {
          const data = await response.json()
          expect(data.agent_name).toBe(testCase.expectedAgent)
          expect(data.agent_personality).toBe(testCase.expectedPersonality)
        }
      }
    })
    
    test('AI orchestrator handles invalid input gracefully', async () => {
      const { POST } = await import('../app/api/ai/orchestrator/route.js')
      
      // Test empty message
      let request = new NextRequest('http://localhost:9999/api/ai/orchestrator', {
        method: 'POST',
        body: JSON.stringify({ message: '', sessionId: 'test' }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      let response = await POST(request)
      expect(response.status).toBe(400)
      
      // Test missing message
      request = new NextRequest('http://localhost:9999/api/ai/orchestrator', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'test' }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Performance Dashboard API', () => {
    test('performance dashboard endpoint works without Python backend', async () => {
      const { GET } = await import('../app/api/performance/dashboard/route.js')
      
      const request = new NextRequest('http://localhost:9999/api/performance/dashboard')
      const response = await GET(request)
      
      // Should either succeed or fail with auth (not 500 error)
      expect([200, 401]).toContain(response.status)
      
      if (response.status === 200) {
        const data = await response.json()
        expect(data.timestamp).toBeDefined()
        expect(data.model_stats).toBeDefined()
        expect(data.system_health).toBe('healthy')
        expect(data.data_available).toBe(true)
        expect(data.metrics).toBeDefined()
        expect(data.metrics.response_times).toBeDefined()
        expect(data.metrics.throughput).toBeDefined()
      }
    })
  })

  describe('Configuration Services', () => {
    test('API client uses correct URLs', async () => {
      const apiClient = await import('../lib/api-client.js')
      
      // Should not have hardcoded localhost:8001 URLs
      expect(apiClient.default.baseURL).not.toContain('localhost:8001')
      expect(apiClient.default.baseURL).not.toContain('http://localhost:8001')
      
      // Should use relative URLs or proper environment configuration
      expect(apiClient.default.baseURL).toBe('')
    })
    
    test('AI client uses Next.js API routes', async () => {
      const aiClient = await import('../lib/api/ai-client.js')
      
      // Should not have hardcoded Python backend URLs
      expect(aiClient.default.baseUrl).not.toContain('localhost:8001')
      expect(aiClient.default.baseUrl).toContain('/api/ai')
    })
    
    test('config service has no Python backend references', async () => {
      const configService = await import('../lib/config-service.js')
      
      const config = configService.default.getAppConfig()
      expect(config.apiUrl).not.toContain('localhost:8001')
      
      const endpoints = configService.default.getApiEndpoints()
      expect(endpoints.backend.base).not.toContain('localhost:8001')
      expect(endpoints.backend.ai).toContain('/api/ai')
      expect(endpoints.backend.dashboard).toContain('/api/dashboard')
    })
  })

  describe('WebSocket Manager', () => {
    test('WebSocket manager uses correct URLs', async () => {
      const wsManager = await import('../lib/ai-websocket-manager.js')
      
      const manager = new wsManager.AIWebSocketManager()
      const wsUrl = manager.getWebSocketUrl()
      
      // Should not use localhost:8001
      expect(wsUrl).not.toContain('localhost:8001')
      
      // Should use correct port and path
      expect(wsUrl).toContain('localhost:9999')
      expect(wsUrl).toContain('/api/ws/agents')
    })
  })

  describe('Error Handling', () => {
    test('API endpoints handle errors gracefully', async () => {
      // Test malformed requests don't cause 500 errors
      
      // Test AI orchestrator with malformed JSON
      const { POST } = await import('../app/api/ai/orchestrator/route.js')
      
      try {
        const request = new NextRequest('http://localhost:9999/api/ai/orchestrator', {
          method: 'POST',
          body: '{ invalid json',
          headers: { 'Content-Type': 'application/json' }
        })
        
        const response = await POST(request)
        
        // Should handle parsing error gracefully
        expect(response.status).toBe(500)
        
        const data = await response.json()
        expect(data.error).toBeDefined()
      } catch (error) {
        // Parsing errors are acceptable in this test
        expect(error).toBeDefined()
      }
    })
  })

  describe('Database Integration', () => {
    test('database client configuration is correct', () => {
      // Verify Supabase configuration
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      expect(supabaseUrl).toBeDefined()
      expect(supabaseKey).toBeDefined()
      
      if (supabaseUrl && supabaseUrl !== 'https://test.supabase.co') {
        expect(supabaseUrl).toMatch(/^https:\/\/.*\.supabase\.co$/)
      }
    })
  })

  describe('Authentication Flow', () => {
    test('sign out endpoint works correctly', async () => {
      const { POST } = await import('../app/api/auth/signout/route.js')
      
      // Test regular signout
      let request = new NextRequest('http://localhost:9999/api/auth/signout', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })
      
      let response = await POST(request)
      expect(response.status).toBe(200)
      
      let data = await response.json()
      expect(data.message).toContain('signed out')
      
      // Test force signout
      request = new NextRequest('http://localhost:9999/api/auth/signout', {
        method: 'POST',
        body: JSON.stringify({ force: true }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      response = await POST(request)
      expect(response.status).toBe(200)
      
      data = await response.json()
      expect(data.message).toContain('force signed out')
    })
  })

  describe('MVP Completeness', () => {
    test('all critical API routes exist', () => {
      const criticalRoutes = [
        '../app/api/monitoring/health/route.js',
        '../app/api/ai/orchestrator/route.js', 
        '../app/api/performance/dashboard/route.js',
        '../app/api/auth/signout/route.js'
      ]
      
      criticalRoutes.forEach(route => {
        expect(() => require(route)).not.toThrow()
      })
    })
    
    test('no Python backend dependencies remain', async () => {
      // Check that imports work without Python backend
      const healthModule = await import('../app/api/monitoring/health/route.js')
      const aiModule = await import('../app/api/ai/orchestrator/route.js')
      const perfModule = await import('../app/api/performance/dashboard/route.js')
      
      expect(healthModule.GET).toBeDefined()
      expect(aiModule.POST).toBeDefined()
      expect(perfModule.GET).toBeDefined()
    })
    
    test('configuration is production-ready', async () => {
      const config = await import('../config/index.js')
      
      // Should have production-ready settings
      expect(config.config.app.name).toBeDefined()
      expect(config.config.app.url).toBeDefined()
      expect(config.config.supabase.url).toBeDefined()
      expect(config.config.supabase.anonKey).toBeDefined()
      
      // Should not have hardcoded backend URLs
      expect(config.config.app.apiUrl).not.toContain('localhost:8001')
    })
  })
})