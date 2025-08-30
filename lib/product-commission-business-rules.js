/**
 * Product Commission Business Rules & Validation
 * Comprehensive business logic for product sales commission management
 * Integrates with progressive tier system and handles edge cases
 */

import financialService from './financial-service'

/**
 * Business rules configuration for product commissions
 */
const BUSINESS_RULES = {
  // Commission Rate Limits
  MIN_COMMISSION_RATE: 0.01, // 1%
  MAX_COMMISSION_RATE: 0.50, // 50%
  DEFAULT_COMMISSION_RATE: 0.10, // 10%

  // Tier Integration Rules
  MIN_TIER_WEIGHT: 0.0, // 0% weight
  MAX_TIER_WEIGHT: 1.0, // 100% weight
  DEFAULT_TIER_WEIGHT: 0.5, // 50% weight
  PRODUCT_TIER_BONUS_RATE: 0.01, // 1% bonus on tier upgrade

  // Return/Refund Rules
  MAX_RETURN_DAYS: 30,
  PARTIAL_RETURN_MIN_PERCENTAGE: 0.01, // 1%
  COMMISSION_CLAWBACK_GRACE_PERIOD: 24 * 60 * 60 * 1000, // 24 hours

  // Validation Limits
  MAX_PRODUCTS_PER_SALE: 50,
  MIN_PRODUCT_PRICE: 0.01,
  MAX_PRODUCT_PRICE: 10000,
  MAX_QUANTITY_PER_ITEM: 100,

  // Category Rules
  REQUIRED_CATEGORY_FIELDS: ['category_name', 'category_display_name', 'default_commission_rate'],
  CATEGORY_NAME_PATTERN: /^[a-z_]+$/,
  MAX_CATEGORY_NAME_LENGTH: 50,
  MAX_DISPLAY_NAME_LENGTH: 255
}

/**
 * Validate product commission category configuration
 * @param {Object} categoryData - Category configuration data
 * @returns {Object} Validation result
 */
