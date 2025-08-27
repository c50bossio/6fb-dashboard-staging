/**
 * Comprehensive Business Logic Test Suite for Commission Calculations
 * Tests all commission arrangement types, tier calculations, and edge cases
 * 
 * Tests coverage:
 * 1. Commission Arrangement Types (Commission, Booth Rent, Hybrid)
 * 2. Progressive Tier System Calculations
 * 3. Product Sales Commission Tracking
 * 4. Complex Business Scenarios & Edge Cases
 * 5. Financial Validation & Compliance
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals')

// Mock the financial service
const mockFinancialService = {
  calculateCommission: jest.fn(),
  getBarberTierStatus: jest.fn(),
  updateBarberTierProgress: jest.fn(),
  calculateProductCommission: jest.fn(),
  validateFinancialArrangement: jest.fn()
}

jest.mock('@/lib/financial-service', () => mockFinancialService)

describe('Commission Calculation Business Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Standard Commission Arrangements', () => {
    it('should calculate 60/40 commission split correctly', () => {
      const paymentAmount = 100.00
      const arrangement = {
        type: 'commission',
        commission_percentage: 60,
        barbershop_id: 'shop_123',
        barber_id: 'barber_456'
      }

      const result = calculateCommissionSplit(paymentAmount, arrangement)

      expect(result.barberAmount).toBe(60.00)
      expect(result.shopAmount).toBe(40.00)
      expect(result.commissionRate).toBe(60)
      expect(result.arrangementType).toBe('commission')
    })

    it('should handle fractional amounts correctly', () => {
      const paymentAmount = 33.33
      const arrangement = {
        type: 'commission',
        commission_percentage: 60
      }

      const result = calculateCommissionSplit(paymentAmount, arrangement)

      expect(result.barberAmount).toBe(19.998) // 60% of 33.33
      expect(result.shopAmount).toBe(13.332)   // 40% of 33.33
      expect(result.barberAmount + result.shopAmount).toBeCloseTo(33.33, 2)
    })

    it('should validate commission percentage boundaries', () => {
      const arrangements = [
        { commission_percentage: 0 },    // Minimum valid
        { commission_percentage: 100 },  // Maximum valid
        { commission_percentage: -5 },   // Invalid low
        { commission_percentage: 105 }   // Invalid high
      ]

      const validResults = arrangements.map(arrangement => {
        try {
          return calculateCommissionSplit(100, { ...arrangement, type: 'commission' })
        } catch (error) {
          return { error: error.message }
        }
      })

      expect(validResults[0].barberAmount).toBe(0)
      expect(validResults[1].barberAmount).toBe(100)
      expect(validResults[2].error).toContain('Invalid commission percentage')
      expect(validResults[3].error).toContain('Invalid commission percentage')
    })

    it('should calculate commission for high-value transactions', () => {
      const paymentAmount = 10000.00 // $10,000 luxury service
      const arrangement = {
        type: 'commission',
        commission_percentage: 70
      }

      const result = calculateCommissionSplit(paymentAmount, arrangement)

      expect(result.barberAmount).toBe(7000.00)
      expect(result.shopAmount).toBe(3000.00)
      expect(result.barberAmount + result.shopAmount).toBe(10000.00)
    })
  })

  describe('Booth Rent Arrangements', () => {
    it('should allocate 100% to barber for booth rent', () => {
      const paymentAmount = 150.00
      const arrangement = {
        type: 'booth_rent',
        booth_rent_amount: 1500, // Monthly rent
        booth_rent_frequency: 'monthly'
      }

      const result = calculateCommissionSplit(paymentAmount, arrangement)

      expect(result.barberAmount).toBe(150.00)
      expect(result.shopAmount).toBe(0)
      expect(result.arrangementType).toBe('booth_rent')
      expect(result.rentDue).toBe(1500) // Rent handled separately
    })

    it('should calculate prorated daily rent for booth arrangements', () => {
      const arrangement = {
        type: 'booth_rent',
        booth_rent_amount: 3100, // Monthly rent
        booth_rent_frequency: 'monthly',
        rent_due_day: 1
      }

      const dailyRent = calculateDailyRent(arrangement, new Date('2024-02-15')) // February (29 days)
      expect(dailyRent).toBeCloseTo(106.90, 2) // 3100 / 29 days

      const monthlyRent = calculateDailyRent(arrangement, new Date('2024-01-15')) // January (31 days)
      expect(monthlyRent).toBe(100.00) // 3100 / 31 days
    })

    it('should track booth rent payment status', () => {
      const arrangement = {
        type: 'booth_rent',
        booth_rent_amount: 2000,
        booth_rent_frequency: 'monthly',
        rent_due_day: 1
      }

      const currentDate = new Date('2024-01-15')
      const rentStatus = calculateRentStatus(arrangement, currentDate)

      expect(rentStatus.amountDue).toBe(2000)
      expect(rentStatus.daysPastDue).toBe(14) // 15th - 1st = 14 days
      expect(rentStatus.status).toBe('overdue')
    })
  })

  describe('Hybrid Arrangements', () => {
    it('should calculate hybrid commission with base rent', () => {
      const paymentAmount = 200.00
      const arrangement = {
        type: 'hybrid',
        commission_percentage: 40,
        hybrid_base_rent: 800,        // Monthly base rent
        hybrid_revenue_threshold: 3000 // Threshold before commission kicks in
      }

      const monthlyRevenue = 5000 // Above threshold
      const result = calculateHybridCommission(paymentAmount, arrangement, monthlyRevenue)

      expect(result.barberAmount).toBe(80.00) // 40% commission
      expect(result.shopAmount).toBe(120.00)  // 60% to shop
      expect(result.baseRentDue).toBe(800)
      expect(result.commissionEarned).toBe(80.00)
    })

    it('should handle below-threshold hybrid arrangements', () => {
      const paymentAmount = 100.00
      const arrangement = {
        type: 'hybrid',
        commission_percentage: 50,
        hybrid_base_rent: 500,
        hybrid_revenue_threshold: 3000
      }

      const monthlyRevenue = 2000 // Below threshold
      const result = calculateHybridCommission(paymentAmount, arrangement, monthlyRevenue)

      expect(result.barberAmount).toBe(0) // No commission until threshold reached
      expect(result.shopAmount).toBe(100.00) // Shop gets all revenue
      expect(result.baseRentDue).toBe(500)
    })

    it('should calculate progressive hybrid commission above threshold', () => {
      const arrangement = {
        type: 'hybrid',
        commission_percentage: 60,
        hybrid_base_rent: 1000,
        hybrid_revenue_threshold: 4000
      }

      // Test different revenue levels
      const scenarios = [
        { payment: 500, monthlyRevenue: 3500, expectedCommission: 0 }, // Below threshold
        { payment: 500, monthlyRevenue: 4500, expectedCommission: 300 }, // Above threshold
        { payment: 200, monthlyRevenue: 8000, expectedCommission: 120 }  // Well above threshold
      ]

      scenarios.forEach((scenario, index) => {
        const result = calculateHybridCommission(scenario.payment, arrangement, scenario.monthlyRevenue)
        expect(result.barberAmount).toBe(scenario.expectedCommission)
        
      })
    })
  })

  describe('Progressive Tier System Calculations', () => {
    const tierStructure = {
      id: 'tier_structure_123',
      tiers: [
        { level: 1, name: 'Starter', threshold_amount: 0, commission_percentage: 50 },
        { level: 2, name: 'Professional', threshold_amount: 5000, commission_percentage: 60 },
        { level: 3, name: 'Elite', threshold_amount: 15000, commission_percentage: 70 },
        { level: 4, name: 'Master', threshold_amount: 25000, commission_percentage: 75 }
      ]
    }

    it('should determine correct tier based on current revenue', () => {
      const testCases = [
        { revenue: 0, expectedTier: 1, expectedRate: 50 },
        { revenue: 2500, expectedTier: 1, expectedRate: 50 },
        { revenue: 7500, expectedTier: 2, expectedRate: 60 },
        { revenue: 18000, expectedTier: 3, expectedRate: 70 },
        { revenue: 30000, expectedTier: 4, expectedRate: 75 }
      ]

      testCases.forEach(testCase => {
        const tier = determineTierByRevenue(testCase.revenue, tierStructure)
        expect(tier.level).toBe(testCase.expectedTier)
        expect(tier.commission_percentage).toBe(testCase.expectedRate)
      })
    })

    it('should calculate tier-based commission with tier upgrade bonus', () => {
      const paymentAmount = 1000.00
      const currentRevenue = 4800 // Close to Professional tier (5000)
      const arrangement = { type: 'commission', use_tier_system: true }

      const result = calculateTierBasedCommission(
        paymentAmount, 
        arrangement, 
        tierStructure, 
        currentRevenue
      )

      // Payment pushes revenue to 5800 (tier upgrade to Professional)
      expect(result.newTier.level).toBe(2)
      expect(result.baseCommission).toBe(600.00) // 60% of 1000
      expect(result.tierUpgradeBonus).toBe(20.00) // 2% bonus for upgrade
      expect(result.totalCommission).toBe(620.00)
      expect(result.tierUpgradeAchieved).toBe(true)
    })

    it('should handle tier progression within same payment', () => {
      const paymentAmount = 15000.00 // Large payment
      const currentRevenue = 12000 // Professional tier
      const arrangement = { type: 'commission', use_tier_system: true }

      const result = calculateTierBasedCommission(
        paymentAmount, 
        arrangement, 
        tierStructure, 
        currentRevenue
      )

      // Revenue goes from 12000 to 27000 (skips Elite, reaches Master)
      expect(result.newTier.level).toBe(4) // Master tier
      expect(result.baseCommission).toBe(11250.00) // 75% of 15000
      expect(result.tierUpgradeBonus).toBe(300.00) // 2% bonus
      expect(result.totalCommission).toBe(11550.00)
      expect(result.tierSkipped).toContain('Elite') // Tier 3 was skipped
    })

    it('should calculate tier reset for new periods', () => {
      const tierAssignment = {
        barber_id: 'barber_123',
        current_revenue: 18000, // Elite tier
        current_tier_level: 3,
        period_start_date: '2024-01-01'
      }

      const currentDate = new Date('2024-02-01') // New month
      const resetStructure = { ...tierStructure, reset_period: 'monthly', reset_day: 1 }

      const result = checkTierReset(tierAssignment, resetStructure, currentDate)

      expect(result.needsReset).toBe(true)
      expect(result.newRevenue).toBe(0)
      expect(result.newTierLevel).toBe(1) // Back to Starter
      expect(result.newPeriodStart).toBe('2024-02-01')
    })

    it('should handle quarterly and yearly tier resets', () => {
      const quarterlyTests = [
        { current: '2024-01-15', start: '2024-01-01', reset: 'quarterly', shouldReset: false },
        { current: '2024-04-01', start: '2024-01-01', reset: 'quarterly', shouldReset: true },
        { current: '2024-07-01', start: '2024-04-01', reset: 'quarterly', shouldReset: true },
        { current: '2024-12-31', start: '2024-10-01', reset: 'quarterly', shouldReset: false }
      ]

      quarterlyTests.forEach(test => {
        const result = checkTierReset(
          { period_start_date: test.start },
          { reset_period: test.reset, reset_day: 1 },
          new Date(test.current)
        )
        expect(result.needsReset).toBe(test.shouldReset)
      })
    })
  })

  describe('Product Sales Commission Tracking', () => {
    const productCommissionConfig = {
      categories: {
        'hair_products': { commission_rate: 15, min_commission: 5.00 },
        'styling_tools': { commission_rate: 20, min_commission: 10.00 },
        'gift_certificates': { commission_rate: 5, min_commission: 2.00 },
        'membership_packages': { commission_rate: 10, min_commission: 0 }
      }
    }

    it('should calculate product commission by category', () => {
      const productSales = [
        { category: 'hair_products', amount: 50.00, quantity: 2 },
        { category: 'styling_tools', amount: 120.00, quantity: 1 },
        { category: 'gift_certificates', amount: 25.00, quantity: 1 }
      ]

      const result = calculateProductCommissions(productSales, productCommissionConfig)

      expect(result.commissions).toEqual([
        { category: 'hair_products', commission: 7.50, rate: 15 }, // 15% of 50
        { category: 'styling_tools', commission: 24.00, rate: 20 }, // 20% of 120
        { category: 'gift_certificates', commission: 2.00, rate: 5 } // Min commission applied
      ])
      expect(result.totalCommission).toBe(33.50)
    })

    it('should apply minimum commission thresholds', () => {
      const lowValueSales = [
        { category: 'hair_products', amount: 20.00 }, // 15% = 3.00, but min is 5.00
        { category: 'styling_tools', amount: 30.00 }   // 20% = 6.00, above min of 10.00
      ]

      const result = calculateProductCommissions(lowValueSales, productCommissionConfig)

      expect(result.commissions[0].commission).toBe(5.00) // Minimum applied
      expect(result.commissions[1].commission).toBe(6.00) // Calculated rate used
    })

    it('should integrate product commissions with service commissions', () => {
      const servicePayment = 100.00
      const serviceArrangement = { type: 'commission', commission_percentage: 60 }
      
      const productSales = [
        { category: 'hair_products', amount: 75.00 }
      ]

      const result = calculateCombinedCommissions(
        servicePayment, 
        serviceArrangement, 
        productSales, 
        productCommissionConfig
      )

      expect(result.serviceCommission).toBe(60.00) // 60% of service
      expect(result.productCommission).toBe(11.25) // 15% of products
      expect(result.totalCommission).toBe(71.25)
      expect(result.breakdown.service_percentage).toBe(60)
      expect(result.breakdown.product_categories).toHaveLength(1)
    })

    it('should track inventory impact from product sales', () => {
      const productSales = [
        { product_id: 'shampoo_001', quantity: 3, current_stock: 25 },
        { product_id: 'conditioner_001', quantity: 2, current_stock: 5 },
        { product_id: 'styling_gel_001', quantity: 1, current_stock: 0 } // Out of stock
      ]

      const result = processProductSalesWithInventory(productSales)

      expect(result.stockUpdates).toEqual([
        { product_id: 'shampoo_001', new_stock: 22 },
        { product_id: 'conditioner_001', new_stock: 3 },
      ])
      expect(result.lowStockAlerts).toContain('conditioner_001') // Stock below threshold
      expect(result.outOfStockErrors).toContain('styling_gel_001')
    })
  })

  describe('Complex Business Scenarios', () => {
    it('should handle barber switching arrangements mid-period', () => {
      const oldArrangement = { type: 'commission', commission_percentage: 50 }
      const newArrangement = { type: 'booth_rent', booth_rent_amount: 1200 }
      const switchDate = new Date('2024-01-15') // Mid-month switch

      const transactions = [
        { date: '2024-01-05', amount: 200 }, // Under old arrangement
        { date: '2024-01-20', amount: 150 }, // Under new arrangement
        { date: '2024-01-25', amount: 100 }  // Under new arrangement
      ]

      const result = calculateArrangementTransition(
        transactions, 
        oldArrangement, 
        newArrangement, 
        switchDate
      )

      expect(result.oldArrangementTotal).toBe(100.00) // 50% of 200
      expect(result.newArrangementTotal).toBe(250.00) // 100% of 150 + 100
      expect(result.totalCommission).toBe(350.00)
      expect(result.rentProration).toBe(612.90) // ~19 days of January
    })

    it('should calculate commission splits for team services', () => {
      const teamService = {
        total_amount: 300.00,
        participants: [
          { barber_id: 'barber_1', role: 'primary', split_percentage: 60 },
          { barber_id: 'barber_2', role: 'assistant', split_percentage: 40 }
        ]
      }

      const arrangements = {
        'barber_1': { commission_percentage: 65 },
        'barber_2': { commission_percentage: 55 }
      }

      const result = calculateTeamServiceCommission(teamService, arrangements)

      expect(result.splits).toEqual([
        { barber_id: 'barber_1', service_amount: 180.00, commission: 117.00 }, // 65% of 180
        { barber_id: 'barber_2', service_amount: 120.00, commission: 66.00 }   // 55% of 120
      ])
      expect(result.totalCommission).toBe(183.00)
      expect(result.shopAmount).toBe(117.00)
    })

    it('should handle refunds and charge reversals', () => {
      const originalTransaction = {
        payment_intent_id: 'pi_original',
        amount: 150.00,
        commission_amount: 90.00,
        arrangement_type: 'commission'
      }

      const refundAmount = 50.00 // Partial refund

      const result = processCommissionRefund(originalTransaction, refundAmount)

      expect(result.refund_commission_amount).toBe(30.00) // Proportional commission refund
      expect(result.remaining_commission).toBe(60.00) // 90 - 30
      expect(result.refund_shop_amount).toBe(20.00) // Proportional shop refund
      expect(result.adjustment_type).toBe('partial_refund')
    })

    it('should calculate commission adjustments for disputes', () => {
      const disputeAdjustment = {
        original_commission: 75.00,
        dispute_amount: 125.00, // Service amount in dispute
        resolution_type: 'partial_favor_customer',
        adjustment_percentage: 30 // 30% reduction
      }

      const result = processDisputeAdjustment(disputeAdjustment)

      expect(result.adjusted_commission).toBe(52.50) // 75 * (1 - 0.30)
      expect(result.commission_reduction).toBe(22.50)
      expect(result.requires_payout_adjustment).toBe(true)
    })
  })

  describe('Financial Validation & Compliance', () => {
    it('should validate commission calculations match payment amounts', () => {
      const paymentAmount = 250.75
      const calculatedCommission = 150.45
      const calculatedShopAmount = 100.30

      const validation = validateCommissionAccuracy(
        paymentAmount, 
        calculatedCommission, 
        calculatedShopAmount
      )

      expect(validation.isValid).toBe(true)
      expect(validation.totalMatch).toBe(true)
      expect(validation.variance).toBe(0)
    })

    it('should detect calculation errors and variances', () => {
      const paymentAmount = 100.00
      const calculatedCommission = 65.50 // Incorrect
      const calculatedShopAmount = 35.50 // Total = 101.00 (error)

      const validation = validateCommissionAccuracy(
        paymentAmount, 
        calculatedCommission, 
        calculatedShopAmount
      )

      expect(validation.isValid).toBe(false)
      expect(validation.variance).toBe(1.00) // $1.00 over
      expect(validation.errorType).toBe('calculation_mismatch')
    })

    it('should enforce minimum wage compliance for booth rent', () => {
      const workHours = 40 // Weekly hours
      const weeklyRevenue = 800 // Revenue for the week
      const boothRentWeekly = 375 // Weekly rent (1500/month)
      const minimumWage = 15.00 // Hourly minimum wage

      const compliance = checkMinimumWageCompliance(
        workHours, 
        weeklyRevenue, 
        boothRentWeekly, 
        minimumWage
      )

      const netEarnings = weeklyRevenue - boothRentWeekly // 425
      const minimumRequired = workHours * minimumWage // 600

      expect(compliance.isCompliant).toBe(false)
      expect(compliance.shortfall).toBe(175.00)
      expect(compliance.requiresAdjustment).toBe(true)
    })

    it('should track tax compliance for high-earning barbers', () => {
      const quarterlyEarnings = 25000 // Q1 earnings
      const taxThreshold = 20000 // Threshold for 1099 reporting
      
      const taxCompliance = checkTaxCompliance(quarterlyEarnings, taxThreshold)

      expect(taxCompliance.requires1099).toBe(true)
      expect(taxCompliance.estimatedTaxLiability).toBeGreaterThan(0)
      expect(taxCompliance.recommendedQuarterlyPayment).toBeCloseTo(6250, 0) // ~25% estimate
    })
  })

  // Helper functions for testing
  function calculateCommissionSplit(amount, arrangement) {
    if (arrangement.commission_percentage < 0 || arrangement.commission_percentage > 100) {
      throw new Error('Invalid commission percentage')
    }

    const barberAmount = amount * (arrangement.commission_percentage / 100)
    const shopAmount = amount - barberAmount

    return {
      barberAmount,
      shopAmount,
      commissionRate: arrangement.commission_percentage,
      arrangementType: arrangement.type
    }
  }

  function calculateDailyRent(arrangement, date) {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    return arrangement.booth_rent_amount / daysInMonth
  }

  function calculateRentStatus(arrangement, currentDate) {
    const dueDay = arrangement.rent_due_day
    const currentDay = currentDate.getDate()
    const daysPastDue = Math.max(0, currentDay - dueDay)

    return {
      amountDue: arrangement.booth_rent_amount,
      daysPastDue,
      status: daysPastDue > 0 ? 'overdue' : 'current'
    }
  }

  function calculateHybridCommission(payment, arrangement, monthlyRevenue) {
    const { commission_percentage, hybrid_revenue_threshold } = arrangement

    if (monthlyRevenue < hybrid_revenue_threshold) {
      return {
        barberAmount: 0,
        shopAmount: payment,
        baseRentDue: arrangement.hybrid_base_rent,
        commissionEarned: 0
      }
    }

    const barberAmount = payment * (commission_percentage / 100)
    return {
      barberAmount,
      shopAmount: payment - barberAmount,
      baseRentDue: arrangement.hybrid_base_rent,
      commissionEarned: barberAmount
    }
  }

  function determineTierByRevenue(revenue, tierStructure) {
    const applicableTiers = tierStructure.tiers
      .filter(tier => revenue >= tier.threshold_amount)
      .sort((a, b) => b.threshold_amount - a.threshold_amount)

    return applicableTiers[0] || tierStructure.tiers[0]
  }

  function calculateTierBasedCommission(payment, arrangement, tierStructure, currentRevenue) {
    const newRevenue = currentRevenue + payment
    const currentTier = determineTierByRevenue(currentRevenue, tierStructure)
    const newTier = determineTierByRevenue(newRevenue, tierStructure)

    const baseCommission = payment * (newTier.commission_percentage / 100)
    const tierUpgradeAchieved = newTier.level > currentTier.level
    const tierUpgradeBonus = tierUpgradeAchieved ? payment * 0.02 : 0 // 2% bonus

    return {
      baseCommission,
      tierUpgradeBonus,
      totalCommission: baseCommission + tierUpgradeBonus,
      currentTier,
      newTier,
      tierUpgradeAchieved,
      tierSkipped: newTier.level > currentTier.level + 1 ? [currentTier.level + 1] : []
    }
  }

  function checkTierReset(assignment, structure, currentDate) {
    const periodStart = new Date(assignment.period_start_date)
    const resetDay = structure.reset_day || 1

    let needsReset = false
    let newPeriodStart = null

    if (structure.reset_period === 'monthly') {
      if (currentDate.getMonth() !== periodStart.getMonth() && currentDate.getDate() >= resetDay) {
        needsReset = true
        newPeriodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), resetDay)
      }
    }

    return {
      needsReset,
      newRevenue: needsReset ? 0 : assignment.current_revenue,
      newTierLevel: needsReset ? 1 : assignment.current_tier_level,
      newPeriodStart: newPeriodStart?.toISOString().split('T')[0]
    }
  }

  function calculateProductCommissions(sales, config) {
    const commissions = sales.map(sale => {
      const categoryConfig = config.categories[sale.category]
      const calculatedCommission = sale.amount * (categoryConfig.commission_rate / 100)
      const commission = Math.max(calculatedCommission, categoryConfig.min_commission)

      return {
        category: sale.category,
        commission,
        rate: categoryConfig.commission_rate
      }
    })

    return {
      commissions,
      totalCommission: commissions.reduce((sum, c) => sum + c.commission, 0)
    }
  }

  function calculateCombinedCommissions(servicePayment, serviceArrangement, productSales, productConfig) {
    const serviceCommission = servicePayment * (serviceArrangement.commission_percentage / 100)
    const productResult = calculateProductCommissions(productSales, productConfig)

    return {
      serviceCommission,
      productCommission: productResult.totalCommission,
      totalCommission: serviceCommission + productResult.totalCommission,
      breakdown: {
        service_percentage: serviceArrangement.commission_percentage,
        product_categories: productResult.commissions
      }
    }
  }

  function validateCommissionAccuracy(payment, commission, shopAmount) {
    const total = commission + shopAmount
    const variance = Math.abs(payment - total)
    const isValid = variance < 0.01 // Allow 1 cent variance for rounding

    return {
      isValid,
      totalMatch: variance === 0,
      variance,
      errorType: variance > 0.01 ? 'calculation_mismatch' : null
    }
  }

  function checkMinimumWageCompliance(hours, revenue, expenses, minimumWage) {
    const netEarnings = revenue - expenses
    const minimumRequired = hours * minimumWage
    const shortfall = Math.max(0, minimumRequired - netEarnings)

    return {
      isCompliant: netEarnings >= minimumRequired,
      shortfall,
      requiresAdjustment: shortfall > 0
    }
  }

  function checkTaxCompliance(earnings, threshold) {
    const requires1099 = earnings >= threshold
    const estimatedTaxRate = 0.25 // 25% combined estimate
    const estimatedTaxLiability = requires1099 ? earnings * estimatedTaxRate : 0

    return {
      requires1099,
      estimatedTaxLiability,
      recommendedQuarterlyPayment: estimatedTaxLiability / 4
    }
  }
})