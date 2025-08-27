/**
 * Comprehensive Integration Test Suite for Webhook Automation Pipeline
 * Tests complete end-to-end payment → commission → tier → payout flow
 * 
 * Tests all major system components:
 * 1. Webhook Security & Validation
 * 2. Commission Calculation & Recording  
 * 3. Progressive Tier System
 * 4. Balance Updates & Notifications
 * 5. Error Recovery & Retry Logic
 */

const { describe, it, expect, beforeEach, afterEach, jest, beforeAll, afterAll } = require('@jest/globals')
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')
const { performance } = require('perf_hooks')

// Test environment setup
const TEST_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
const TEST_SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test_key'

// Mock Stripe for webhook testing
const mockStripe = {
  webhooks: {
    constructEvent: jest.fn(),
    signature: {
      verifyHeader: jest.fn()
    }
  },
  transfers: {
    create: jest.fn(),
    retrieve: jest.fn()
  },
  accounts: {
    retrieve: jest.fn()
  }
}

// Mock external dependencies
jest.mock('stripe', () => () => mockStripe)

describe('Webhook Automation Integration Tests', () => {
  let supabase
  let testBarbershop
  let testBarber 
  let testFinancialArrangement
  let testTierStructure

  beforeAll(async () => {
    supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_KEY)
    
    // Create test data
    await setupTestData()
  })

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData()
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default Stripe mocks
    mockStripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_test_webhook',
      type: 'payment_intent.succeeded',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'pi_test_payment',
          amount: 10000, // $100.00
          currency: 'usd',
          status: 'succeeded',
          metadata: {
            booking_id: 'test_booking_123',
            barber_id: testBarber?.id,
            barbershop_id: testBarbershop?.id,
            arrangement_id: testFinancialArrangement?.id
          }
        }
      }
    })

    mockStripe.transfers.create.mockResolvedValue({
      id: 'tr_test_transfer',
      amount: 6000,
      currency: 'usd',
      destination: 'acct_test'
    })

    mockStripe.accounts.retrieve.mockResolvedValue({
      id: 'acct_test',
      payouts_enabled: true,
      charges_enabled: true
    })
  })

  describe('End-to-End Payment Processing Flow', () => {
    it('should process complete payment → commission → tier → notification flow', async () => {
      const startTime = performance.now()
      
      // 1. Simulate incoming Stripe webhook
      const webhookPayload = JSON.stringify({
        id: 'evt_test_webhook',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_integration_test',
            amount: 15000, // $150.00 - should trigger tier progression
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              booking_id: 'integration_booking_456',
              barber_id: testBarber.id,
              barbershop_id: testBarbershop.id,
              arrangement_id: testFinancialArrangement.id,
              customer_name: 'John Doe',
              service_id: 'service_123'
            }
          }
        }
      })

      const signature = generateWebhookSignature(webhookPayload)
      
      // 2. Process webhook through main handler
      const response = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': signature
        },
        body: webhookPayload
      })

      expect(response.status).toBe(200)
      
      // 3. Verify commission transaction was created
      const { data: commissionTx } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('payment_intent_id', 'pi_integration_test')
        .single()

      expect(commissionTx).toBeTruthy()
      expect(commissionTx.commission_amount).toBe(90.00) // 60% of $150
      expect(commissionTx.shop_amount).toBe(60.00) // 40% of $150
      expect(commissionTx.arrangement_type).toBe('commission')

      // 4. Verify barber balance was updated
      const { data: balance } = await supabase
        .from('barber_commission_balances')
        .select('*')
        .eq('barber_id', testBarber.id)
        .eq('barbershop_id', testBarbershop.id)
        .single()

      expect(balance.pending_amount).toBeGreaterThanOrEqual(90.00)
      expect(balance.total_earned).toBeGreaterThanOrEqual(90.00)

      // 5. Verify tier progression was calculated
      const { data: tierAssignment } = await supabase
        .from('barber_tier_assignments')
        .select('*')
        .eq('barber_id', testBarber.id)
        .eq('barbershop_id', testBarbershop.id)
        .single()

      expect(tierAssignment.current_revenue).toBeGreaterThanOrEqual(150.00)
      
      // 6. Check processing time
      const processingTime = performance.now() - startTime
      expect(processingTime).toBeLessThan(5000) // Should complete within 5 seconds

      }ms`)
    })

    it('should handle multiple concurrent payments correctly', async () => {
      const concurrentPayments = []
      
      // Create 5 concurrent payment webhooks
      for (let i = 0; i < 5; i++) {
        const paymentId = `pi_concurrent_${i}`
        const amount = (i + 1) * 2000 // $20, $40, $60, $80, $100
        
        concurrentPayments.push(
          processWebhookPayment({
            id: paymentId,
            amount: amount,
            barber_id: testBarber.id,
            barbershop_id: testBarbershop.id,
            arrangement_id: testFinancialArrangement.id
          })
        )
      }

      const results = await Promise.allSettled(concurrentPayments)
      
      // All payments should succeed
      expect(results.every(r => r.status === 'fulfilled')).toBe(true)
      
      // Verify all transactions were recorded
      const { data: transactions } = await supabase
        .from('commission_transactions')
        .select('*')
        .like('payment_intent_id', 'pi_concurrent_%')
        .order('created_at', { ascending: true })

      expect(transactions).toHaveLength(5)
      
      // Verify commission calculations are correct
      const expectedCommissions = [12.00, 24.00, 36.00, 48.00, 60.00] // 60% of each amount
      transactions.forEach((tx, index) => {
        expect(tx.commission_amount).toBe(expectedCommissions[index])
      })

      // Verify balance updates are atomic (final balance should equal sum)
      const { data: finalBalance } = await supabase
        .from('barber_commission_balances')
        .select('*')
        .eq('barber_id', testBarber.id)
        .eq('barbershop_id', testBarbershop.id)
        .single()

      const expectedTotalCommission = expectedCommissions.reduce((sum, amount) => sum + amount, 0)
      expect(finalBalance.pending_amount).toBeGreaterThanOrEqual(expectedTotalCommission)
    })
  })

  describe('Progressive Tier System Integration', () => {
    it('should automatically progress tiers based on revenue', async () => {
      // Start with fresh tier assignment
      await supabase
        .from('barber_tier_assignments')
        .delete()
        .eq('barber_id', testBarber.id)

      // Create new tier assignment at starter level
      const { data: initialAssignment } = await supabase
        .from('barber_tier_assignments')
        .insert({
          barber_id: testBarber.id,
          barbershop_id: testBarbershop.id,
          tier_structure_id: testTierStructure.id,
          current_tier_id: testTierStructure.tiers[0].id, // Starter tier
          current_revenue: 0,
          period_start_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      expect(initialAssignment.current_tier_id).toBe(testTierStructure.tiers[0].id)

      // Process payment that should trigger tier upgrade
      await processWebhookPayment({
        id: 'pi_tier_upgrade_test',
        amount: 600000, // $6,000 - should reach Professional tier ($5,000 threshold)
        barber_id: testBarber.id,
        barbershop_id: testBarbershop.id,
        arrangement_id: testFinancialArrangement.id
      })

      // Verify tier upgrade occurred
      const { data: upgradedAssignment } = await supabase
        .from('barber_tier_assignments')
        .select('*')
        .eq('barber_id', testBarber.id)
        .eq('barbershop_id', testBarbershop.id)
        .single()

      expect(upgradedAssignment.current_tier_id).toBe(testTierStructure.tiers[1].id) // Professional tier
      expect(upgradedAssignment.current_revenue).toBeGreaterThanOrEqual(6000)

      // Verify tier history was recorded
      const { data: tierHistory } = await supabase
        .from('commission_tier_history')
        .select('*')
        .eq('barber_id', testBarber.id)
        .eq('tier_id', testTierStructure.tiers[1].id)

      expect(tierHistory).toHaveLength(1)
      expect(tierHistory[0].achievement_date).toBeTruthy()
    })

    it('should apply correct tier-based commission rates', async () => {
      // Set barber to Elite tier (70% commission)
      await supabase
        .from('barber_tier_assignments')
        .upsert({
          barber_id: testBarber.id,
          barbershop_id: testBarbershop.id,
          tier_structure_id: testTierStructure.id,
          current_tier_id: testTierStructure.tiers[2].id, // Elite tier
          current_revenue: 16000 // Above $15,000 threshold
        })

      // Process payment with tier-based calculation
      await processWebhookPayment({
        id: 'pi_tier_rate_test',
        amount: 10000, // $100.00
        barber_id: testBarber.id,
        barbershop_id: testBarbershop.id,
        arrangement_id: testFinancialArrangement.id
      })

      // Verify commission was calculated at tier rate (70%)
      const { data: transaction } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('payment_intent_id', 'pi_tier_rate_test')
        .single()

      expect(transaction.commission_amount).toBe(70.00) // 70% tier rate
      expect(transaction.shop_amount).toBe(30.00) // 30% to shop
      expect(transaction.tier_level).toBe(3) // Elite tier level
      expect(transaction.tier_id).toBe(testTierStructure.tiers[2].id)
    })

    it('should handle tier reset periods correctly', async () => {
      // Set up monthly reset scenario
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      await supabase
        .from('barber_tier_assignments')
        .upsert({
          barber_id: testBarber.id,
          barbershop_id: testBarbershop.id,
          tier_structure_id: testTierStructure.id,
          current_tier_id: testTierStructure.tiers[2].id, // Elite tier
          current_revenue: 20000, // High revenue from last period
          period_start_date: lastMonth.toISOString().split('T')[0]
        })

      // Process first payment of new period
      await processWebhookPayment({
        id: 'pi_period_reset_test',
        amount: 5000, // $50.00
        barber_id: testBarber.id,
        barbershop_id: testBarbershop.id,
        arrangement_id: testFinancialArrangement.id
      })

      // Verify tier was reset for new period
      const { data: resetAssignment } = await supabase
        .from('barber_tier_assignments')
        .select('*')
        .eq('barber_id', testBarber.id)
        .eq('barbershop_id', testBarbershop.id)
        .single()

      expect(resetAssignment.current_revenue).toBe(50.00) // Only new period revenue
      expect(resetAssignment.current_tier_id).toBe(testTierStructure.tiers[0].id) // Back to starter
      expect(new Date(resetAssignment.period_start_date).getMonth()).toBe(new Date().getMonth())
    })
  })

  describe('Error Recovery and Retry Logic', () => {
    it('should retry failed commission calculations', async () => {
      // Mock temporary database failure
      let attempts = 0
      const originalFrom = supabase.from
      supabase.from = jest.fn((table) => {
        attempts++
        if (table === 'financial_arrangements' && attempts === 1) {
          return {
            select: () => ({
              eq: () => ({
                single: () => ({ data: null, error: { message: 'Connection timeout' } })
              })
            })
          }
        }
        return originalFrom.call(supabase, table)
      })

      // Process payment that will initially fail
      const result = await processWebhookPayment({
        id: 'pi_retry_test',
        amount: 10000,
        barber_id: testBarber.id,
        barbershop_id: testBarbershop.id,
        arrangement_id: testFinancialArrangement.id
      })

      // Restore original method
      supabase.from = originalFrom

      // Verify retry eventually succeeded
      expect(result.status).toBe(200)
      expect(attempts).toBeGreaterThan(1)
    })

    it('should handle dead letter queue for permanent failures', async () => {
      // Process payment with invalid arrangement ID
      const result = await processWebhookPayment({
        id: 'pi_dead_letter_test',
        amount: 10000,
        barber_id: testBarber.id,
        barbershop_id: testBarbershop.id,
        arrangement_id: 'invalid_arrangement_id'
      })

      // Verify error was recorded in dead letter queue
      const { data: deadLetterRecords } = await supabase
        .from('webhook_dead_letter_queue')
        .select('*')
        .eq('payment_intent_id', 'pi_dead_letter_test')

      expect(deadLetterRecords).toHaveLength(1)
      expect(deadLetterRecords[0].error_type).toBe('arrangement_not_found')
      expect(deadLetterRecords[0].retry_count).toBeGreaterThan(0)
    })
  })

  describe('Security and Validation Testing', () => {
    it('should reject webhooks with invalid signatures', async () => {
      const webhookPayload = JSON.stringify({
        id: 'evt_invalid_signature',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test' } }
      })

      // Use invalid signature
      const response = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': 'invalid_signature'
        },
        body: webhookPayload
      })

      expect(response.status).toBe(400)
      
      // Verify security event was logged
      const { data: securityLog } = await supabase
        .from('webhook_security_logs')
        .select('*')
        .eq('event_type', 'invalid_signature')
        .order('created_at', { ascending: false })
        .limit(1)

      expect(securityLog).toHaveLength(1)
    })

    it('should prevent replay attacks', async () => {
      const webhookPayload = JSON.stringify({
        id: 'evt_replay_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_replay_test' } }
      })

      const signature = generateWebhookSignature(webhookPayload)

      // Send webhook first time
      const firstResponse = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': signature
        },
        body: webhookPayload
      })

      expect(firstResponse.status).toBe(200)

      // Send same webhook again (replay attack)
      const replayResponse = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': signature
        },
        body: webhookPayload
      })

      expect(replayResponse.status).toBe(400)
    })

    it('should enforce rate limiting', async () => {
      const requests = []
      const webhookPayload = JSON.stringify({
        id: 'evt_rate_limit_test',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_rate_limit' } }
      })

      const signature = generateWebhookSignature(webhookPayload)

      // Send 150 requests rapidly (exceeds 100/minute limit)
      for (let i = 0; i < 150; i++) {
        requests.push(
          fetch('/api/webhooks/stripe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Stripe-Signature': signature,
              'X-Forwarded-For': '192.168.1.1' // Same IP for rate limiting
            },
            body: webhookPayload.replace('evt_rate_limit_test', `evt_rate_limit_${i}`)
          })
        )
      }

      const responses = await Promise.allSettled(requests)
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 429
      )

      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle high-volume webhook processing', async () => {
      const startTime = performance.now()
      const webhookPromises = []

      // Process 50 concurrent webhooks
      for (let i = 0; i < 50; i++) {
        webhookPromises.push(
          processWebhookPayment({
            id: `pi_load_test_${i}`,
            amount: Math.floor(Math.random() * 20000) + 1000, // $10-$200
            barber_id: testBarber.id,
            barbershop_id: testBarbershop.id,
            arrangement_id: testFinancialArrangement.id
          })
        )
      }

      const results = await Promise.allSettled(webhookPromises)
      const processingTime = performance.now() - startTime

      // All should complete successfully
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      expect(successfulResults.length).toBeGreaterThanOrEqual(45) // Allow up to 10% failures

      // Should complete within reasonable time
      expect(processingTime).toBeLessThan(30000) // 30 seconds for 50 webhooks

      }ms`)
      .toFixed(2)}ms per webhook`)
    })

    it('should maintain database performance under load', async () => {
      const dbPerformanceTests = []

      // Test various database operations under load
      for (let i = 0; i < 20; i++) {
        dbPerformanceTests.push(
          measureDbPerformance('commission_transactions', {
            payment_intent_id: `pi_perf_test_${i}`,
            arrangement_id: testFinancialArrangement.id,
            barber_id: testBarber.id,
            barbershop_id: testBarbershop.id,
            commission_amount: 50.00,
            shop_amount: 50.00
          })
        )
      }

      const dbResults = await Promise.allSettled(dbPerformanceTests)
      const avgDbTime = dbResults
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value, 0) / dbResults.length

      expect(avgDbTime).toBeLessThan(100) // Average DB operation should be under 100ms
      }ms`)
    })
  })

  // Helper Functions
  async function setupTestData() {
    // Create test barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .insert({
        id: 'test_barbershop_integration',
        name: 'Integration Test Shop',
        owner_id: 'test_owner_integration',
        address: '123 Test St, Test City'
      })
      .select()
      .single()

    testBarbershop = barbershop

    // Create test barber
    const { data: barber } = await supabase
      .from('profiles')
      .insert({
        id: 'test_barber_integration',
        email: 'testbarber@integration.test',
        full_name: 'Test Barber Integration',
        role: 'barber',
        barbershop_id: testBarbershop.id
      })
      .select()
      .single()

    testBarber = barber

    // Create financial arrangement
    const { data: arrangement } = await supabase
      .from('financial_arrangements')
      .insert({
        id: 'test_arrangement_integration',
        barber_id: testBarber.id,
        barbershop_id: testBarbershop.id,
        arrangement_type: 'commission',
        commission_percentage: 60,
        use_tier_system: true,
        is_active: true
      })
      .select()
      .single()

    testFinancialArrangement = arrangement

    // Create tier structure
    const { data: tierStructure } = await supabase
      .from('commission_tier_structures')
      .insert({
        id: 'test_tier_structure_integration',
        barbershop_id: testBarbershop.id,
        name: 'Integration Test Tiers',
        description: 'Test tier structure for integration tests',
        reset_period: 'monthly',
        is_active: true
      })
      .select()
      .single()

    // Create tier levels
    const tierLevels = [
      { name: 'Starter', threshold_amount: 0, commission_percentage: 50, level: 1, color: 'gray' },
      { name: 'Professional', threshold_amount: 5000, commission_percentage: 60, level: 2, color: 'blue' },
      { name: 'Elite', threshold_amount: 15000, commission_percentage: 70, level: 3, color: 'green' },
      { name: 'Master', threshold_amount: 25000, commission_percentage: 75, level: 4, color: 'gold' }
    ]

    const { data: tiers } = await supabase
      .from('commission_tiers')
      .insert(
        tierLevels.map(tier => ({
          ...tier,
          id: `test_tier_${tier.level}_integration`,
          tier_structure_id: tierStructure.id,
          threshold_type: 'revenue'
        }))
      )
      .select()

    testTierStructure = { ...tierStructure, tiers }
  }

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    await supabase.from('commission_tier_history').delete().eq('barber_id', testBarber?.id)
    await supabase.from('barber_tier_assignments').delete().eq('barber_id', testBarber?.id)
    await supabase.from('commission_tiers').delete().like('id', 'test_tier_%_integration')
    await supabase.from('commission_tier_structures').delete().eq('id', 'test_tier_structure_integration')
    await supabase.from('commission_transactions').delete().eq('barber_id', testBarber?.id)
    await supabase.from('barber_commission_balances').delete().eq('barber_id', testBarber?.id)
    await supabase.from('financial_arrangements').delete().eq('id', 'test_arrangement_integration')
    await supabase.from('profiles').delete().eq('id', 'test_barber_integration')
    await supabase.from('barbershops').delete().eq('id', 'test_barbershop_integration')
  }

  async function processWebhookPayment(paymentData) {
    const webhookPayload = JSON.stringify({
      id: 'evt_test_webhook',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentData.id,
          amount: paymentData.amount,
          currency: 'usd',
          status: 'succeeded',
          metadata: {
            barber_id: paymentData.barber_id,
            barbershop_id: paymentData.barbershop_id,
            arrangement_id: paymentData.arrangement_id,
            booking_id: `booking_${paymentData.id}`,
            customer_name: 'Integration Test Customer'
          }
        }
      }
    })

    const signature = generateWebhookSignature(webhookPayload)

    return await fetch('/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': signature
      },
      body: webhookPayload
    })
  }

  function generateWebhookSignature(payload) {
    const timestamp = Math.floor(Date.now() / 1000)
    const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret'
    const signature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + '.' + payload)
      .digest('hex')

    return `t=${timestamp},v1=${signature}`
  }

  async function measureDbPerformance(table, data) {
    const startTime = performance.now()
    
    await supabase
      .from(table)
      .insert(data)

    return performance.now() - startTime
  }
})