/**
 * Unit Tests for RiskBasedNotificationEngine
 * Validates core risk assessment and notification scheduling logic
 */

import { RiskBasedNotificationEngine } from '../../services/RiskBasedNotificationEngine'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({ data: null, error: null })),
        limit: jest.fn(() => ({ data: [], error: null })),
        order: jest.fn(() => ({ data: [], error: null }))
      })),
      insert: jest.fn(() => ({ data: null, error: null })),
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
}

// Mock createClient
jest.mock('../../lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

describe('RiskBasedNotificationEngine', () => {
  let engine
  const mockBookingData = {
    booking_id: 'booking-123',
    customer_id: 'customer-456',
    barbershop_id: 'shop-789',
    appointment_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    customer_phone: '555-0123',
    customer_email: 'test@example.com',
    service_name: 'Haircut'
  }

  beforeEach(() => {
    engine = new RiskBasedNotificationEngine()
    jest.clearAllMocks()
  })

  describe('Risk Assessment', () => {
    describe('calculateRiskTier', () => {
      test('should classify green tier correctly (0-39%)', () => {
        expect(engine.calculateRiskTier(0)).toBe('green')
        expect(engine.calculateRiskTier(25)).toBe('green')
        expect(engine.calculateRiskTier(39)).toBe('green')
      })

      test('should classify yellow tier correctly (40-69%)', () => {
        expect(engine.calculateRiskTier(40)).toBe('yellow')
        expect(engine.calculateRiskTier(55)).toBe('yellow')
        expect(engine.calculateRiskTier(69)).toBe('yellow')
      })

      test('should classify red tier correctly (70-100%)', () => {
        expect(engine.calculateRiskTier(70)).toBe('red')
        expect(engine.calculateRiskTier(85)).toBe('red')
        expect(engine.calculateRiskTier(100)).toBe('red')
      })
    })

    describe('analyzeContactRiskIndicators', () => {
      test('should detect temporary phone numbers', () => {
        const result = engine.analyzeContactRiskIndicators({
          phone: '1-800-555-1234',
          email: 'test@gmail.com'
        })
        
        expect(result.factors).toContain('temporary_phone_number')
        expect(result.adjustment).toBeGreaterThan(10)
      })

      test('should detect temporary email domains', () => {
        const result = engine.analyzeContactRiskIndicators({
          phone: '555-123-4567',
          email: 'test@tempmail.com'
        })
        
        expect(result.factors).toContain('temporary_email')
        expect(result.adjustment).toBeGreaterThan(20)
      })

      test('should handle missing contact information', () => {
        const result = engine.analyzeContactRiskIndicators({})
        
        expect(result.factors).toContain('no_phone_provided')
        expect(result.factors).toContain('no_email_provided')
        expect(result.adjustment).toBeGreaterThan(30)
      })

      test('should give low adjustment for good contact info', () => {
        const result = engine.analyzeContactRiskIndicators({
          phone: '555-123-4567',
          email: 'john.smith@gmail.com'
        })
        
        expect(result.adjustment).toBeLessThan(15)
      })
    })

    describe('assessCustomerRisk', () => {
      test('should use existing score if recent enough', async () => {
        const recentDate = new Date().toISOString()
        mockSupabase.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({
                data: {
                  risk_score: 45,
                  risk_tier: 'yellow',
                  calculated_at: recentDate
                }
              }))
            }))
          }))
        })

        const result = await engine.assessCustomerRisk('customer-123', 'shop-456', {
          phone: '555-0123',
          email: 'test@example.com'
        })

        expect(result.risk_score).toBe(45)
        expect(result.risk_tier).toBe('yellow')
        expect(result.source).toBe('existing_score')
      })

      test('should calculate real-time risk for new customers', async () => {
        // Mock no existing score
        mockSupabase.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: null }))
            }))
          }))
        })

        const result = await engine.assessCustomerRisk('customer-123', 'shop-456', {
          phone: '555-0123',
          email: 'test@example.com'
        })

        expect(result.risk_score).toBeGreaterThan(0)
        expect(['green', 'yellow', 'red']).toContain(result.risk_tier)
        expect(result.source).toBe('real_time_calculation')
      })

      test('should fallback to medium risk on error', async () => {
        mockSupabase.from.mockImplementation(() => {
          throw new Error('Database error')
        })

        const result = await engine.assessCustomerRisk('customer-123', 'shop-456', {})

        expect(result.risk_score).toBe(50)
        expect(result.risk_tier).toBe('yellow')
        expect(result.source).toBe('fallback_default')
      })
    })
  })

  describe('Communication Plan Generation', () => {
    describe('generateGreenTierPlan', () => {
      test('should create minimal notification plan for reliable customers', () => {
        const plan = engine.generateGreenTierPlan(48, { preferred_channel: 'sms' })

        expect(plan.strategy_name).toContain('Minimal Touch')
        expect(plan.total_notifications).toBeLessThan(3)
        expect(plan.notifications.every(n => n.priority === 'low')).toBe(true)
      })

      test('should adjust for short-notice appointments', () => {
        const plan = engine.generateGreenTierPlan(12, { preferred_channel: 'sms' })

        // Should have fewer notifications for short-notice appointments
        expect(plan.total_notifications).toBeLessThan(2)
      })
    })

    describe('generateYellowTierPlan', () => {
      test('should create enhanced confirmation plan', () => {
        const plan = engine.generateYellowTierPlan(72, { preferred_channel: 'sms' }, 'Haircut')

        expect(plan.strategy_name).toContain('Enhanced Confirmation')
        expect(plan.total_notifications).toBeGreaterThan(2)
        expect(plan.notifications.some(n => n.requires_response)).toBe(true)
        expect(plan.notifications.some(n => n.includes_reschedule_link)).toBe(true)
      })

      test('should include policy reminders', () => {
        const plan = engine.generateYellowTierPlan(72, {}, 'Haircut')

        const policyNotifications = plan.notifications.filter(n => n.includes_policies)
        expect(policyNotifications.length).toBeGreaterThan(0)
      })
    })

    describe('generateRedTierPlan', () => {
      test('should create white-glove concierge plan', () => {
        const plan = engine.generateRedTierPlan(96, {}, 'Haircut')

        expect(plan.strategy_name).toContain('White-Glove')
        expect(plan.total_notifications).toBeGreaterThan(4)
        expect(plan.notifications.some(n => n.channel === 'phone_call')).toBe(true)
        expect(plan.notifications.some(n => n.requires_human_followup)).toBe(true)
        expect(plan.notifications.some(n => n.priority === 'urgent')).toBe(true)
      })

      test('should include immediate personal confirmation', () => {
        const plan = engine.generateRedTierPlan(96, {}, 'Haircut')

        const immediateConfirmation = plan.notifications.find(n => n.timing < 1)
        expect(immediateConfirmation).toBeDefined()
        expect(immediateConfirmation.type).toBe('personal_confirmation')
      })
    })
  })

  describe('processNewBooking Integration', () => {
    test('should process complete booking workflow successfully', async () => {
      // Mock successful database operations
      const mockInsert = jest.fn(() => ({ data: [{ id: 'plan-123' }], error: null }))
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null })) // No existing score
          }))
        }))
      })

      const result = await engine.processNewBooking(mockBookingData)

      expect(result.success).toBe(true)
      expect(result.risk_tier).toBeDefined()
      expect(result.scheduled_count).toBeGreaterThan(0)
      expect(result.communication_strategy).toBeDefined()
    })

    test('should handle missing required fields', async () => {
      const incompleteBookingData = {
        customer_id: 'customer-456'
        // Missing other required fields
      }

      const result = await engine.processNewBooking(incompleteBookingData)

      expect(result.success).toBe(false)
      expect(result.fallback_applied).toBe(true)
    })

    test('should apply fallback on processing errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await engine.processNewBooking(mockBookingData)

      expect(result.success).toBe(false)
      expect(result.fallback_applied).toBe(true)
      expect(result.error).toBeDefined()
    })
  })

  describe('Helper Functions', () => {
    test('isScoreRecentEnough should validate score age correctly', () => {
      const recentDate = new Date().toISOString()
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago

      expect(engine.isScoreRecentEnough(recentDate)).toBe(true)
      expect(engine.isScoreRecentEnough(oldDate)).toBe(false)
    })

    test('isRecentCustomer should identify new customers correctly', () => {
      const recentDate = new Date().toISOString()
      const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() // 45 days ago

      expect(engine.isRecentCustomer(recentDate)).toBe(true)
      expect(engine.isRecentCustomer(oldDate)).toBe(false)
    })

    test('calculateScheduledTime should calculate notification timing correctly', () => {
      const appointmentTime = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours from now
      engine.currentAppointmentTime = appointmentTime.toISOString()

      const scheduledTime = engine.calculateScheduledTime(24) // 24 hours before
      const expectedTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000)

      expect(Math.abs(scheduledTime - expectedTime)).toBeLessThan(1000) // Within 1 second
    })
  })

  describe('Performance Tests', () => {
    test('risk assessment should complete within performance threshold', async () => {
      const startTime = Date.now()
      
      await engine.assessCustomerRisk('customer-123', 'shop-456', {
        phone: '555-0123',
        email: 'test@example.com'
      })
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })

    test('communication plan generation should be fast', () => {
      const startTime = Date.now()
      
      engine.generateYellowTierPlan(72, {}, 'Haircut')
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(100) // Should complete within 100ms
    })
  })

  describe('Template System', () => {
    test('should initialize with all required templates', () => {
      expect(engine.notificationTemplates).toBeDefined()
      expect(engine.notificationTemplates.green_tier_reminder).toBeDefined()
      expect(engine.notificationTemplates.yellow_tier_24h_reminder).toBeDefined()
      expect(engine.notificationTemplates.red_tier_personal_confirmation).toBeDefined()
    })

    test('templates should contain required placeholders', () => {
      const greenTemplate = engine.notificationTemplates.green_tier_reminder.sms
      
      expect(greenTemplate).toContain('{customer_name}')
      expect(greenTemplate).toContain('{service_name}')
      expect(greenTemplate).toContain('{time}')
      expect(greenTemplate).toContain('{barbershop_name}')
    })
  })
})

// Performance benchmarking helper
export const benchmarkNotificationEngine = async (iterations = 100) => {
  const engine = new RiskBasedNotificationEngine()
  const mockBooking = {
    booking_id: 'perf-test',
    customer_id: 'customer-perf',
    barbershop_id: 'shop-perf',
    appointment_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    customer_phone: '555-0123',
    customer_email: 'perf@test.com',
    service_name: 'Performance Test'
  }

  const times = []
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now()
    await engine.assessCustomerRisk(mockBooking.customer_id, mockBooking.barbershop_id, {
      phone: mockBooking.customer_phone,
      email: mockBooking.customer_email
    })
    times.push(Date.now() - start)
  }

  return {
    average: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
    p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
  }
}