export function validateProductCommissionCategory(categoryData) {
  const errors = []
  const warnings = []

  // Required fields validation
  for (const field of BUSINESS_RULES.REQUIRED_CATEGORY_FIELDS) {
    if (!categoryData[field] || categoryData[field].toString().trim() === '') {
      errors.push(`${field} is required`)
    }
  }

  // Category name validation
  if (categoryData.category_name) {
    if (categoryData.category_name.length > BUSINESS_RULES.MAX_CATEGORY_NAME_LENGTH) {
      errors.push(`Category name must be ${BUSINESS_RULES.MAX_CATEGORY_NAME_LENGTH} characters or less`)
    }
    if (!BUSINESS_RULES.CATEGORY_NAME_PATTERN.test(categoryData.category_name)) {
      errors.push('Category name must contain only lowercase letters and underscores')
    }
  }

  // Display name validation
  if (categoryData.category_display_name && 
      categoryData.category_display_name.length > BUSINESS_RULES.MAX_DISPLAY_NAME_LENGTH) {
    errors.push(`Display name must be ${BUSINESS_RULES.MAX_DISPLAY_NAME_LENGTH} characters or less`)
  }

  // Commission rate validation
  if (categoryData.default_commission_rate !== undefined) {
    const rate = parseFloat(categoryData.default_commission_rate)
    if (isNaN(rate)) {
      errors.push('Default commission rate must be a valid number')
    } else {
      if (rate < BUSINESS_RULES.MIN_COMMISSION_RATE) {
        errors.push(`Commission rate cannot be less than ${BUSINESS_RULES.MIN_COMMISSION_RATE * 100}%`)
      }
      if (rate > BUSINESS_RULES.MAX_COMMISSION_RATE) {
        errors.push(`Commission rate cannot be more than ${BUSINESS_RULES.MAX_COMMISSION_RATE * 100}%`)
      }
      if (rate > 0.25) { // 25%
        warnings.push('Commission rate above 25% is unusually high')
      }
    }
  }

  // Rate range validation
  if (categoryData.min_commission_rate !== undefined && 
      categoryData.max_commission_rate !== undefined) {
    const min = parseFloat(categoryData.min_commission_rate)
    const max = parseFloat(categoryData.max_commission_rate)
    
    if (!isNaN(min) && !isNaN(max) && min > max) {
      errors.push('Minimum commission rate cannot be higher than maximum rate')
    }
  }

  // Tier weight validation
  if (categoryData.tier_weight_multiplier !== undefined) {
    const weight = parseFloat(categoryData.tier_weight_multiplier)
    if (isNaN(weight)) {
      errors.push('Tier weight multiplier must be a valid number')
    } else {
      if (weight < BUSINESS_RULES.MIN_TIER_WEIGHT) {
        errors.push(`Tier weight cannot be less than ${BUSINESS_RULES.MIN_TIER_WEIGHT}`)
      }
      if (weight > BUSINESS_RULES.MAX_TIER_WEIGHT) {
        warnings.push('Tier weight above 1.0 may cause products to contribute more than services to tier progress')
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate product sale data before commission calculation
 * @param {Object} saleData - Product sale data
 * @returns {Object} Validation result
 */
export function validateProductSaleData(saleData) {
  const errors = []
  const warnings = []

  // Required fields
  const requiredFields = ['product_sale_id', 'barberbarbershop_id', 'barber_id', 'line_items', 'total_amount']
  for (const field of requiredFields) {
    if (!saleData[field]) {
      errors.push(`${field} is required`)
    }
  }

  // Line items validation
  if (saleData.line_items) {
    if (!Array.isArray(saleData.line_items)) {
      errors.push('line_items must be an array')
    } else {
      if (saleData.line_items.length === 0) {
        errors.push('At least one line item is required')
      }
      if (saleData.line_items.length > BUSINESS_RULES.MAX_PRODUCTS_PER_SALE) {
        errors.push(`Maximum ${BUSINESS_RULES.MAX_PRODUCTS_PER_SALE} products per sale`)
      }

      // Validate each line item
      saleData.line_items.forEach((item, index) => {
        const itemPrefix = `Item ${index + 1}:`
        
        if (!item.product_id) {
          errors.push(`${itemPrefix} product_id is required`)
        }
        
        if (!item.quantity || item.quantity < 1) {
          errors.push(`${itemPrefix} quantity must be at least 1`)
        } else if (item.quantity > BUSINESS_RULES.MAX_QUANTITY_PER_ITEM) {
          warnings.push(`${itemPrefix} quantity ${item.quantity} is unusually high`)
        }
        
        if (!item.unit_price || item.unit_price < BUSINESS_RULES.MIN_PRODUCT_PRICE) {
          errors.push(`${itemPrefix} unit_price must be at least $${BUSINESS_RULES.MIN_PRODUCT_PRICE}`)
        } else if (item.unit_price > BUSINESS_RULES.MAX_PRODUCT_PRICE) {
          warnings.push(`${itemPrefix} unit_price $${item.unit_price} is unusually high`)
        }

        if (!item.category) {
          warnings.push(`${itemPrefix} category not specified, will use 'uncategorized'`)
        }
      })
    }
  }

  // Total amount validation
  if (saleData.total_amount) {
    const totalAmount = parseFloat(saleData.total_amount)
    if (isNaN(totalAmount)) {
      errors.push('total_amount must be a valid number')
    } else {
      if (totalAmount <= 0) {
        errors.push('total_amount must be positive')
      }
      
      // Validate total matches line items
      if (saleData.line_items && Array.isArray(saleData.line_items)) {
        const calculatedTotal = saleData.line_items.reduce((sum, item) => {
          return sum + (parseFloat(item.unit_price || 0) * (parseInt(item.quantity || 0)))
        }, 0)
        
        if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
          errors.push(`total_amount ($${totalAmount}) doesn't match line items total ($${calculatedTotal})`)
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Apply business rules for commission calculation
 * @param {Object} commissionCalculation - Raw commission calculation
 * @param {Object} arrangement - Financial arrangement
 * @param {Array} categories - Product categories
 * @returns {Object} Commission calculation with business rules applied
 */
export function applyCommissionBusinessRules(commissionCalculation, arrangement, categories) {
  const adjustments = []
  const finalCalculation = { ...commissionCalculation }

  // Rule: Minimum commission enforcement
  if (finalCalculation.baseCommissionAmount < 0.01) {
    adjustments.push('Applied minimum commission floor of $0.01')
    finalCalculation.baseCommissionAmount = 0.01
    finalCalculation.barberAmount = Math.max(finalCalculation.barberAmount, 0.01)
  }

  // Rule: Maximum commission safety check
  const maxCommissionAllowed = finalCalculation.shopAmount * 0.9 // Never more than 90% to barber
  if (finalCalculation.barberAmount > maxCommissionAllowed) {
    adjustments.push('Applied maximum commission safety cap')
    finalCalculation.barberAmount = maxCommissionAllowed
    finalCalculation.shopAmount = commissionCalculation.totalAmount - maxCommissionAllowed
  }

  // Rule: Tier bonus limits
  if (finalCalculation.tierBonusAmount) {
    const maxTierBonus = finalCalculation.baseCommissionAmount * 0.5 // Max 50% bonus
    if (finalCalculation.tierBonusAmount > maxTierBonus) {
      adjustments.push('Applied tier bonus limit')
      finalCalculation.tierBonusAmount = maxTierBonus
      finalCalculation.barberAmount = finalCalculation.baseCommissionAmount + maxTierBonus
      finalCalculation.shopAmount = commissionCalculation.totalAmount - finalCalculation.barberAmount
    }
  }

  // Rule: Category-specific adjustments
  if (categories && finalCalculation.commissionBreakdown) {
    const categoryMap = new Map(categories.map(cat => [cat.category_name, cat]))
    
    finalCalculation.commissionBreakdown = finalCalculation.commissionBreakdown.map(item => {
      const category = categoryMap.get(item.category)
      if (category && !category.is_active) {
        adjustments.push(`Category '${item.category}' is inactive, applied default rate`)
        const defaultRate = BUSINESS_RULES.DEFAULT_COMMISSION_RATE
        return {
          ...item,
          commission_rate: defaultRate,
          commission_amount: item.item_total * defaultRate
        }
      }
      return item
    })
  }

  // Rule: Rounding to prevent penny issues
  finalCalculation.baseCommissionAmount = Math.round(finalCalculation.baseCommissionAmount * 100) / 100
  finalCalculation.barberAmount = Math.round(finalCalculation.barberAmount * 100) / 100
  finalCalculation.shopAmount = Math.round(finalCalculation.shopAmount * 100) / 100
  if (finalCalculation.tierBonusAmount) {
    finalCalculation.tierBonusAmount = Math.round(finalCalculation.tierBonusAmount * 100) / 100
  }

  return {
    ...finalCalculation,
    businessRuleAdjustments: adjustments
  }
}

/**
 * Validate product return data
 * @param {Object} returnData - Return data
 * @returns {Object} Validation result
 */
export function validateProductReturnData(returnData) {
  const errors = []
  const warnings = []

  // Required fields
  const requiredFields = ['original_product_sale_id', 'barberbarbershop_id', 'barber_id', 'returned_items']
  for (const field of requiredFields) {
    if (!returnData[field]) {
      errors.push(`${field} is required`)
    }
  }

  // Returned items validation
  if (returnData.returned_items) {
    if (!Array.isArray(returnData.returned_items)) {
      errors.push('returned_items must be an array')
    } else {
      if (returnData.returned_items.length === 0) {
        errors.push('At least one returned item is required')
      }

      returnData.returned_items.forEach((item, index) => {
        const itemPrefix = `Returned item ${index + 1}:`
        
        if (!item.product_id) {
          errors.push(`${itemPrefix} product_id is required`)
        }
        
        if (!item.quantity_returned || item.quantity_returned < 1) {
          errors.push(`${itemPrefix} quantity_returned must be at least 1`)
        }
        
        if (item.refund_amount !== undefined) {
          const refundAmount = parseFloat(item.refund_amount)
          if (isNaN(refundAmount) || refundAmount < 0) {
            errors.push(`${itemPrefix} refund_amount must be a non-negative number`)
          }
        }
      })
    }
  }

  // Return time validation (if sale_date provided)
  if (returnData.sale_date) {
    const saleDate = new Date(returnData.sale_date)
    const now = new Date()
    const daysSinceSale = (now - saleDate) / (1000 * 60 * 60 * 24)
    
    if (daysSinceSale > BUSINESS_RULES.MAX_RETURN_DAYS) {
      warnings.push(`Return is ${Math.round(daysSinceSale)} days after sale (policy allows ${BUSINESS_RULES.MAX_RETURN_DAYS} days)`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Calculate tier weight for combined progression
 * @param {number} serviceRevenue - Service revenue amount
 * @param {number} productRevenue - Product revenue amount
 * @param {number} productTierWeight - Product tier weight multiplier
 * @returns {Object} Combined tier calculation
 */
export function calculateCombinedTierProgression(serviceRevenue, productRevenue, productTierWeight = 0.5) {
  const weightedProductRevenue = productRevenue * productTierWeight
  const combinedRevenue = serviceRevenue + weightedProductRevenue
  
  return {
    service_revenue: serviceRevenue,
    product_revenue: productRevenue,
    weighted_product_revenue: weightedProductRevenue,
    combined_tier_revenue: combinedRevenue,
    product_contribution_percentage: combinedRevenue > 0 ? (weightedProductRevenue / combinedRevenue) * 100 : 0,
    tier_weight_applied: productTierWeight
  }
}

/**
 * Validate commission payout eligibility
 * @param {Object} commissionTransaction - Commission transaction data
 * @param {Object} barberBalance - Current barber balance
 * @returns {Object} Eligibility result
 */
export function validateCommissionPayoutEligibility(commissionTransaction, barberBalance) {
  const issues = []
  const warnings = []
  let eligible = true

  // Grace period check for recent transactions
  if (commissionTransaction.created_at) {
    const transactionDate = new Date(commissionTransaction.created_at)
    const now = new Date()
    const timeSinceTransaction = now - transactionDate
    
    if (timeSinceTransaction < BUSINESS_RULES.COMMISSION_CLAWBACK_GRACE_PERIOD) {
      warnings.push(`Transaction is within ${BUSINESS_RULES.COMMISSION_CLAWBACK_GRACE_PERIOD / (60 * 60 * 1000)} hour grace period`)
    }
  }

  // Status validation
  if (commissionTransaction.status !== 'pending_payout') {
    issues.push(`Transaction status is '${commissionTransaction.status}', not eligible for payout`)
    eligible = false
  }

  // Amount validation
  if (!commissionTransaction.total_commission_amount || commissionTransaction.total_commission_amount <= 0) {
    issues.push('Commission amount must be positive')
    eligible = false
  }

  // Balance consistency check
  if (barberBalance && commissionTransaction.total_commission_amount > barberBalance.pending_amount) {
    issues.push('Commission amount exceeds pending balance')
    eligible = false
  }

  // Minimum payout threshold (business rule)
  const minPayoutAmount = 10.00 // $10 minimum
  if (commissionTransaction.total_commission_amount < minPayoutAmount) {
    warnings.push(`Amount $${commissionTransaction.total_commission_amount} is below recommended minimum payout of $${minPayoutAmount}`)
  }

  return {
    eligible,
    issues,
    warnings,
    recommended_action: eligible 
      ? (warnings.length > 0 ? 'Proceed with caution' : 'Proceed with payout')
      : 'Resolve issues before payout'
  }
}

/**
 * Calculate commission adjustment for partial returns
 * @param {Object} originalTransaction - Original commission transaction
 * @param {number} returnQuantity - Quantity being returned
 * @param {number} originalQuantity - Original quantity sold
 * @returns {Object} Adjustment calculation
 */
export function calculatePartialReturnAdjustment(originalTransaction, returnQuantity, originalQuantity) {
  if (returnQuantity <= 0 || originalQuantity <= 0) {
    throw new Error('Quantities must be positive')
  }
  
  if (returnQuantity > originalQuantity) {
    throw new Error('Return quantity cannot exceed original quantity')
  }

  const returnRatio = returnQuantity / originalQuantity
  const commissionAdjustment = -(originalTransaction.total_commission_amount * returnRatio)
  const tierAdjustment = originalTransaction.tier_weighted_amount 
    ? -(originalTransaction.tier_weighted_amount * returnRatio)
    : 0

  // Apply minimum adjustment threshold
  const minAdjustment = 0.01
  const finalCommissionAdjustment = Math.abs(commissionAdjustment) >= minAdjustment 
    ? commissionAdjustment 
    : 0

  return {
    return_ratio: returnRatio,
    commission_adjustment: finalCommissionAdjustment,
    tier_adjustment: tierAdjustment,
    original_commission: originalTransaction.total_commission_amount,
    remaining_commission: originalTransaction.total_commission_amount + finalCommissionAdjustment,
    adjustment_applied: Math.abs(finalCommissionAdjustment) >= minAdjustment
  }
}

/**
 * Generate business rules summary for reporting
 * @returns {Object} Business rules summary
 */
export function getBusinessRulesSummary() {
  return {
    commission_limits: {
      min_rate: BUSINESS_RULES.MIN_COMMISSION_RATE,
      max_rate: BUSINESS_RULES.MAX_COMMISSION_RATE,
      default_rate: BUSINESS_RULES.DEFAULT_COMMISSION_RATE
    },
    tier_integration: {
      min_weight: BUSINESS_RULES.MIN_TIER_WEIGHT,
      max_weight: BUSINESS_RULES.MAX_TIER_WEIGHT,
      default_weight: BUSINESS_RULES.DEFAULT_TIER_WEIGHT,
      bonus_rate: BUSINESS_RULES.PRODUCT_TIER_BONUS_RATE
    },
    return_policy: {
      max_return_days: BUSINESS_RULES.MAX_RETURN_DAYS,
      grace_period_hours: BUSINESS_RULES.COMMISSION_CLAWBACK_GRACE_PERIOD / (60 * 60 * 1000),
      min_return_percentage: BUSINESS_RULES.PARTIAL_RETURN_MIN_PERCENTAGE
    },
    transaction_limits: {
      max_products_per_sale: BUSINESS_RULES.MAX_PRODUCTS_PER_SALE,
      min_product_price: BUSINESS_RULES.MIN_PRODUCT_PRICE,
      max_product_price: BUSINESS_RULES.MAX_PRODUCT_PRICE,
      max_quantity_per_item: BUSINESS_RULES.MAX_QUANTITY_PER_ITEM
    },
    category_requirements: {
      required_fields: BUSINESS_RULES.REQUIRED_CATEGORY_FIELDS,
      name_pattern: BUSINESS_RULES.CATEGORY_NAME_PATTERN.source,
      max_name_length: BUSINESS_RULES.MAX_CATEGORY_NAME_LENGTH,
      max_display_name_length: BUSINESS_RULES.MAX_DISPLAY_NAME_LENGTH
    }
  }
}

export default {
  validateProductCommissionCategory,
  validateProductSaleData,
  applyCommissionBusinessRules,
  validateProductReturnData,
  calculateCombinedTierProgression,
  validateCommissionPayoutEligibility,
  calculatePartialReturnAdjustment,
  getBusinessRulesSummary,
  BUSINESS_RULES
}