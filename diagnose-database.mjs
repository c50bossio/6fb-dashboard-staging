#!/usr/bin/env node

/**
 * Diagnostic script to check current database state
 * Identifies what data exists and what needs to be seeded
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DEMO_BARBERSHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function diagnoseDatabase() {
  console.log('🔍 Diagnosing database state...\n')

  // Check barbershops table
  console.log('📍 Checking barbershops table...')
  const { data: barbershops, error: bbError } = await supabase
    .from('barbershops')
    .select('id, name, owner_id')
    .limit(5)

  if (bbError) {
    console.log('❌ Error querying barbershops:', bbError.message)
  } else {
    console.log(`✅ Found ${barbershops.length} barbershop(s)`)
    barbershops.forEach(bb => console.log(`   - ${bb.name} (${bb.id})`))

    // Check if demo barbershop exists
    const demoBB = barbershops.find(bb => bb.id === DEMO_BARBERSHOP_ID)
    if (demoBB) {
      console.log(`✅ Demo barbershop found: ${demoBB.name}`)
    } else {
      console.log(`⚠️  Demo barbershop (${DEMO_BARBERSHOP_ID}) not found`)
    }
  }

  console.log('\n👥 Checking users table...')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, name')
    .limit(5)

  if (usersError) {
    console.log('❌ Error querying users:', usersError.message)
  } else {
    console.log(`✅ Found ${users.length} user(s)`)
    users.forEach(u => console.log(`   - ${u.name} (${u.role}) - ${u.email}`))
  }

  console.log('\n💇 Checking services table...')
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, price, barbershop_id')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .limit(10)

  if (servicesError) {
    console.log('❌ Error querying services:', servicesError.message)
  } else {
    console.log(`✅ Found ${services.length} service(s) for demo barbershop`)
    services.forEach(s => console.log(`   - ${s.name}: $${s.price}`))
  }

  console.log('\n📅 Checking appointments table...')
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('id, scheduled_at, service_price, tip_amount, total_amount, status')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .gte('scheduled_at', '2025-10-01T00:00:00')
    .lte('scheduled_at', '2025-10-31T23:59:59')
    .limit(20)

  if (apptError) {
    console.log('❌ Error querying appointments:', apptError.message)
  } else {
    console.log(`✅ Found ${appointments.length} appointment(s) in October 2025`)

    // Check for NULL values
    const nullPrices = appointments.filter(a => a.service_price === null || a.service_price === undefined)
    const nullTotals = appointments.filter(a => a.total_amount === null || a.total_amount === undefined)

    console.log(`\n📊 Data Quality:`)
    console.log(`   - Appointments with NULL service_price: ${nullPrices.length}`)
    console.log(`   - Appointments with NULL total_amount: ${nullTotals.length}`)

    if (appointments.length > 0) {
      console.log(`\n🔍 Sample appointments:`)
      appointments.slice(0, 5).forEach(a => {
        console.log(`   - ${a.scheduled_at}: $${a.service_price} + $${a.tip_amount} = $${a.total_amount} (${a.status})`)
      })
    }

    // Calculate totals for valid appointments
    const validAppointments = appointments.filter(a =>
      a.service_price !== null &&
      a.total_amount !== null &&
      (a.status === 'CONFIRMED' || a.status === 'COMPLETED')
    )

    if (validAppointments.length > 0) {
      const totalRevenue = validAppointments.reduce((sum, a) => sum + parseFloat(a.total_amount || 0), 0)
      const totalTips = validAppointments.reduce((sum, a) => sum + parseFloat(a.tip_amount || 0), 0)

      console.log(`\n💰 Revenue Summary (October 2025):`)
      console.log(`   - Valid appointments: ${validAppointments.length}`)
      console.log(`   - Total revenue: $${totalRevenue.toFixed(2)}`)
      console.log(`   - Total tips: $${totalTips.toFixed(2)}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📋 DIAGNOSIS SUMMARY')
  console.log('='.repeat(60))

  if (appointments && appointments.length > 0) {
    const nullPrices = appointments.filter(a => a.service_price === null)
    if (nullPrices.length > 0) {
      console.log('⚠️  ISSUE: Appointments with NULL service_price values')
      console.log(`   This is causing the AgentKit revenue query to fail`)
      console.log(`   Solution: Update appointments with valid service_price values`)
    } else {
      console.log('✅ All appointments have valid service_price values')
    }
  } else {
    console.log('⚠️  ISSUE: No appointments found for October 2025')
    console.log(`   Solution: Create seed data for appointments`)
  }

  console.log('\n')
}

diagnoseDatabase().catch(console.error)
