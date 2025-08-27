#!/usr/bin/env node

/**
 * Test the fixed financial validation
 */

import { 
  validateFinancialArrangement 
} from '../lib/financial-display-utils.js'

console.log('🧪 Testing FIXED Financial Validation')
console.log('=====================================')

console.log('\n1️⃣ Testing commission rate of 0 (should now pass)...')
const test1 = validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 0, // This should now work!
  rent_frequency: 'monthly'
})
console.log('Result:', test1)

console.log('\n2️⃣ Testing normal commission rate (should pass)...')
const test2 = validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 0.6, // 60%
  rent_frequency: 'monthly'
})
console.log('Result:', test2)

console.log('\n3️⃣ Testing null commission rate (should fail)...')
const test3 = validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: null,
  rent_frequency: 'monthly'
})
console.log('Result:', test3)

console.log('\n4️⃣ Testing undefined commission rate (should fail)...')
const test4 = validateFinancialArrangement({
  arrangement_type: 'commission',
  // commission_rate: undefined (not provided)
  rent_frequency: 'monthly'
})
console.log('Result:', test4)

console.log('\n5️⃣ Testing booth rent of 0 (should fail)...')
const test5 = validateFinancialArrangement({
  arrangement_type: 'booth_rent',
  booth_rent_amount: 0, // Should fail
  rent_frequency: 'monthly'
})
console.log('Result:', test5)

console.log('\n6️⃣ Testing valid booth rent (should pass)...')
const test6 = validateFinancialArrangement({
  arrangement_type: 'booth_rent',
  booth_rent_amount: 1500, // Should pass
  rent_frequency: 'monthly'
})
console.log('Result:', test6)

console.log('\n7️⃣ Testing typical unnamed barber scenario...')
const unnamedBarberData = {
  full_name: '', // Empty name
  arrangement_type: 'commission',
  commission_rate: 0.6, // Default 60%
  rent_frequency: 'monthly',
  booth_rent_amount: 0, // Not using booth rent
  hourly_rate: 0
}
const test7 = validateFinancialArrangement(unnamedBarberData)
console.log('Unnamed barber data:', unnamedBarberData)
console.log('Result:', test7)

if (test7.isValid) {
  console.log('✅ Unnamed barber scenario should now save successfully!')
} else {
  console.log('❌ Still issues with unnamed barber scenario:', test7.errors)
}