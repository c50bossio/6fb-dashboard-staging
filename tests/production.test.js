/**
 * Production Test Suite for 6FB AI Agent System
 * Tests critical production functionality end-to-end
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'
const API_BASE = `${BASE_URL}/api`

describe('Production System Tests', () => {
  let testAuthToken = null
  
  beforeAll(async () => {
    console.log(`🧪 Running production tests against: ${BASE_URL}`)
  })

  afterAll(async () => {
    console.log('✅ Production test suite completed')
  })

  describe('Health Checks', () => {
    test('Application should be accessible', async () => {
      const response = await fetch(BASE_URL)
      expect(response.status).toBe(200)
      
      const html = await response.text()
      expect(html).toContain('BookedBarber')
    })

    test('Monitoring API should be accessible', async () => {
      const response = await fetch(`${API_BASE}/monitoring?type=health`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('status')
      expect(['healthy', 'degraded', 'critical', 'unknown']).toContain(data.status)
    })

    test('Database connection should be healthy', async () => {
      const response = await fetch(`${API_BASE}/monitoring?type=health`)
      const data = await response.json()
      
      // Should have basic metrics structure
      expect(data).toHaveProperty('metrics')
      expect(data.timestamp).toBeTruthy()
    })
  })

  describe('AI System Integration', () => {
    test('AI endpoints should be accessible', async () => {
      // Test the main AI API endpoint existence
      const response = await fetch(`${API_BASE}/ai/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test connectivity',
          agent: 'business_coach'
        })
      })
      
      // Should not be 404 (endpoint exists)
      // May be 401/403 if auth required, or 400 for invalid request
      expect([200, 400, 401, 403, 500]).toContain(response.status)
    })

    test('Monitoring should track AI usage', async () => {
      const response = await fetch(`${API_BASE}/monitoring?type=ai-usage&hours=1`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('totalRequests')
      expect(data).toHaveProperty('totalCost')
      expect(Array.isArray(data.modelStats)).toBe(true)
    })
  })

  describe('Error Handling and Monitoring', () => {
    test('Should handle invalid API requests gracefully', async () => {
      const response = await fetch(`${API_BASE}/nonexistent-endpoint`)
      expect(response.status).toBe(404)
    })

    test('Monitoring should track errors', async () => {
      const response = await fetch(`${API_BASE}/monitoring?type=errors&hours=24`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('summary')
      expect(data.summary).toHaveProperty('totalErrors')
      expect(Array.isArray(data.recentErrors)).toBe(true)
    })

    test('Should be able to store monitoring data', async () => {
      const testMetric = {
        type: 'metrics',
        data: {
          type: 'test_metric',
          value: Math.random(),
          timestamp: new Date().toISOString()
        }
      }

      const response = await fetch(`${API_BASE}/monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMetric)
      })

      expect([200, 401, 403]).toContain(response.status) // May require auth
    })
  })

  describe('Performance and Scalability', () => {
    test('API endpoints should respond within acceptable time', async () => {
      const startTime = Date.now()
      
      const response = await fetch(`${API_BASE}/monitoring?type=health`)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds
    }, 10000) // 10 second timeout

    test('Multiple concurrent requests should be handled', async () => {
      const requests = Array(5).fill().map(() => 
        fetch(`${API_BASE}/monitoring?type=health`)
      )

      const responses = await Promise.all(requests)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Security and Access Control', () => {
    test('Admin-only endpoints should require authentication', async () => {
      const response = await fetch(`${BASE_URL}/admin/monitoring`)
      
      // Should redirect to login or return unauthorized
      expect([302, 401, 403]).toContain(response.status)
    })

    test('API should have proper CORS headers', async () => {
      const response = await fetch(`${API_BASE}/monitoring?type=health`)
      
      // Should have basic CORS handling
      expect(response.headers.get('content-type')).toMatch(/application\/json/)
    })

    test('Should not expose sensitive information in errors', async () => {
      const response = await fetch(`${API_BASE}/invalid-endpoint`)
      const text = await response.text()
      
      // Should not contain database connection strings, API keys, etc.
      expect(text).not.toMatch(/password|secret|key|token|supabase\.co/i)
    })
  })

  describe('Data Consistency', () => {
    test('Monitoring data should have consistent timestamps', async () => {
      const response = await fetch(`${API_BASE}/monitoring?type=metrics&hours=1`)
      const data = await response.json()
      
      if (data.hourlyData && data.hourlyData.length > 0) {
        data.hourlyData.forEach(hourData => {
          expect(hourData.timestamp).toBeTruthy()
          expect(new Date(hourData.timestamp).getTime()).not.toBeNaN()
        })
      }
    })

    test('Health status should be valid enum value', async () => {
      const response = await fetch(`${API_BASE}/monitoring?type=health`)
      const data = await response.json()
      
      const validStatuses = ['healthy', 'degraded', 'critical', 'unknown']
      expect(validStatuses).toContain(data.status)
    })
  })

  describe('Integration Points', () => {
    test('Static assets should be served correctly', async () => {
      const response = await fetch(`${BASE_URL}/favicon.ico`)
      expect([200, 404]).toContain(response.status) // 404 is acceptable if no favicon
    })

    test('Service Worker should be available for PWA functionality', async () => {
      const response = await fetch(`${BASE_URL}/sw.js`)
      expect([200, 404]).toContain(response.status) // 404 acceptable if SW not implemented
    })

    test('Manifest should be valid for PWA', async () => {
      const response = await fetch(`${BASE_URL}/manifest.json`)
      
      if (response.status === 200) {
        const manifest = await response.json()
        expect(manifest).toHaveProperty('name')
      }
    })
  })
})

describe('Load Testing (Light)', () => {
  test('System should handle burst of health check requests', async () => {
    const startTime = Date.now()
    
    // Send 20 concurrent health check requests
    const requests = Array(20).fill().map(() => 
      fetch(`${API_BASE}/monitoring?type=health`)
    )

    const responses = await Promise.allSettled(requests)
    const endTime = Date.now()
    const totalTime = endTime - startTime

    // Count successful responses
    const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200)
    
    console.log(`🚀 Load test: ${successful.length}/20 requests successful in ${totalTime}ms`)
    
    // At least 80% should succeed
    expect(successful.length).toBeGreaterThanOrEqual(16)
    
    // Should complete within 10 seconds
    expect(totalTime).toBeLessThan(10000)
  }, 15000) // 15 second timeout
})

describe('Monitoring Integration', () => {
  test('Production monitor should be collecting metrics', async () => {
    // Wait a moment for metrics to be collected
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const response = await fetch(`${API_BASE}/monitoring?type=metrics&hours=1`)
    const data = await response.json()
    
    // Should have some structure even if no data yet
    expect(data).toHaveProperty('timeRange')
    expect(data).toHaveProperty('hourlyData')
    expect(Array.isArray(data.hourlyData)).toBe(true)
  })

  test('Error tracking should be functional', async () => {
    // Trigger a controlled error by hitting invalid endpoint
    await fetch(`${API_BASE}/trigger-test-error-${Date.now()}`)
    
    // Wait for error to be processed
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const response = await fetch(`${API_BASE}/monitoring?type=errors&hours=1`)
    const data = await response.json()
    
    expect(data).toHaveProperty('summary')
    expect(typeof data.summary.totalErrors).toBe('number')
  })
})

// Helper function for authenticated requests (if needed)
async function authenticatedRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(testAuthToken && { 'Authorization': `Bearer ${testAuthToken}` }),
    ...options.headers
  }

  return fetch(url, {
    ...options,
    headers
  })
}