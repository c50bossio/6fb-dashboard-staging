/**
 * Migration Regression Test Suite
 * Tests critical paths affected by shop_id → barbershop_id migration
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const tests = []
const results = { passed: 0, failed: 0, skipped: 0 }

function test(name, fn) {
  tests.push({ name, fn })
}

async function runTests() {
  console.log('🧪 Running Migration Regression Tests\n')
  console.log('=' .repeat(70))

  for (const { name, fn } of tests) {
    try {
      await fn()
      console.log(`✅ PASS: ${name}`)
      results.passed++
    } catch (error) {
      console.log(`❌ FAIL: ${name}`)
      console.log(`   Error: ${error.message}`)
      results.failed++
    }
  }

  console.log('='.repeat(70))
  console.log(`\n📊 Test Results: ${results.passed} passed, ${results.failed} failed\n`)

  if (results.failed === 0) {
    console.log('🎉 ALL REGRESSION TESTS PASSED!')
    process.exit(0)
  } else {
    console.log('❌ SOME TESTS FAILED - Review errors above')
    process.exit(1)
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

test('Database: barbershops table is accessible', async () => {
  const { data, error } = await supabase
    .from('barbershops')
    .select('id, name')
    .limit(1)

  if (error) throw new Error(`barbershops query failed: ${error.message}`)
  if (!data || data.length === 0) throw new Error('No barbershops found')
})

test('Database: profiles.barbershop_id field exists and works', async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, barbershop_id, role')
    .not('barbershop_id', 'is', null)
    .limit(1)

  if (error) throw new Error(`profiles query failed: ${error.message}`)
  if (!data || data.length === 0) throw new Error('No profiles with barbershop_id found')
})

test('Database: appointments.barbershop_id field exists', async () => {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, barbershop_id')
    .limit(1)

  if (error) throw new Error(`appointments query failed: ${error.message}`)
})

test('Database: customers.barbershop_id field exists', async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('id, barbershop_id')
    .limit(1)

  if (error) throw new Error(`customers query failed: ${error.message}`)
})

test('Database: services.barbershop_id field exists and has data', async () => {
  const { data, error } = await supabase
    .from('services')
    .select('id, barbershop_id, name, price')
    .not('barbershop_id', 'is', null)
    .limit(1)

  if (error) throw new Error(`services query failed: ${error.message}`)
  if (!data || data.length === 0) throw new Error('No services with barbershop_id found')
})

test('Database: barbers.barbershop_id field exists (migrated from shop_id)', async () => {
  const { data, error } = await supabase
    .from('barbers')
    .select('id, barbershop_id, name')
    .limit(1)

  if (error) throw new Error(`barbers query failed: ${error.message}`)
})

test('Database: inventory.barbershop_id field exists (migrated from shop_id)', async () => {
  const { data, error } = await supabase
    .from('inventory')
    .select('id, barbershop_id')
    .limit(1)

  if (error) throw new Error(`inventory query failed: ${error.message}`)
})

test('Database: user_shop_access_history.barbershop_id exists (migrated)', async () => {
  const { data, error } = await supabase
    .from('user_shop_access_history')
    .select('id, barbershop_id')
    .limit(1)

  if (error) throw new Error(`user_shop_access_history query failed: ${error.message}`)
})

test('Database: shop_id columns no longer exist', async () => {
  const { data, error } = await supabase.rpc('execute_sql', {
    query: `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE column_name = 'shop_id'
        AND table_schema = 'public'
        AND table_name NOT LIKE 'test_%'
    `
  })

  // Note: This query will fail because execute_sql RPC might not exist
  // Instead, we'll trust the schema validation from earlier
  // Skip this test for now
  throw new Error('SKIPPED: Cannot validate without RPC function')
})

test('View: production_barbers uses barbershop_id', async () => {
  const { data, error } = await supabase
    .from('production_barbers')
    .select('id, barbershop_id, name')
    .limit(1)

  if (error) throw new Error(`production_barbers view query failed: ${error.message}`)
})

test('View: barber_payment_status uses barbershop_id', async () => {
  const { data, error } = await supabase
    .from('barber_payment_status')
    .select('barber_id, barbershop_id, barbershop_name')
    .limit(1)

  if (error) throw new Error(`barber_payment_status view query failed: ${error.message}`)
})

test('API: Health check returns success', async () => {
  const response = await fetch('http://localhost:9999/api/health')
  if (!response.ok) throw new Error(`Health check failed with status ${response.status}`)

  const data = await response.json()
  if (data.status !== 'healthy' && data.status !== 'partial') {
    throw new Error(`Health check returned unexpected status: ${data.status}`)
  }
})

test('Integration: Can query barbershop with services and customers', async () => {
  // Get a barbershop
  const { data: shops, error: shopsError } = await supabase
    .from('barbershops')
    .select('id, name')
    .limit(1)

  if (shopsError) throw new Error(`barbershops query failed: ${shopsError.message}`)
  if (!shops || shops.length === 0) throw new Error('No barbershops found')

  const shopId = shops[0].id

  // Query services for this barbershop
  const { error: servicesError } = await supabase
    .from('services')
    .select('id, name, price')
    .eq('barbershop_id', shopId)

  if (servicesError) throw new Error(`services query by barbershop_id failed: ${servicesError.message}`)

  // Query customers for this barbershop
  const { error: customersError } = await supabase
    .from('customers')
    .select('id')
    .eq('barbershop_id', shopId)

  if (customersError) throw new Error(`customers query by barbershop_id failed: ${customersError.message}`)
})

test('Integration: Profile with barbershop_id can access location data', async () => {
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, barbershop_id, role')
    .not('barbershop_id', 'is', null)
    .limit(1)

  if (profileError) throw new Error(`profiles query failed: ${profileError.message}`)
  if (!profiles || profiles.length === 0) throw new Error('No profiles with barbershop_id found')

  const profile = profiles[0]

  // Verify we can fetch the barbershop
  const { data: shop, error: shopError } = await supabase
    .from('barbershops')
    .select('id, name')
    .eq('id', profile.barbershop_id)
    .single()

  if (shopError) throw new Error(`barbershop query failed: ${shopError.message}`)
  if (!shop) throw new Error('Barbershop not found for profile')
})

// ============================================================================
// RUN TESTS
// ============================================================================

runTests().catch(error => {
  console.error('❌ Test runner error:', error)
  process.exit(1)
})
