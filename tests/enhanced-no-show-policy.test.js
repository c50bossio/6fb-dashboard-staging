/**
 * Enhanced No-Show Policy System Tests
 * 
 * Comprehensive test suite for the enhanced no-show policy implementation
 * including backward compatibility, integration tests, and component functionality.
 */

import { EnhancedNoShowPolicy } from '../lib/booking-rules-engine/EnhancedNoShowPolicy'
import { TemplatePresets } from '../lib/booking-rules-engine/TemplatePresets'
import { generateMockClientHistory } from '../components/booking/ClientHistoryTracker'

describe('Enhanced No-Show Policy System', () => {
  
  describe('EnhancedNoShowPolicy Core Logic', () => {
    let policy
    const basicRules = {
      noShowFee: 25,
      noShowFeeType: 'fixed',
      noShowStrikeLimit: 3,
      blockAfterNoShows: true,
      enableGracePeriod: true,
      enableLoyaltyDiscount: true,
      enableServiceAdjustments: true
    }

    beforeEach(() => {
      policy = new EnhancedNoShowPolicy(basicRules)
    })

    test('should apply grace period for first-time clients', () => {
      const appointment = { servicePrice: 50, serviceDuration: 60 }
      const firstTimeClient = { noShowStrikes: 0, totalBookings: 1, loyaltyMonths: 0 }
      
      const result = policy.calculateNoShowPenalty(appointment, firstTimeClient)
      
      expect(result.gracePeriodApplied).toBe(true)
      expect(result.shouldChargeFee).toBe(false)
      expect(result.penaltyLevel).toBe('warning')
      expect(result.recommendedAction).toBe('warning')
      expect(result.reasoning).toContain('First-time client grace period applied')
    })

    test('should calculate tiered penalties correctly', () => {
      const appointment = { servicePrice: 50, serviceDuration: 60 }
      
      // First offense (50% of base fee)
      const firstOffense = { noShowStrikes: 0, totalBookings: 5, loyaltyMonths: 2 }
      const result1 = policy.calculateNoShowPenalty(appointment, firstOffense)
      expect(result1.feeAmount).toBe(13) // 50% of $25 rounded
      expect(result1.penaltyLevel).toBe('low')

      // Second offense (75% of base fee) 
      const secondOffense = { noShowStrikes: 1, totalBookings: 8, loyaltyMonths: 4 }
      const result2 = policy.calculateNoShowPenalty(appointment, secondOffense)
      expect(result2.feeAmount).toBe(19) // 75% of $25 rounded
      expect(result2.penaltyLevel).toBe('medium')

      // Third offense (125% of base fee)
      const thirdOffense = { noShowStrikes: 2, totalBookings: 10, loyaltyMonths: 6 }
      const result3 = policy.calculateNoShowPenalty(appointment, thirdOffense)
      expect(result3.feeAmount).toBe(31) // 125% of $25 rounded
      expect(result3.penaltyLevel).toBe('high')
    })

    test('should apply loyalty discounts correctly', () => {
      const appointment = { servicePrice: 50, serviceDuration: 60 }
      const loyalClient = { 
        noShowStrikes: 1, 
        totalBookings: 25, 
        loyaltyMonths: 12 // 12+ months and 25+ bookings = loyal
      }
      
      const result = policy.calculateNoShowPenalty(appointment, loyalClient)
      
      expect(result.loyaltyDiscountApplied).toBe(true)
      expect(result.reasoning).toContain('Loyal client discount applied')
      // Base would be $19 (75% of $25), with 25% loyalty discount = ~$14
      expect(result.feeAmount).toBeLessThan(19)
    })

    test('should calculate service-based adjustments', () => {
      const policy = new EnhancedNoShowPolicy(basicRules)
      
      // Long service (2+ hours) should increase penalty
      const longService = { servicePrice: 50, serviceDuration: 150 } // 2.5 hours
      const multiplier1 = policy.calculateServiceMultiplier(longService)
      expect(multiplier1).toBeGreaterThan(1.0)

      // Premium service ($100+) should increase penalty  
      const premiumService = { servicePrice: 120, serviceDuration: 60 }
      const multiplier2 = policy.calculateServiceMultiplier(premiumService)
      expect(multiplier2).toBeGreaterThan(1.0)

      // Quick service (≤30 min) should decrease penalty
      const quickService = { servicePrice: 20, serviceDuration: 30 }
      const multiplier3 = policy.calculateServiceMultiplier(quickService)
      expect(multiplier3).toBeLessThan(1.0)
    })

    test('should handle client blocking correctly', () => {
      const policy = new EnhancedNoShowPolicy(basicRules)
      const blockedClient = { noShowStrikes: 4, totalBookings: 6, loyaltyMonths: 1 }
      
      const blockResult = policy.shouldBlockClient(blockedClient)
      
      expect(blockResult.shouldBlock).toBe(true)
      expect(blockResult.reason).toContain('Exceeded no-show limit')
      expect(blockResult.canRecover).toBe(true)
      expect(blockResult.recoveryOptions).toContain('pay_outstanding_fees')
    })

    test('should generate client-friendly explanations', () => {
      const appointment = { date: '2024-02-01', servicePrice: 50 }
      const client = { noShowStrikes: 1, totalBookings: 15, loyaltyMonths: 8 }
      
      const penalty = policy.calculateNoShowPenalty(appointment, client)
      const explanation = policy.generatePenaltyExplanation(penalty, appointment)
      
      expect(explanation.title).toContain('No-Show Fee Applied')
      expect(explanation.message).toBeDefined()
      expect(explanation.nextSteps).toBeInstanceOf(Array)
      expect(explanation.nextSteps.length).toBeGreaterThan(0)
    })

    test('should provide recovery options for blocked clients', () => {
      const blockedClient = { noShowStrikes: 4, totalBookings: 25, loyaltyMonths: 12 }
      const options = policy.getRecoveryOptions(blockedClient)
      
      expect(options).toBeInstanceOf(Array)
      expect(options.length).toBeGreaterThan(0)
      
      const payOption = options.find(opt => opt.id === 'pay_outstanding_fees')
      expect(payOption).toBeDefined()
      expect(payOption.title).toBe('Pay Outstanding Fees')
      expect(payOption.difficulty).toBe('easy')
    })
  })

  describe('Backward Compatibility', () => {
    test('should work with legacy no-show rules', () => {
      const legacyRules = {
        noShowFee: 30,
        noShowFeeType: 'fixed',
        noShowStrikeLimit: 2,
        blockAfterNoShows: false
        // No enhanced features enabled
      }
      
      const policy = new EnhancedNoShowPolicy(legacyRules)
      const appointment = { servicePrice: 45, serviceDuration: 60 }
      const client = { noShowStrikes: 1, totalBookings: 5, loyaltyMonths: 2 }
      
      const result = policy.calculateNoShowPenalty(appointment, client)
      
      // Should still work but without enhanced features
      expect(result.shouldChargeFee).toBe(true)
      expect(result.gracePeriodApplied).toBe(false)
      expect(result.loyaltyDiscountApplied).toBe(false)
    })

    test('should handle percentage-based fees correctly', () => {
      const percentageRules = {
        noShowFee: 20, // 20%
        noShowFeeType: 'percentage',
        enableGracePeriod: true
      }
      
      const policy = new EnhancedNoShowPolicy(percentageRules)
      const appointment = { servicePrice: 100, serviceDuration: 60 }
      const client = { noShowStrikes: 0, totalBookings: 5, loyaltyMonths: 3 }
      
      const result = policy.calculateNoShowPenalty(appointment, client)
      
      // 20% of $100 = $20, with first offense reduction (50%) = $10
      expect(result.feeAmount).toBe(10)
    })

    test('should validate policy configuration', () => {
      const invalidRules = {
        noShowFee: 150, // Over 100%
        noShowFeeType: 'percentage',
        noShowStrikeLimit: 1,
        blockAfterNoShows: true
      }
      
      const policy = new EnhancedNoShowPolicy(invalidRules)
      const warnings = policy.validatePolicyConfiguration()
      
      expect(warnings).toBeInstanceOf(Array)
      expect(warnings.some(w => w.type === 'error')).toBe(true)
      expect(warnings.some(w => w.field === 'noShowFee')).toBe(true)
    })
  })

  describe('Template Integration', () => {
    const businessInfo = {
      name: 'Test Barbershop',
      phone: '(555) 123-4567',
      email: 'info@testshop.com',
      address: '123 Main St, City, ST 12345'
    }

    test('should generate enhanced policy text for website', () => {
      const rules = {
        noShowFee: 25,
        noShowFeeType: 'fixed',
        enableGracePeriod: true,
        enableLoyaltyDiscount: true,
        enableServiceAdjustments: true
      }
      
      const websitePolicy = TemplatePresets.generateWebsitePolicy(rules, businessInfo, 'professional')
      
      expect(websitePolicy).toContain('Enhanced No-Show Policy')
      expect(websitePolicy).toContain('First-time clients')
      expect(websitePolicy).toContain('Loyal clients')
      expect(websitePolicy).toContain('Smart adjustments')
    })

    test('should generate enhanced policy text for emails', () => {
      const rules = {
        noShowFee: 30,
        noShowFeeType: 'fixed',
        enableGracePeriod: true,
        enableLoyaltyDiscount: true,
        cancellationWindow: 24
      }
      
      const emailTemplate = TemplatePresets.generateEmailConfirmation(rules, businessInfo, 'professional')
      
      expect(emailTemplate).toContain('Enhanced No-Show Policy')
      expect(emailTemplate).toContain('First-time clients receive warnings only')
      expect(emailTemplate).toContain('Loyal clients get 25% discount')
    })

    test('should handle different tone variations', () => {
      const rules = { noShowFee: 25, noShowFeeType: 'fixed', enableGracePeriod: true }
      
      const professionalTemplate = TemplatePresets.generateWebsitePolicy(rules, businessInfo, 'professional')
      const friendlyTemplate = TemplatePresets.generateWebsitePolicy(rules, businessInfo, 'friendly')
      const strictTemplate = TemplatePresets.generateWebsitePolicy(rules, businessInfo, 'strict')
      
      expect(professionalTemplate).toBeDefined()
      expect(friendlyTemplate).toBeDefined() 
      expect(strictTemplate).toBeDefined()
      
      // Each should have different tone while maintaining enhanced policy info
      expect(friendlyTemplate).toMatch(/👋|🎉|✨/) // Contains emojis for friendly tone
      expect(strictTemplate).toContain('MANDATORY') // Contains strict language
    })

    test('should fallback to basic policy when enhanced features disabled', () => {
      const basicRules = {
        noShowFee: 20,
        noShowFeeType: 'fixed',
        enableGracePeriod: false,
        enableLoyaltyDiscount: false,
        enableServiceAdjustments: false
      }
      
      const template = TemplatePresets.generateWebsitePolicy(basicRules, businessInfo, 'professional')
      
      expect(template).toContain('No-show fee: $20')
      expect(template).not.toContain('Enhanced No-Show Policy')
      expect(template).not.toContain('First-time clients')
    })
  })

  describe('Client History Integration', () => {
    test('should generate realistic mock client history', () => {
      const scenarios = ['standard', 'loyal', 'problematic', 'blocked', 'first_time']
      
      scenarios.forEach(scenario => {
        const history = generateMockClientHistory('test-client-123', scenario)
        
        expect(history).toHaveProperty('id')
        expect(history).toHaveProperty('totalBookings')
        expect(history).toHaveProperty('noShowStrikes')
        expect(history).toHaveProperty('appointmentHistory')
        expect(history.appointmentHistory).toBeInstanceOf(Array)
        
        // Verify scenario-specific characteristics
        if (scenario === 'loyal') {
          expect(history.loyaltyMonths).toBeGreaterThanOrEqual(6)
          expect(history.totalBookings).toBeGreaterThanOrEqual(10)
        } else if (scenario === 'blocked') {
          expect(history.noShowStrikes).toBeGreaterThanOrEqual(4)
        } else if (scenario === 'first_time') {
          expect(history.totalBookings).toBe(1)
          expect(history.noShowStrikes).toBe(0)
        }
      })
    })

    test('should integrate policy calculations with client history', () => {
      const rules = {
        noShowFee: 25,
        noShowFeeType: 'fixed',
        enableGracePeriod: true,
        enableLoyaltyDiscount: true
      }
      
      const policy = new EnhancedNoShowPolicy(rules)
      const loyalHistory = generateMockClientHistory('loyal-client', 'loyal')
      const appointment = { servicePrice: 50, serviceDuration: 60 }
      
      const result = policy.calculateNoShowPenalty(appointment, loyalHistory)
      
      expect(result.loyaltyDiscountApplied).toBe(true)
      expect(result.reasoning.some(r => r.includes('loyalty'))).toBe(true)
    })
  })

  describe('Component Integration Tests', () => {
    // These would typically be React Testing Library tests
    // but we'll simulate the key integration points

    test('should provide correct props interface for PolicyPreview', () => {
      const rules = {
        noShowFee: 25,
        enableGracePeriod: true,
        enableLoyaltyDiscount: true
      }
      
      const sampleService = { name: 'Haircut', price: 45, duration: 60 }
      
      // Simulate what PolicyPreview component would do
      const policy = new EnhancedNoShowPolicy(rules)
      const scenarios = [
        { client: { noShowStrikes: 0, totalBookings: 1, loyaltyMonths: 0 } },
        { client: { noShowStrikes: 1, totalBookings: 15, loyaltyMonths: 8 } }
      ]
      
      scenarios.forEach(scenario => {
        const penalty = policy.calculateNoShowPenalty(sampleService, scenario.client)
        expect(penalty).toHaveProperty('shouldChargeFee')
        expect(penalty).toHaveProperty('feeAmount')
        expect(penalty).toHaveProperty('penaltyLevel')
        expect(penalty).toHaveProperty('reasoning')
      })
    })

    test('should handle automation settings integration', () => {
      const automationSettings = {
        enableAutomaticFeeCollection: true,
        enableSmartReminderEscalation: true,
        enablePredictiveNoShowDetection: false
      }
      
      // These settings would be passed to the enhanced policy system
      expect(automationSettings).toHaveProperty('enableAutomaticFeeCollection')
      expect(automationSettings.enableAutomaticFeeCollection).toBe(true)
    })
  })

  describe('Performance & Edge Cases', () => {
    test('should handle null/undefined inputs gracefully', () => {
      const policy = new EnhancedNoShowPolicy({})
      
      expect(() => {
        policy.calculateNoShowPenalty(null, null)
      }).not.toThrow()
      
      expect(() => {
        policy.calculateNoShowPenalty({}, undefined)
      }).not.toThrow()
    })

    test('should handle extreme values correctly', () => {
      const extremeRules = {
        noShowFee: 999999,
        noShowFeeType: 'fixed'
      }
      
      const policy = new EnhancedNoShowPolicy(extremeRules)
      const appointment = { servicePrice: 1, serviceDuration: 1 }
      const client = { noShowStrikes: 0, totalBookings: 1, loyaltyMonths: 0 }
      
      const result = policy.calculateNoShowPenalty(appointment, client)
      
      expect(result).toHaveProperty('feeAmount')
      expect(typeof result.feeAmount).toBe('number')
      expect(result.feeAmount).toBeGreaterThan(0)
    })

    test('should validate all required methods are present', () => {
      const policy = new EnhancedNoShowPolicy({})
      
      const requiredMethods = [
        'calculateNoShowPenalty',
        'calculateServiceMultiplier', 
        'getRecommendedAction',
        'shouldBlockClient',
        'getRecoveryOptions',
        'generatePenaltyExplanation',
        'validatePolicyConfiguration'
      ]
      
      requiredMethods.forEach(method => {
        expect(typeof policy[method]).toBe('function')
      })
    })

    test('should maintain consistency across multiple calculations', () => {
      const policy = new EnhancedNoShowPolicy({ 
        noShowFee: 25, 
        noShowFeeType: 'fixed',
        enableGracePeriod: true 
      })
      
      const appointment = { servicePrice: 50, serviceDuration: 60 }
      const client = { noShowStrikes: 1, totalBookings: 10, loyaltyMonths: 6 }
      
      // Multiple calls should return consistent results
      const result1 = policy.calculateNoShowPenalty(appointment, client)
      const result2 = policy.calculateNoShowPenalty(appointment, client)
      const result3 = policy.calculateNoShowPenalty(appointment, client)
      
      expect(result1.feeAmount).toBe(result2.feeAmount)
      expect(result2.feeAmount).toBe(result3.feeAmount)
      expect(result1.penaltyLevel).toBe(result2.penaltyLevel)
    })
  })

  describe('System Integration', () => {
    test('should work with existing booking rules structure', () => {
      // Simulate existing BookingRulesSetup component data structure
      const existingRules = {
        // Existing fields
        cancellationWindow: 24,
        cancellationFee: 15,
        allowRescheduling: true,
        
        // Basic no-show fields (legacy)
        noShowFee: 25,
        noShowStrikeLimit: 3,
        
        // Enhanced fields (new)
        enableGracePeriod: true,
        enableLoyaltyDiscount: true,
        enableServiceAdjustments: false,
        
        // Field normalization should handle both formats
        noShow_fee: 25, // snake_case
        noShowFee: 25,  // camelCase
      }
      
      const policy = new EnhancedNoShowPolicy(existingRules)
      const result = policy.calculateNoShowPenalty(
        { servicePrice: 50, serviceDuration: 60 },
        { noShowStrikes: 0, totalBookings: 1, loyaltyMonths: 0 }
      )
      
      expect(result.gracePeriodApplied).toBe(true)
    })

    test('should integrate with validation system', () => {
      const invalidRules = {
        noShowFee: 150,
        noShowFeeType: 'percentage' // 150% is invalid
      }
      
      const policy = new EnhancedNoShowPolicy(invalidRules)
      const warnings = policy.validatePolicyConfiguration()
      
      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings.some(w => w.type === 'error')).toBe(true)
    })
  })
})

// Test utilities and helpers
export const testHelpers = {
  createMockRules: (overrides = {}) => ({
    noShowFee: 25,
    noShowFeeType: 'fixed',
    noShowStrikeLimit: 3,
    blockAfterNoShows: true,
    enableGracePeriod: true,
    enableLoyaltyDiscount: true,
    enableServiceAdjustments: true,
    ...overrides
  }),
  
  createMockClient: (scenario = 'standard') => {
    return generateMockClientHistory('test-client', scenario)
  },
  
  createMockAppointment: (overrides = {}) => ({
    servicePrice: 50,
    serviceDuration: 60,
    serviceName: 'Haircut',
    date: '2024-02-01',
    ...overrides
  })
}