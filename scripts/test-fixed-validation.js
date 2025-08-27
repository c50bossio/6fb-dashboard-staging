#!/usr/bin/env node

/**
 * Test the fixed financial validation
 */

import { 
  validateFinancialArrangement 
} from '../lib/financial-display-utils.js'

...')
const test1 = validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 0, // This should now work!
  rent_frequency: 'monthly'
})

...')
const test2 = validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 0.6, // 60%
  rent_frequency: 'monthly'
})

...')
const test3 = validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: null,
  rent_frequency: 'monthly'
})

...')
const test4 = validateFinancialArrangement({
  arrangement_type: 'commission',
  // commission_rate: undefined (not provided)
  rent_frequency: 'monthly'
})

...')
const test5 = validateFinancialArrangement({
  arrangement_type: 'booth_rent',
  booth_rent_amount: 0, // Should fail
  rent_frequency: 'monthly'
})

...')
const test6 = validateFinancialArrangement({
  arrangement_type: 'booth_rent',
  booth_rent_amount: 1500, // Should pass
  rent_frequency: 'monthly'
})

const unnamedBarberData = {
  full_name: '', // Empty name
  arrangement_type: 'commission',
  commission_rate: 0.6, // Default 60%
  rent_frequency: 'monthly',
  booth_rent_amount: 0, // Not using booth rent
  hourly_rate: 0
}
const test7 = validateFinancialArrangement(unnamedBarberData)

if (test7.isValid) {
  
} else {
  
}