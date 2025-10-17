/**
 * INTEGRATION TESTS FOR AI PREDICTIVE ANALYTICS SYSTEM
 * 
 * Tests the complete AI and business intelligence pipeline integration
 * Covers API endpoints, database operations, and real-time analytics flow
 */

import { NextRequest } from 'next/server'
import { POST, GET } from '../../app/api/ai/predictive-analytics/route.js'

jest.mock('../../lib/supabase-query.js', () => ({
  queryTable: jest.fn(),
  executeQuery: jest.fn(),
  getTableSchema: jest.fn()
}))

jest.mock('../../lib/ai-providers.js', () => ({
  openaiClient: {
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  },
  anthropicClient: {
    messages: {
      create: jest.fn()
    }
  },
  geminiClient: {
    generateContent: jest.fn()
  }
}))

import supabaseQuery from '../../lib/supabase-query.js'
import { openaiClient, anthropicClient, geminiClient } from '../../lib/ai-providers.js'

describe('AI Predictive Analytics - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    supabaseQuery.queryTable.mockResolvedValue({
      data: [
        { id: 1, total_revenue: 15420, booking_count: 156, date: '2025-01-01' },
        { id: 2, total_revenue: 16200, booking_count: 162, date: '2025-01-02' }
      ],
      error: null
    })
    
    supabaseQuery.executeQuery.mockResolvedValue({
      data: [
        { service_name: 'Haircut', avg_price: 45, booking_count: 85 },
        { service_name: 'Beard Trim', avg_price: 25, booking_count: 32 }
      ],
      error: null
    })
  })

  describe('Revenue Forecasting Integration', () => {
    test('POST /api/ai/predictive-analytics - revenue_forecast with real data flow', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'revenue_forecast',
          barbershop_id: 'test-shop-001',
          parameters: {
            timeframe: 30,
            confidence_level: 0.85
          }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.forecast).toBeDefined()
      expect(data.forecast.predicted_revenue).toBeGreaterThan(0)
      expect(data.forecast.confidence_level).toBe(0.85)
      
      expect(supabaseQuery.queryTable).toHaveBeenCalledWith(
        'business_analytics',
        expect.objectContaining({
          filter: expect.objectContaining({
            barbershop_id: 'test-shop-001'
          })
        })
      )
    })

    test('revenue forecast integrates with multiple data sources', async () => {
      supabaseQuery.queryTable
        .mockResolvedValueOnce({ // Revenue data
          data: [{ total_revenue: 15420, date: '2025-01-01' }],
          error: null
        })
        .mockResolvedValueOnce({ // Booking data
          data: [{ booking_count: 156, date: '2025-01-01' }],
          error: null
        })
        .mockResolvedValueOnce({ // Service data
          data: [{ service_name: 'Haircut', price: 45 }],
          error: null
        })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'revenue_forecast',
          barbershop_id: 'test-shop-001',
          parameters: { timeframe: 30, confidence_level: 0.90 }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.forecast.weekly_breakdown).toBeDefined()
      expect(data.forecast.key_factors).toBeDefined()
      expect(data.forecast.trend_analysis).toBeDefined()
      
      expect(supabaseQuery.queryTable).toHaveBeenCalledTimes(3)
    })

    test('handles seasonal adjustments in revenue forecasting', async () => {
      supabaseQuery.executeQuery.mockResolvedValue({
        data: [
          { month: 12, seasonal_multiplier: 1.25, revenue: 18500 }, // Holiday boost
          { month: 1, seasonal_multiplier: 0.85, revenue: 12800 }   // Post-holiday dip
        ],
        error: null
      })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'seasonal_trends',
          barbershop_id: 'test-shop-001'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.seasonal_analysis).toBeDefined()
      expect(data.seasonal_analysis.holiday_impact).toBeDefined()
      expect(data.seasonal_analysis.monthly_patterns).toBeDefined()
    })
  })

  describe('Customer Behavior Prediction Integration', () => {
    test('POST /api/ai/predictive-analytics - customer_behavior analysis', async () => {
      supabaseQuery.queryTable.mockResolvedValue({
        data: [
          { customer_id: 1, visit_frequency: 30, last_visit: '2025-01-01', churn_score: 0.15 },
          { customer_id: 2, visit_frequency: 45, last_visit: '2024-12-15', churn_score: 0.75 }
        ],
        error: null
      })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'customer_behavior',
          barbershop_id: 'test-shop-001',
          parameters: {
            analysis_type: 'churn_prediction',
            lookback_days: 90
          }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.customer_analysis).toBeDefined()
      expect(data.customer_analysis.churn_risk_segments).toBeDefined()
      expect(data.customer_analysis.retention_recommendations).toBeDefined()
    })

    test('integrates customer lifetime value calculations', async () => {
      supabaseQuery.executeQuery.mockResolvedValue({
        data: [
          { customer_id: 1, total_spent: 1250, visit_count: 28, avg_service_price: 45 },
          { customer_id: 2, total_spent: 890, visit_count: 19, avg_service_price: 47 }
        ],
        error: null
      })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'customer_behavior',
          barbershop_id: 'test-shop-001',
          parameters: { analysis_type: 'lifetime_value' }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.customer_analysis.lifetime_value_segments).toBeDefined()
      expect(data.customer_analysis.high_value_customers).toBeDefined()
      expect(data.customer_analysis.growth_opportunities).toBeDefined()
    })
  })

  describe('Demand Prediction Integration', () => {
    test('POST /api/ai/predictive-analytics - demand_prediction with time patterns', async () => {
      supabaseQuery.queryTable.mockResolvedValue({
        data: [
          { hour: 10, day_of_week: 6, booking_count: 25, date: '2025-01-04' }, // Saturday 10 AM
          { hour: 14, day_of_week: 6, booking_count: 18, date: '2025-01-04' }, // Saturday 2 PM
          { hour: 16, day_of_week: 6, booking_count: 22, date: '2025-01-04' }  // Saturday 4 PM
        ],
        error: null
      })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'demand_prediction',
          barbershop_id: 'test-shop-001'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.demand_prediction.peak_times).toBeDefined()
      expect(data.demand_prediction.service_demand).toBeDefined()
      expect(data.demand_prediction.capacity_recommendations).toBeDefined()
      
      const saturdayDemand = data.demand_prediction.peak_times.find(p => p.day === 'Saturday')
      expect(saturdayDemand).toBeDefined()
    })

    test('integrates capacity optimization with staff scheduling', async () => {
      supabaseQuery.queryTable
        .mockResolvedValueOnce({ // Booking patterns
          data: [{ hour: 10, booking_count: 25, capacity_utilization: 0.96 }],
          error: null
        })
        .mockResolvedValueOnce({ // Staff availability
          data: [{ barber_id: 1, available_hours: ['10:00', '11:00', '12:00'] }],
          error: null
        })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'demand_prediction',
          barbershop_id: 'test-shop-001',
          parameters: { include_capacity_optimization: true }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.demand_prediction.capacity_alerts).toBeDefined()
      expect(data.demand_prediction.staffing_recommendations).toBeDefined()
      expect(data.demand_prediction.optimization_suggestions).toBeDefined()
    })
  })

  describe('Pricing Optimization Integration', () => {
    test('POST /api/ai/predictive-analytics - pricing_optimization', async () => {
      supabaseQuery.executeQuery.mockResolvedValue({
        data: [
          { service: 'Haircut', current_price: 45, demand_elasticity: -0.8, optimal_price: 48 },
          { service: 'Beard Trim', current_price: 25, demand_elasticity: -1.2, optimal_price: 23 }
        ],
        error: null
      })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'pricing_optimization',
          barbershop_id: 'test-shop-001',
          parameters: {
            optimization_goal: 'revenue_maximization',
            constraints: { max_price_increase: 0.15 }
          }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.pricing_optimization.recommended_prices).toBeDefined()
      expect(data.pricing_optimization.revenue_impact).toBeDefined()
      expect(data.pricing_optimization.elasticity_analysis).toBeDefined()
    })
  })

  describe('Comprehensive Dashboard Integration', () => {
    test('GET /api/ai/predictive-analytics - generates complete dashboard', async () => {
      supabaseQuery.queryTable
        .mockResolvedValueOnce({ // Revenue metrics
          data: [{ total_revenue: 15420, growth_rate: 0.125 }],
          error: null
        })
        .mockResolvedValueOnce({ // Customer metrics
          data: [{ total_customers: 342, new_customers: 23, retention_rate: 0.87 }],
          error: null
        })
        .mockResolvedValueOnce({ // Service metrics
          data: [{ total_services: 156, avg_duration: 45, satisfaction_score: 92 }],
          error: null
        })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics?barbershop_id=test-shop-001')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.dashboard).toBeDefined()
      
      expect(data.dashboard.revenue_metrics).toBeDefined()
      expect(data.dashboard.customer_metrics).toBeDefined()
      expect(data.dashboard.operational_metrics).toBeDefined()
      expect(data.dashboard.prediction_accuracy).toBeDefined()
      expect(data.dashboard.recommendations).toBeDefined()
    })

    test('dashboard integration handles real-time data updates', async () => {
      const realTimeData = {
        data: [
          { metric: 'current_bookings', value: 12, timestamp: new Date() },
          { metric: 'revenue_today', value: 1240, timestamp: new Date() }
        ],
        error: null
      }
      
      supabaseQuery.queryTable.mockResolvedValue(realTimeData)
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics?barbershop_id=test-shop-001&real_time=true')
      
      const response = await GET(request)
      const data = await response.json()
      
      expect(data.dashboard.real_time_metrics).toBeDefined()
      expect(data.dashboard.last_updated).toBeDefined()
    })
  })

  describe('Error Handling and Resilience', () => {
    test('handles database connection failures gracefully', async () => {
      supabaseQuery.queryTable.mockRejectedValue(new Error('Database connection failed'))
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'revenue_forecast',
          barbershop_id: 'test-shop-001'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to generate predictions')
    })

    test('handles partial data availability', async () => {
      supabaseQuery.queryTable
        .mockResolvedValueOnce({ data: [{ revenue: 1000 }], error: null })
        .mockRejectedValueOnce(new Error('Service data unavailable'))
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'revenue_forecast',
          barbershop_id: 'test-shop-001'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.forecast).toBeDefined()
      expect(data.warnings).toBeDefined()
      expect(data.warnings).toContain('Limited data availability')
    })

    test('validates input parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'invalid_type',
          barbershop_id: 'test-shop-001'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.error).toBe('Unknown prediction type')
    })
  })

  describe('Performance and Caching Integration', () => {
    test('implements caching for frequently requested predictions', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/ai/predictive-analytics?barbershop_id=test-shop-001')
      const response1 = await GET(request1)
      
      const request2 = new NextRequest('http://localhost:3000/api/ai/predictive-analytics?barbershop_id=test-shop-001')
      const response2 = await GET(request2)
      
      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      expect(supabaseQuery.queryTable).toHaveBeenCalledTimes(3) // Initial queries only
    })

    test('handles concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        new NextRequest(`http://localhost:3000/api/ai/predictive-analytics?barbershop_id=shop-${i}`)
      )
      
      const responses = await Promise.all(requests.map(req => GET(req)))
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('AI Provider Integration', () => {
    test('integrates with OpenAI for advanced analytics', async () => {
      openaiClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              insights: ['Revenue growth accelerating', 'Customer retention improving'],
              predictions: { next_month_revenue: 18500 }
            })
          }
        }]
      })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'ai_insights',
          barbershop_id: 'test-shop-001',
          parameters: { ai_provider: 'openai' }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.ai_insights).toBeDefined()
      expect(openaiClient.chat.completions.create).toHaveBeenCalled()
    })

    test('falls back between AI providers on failure', async () => {
      openaiClient.chat.completions.create.mockRejectedValue(new Error('OpenAI unavailable'))
      
      anthropicClient.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            insights: ['Backup AI analysis'],
            predictions: { confidence: 0.75 }
          })
        }]
      })
      
      const request = new NextRequest('http://localhost:3000/api/ai/predictive-analytics', {
        method: 'POST',
        body: JSON.stringify({
          prediction_type: 'ai_insights',
          barbershop_id: 'test-shop-001'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(data.ai_insights).toBeDefined()
      expect(data.ai_provider_used).toBe('anthropic')
    })
  })
})