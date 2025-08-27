#!/usr/bin/env node

/**
 * Test the financial validation that might be blocking saves
 */

// Import the validation functions directly (simulated here)
function validateFinancialArrangement(arrangement) {
  const errors = []
  const type = arrangement?.arrangement_type || arrangement?.financial_model || arrangement?.type

  if (!type) {
    errors.push('Financial arrangement type is required')
    return { isValid: false, errors }
  }

  switch (type) {
    case 'commission':
      const commissionRate = arrangement.commission_rate || arrangement.commission_percentage

      if (!commissionRate || commissionRate <= 0 || commissionRate > 1) {

        errors.push('Commission rate must be between 1% and 100%')
      } else {
        
      }
      break

    case 'booth_rent':
      const boothRent = arrangement.booth_rent_amount
      
      if (!boothRent || boothRent <= 0) {
        
        errors.push('Booth rent amount must be greater than $0')
      } else {
        
      }
      break

    case 'hybrid':
      const hybridBaseRent = arrangement.hybrid_base_rent
      const hybridThreshold = arrangement.hybrid_revenue_threshold

      if (!hybridBaseRent || hybridBaseRent <= 0) {
        
        errors.push('Hybrid base rent must be greater than $0')
      }
      if (!hybridThreshold || hybridThreshold <= 0) {
        
        errors.push('Hybrid revenue threshold must be greater than $0')
      }
      if (errors.length === 0) {
        
      }
      break

    default:
      
      errors.push(`Unknown financial arrangement type: ${type}`)
  }

  const result = { isValid: errors.length === 0, errors }
  
  return result
}

...')
validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 0.6, // 60% as decimal
  rent_frequency: 'monthly'
})

...')
validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 60, // 60% as number - this would fail!
  rent_frequency: 'monthly'
})

validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: null,
  rent_frequency: 'monthly'
})

validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 0,
  rent_frequency: 'monthly'
})

...')
validateFinancialArrangement({
  arrangement_type: 'booth_rent',
  booth_rent_amount: 1500,
  rent_frequency: 'monthly'
})

...')
validateFinancialArrangement({
  arrangement_type: 'booth_rent',
  booth_rent_amount: 0,
  rent_frequency: 'monthly'
})

validateFinancialArrangement({
  commission_rate: 0.6,
  rent_frequency: 'monthly'
  // No arrangement_type defined
})

const frontendData = {
  full_name: 'Test Barber',
  commission_rate: 0.6, // This should be decimal format
  arrangement_type: 'commission',
  rent_frequency: 'monthly',
  booth_rent_amount: 0, // This is 0 for commission arrangement
  hourly_rate: 0
}
validateFinancialArrangement(frontendData)

')
, the validation will fail!')
