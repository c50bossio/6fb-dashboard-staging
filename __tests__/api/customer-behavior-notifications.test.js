/**
 * Integration Tests for Customer Behavior Notifications API
 * Tests the complete API integration with database and notification engine
 */

import { createMocks } from 'node-mocks-http'
import { POST, GET } from '../../app/api/customer-behavior/notifications/route'

// Mock authentication
const mockUser = {
  id: 'user-123',
  email: 'test@barbershop.com'
}

jest.mock('../../lib/supabase/server', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: mockUser },
        error: null
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: mockBarbershop, error: null })),
          limit: jest.fn(() => ({ data: [], error: null })),
          order: jest.fn(() => ({ data: [], error: null }))
        })),
        insert: jest.fn(() => ({ data: [{ id: 'new-id' }], error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ data: null, error: null }))
        })),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({ data: [], error: null }))
          }))
        }))
      }))
    })),
    rpc: jest.fn(() => ({ data: null, error: null }))
  })
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({}))
}))

// Mock RiskBasedNotificationEngine
const mockProcessingResult = {
  success: true,
  risk_tier: 'yellow',
  risk_score: 55,
  scheduled_count: 3,
  communication_strategy: 'Enhanced Confirmation - Moderate Risk'
}

jest.mock('../../services/RiskBasedNotificationEngine', () => ({
  riskBasedNotifications: {
    processNewBooking: jest.fn(() => Promise.resolve(mockProcessingResult))
  }
}))

const mockBarbershop = {
  id: 'shop-789',
  name: 'Test Barbershop',
  owner_id: 'user-123'
}

