/**
 * Post-Migration Validation Script
 * Tests that barbershop_id queries work correctly after shop_id → barbershop_id migration
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function validateMigration() {
  console.log('🔍 Starting Post-Migration Validation...\n')

  const validationResults = {
    passed: [],
    failed: [],
    warnings: []
  }

  // Test 1: Verify barbershops table has data
  console.log('📋 Test 1: Checking barbershops table...')
  const { data: barbershops, error: barbershopsError } = await supabase
    .from('barbershops')
    .select('id, name')
    .limit(1)

  if (barbershopsError) {
    validationResults.failed.push('❌ barbershops table query failed: ' + barbershopsError.message)
  } else if (!barbershops || barbershops.length === 0) {
    validationResults.warnings.push('⚠️  No barbershops found in database')
  } else {
    validationResults.passed.push('✅ barbershops table accessible')
    const testBarbershopId = barbershops[0].id
    console.log(`   Using test barbershop: ${barbershops[0].name} (${testBarbershopId})\n`)

    // Test 2: Query appointments using barbershop_id (simplified)
    console.log('📋 Test 2: Querying appointments by barbershop_id...')
    const { data: appointments, error: appointmentsError, count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: false })
      .eq('barbershop_id', testBarbershopId)
      .limit(5)

    if (appointmentsError) {
      validationResults.failed.push('❌ appointments query by barbershop_id failed: ' + appointmentsError.message)
    } else {
      validationResults.passed.push(`✅ appointments query works (found ${appointments?.length || 0} appointments)`)
    }

    // Test 3: Query customers using barbershop_id (simplified)
    console.log('📋 Test 3: Querying customers by barbershop_id...')
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('barbershop_id', testBarbershopId)
      .limit(5)

    if (customersError) {
      validationResults.failed.push('❌ customers query by barbershop_id failed: ' + customersError.message)
    } else {
      validationResults.passed.push(`✅ customers query works (found ${customers?.length || 0} customers)`)
    }

    // Test 4: Query services using barbershop_id (simplified)
    console.log('📋 Test 4: Querying services by barbershop_id...')
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', testBarbershopId)
      .limit(5)

    if (servicesError) {
      validationResults.failed.push('❌ services query by barbershop_id failed: ' + servicesError.message)
    } else {
      validationResults.passed.push(`✅ services query works (found ${services?.length || 0} services)`)
    }

    // Test 5: Verify profile.barbershop_id field exists
    console.log('📋 Test 5: Checking profiles.barbershop_id field...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, barbershop_id, role')
      .not('barbershop_id', 'is', null)
      .limit(5)

    if (profilesError) {
      validationResults.failed.push('❌ profiles query failed: ' + profilesError.message)
    } else {
      validationResults.passed.push(`✅ profiles.barbershop_id field works (found ${profiles?.length || 0} profiles)`)
    }
  }

  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('📊 VALIDATION RESULTS')
  console.log('='.repeat(60))

  console.log('\n✅ PASSED TESTS (' + validationResults.passed.length + '):')
  validationResults.passed.forEach(msg => console.log('   ' + msg))

  if (validationResults.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (' + validationResults.warnings.length + '):')
    validationResults.warnings.forEach(msg => console.log('   ' + msg))
  }

  if (validationResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS (' + validationResults.failed.length + '):')
    validationResults.failed.forEach(msg => console.log('   ' + msg))
  }

  console.log('\n' + '='.repeat(60))

  if (validationResults.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED! Migration successful.')
    process.exit(0)
  } else {
    console.log('❌ VALIDATION FAILED! Please review errors above.')
    process.exit(1)
  }
}

validateMigration().catch(error => {
  console.error('❌ Validation script error:', error)
  process.exit(1)
})
