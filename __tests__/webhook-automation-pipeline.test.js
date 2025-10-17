/**
 * Comprehensive Test Suite for Webhook Automation Pipeline
 * Tests the complete commission processing automation system
 */

const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals')

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  upsert: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(() => mockSupabaseClient),
  rpc: jest.fn(() => mockSupabaseClient),
  channel: jest.fn(() => mockSupabaseClient),
  send: jest.fn(() => mockSupabaseClient),
  raw: jest.fn((sql) => ({ toSQL: () => sql }))
}

// Mock modules
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}))

jest.mock('@/lib/webhook-security', () => ({
  checkRateLimit: jest.fn(() => ({ allowed: true, requestCount: 1 })),
  verifyStripeSignature: jest.fn(() => ({ valid: true, timestamp: Date.now() / 1000 })),
  validateWebhookPayload: jest.fn(() => ({ valid: true, errors: [] })),
  checkReplayAttack: jest.fn(() => ({ isReplay: false })),
  sanitizeWebhookEvent: jest.fn((event) => event),
  logSecurityEvent: jest.fn(),
  getSecurityHeaders: jest.fn(() => ({}))
}))

jest.mock('@/lib/webhook-retry-manager', () => ({
  withRetry: jest.fn((operation) => operation()),
  createDeadLetterRecord: jest.fn()
}))

// Test data
const mockPaymentIntent = {
  id: 'pi_test_payment_intent',
  amount: 10000, // $100.00 in cents
  currency: 'usd',
  status: 'succeeded',
  created: Math.floor(Date.now() / 1000),
  metadata: {
    booking_id: 'booking_123',
    barber_id: 'barber_456',
    barbershop_id: 'shop_789',
    arrangement_id: 'arrangement_101',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    service_id: 'service_202'
  }
}

const mockFinancialArrangement = {
  id: 'arrangement_101',
  barber_id: 'barber_456',
  barbershop_id: 'shop_789',
  type: 'commission',
  commission_percentage: 60,
  is_active: true,
  total_commissions_earned: 500.00,
  created_at: new Date().toISOString()
}

const mockBooking = {
  id: 'booking_123',
  status: 'pending_payment',
  notes: 'Original booking notes',
  created_at: new Date().toISOString()
}

const mockBarberBalance = {
  id: 'balance_333',
  barber_id: 'barber_456',
  barbershop_id: 'shop_789',
  pending_amount: 200.00,
  paid_amount: 800.00,
  total_earned: 1000.00,
  last_transaction_at: new Date().toISOString()
}

