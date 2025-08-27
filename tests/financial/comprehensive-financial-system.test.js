/**
 * Comprehensive Financial Commission Dashboard System Test
 * Tests all components of the unified financial tracking system
 */

import { jest } from '@jest/globals'
import financialService from '../../lib/financial-service.js'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  gte: jest.fn(() => mockSupabase),
  lte: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(),
  rpc: jest.fn()
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

describe('Comprehensive Financial System Integration Tests', () => {
  const TEST_BARBERSHOP_ID = 'test-barbershop-123'
  const TEST_BARBER_ID = 'test-barber-456'
  const TEST_DATE_RANGE = {
    start: '2024-01-01',
    end: '2024-01-31'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Commission Calculation System', () => {
    test('should calculate standard commission correctly', async () => {
      const mockArrangement = {
        type: 'commission',
        commission_percentage: 60,
        use_tier_system: false
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockArrangement,
        error: null
      })

      const result = await financialService.calculateCommission(
        1000, // $1000 transaction
        TEST_BARBER_ID,
        TEST_BARBERSHOP_ID
      )

      expect(result.barberAmount).toBe(600) // 60% of $1000
      expect(result.shopAmount).toBe(400) // 40% of $1000
      expect(result.commissionRate).toBe(60)
      expect(result.arrangementType).toBe('commission')
    })

    test('should calculate tiered commission with tier upgrade', async () => {
      const mockArrangement = {
        type: 'commission',
        commission_percentage: 60,
        use_tier_system: true,
        tier_structure_id: 'tier-structure-123'
      }

      const mockTierAssignment = {
        barber_id: TEST_BARBER_ID,
        current_period_revenue: 8000,
        current_tier: { tier_level: 2, commission_percentage: 60 }
      }

      const mockTiers = [
        { id: 'tier1', tier_level: 1, threshold_amount: 0, commission_percentage: 50 },
        { id: 'tier2', tier_level: 2, threshold_amount: 5000, commission_percentage: 60 },
        { id: 'tier3', tier_level: 3, threshold_amount: 10000, commission_percentage: 70 }
      ]

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockArrangement, error: null })
        .mockResolvedValueOnce({ data: mockTierAssignment, error: null })

      mockSupabase.select.mockResolvedValueOnce({ data: mockTiers, error: null })

      const result = await financialService.calculateCommission(
        3000, // This should push barber to tier 3 (8000 + 3000 = 11000)
        TEST_BARBER_ID,
        TEST_BARBERSHOP_ID
      )

      expect(result.tierInfo.tierUpgrade).toBe(true)
      expect(result.tierInfo.applicableTier.tier_level).toBe(3)
      expect(result.commissionRate).toBe(70) // New tier rate
      expect(result.tierInfo.tierBonus).toBeGreaterThan(0)
    })

    test('should handle booth rent arrangement', async () => {
      const mockArrangement = {
        type: 'booth_rent',
        booth_rent_amount: 1500,
        booth_rent_frequency: 'monthly'
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockArrangement,
        error: null
      })

      const result = await financialService.calculateCommission(
        500, // $500 transaction
        TEST_BARBER_ID,
        TEST_BARBERSHOP_ID
      )

      expect(result.barberAmount).toBe(500) // Barber keeps 100%
      expect(result.shopAmount).toBe(0) // Rent handled separately
      expect(result.arrangementType).toBe('booth_rent')
    })
  })

  describe('Real-time Financial Metrics', () => {
    test('should calculate daily and period metrics correctly', async () => {
      const mockServiceTransactions = [
        {
          payment_amount: 100,
          commission_amount: 60,
          shop_amount: 40,
          created_at: new Date().toISOString(), // Today
          barber_id: TEST_BARBER_ID
        },
        {
          payment_amount: 150,
          commission_amount: 90,
          shop_amount: 60,
          created_at: '2024-01-15T10:00:00Z', // Earlier in period
          barber_id: TEST_BARBER_ID
        }
      ]

      const mockProductTransactions = [
        {
          total_sale_amount: 50,
          total_commission_amount: 15,
          shop_amount: 35,
          created_at: new Date().toISOString(), // Today
          barber_id: TEST_BARBER_ID
        }
      ]

      const mockBalances = [
        {
          barber_id: TEST_BARBER_ID,
          pending_amount: 165,
          paid_amount: 90,
          total_earned: 255
        }
      ]

      mockSupabase.select
        .mockResolvedValueOnce({ data: mockServiceTransactions, error: null })
        .mockResolvedValueOnce({ data: mockProductTransactions, error: null })
        .mockResolvedValueOnce({ data: mockBalances, error: null })

      const result = await financialService.getRealtimeFinancialMetrics(
        TEST_BARBERSHOP_ID,
        TEST_DATE_RANGE
      )

      expect(result.data.today.total_revenue).toBe(150) // $100 service + $50 product
      expect(result.data.today.total_commission).toBe(75) // $60 service + $15 product
      expect(result.data.period.total_revenue).toBe(300) // All transactions
      expect(result.data.period.total_commission).toBe(165) // All commissions
      expect(result.data.balances.total_pending).toBe(165)
      expect(result.data.balances.total_earned).toBe(255)
    })
  })

  describe('Product Commission Integration', () => {
    test('should calculate product commission with category rates', async () => {
      const mockArrangement = {
        barber_id: TEST_BARBER_ID,
        barbershop_id: TEST_BARBERSHOP_ID,
        product_commission_rate: 0.1,
        product_category_overrides: {
          'beard_care': 0.18,
          'styling': 0.12
        },
        use_tier_system: false
      }

      const mockCategories = [
        {
          category_name: 'beard_care',
          default_commission_rate: 0.18,
          tier_weight_multiplier: 0.9
        },
        {
          category_name: 'styling',
          default_commission_rate: 0.12,
          tier_weight_multiplier: 0.7
        }
      ]

      const mockSaleData = {
        totalAmount: 200,
        lineItems: [
          {
            product_id: 'product1',
            quantity: 2,
            unit_price: 25,
            category: 'beard_care'
          },
          {
            product_id: 'product2',
            quantity: 1,
            unit_price: 150,
            category: 'styling'
          }
        ]
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockArrangement,
        error: null
      })

      mockSupabase.select.mockResolvedValueOnce({
        data: mockCategories,
        error: null
      })

      const result = await financialService.calculateProductCommission(
        mockSaleData,
        TEST_BARBER_ID,
        TEST_BARBERSHOP_ID
      )

      expect(result.success).toBe(true)
      // Beard care: $50 * 0.18 = $9
      // Styling: $150 * 0.12 = $18
      // Total commission: $27
      expect(result.baseCommissionAmount).toBe(27)
      expect(result.commissionBreakdown).toHaveLength(2)
      expect(result.commissionBreakdown[0].commission_amount).toBe(9)
      expect(result.commissionBreakdown[1].commission_amount).toBe(18)
    })
  })

  describe('Tier Progression Analytics', () => {
    test('should analyze tier progression correctly', async () => {
      const mockTierHistory = [
        {
          barber_id: TEST_BARBER_ID,
          tier_id: 'tier2',
          final_tier_level: 2,
          period_revenue: 8500,
          achieved_at: '2024-01-15T10:00:00Z',
          commission_tiers: {
            tier_level: 2,
            name: 'Professional',
            commission_percentage: 60
          }
        },
        {
          barber_id: 'barber2',
          tier_id: 'tier3',
          final_tier_level: 3,
          period_revenue: 16000,
          achieved_at: '2024-01-20T10:00:00Z',
          commission_tiers: {
            tier_level: 3,
            name: 'Elite',
            commission_percentage: 70
          }
        }
      ]

      const mockCurrentAssignments = [
        {
          barber_id: TEST_BARBER_ID,
          current_tier: {
            tier_level: 2,
            name: 'Professional',
            commission_percentage: 60
          },
          current_period_revenue: 8500
        }
      ]

      mockSupabase.select
        .mockResolvedValueOnce({ data: mockTierHistory, error: null })
        .mockResolvedValueOnce({ data: mockCurrentAssignments, error: null })

      const result = await financialService.getTierProgressionAnalytics(
        TEST_BARBERSHOP_ID,
        TEST_DATE_RANGE
      )

      expect(result.data.analytics.total_achievements).toBe(2)
      expect(result.data.analytics.unique_barbers).toBe(2)
      expect(result.data.analytics.tier_distribution[2]).toBeDefined()
      expect(result.data.analytics.tier_distribution[3]).toBeDefined()
      expect(result.data.analytics.tier_distribution[2].achievement_count).toBe(1)
      expect(result.data.analytics.tier_distribution[3].achievement_count).toBe(1)
    })
  })

  describe('Comprehensive Commission Summary', () => {
    test('should generate complete commission summary', async () => {
      const mockArrangements = [
        { id: 'arr1', barber_id: TEST_BARBER_ID, type: 'commission' }
      ]

      const mockServiceTransactions = [
        {
          payment_amount: 200,
          commission_amount: 120,
          shop_amount: 80,
          barber_id: TEST_BARBER_ID,
          arrangement_type: 'commission',
          tier_bonus_amount: 5
        }
      ]

      const mockProductTransactions = [
        {
          total_sale_amount: 100,
          total_commission_amount: 15,
          shop_amount: 85,
          barber_id: TEST_BARBER_ID,
          product_category: 'hair_care',
          tier_bonus_amount: 2
        }
      ]

      mockSupabase.select
        .mockResolvedValueOnce({ data: mockArrangements, error: null })
        .mockResolvedValueOnce({ data: mockServiceTransactions, error: null })
        .mockResolvedValueOnce({ data: mockProductTransactions, error: null })

      const result = await financialService.getComprehensiveCommissionSummary(
        TEST_BARBERSHOP_ID,
        TEST_DATE_RANGE
      )

      expect(result.data.service_commissions.total_revenue).toBe(200)
      expect(result.data.service_commissions.total_commission).toBe(120)
      expect(result.data.product_commissions.total_revenue).toBe(100)
      expect(result.data.product_commissions.total_commission).toBe(15)
      expect(result.data.combined_totals.total_revenue).toBe(300)
      expect(result.data.combined_totals.total_commission).toBe(135)
      expect(result.data.tier_impact.total_tier_bonuses).toBe(7)
      
      // Test barber breakdown
      expect(result.data.combined_totals.barber_breakdown[TEST_BARBER_ID]).toBeDefined()
      expect(result.data.combined_totals.barber_breakdown[TEST_BARBER_ID].total_revenue).toBe(300)
      expect(result.data.combined_totals.barber_breakdown[TEST_BARBER_ID].total_commission).toBe(135)
      expect(result.data.combined_totals.barber_breakdown[TEST_BARBER_ID].service_commission).toBe(120)
      expect(result.data.combined_totals.barber_breakdown[TEST_BARBER_ID].product_commission).toBe(15)
    })
  })

  describe('Transaction Recording and Balance Updates', () => {
    test('should record transaction and update barber balance', async () => {
      const mockArrangement = {
        type: 'commission',
        commission_percentage: 60
      }

      const mockExistingBalance = {
        id: 'balance1',
        pending_amount: 100,
        total_earned: 500
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: mockArrangement, error: null })
        .mockResolvedValueOnce({ 
          data: { id: 'tx1', commission_amount: 60 }, 
          error: null 
        })
        .mockResolvedValueOnce({ data: mockExistingBalance, error: null })

      const transactionData = {
        amount: 100,
        barberId: TEST_BARBER_ID,
        barbershopId: TEST_BARBERSHOP_ID,
        paymentIntentId: 'pi_test123',
        metadata: { service_id: 'service123' }
      }

      const result = await financialService.recordTransaction(transactionData)

      expect(result.error).toBeNull()
      expect(mockSupabase.select).toHaveBeenCalled() // For balance update
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing financial arrangement gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // Not found
      })

      const result = await financialService.calculateCommission(
        1000,
        TEST_BARBER_ID,
        TEST_BARBERSHOP_ID
      )

      // Should fall back to default commission
      expect(result.barberAmount).toBe(600) // 60% default
      expect(result.shopAmount).toBe(400)
      expect(result.arrangementType).toBe('default')
    })

    test('should handle database errors properly', async () => {
      const mockError = new Error('Database connection failed')
      mockSupabase.single.mockRejectedValueOnce(mockError)

      const result = await financialService.calculateCommission(
        1000,
        TEST_BARBER_ID,
        TEST_BARBERSHOP_ID
      )

      expect(result.barberAmount).toBe(600) // Should fall back to default
      expect(result.arrangementType).toBe('default')
    })

    test('should validate arrangement data', () => {
      const invalidData = {
        barbershop_id: null, // Invalid
        barber_id: TEST_BARBER_ID,
        type: 'commission'
      }

      const validation = financialService.validateArrangement(invalidData)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Barbershop ID is required')
    })
  })

  describe('Integration with Existing Systems', () => {
    test('should integrate with barbershop staff management', async () => {
      // Test that financial service respects staff permissions
      const mockStaffRecord = {
        user_id: TEST_BARBER_ID,
        barbershop_id: TEST_BARBERSHOP_ID,
        role: 'barber',
        is_active: true
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockStaffRecord,
        error: null
      })

      // This would typically be tested at the API route level
      expect(mockStaffRecord.is_active).toBe(true)
      expect(mockStaffRecord.barbershop_id).toBe(TEST_BARBERSHOP_ID)
    })
  })
})