describe('/api/customer-behavior/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/customer-behavior/notifications', () => {
    describe('process_new_booking action', () => {
      test('should process new booking notifications successfully', async () => {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            action: 'process_new_booking',
            booking_data: {
              booking_id: 'booking-123',
              customer_id: 'customer-456',
              barbershop_id: 'shop-789',
              appointment_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              customer_phone: '555-0123',
              customer_email: 'test@example.com',
              service_name: 'Haircut'
            }
          }
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.risk_assessment.tier).toBe('yellow')
        expect(data.notifications_scheduled).toBe(3)
        expect(data.strategy).toContain('Enhanced Confirmation')
      })

      test('should validate required booking data fields', async () => {
        const { req } = createMocks({
          method: 'POST',
          body: {
            action: 'process_new_booking',
            booking_data: {
              booking_id: 'booking-123'
              // Missing required fields
            }
          }
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain('Missing required fields')
      })

      test('should handle notification engine failures gracefully', async () => {
        const { riskBasedNotifications } = require('../../services/RiskBasedNotificationEngine')
        riskBasedNotifications.processNewBooking.mockResolvedValueOnce({
          success: false,
          error: 'Risk assessment failed',
          fallback_applied: true
        })

        const { req } = createMocks({
          method: 'POST',
          body: {
            action: 'process_new_booking',
            booking_data: {
              booking_id: 'booking-123',
              customer_id: 'customer-456',
              barbershop_id: 'shop-789',
              appointment_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
          }
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.fallback_applied).toBe(true)
        expect(data.message).toContain('Basic notifications scheduled')
      })
    })

    describe('update_notification_status action', () => {
      test('should update notification status successfully', async () => {
        const { req } = createMocks({
          method: 'POST',
          body: {
            action: 'update_notification_status',
            notification_id: 'notification-123',
            booking_data: {
              status: 'delivered',
              delivered_at: new Date().toISOString(),
              customer_id: 'customer-456',
              barbershop_id: 'shop-789'
            }
          }
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('successfully')
      })

      test('should update engagement score on customer response', async () => {
        const mockRpc = jest.fn(() => ({ data: null, error: null }))
        const { createClient } = require('../../lib/supabase/server')
        const mockSupabase = createClient()
        mockSupabase.rpc = mockRpc

        const { req } = createMocks({
          method: 'POST',
          body: {
            action: 'update_notification_status',
            notification_id: 'notification-123',
            booking_data: {
              status: 'responded',
              customer_id: 'customer-456',
              barbershop_id: 'shop-789'
            }
          }
        })

        await POST(req)

        expect(mockRpc).toHaveBeenCalledWith('update_customer_engagement_score', {
          p_customer_id: 'customer-456',
          p_barbershop_id: 'shop-789',
          p_engagement_improvement: 5
        })
      })
    })

    describe('reschedule_notifications action', () => {
      test('should reschedule notifications successfully', async () => {
        const { req } = createMocks({
          method: 'POST',
          body: {
            action: 'reschedule_notifications',
            booking_data: {
              booking_id: 'booking-123',
              new_appointment_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
              customer_id: 'customer-456',
              barbershop_id: 'shop-789'
            }
          }
        })

        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.message).toContain('rescheduled successfully')
        expect(data.new_schedule).toBeDefined()
      })
    })

    test('should require authentication', async () => {
      const { createClient } = require('../../lib/supabase/server')
      const mockSupabase = createClient()
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const { req } = createMocks({
        method: 'POST',
        body: { action: 'process_new_booking', booking_data: {} }
      })

      const response = await POST(req)
      
      expect(response.status).toBe(401)
    })

    test('should handle invalid actions', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: { action: 'invalid_action' }
      })

      const response = await POST(req)
      
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/customer-behavior/notifications', () => {
    describe('effectiveness_metrics type', () => {
      test('should return notification effectiveness metrics', async () => {
        const { createClient } = require('../../lib/supabase/server')
        const mockSupabase = createClient()
        
        // Mock notification data
        mockSupabase.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                data: [
                  { 
                    status: 'delivered', 
                    booking_notification_plans: { customer_risk_tier: 'green' }
                  },
                  { 
                    status: 'responded', 
                    booking_notification_plans: { customer_risk_tier: 'yellow' }
                  },
                  { 
                    status: 'pending', 
                    booking_notification_plans: { customer_risk_tier: 'red' }
                  }
                ],
                error: null
              }))
            }))
          }))
        })

        const { req } = createMocks({
          method: 'GET',
          query: {
            barbershop_id: 'shop-789',
            type: 'effectiveness_metrics'
          }
        })

        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.metrics).toBeDefined()
        expect(data.metrics.total_notifications).toBe(3)
        expect(data.metrics.effectiveness_by_tier).toBeDefined()
      })

      test('should handle empty notification data', async () => {
        const { createClient } = require('../../lib/supabase/server')
        const mockSupabase = createClient()
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                data: null,
                error: null
              }))
            }))
          }))
        })

        const { req } = createMocks({
          method: 'GET',
          query: {
            barbershop_id: 'shop-789',
            type: 'effectiveness_metrics'
          }
        })

        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.metrics.total_notifications).toBe(0)
        expect(data.message).toContain('No notification data available')
      })
    })

    describe('upcoming_notifications type', () => {
      test('should return upcoming notifications', async () => {
        const { createClient } = require('../../lib/supabase/server')
        const mockSupabase = createClient()
        
        const upcomingNotifications = [
          {
            id: 'notification-1',
            type: 'reminder',
            scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            customers: { name: 'John Doe', phone: '555-0123' },
            booking_notification_plans: { 
              customer_risk_tier: 'yellow',
              communication_strategy: 'Enhanced Confirmation'
            }
          }
        ]
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              gte: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => ({
                    data: upcomingNotifications,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        })

        const { req } = createMocks({
          method: 'GET',
          query: {
            barbershop_id: 'shop-789',
            type: 'upcoming_notifications'
          }
        })

        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.upcoming_notifications).toHaveLength(1)
        expect(data.count).toBe(1)
      })
    })

    describe('communication_history type', () => {
      test('should return customer communication history', async () => {
        const { createClient } = require('../../lib/supabase/server')
        const mockSupabase = createClient()
        
        const communicationHistory = [
          {
            id: 'notification-1',
            type: 'reminder',
            status: 'delivered',
            scheduled_time: new Date().toISOString(),
            booking_notification_plans: {
              communication_strategy: 'Enhanced Confirmation'
            }
          },
          {
            id: 'notification-2',
            type: 'confirmation',
            status: 'responded',
            scheduled_time: new Date().toISOString(),
            booking_notification_plans: {
              communication_strategy: 'Enhanced Confirmation'
            }
          }
        ]
        
        mockSupabase.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  data: communicationHistory,
                  error: null
                }))
              }))
            }))
          }))
        })

        const { req } = createMocks({
          method: 'GET',
          query: {
            barbershop_id: 'shop-789',
            customer_id: 'customer-456',
            type: 'communication_history'
          }
        })

        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.communication_history).toHaveLength(2)
        expect(data.metrics.total_notifications).toBe(2)
        expect(data.metrics.delivery_rate).toBe('100.0%')
        expect(data.metrics.engagement_rate).toBe('50.0%')
      })
    })

    test('should require authentication for GET requests', async () => {
      const { createClient } = require('../../lib/supabase/server')
      const mockSupabase = createClient()
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const { req } = createMocks({
        method: 'GET',
        query: { barbershop_id: 'shop-789' }
      })

      const response = await GET(req)
      
      expect(response.status).toBe(401)
    })

    test('should handle invalid types', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: {
          barbershop_id: 'shop-789',
          type: 'invalid_type'
        }
      })

      const response = await GET(req)
      
      expect(response.status).toBe(400)
    })
  })

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const { createClient } = require('../../lib/supabase/server')
      const mockSupabase = createClient()
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const { req } = createMocks({
        method: 'POST',
        body: {
          action: 'process_new_booking',
          booking_data: {
            booking_id: 'booking-123',
            customer_id: 'customer-456',
            barbershop_id: 'shop-789',
            appointment_time: new Date().toISOString()
          }
        }
      })

      const response = await POST(req)
      
      expect(response.status).toBe(500)
    })

    test('should handle malformed request bodies', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(req)
      
      expect(response.status).toBe(500)
    })
  })

  describe('Performance Tests', () => {
    test('API should respond within acceptable time limits', async () => {
      const startTime = Date.now()
      
      const { req } = createMocks({
        method: 'POST',
        body: {
          action: 'process_new_booking',
          booking_data: {
            booking_id: 'booking-123',
            customer_id: 'customer-456',
            barbershop_id: 'shop-789',
            appointment_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            customer_phone: '555-0123',
            customer_email: 'test@example.com'
          }
        }
      })

      await POST(req)
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})