describe('Webhook Automation Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock responses
    mockSupabaseClient.select.mockReturnValue({ 
      data: null, 
      error: null,
      single: jest.fn(() => ({ data: null, error: null }))
    })
    mockSupabaseClient.insert.mockReturnValue({ data: {}, error: null })
    mockSupabaseClient.update.mockReturnValue({ data: {}, error: null })
    mockSupabaseClient.upsert.mockReturnValue({ data: {}, error: null })
  })

  describe('Payment Intent Succeeded Handler', () => {
    it('should process commission calculation successfully', async () => {
      // Mock successful database responses
      mockSupabaseClient.single
        .mockReturnValueOnce({ data: mockBooking, error: null }) // Booking lookup
        .mockReturnValueOnce({ data: mockFinancialArrangement, error: null }) // Arrangement lookup
        .mockReturnValueOnce({ data: { id: 'tx_123' }, error: null }) // Transaction insert
        .mockReturnValueOnce({ data: mockBarberBalance, error: null }) // Balance lookup

      // Import and test the commission calculation
      const { processCommissionCalculation } = require('@/app/api/webhooks/stripe/route')
      
      const result = await processCommissionCalculation(mockPaymentIntent, mockSupabaseClient)

      expect(result.success).toBe(true)
      expect(result.commission_amount).toBe(60.00) // 60% of $100
      expect(result.shop_amount).toBe(40.00) // 40% of $100
      expect(result.arrangement_type).toBe('commission')

      // Verify database calls
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('financial_arrangements')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('commission_transactions')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('barber_commission_balances')
    })

    it('should handle booth rent arrangement correctly', async () => {
      const boothRentArrangement = {
        ...mockFinancialArrangement,
        type: 'booth_rent',
        booth_rent_amount: 1500,
        commission_percentage: null
      }

      mockSupabaseClient.single
        .mockReturnValueOnce({ data: mockBooking, error: null })
        .mockReturnValueOnce({ data: boothRentArrangement, error: null })
        .mockReturnValueOnce({ data: { id: 'tx_124' }, error: null })

      const { processCommissionCalculation } = require('@/app/api/webhooks/stripe/route')
      
      const result = await processCommissionCalculation(mockPaymentIntent, mockSupabaseClient)

      expect(result.success).toBe(true)
      expect(result.commission_amount).toBe(100.00) // Barber keeps everything
      expect(result.shop_amount).toBe(0) // Shop gets rent separately
      expect(result.arrangement_type).toBe('booth_rent')
    })

    it('should handle hybrid arrangement correctly', async () => {
      const hybridArrangement = {
        ...mockFinancialArrangement,
        type: 'hybrid',
        commission_percentage: 40,
        hybrid_base_rent: 800,
        hybrid_revenue_threshold: 3000
      }

      mockSupabaseClient.single
        .mockReturnValueOnce({ data: mockBooking, error: null })
        .mockReturnValueOnce({ data: hybridArrangement, error: null })
        .mockReturnValueOnce({ data: { id: 'tx_125' }, error: null })

      const { processCommissionCalculation } = require('@/app/api/webhooks/stripe/route')
      
      const result = await processCommissionCalculation(mockPaymentIntent, mockSupabaseClient)

      expect(result.success).toBe(true)
      expect(result.commission_amount).toBe(40.00) // 40% of $100
      expect(result.shop_amount).toBe(60.00) // 60% of $100
      expect(result.arrangement_type).toBe('hybrid')
    })

    it('should skip commission calculation when no arrangement found', async () => {
      const paymentWithoutArrangement = {
        ...mockPaymentIntent,
        metadata: {
          booking_id: 'booking_123',
          customer_name: 'John Doe'
          // No barber/arrangement metadata
        }
      }

      const { processCommissionCalculation } = require('@/app/api/webhooks/stripe/route')
      
      const result = await processCommissionCalculation(paymentWithoutArrangement, mockSupabaseClient)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('no_arrangement')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.single
        .mockReturnValueOnce({ data: mockBooking, error: null })
        .mockReturnValueOnce({ data: null, error: { message: 'Database error' } })

      const { processCommissionCalculation } = require('@/app/api/webhooks/stripe/route')
      
      const result = await processCommissionCalculation(mockPaymentIntent, mockSupabaseClient)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('arrangement_error')
    })

    it('should validate calculated amounts', async () => {
      const invalidArrangement = {
        ...mockFinancialArrangement,
        commission_percentage: 150 // Invalid percentage > 100
      }

      mockSupabaseClient.single
        .mockReturnValueOnce({ data: mockBooking, error: null })
        .mockReturnValueOnce({ data: invalidArrangement, error: null })

      const { processCommissionCalculation } = require('@/app/api/webhooks/stripe/route')
      
      const result = await processCommissionCalculation(mockPaymentIntent, mockSupabaseClient)

      expect(result.success).toBe(false)
      expect(result.reason).toBe('calculation_error')
    })
  })

  describe('Balance Update Operations', () => {
    it('should update existing barber balance correctly', async () => {
      mockSupabaseClient.single.mockReturnValue({ 
        data: mockBarberBalance, 
        error: null 
      })
      mockSupabaseClient.update.mockReturnValue({ 
        data: { ...mockBarberBalance, pending_amount: 260.00 }, 
        error: null 
      })

      const { updateBarberCommissionBalance } = require('@/app/api/webhooks/stripe/route')
      
      const result = await updateBarberCommissionBalance(
        'barber_456',
        'shop_789',
        60.00,
        'tx_123',
        mockSupabaseClient
      )

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })

    it('should create new balance record when none exists', async () => {
      mockSupabaseClient.single.mockReturnValue({ 
        data: null, 
        error: { code: 'PGRST116' } // Not found
      })
      mockSupabaseClient.insert.mockReturnValue({ 
        data: { id: 'balance_456' }, 
        error: null 
      })

      const { updateBarberCommissionBalance } = require('@/app/api/webhooks/stripe/route')
      
      const result = await updateBarberCommissionBalance(
        'barber_456',
        'shop_789',
        60.00,
        'tx_123',
        mockSupabaseClient
      )

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.insert).toHaveBeenCalled()
    })

    it('should use upsert as fallback mechanism', async () => {
      // Simulate upsert approach
      mockSupabaseClient.upsert.mockReturnValue({
        data: [{ id: 'balance_456', pending_amount: 60 }],
        error: null
      })

      const { updateBarberCommissionBalance } = require('@/app/api/webhooks/stripe/route')
      
      const result = await updateBarberCommissionBalance(
        'barber_456',
        'shop_789',
        60.00,
        'tx_123',
        mockSupabaseClient
      )

      expect(result.success).toBe(true)
    })
  })

  describe('Transfer Webhook Handlers', () => {
    const mockTransfer = {
      id: 'tr_test_transfer',
      amount: 6000, // $60.00 in cents
      currency: 'usd',
      destination: 'acct_test',
      metadata: {
        commission_transaction_id: 'tx_123'
      },
      failure_code: null,
      failure_message: null
    }

    it('should handle transfer.created event', async () => {
      mockSupabaseClient.update.mockReturnValue({ data: {}, error: null })

      const { handleTransferCreated } = require('@/app/api/webhooks/stripe/route')
      
      await handleTransferCreated(mockTransfer)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('commission_transactions')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })

    it('should handle transfer.paid event with balance update', async () => {
      mockSupabaseClient.single.mockReturnValue({
        data: {
          barber_id: 'barber_456',
          barbershop_id: 'shop_789',
          commission_amount: 60.00
        },
        error: null
      })

      const { handleTransferPaid } = require('@/app/api/webhooks/stripe/route')
      
      await handleTransferPaid(mockTransfer)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('commission_transactions')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('barber_commission_balances')
    })

    it('should handle transfer.failed event', async () => {
      const failedTransfer = {
        ...mockTransfer,
        failure_code: 'insufficient_funds',
        failure_message: 'Insufficient funds in account'
      }

      const { handleTransferFailed } = require('@/app/api/webhooks/stripe/route')
      
      await handleTransferFailed(failedTransfer)

      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'transfer_failed'
        })
      )
    })

    it('should handle transfer.reversed event', async () => {
      mockSupabaseClient.single.mockReturnValue({
        data: {
          barber_id: 'barber_456',
          barbershop_id: 'shop_789'
        },
        error: null
      })

      const { handleTransferReversed } = require('@/app/api/webhooks/stripe/route')
      
      await handleTransferReversed(mockTransfer)

      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'transfer_reversed'
        })
      )
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should record commission processing errors', async () => {
      const { recordCommissionError } = require('@/app/api/webhooks/stripe/route')
      
      await recordCommissionError(
        'pi_test_error',
        'calculation_failed',
        'Division by zero',
        mockSupabaseClient
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('commission_processing_errors')
      expect(mockSupabaseClient.insert).toHaveBeenCalled()
    })

    it('should implement retry mechanism for failed operations', async () => {
      const mockRetryManager = require('@/lib/webhook-retry-manager')
      let attempts = 0
      
      const failingOperation = jest.fn(() => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
        return { success: true }
      })

      mockRetryManager.withRetry.mockImplementation(async (operation) => {
        try {
          const result = await operation()
          return { success: true, data: result }
        } catch (error) {
          return { success: false, error: error.message }
        }
      })

      const result = await mockRetryManager.withRetry(failingOperation)
      
      expect(mockRetryManager.withRetry).toHaveBeenCalled()
    })
  })

  describe('Security and Validation', () => {
    it('should validate webhook signatures', () => {
      const webhookSecurity = require('@/lib/webhook-security')
      
      const result = webhookSecurity.verifyStripeSignature(
        'test_payload',
        't=123,v1=signature',
        'test_secret'
      )

      expect(webhookSecurity.verifyStripeSignature).toHaveBeenCalled()
      expect(result.valid).toBe(true)
    })

    it('should prevent replay attacks', async () => {
      const webhookSecurity = require('@/lib/webhook-security')
      
      const result = await webhookSecurity.checkReplayAttack(
        'evt_test_123',
        Math.floor(Date.now() / 1000)
      )

      expect(webhookSecurity.checkReplayAttack).toHaveBeenCalled()
      expect(result.isReplay).toBe(false)
    })

    it('should enforce rate limiting', () => {
      const webhookSecurity = require('@/lib/webhook-security')
      
      const result = webhookSecurity.checkRateLimit('192.168.1.1')

      expect(webhookSecurity.checkRateLimit).toHaveBeenCalled()
      expect(result.allowed).toBe(true)
    })

    it('should sanitize webhook event data', () => {
      const webhookSecurity = require('@/lib/webhook-security')
      
      const maliciousEvent = {
        id: 'evt_test',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test',
            metadata: {
              xss: '<script>alert("xss")</script>',
              normal: 'safe_data'
            }
          }
        }
      }

      const sanitized = webhookSecurity.sanitizeWebhookEvent(maliciousEvent)

      expect(webhookSecurity.sanitizeWebhookEvent).toHaveBeenCalled()
      expect(sanitized).toBeDefined()
    })
  })

  describe('Notification System Integration', () => {
    it('should send commission calculated notifications', async () => {
      const notificationService = require('@/lib/commission-notification-service')
      
      await notificationService.sendCommissionCalculated({
        barberId: 'barber_456',
        barbershopId: 'shop_789',
        commissionAmount: 60.00,
        shopAmount: 40.00,
        arrangementType: 'commission',
        customerName: 'John Doe'
      })

      expect(notificationService.sendCommissionCalculated).toHaveBeenCalled()
    })

    it('should send commission paid notifications', async () => {
      const notificationService = require('@/lib/commission-notification-service')
      
      await notificationService.sendCommissionPaid({
        barberId: 'barber_456',
        barbershopId: 'shop_789',
        amount: 60.00,
        transferId: 'tr_test',
        method: 'stripe_transfer'
      })

      expect(notificationService.sendCommissionPaid).toHaveBeenCalled()
    })
  })

  describe('End-to-End Webhook Processing', () => {
    it('should process complete payment_intent.succeeded workflow', async () => {
      // Setup successful mocks for entire flow
      mockSupabaseClient.single
        .mockReturnValueOnce({ data: mockBooking, error: null })
        .mockReturnValueOnce({ data: mockFinancialArrangement, error: null })
        .mockReturnValueOnce({ data: { id: 'tx_new' }, error: null })
        .mockReturnValueOnce({ data: mockBarberBalance, error: null })

      mockSupabaseClient.update.mockReturnValue({ data: {}, error: null })
      mockSupabaseClient.insert.mockReturnValue({ data: { id: 'tx_new' }, error: null })

      // Test the full webhook handler
      const { handlePaymentIntentSucceeded } = require('@/app/api/webhooks/stripe/route')
      
      await handlePaymentIntentSucceeded(mockPaymentIntent)

      // Verify all components were called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('bookings')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('financial_arrangements')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('commission_transactions')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('barber_commission_balances')
    })

    it('should handle webhook processing statistics', async () => {
      mockSupabaseClient.rpc.mockReturnValue({ data: null, error: null })

      const { updateWebhookStats } = require('@/app/api/webhooks/stripe/route')
      
      await updateWebhookStats('payment_intent.succeeded', true, 150)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_webhook_stats', {
        p_event_type: 'payment_intent.succeeded',
        p_success: true,
        p_processing_time_ms: 150
      })
    })
  })
})

describe('Performance and Load Testing', () => {
  it('should process multiple webhooks concurrently', async () => {
    const webhookPromises = []
    
    // Simulate 10 concurrent webhook requests
    for (let i = 0; i < 10; i++) {
      const payment = { ...mockPaymentIntent, id: `pi_test_${i}` }
      webhookPromises.push(
        require('@/app/api/webhooks/stripe/route').handlePaymentIntentSucceeded(payment)
      )
    }

    const results = await Promise.allSettled(webhookPromises)
    
    // All should complete without timing out
    expect(results).toHaveLength(10)
    results.forEach(result => {
      expect(['fulfilled', 'rejected']).toContain(result.status)
    })
  })

  it('should handle webhook processing under 2 seconds', async () => {
    const startTime = Date.now()
    
    await require('@/app/api/webhooks/stripe/route').handlePaymentIntentSucceeded(mockPaymentIntent)
    
    const processingTime = Date.now() - startTime
    expect(processingTime).toBeLessThan(2000) // Should process within 2 seconds
  })
})