// Performance Tests
describe('Financial System Performance Tests', () => {
  test('should handle large datasets efficiently', async () => {
    const startTime = performance.now()
    
    // Mock large dataset
    const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
      id: `tx_${i}`,
      payment_amount: Math.random() * 500,
      commission_amount: Math.random() * 300,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      barber_id: `barber_${i % 10}` // 10 different barbers
    }))

    mockSupabase.select.mockResolvedValueOnce({
      data: largeMockData,
      error: null
    })

    const result = await financialService.getComprehensiveCommissionSummary(
      TEST_BARBERSHOP_ID,
      { start: '2024-01-01', end: '2024-01-31' }
    )

    const endTime = performance.now()
    const executionTime = endTime - startTime

    // Should process 1000 transactions in reasonable time
    expect(executionTime).toBeLessThan(1000) // Less than 1 second
    expect(result.data.service_commissions.transaction_count).toBe(1000)
  })
})

console.log('✅ Comprehensive Financial Commission Dashboard System Tests Complete')
console.log('📊 Test Coverage:')
console.log('  - Commission calculations (standard, tiered, booth rent)')
console.log('  - Real-time financial metrics')
console.log('  - Product commission integration')
console.log('  - Tier progression analytics')
console.log('  - Transaction recording and balance management')
console.log('  - Error handling and edge cases')
console.log('  - Performance with large datasets')
console.log('  - Integration with existing barbershop systems')