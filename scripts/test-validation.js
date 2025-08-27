#!/usr/bin/env node

/**
 * Test the financial validation that might be blocking saves
 */

// Import the validation functions directly (simulated here)
function validateFinancialArrangement(arrangement) {
  const errors = []
  const type = arrangement?.arrangement_type || arrangement?.financial_model || arrangement?.type

  console.log('🔍 Validating arrangement:', arrangement)
  console.log('📋 Type detected:', type)

  if (!type) {
    errors.push('Financial arrangement type is required')
    return { isValid: false, errors }
  }

  switch (type) {
    case 'commission':
      const commissionRate = arrangement.commission_rate || arrangement.commission_percentage
      console.log('💰 Commission rate value:', commissionRate, 'type:', typeof commissionRate)
      
      if (!commissionRate || commissionRate <= 0 || commissionRate > 1) {
        console.log('❌ Commission rate validation failed!')
        console.log('   - Value exists:', !!commissionRate)
        console.log('   - Greater than 0:', commissionRate > 0)
        console.log('   - Less than or equal to 1:', commissionRate <= 1)
        errors.push('Commission rate must be between 1% and 100%')
      } else {
        console.log('✅ Commission rate validation passed')
      }
      break

    case 'booth_rent':
      const boothRent = arrangement.booth_rent_amount
      console.log('🏠 Booth rent amount:', boothRent)
      if (!boothRent || boothRent <= 0) {
        console.log('❌ Booth rent validation failed!')
        errors.push('Booth rent amount must be greater than $0')
      } else {
        console.log('✅ Booth rent validation passed')
      }
      break

    case 'hybrid':
      const hybridBaseRent = arrangement.hybrid_base_rent
      const hybridThreshold = arrangement.hybrid_revenue_threshold
      console.log('🔄 Hybrid base rent:', hybridBaseRent)
      console.log('🎯 Hybrid threshold:', hybridThreshold)
      
      if (!hybridBaseRent || hybridBaseRent <= 0) {
        console.log('❌ Hybrid base rent validation failed!')
        errors.push('Hybrid base rent must be greater than $0')
      }
      if (!hybridThreshold || hybridThreshold <= 0) {
        console.log('❌ Hybrid threshold validation failed!')
        errors.push('Hybrid revenue threshold must be greater than $0')
      }
      if (errors.length === 0) {
        console.log('✅ Hybrid model validation passed')
      }
      break

    default:
      console.log('❌ Unknown arrangement type!')
      errors.push(`Unknown financial arrangement type: ${type}`)
  }

  const result = { isValid: errors.length === 0, errors }
  console.log('📊 Validation result:', result)
  return result
}

console.log('🧪 Testing Financial Arrangement Validation')
console.log('=========================================')

console.log('\n1️⃣ Testing typical commission setup (should pass)...')
validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 0.6, // 60% as decimal
  rent_frequency: 'monthly'
})

console.log('\n2️⃣ Testing commission as percentage (might fail)...')
validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 60, // 60% as number - this would fail!
  rent_frequency: 'monthly'
})

console.log('\n3️⃣ Testing empty/null commission rate...')
validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: null,
  rent_frequency: 'monthly'
})

console.log('\n4️⃣ Testing zero commission rate...')
validateFinancialArrangement({
  arrangement_type: 'commission',
  commission_rate: 0,
  rent_frequency: 'monthly'
})

console.log('\n5️⃣ Testing booth rent (should pass)...')
validateFinancialArrangement({
  arrangement_type: 'booth_rent',
  booth_rent_amount: 1500,
  rent_frequency: 'monthly'
})

console.log('\n6️⃣ Testing booth rent with zero amount (should fail)...')
validateFinancialArrangement({
  arrangement_type: 'booth_rent',
  booth_rent_amount: 0,
  rent_frequency: 'monthly'
})

console.log('\n7️⃣ Testing undefined arrangement type...')
validateFinancialArrangement({
  commission_rate: 0.6,
  rent_frequency: 'monthly'
  // No arrangement_type defined
})

console.log('\n8️⃣ Testing what might be sent from the frontend...')
const frontendData = {
  full_name: 'Test Barber',
  commission_rate: 0.6, // This should be decimal format
  arrangement_type: 'commission',
  rent_frequency: 'monthly',
  booth_rent_amount: 0, // This is 0 for commission arrangement
  hourly_rate: 0
}
validateFinancialArrangement(frontendData)

console.log('\n🎯 Key Insight:')
console.log('If the commission rate is being passed as a percentage (60)')
console.log('instead of a decimal (0.6), the validation will fail!')
console.log('Check the frontend code that prepares the data before saving.')