#!/usr/bin/env node

/**
 * Verify Seeded Data for Demo Account
 *
 * Check what data actually exists in the database for the Tomb45 Channelside location.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const BARBERSHOP_ID = 'c5a58548-8f23-426c-bedc-49a83d238724'

async function verifyData() {
  console.log('🔍 Verifying seeded data for Tomb45 Channelside\n')
  console.log('Barbershop ID:', BARBERSHOP_ID)
  console.log()

  try {
    // Check barbershops table
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', BARBERSHOP_ID)
      .single()

    console.log('📍 BARBERSHOPS TABLE:')
    if (shopError || !barbershop) {
      console.log('   ❌ Barbershop not found!')
      console.log('   Error:', shopError?.message || 'No data')
    } else {
      console.log('   ✅ Found:', barbershop.name)
      console.log('   - City:', barbershop.city)
      console.log('   - State:', barbershop.state)
      console.log('   - Owner ID:', barbershop.owner_id)
    }
    console.log()

    // Check services table
    const { data: services, error: servicesError, count: servicesCount } = await supabase
      .from('services')
      .select('*', { count: 'exact' })
      .eq('barbershop_id', BARBERSHOP_ID)

    console.log('💈 SERVICES TABLE:')
    if (servicesError) {
      console.log('   ❌ Error:', servicesError.message)
    } else {
      console.log('   Count:', servicesCount || 0)
      if (services && services.length > 0) {
        console.log('   Sample services:')
        services.slice(0, 3).forEach(s => {
          console.log(`     - ${s.name} ($${s.price})`)
        })
      }
    }
    console.log()

    // Check customers table
    const { data: customers, error: customersError, count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('barbershop_id', BARBERSHOP_ID)

    console.log('👥 CUSTOMERS TABLE:')
    if (customersError) {
      console.log('   ❌ Error:', customersError.message)
    } else {
      console.log('   Count:', customersCount || 0)
      if (customers && customers.length > 0) {
        console.log('   Sample customers:')
        customers.slice(0, 3).forEach(c => {
          console.log(`     - ${c.full_name || c.name} (${c.total_visits || 0} visits)`)
        })
      }
    }
    console.log()

    // Check barbers table
    const { data: barbers, error: barbersError, count: barbersCount } = await supabase
      .from('barbers')
      .select('*', { count: 'exact' })
      .eq('barbershop_id', BARBERSHOP_ID)

    console.log('💇 BARBERS TABLE:')
    if (barbersError) {
      console.log('   ❌ Error:', barbersError.message)
    } else {
      console.log('   Count:', barbersCount || 0)
      if (barbers && barbers.length > 0) {
        console.log('   Sample barbers:')
        barbers.slice(0, 3).forEach(b => {
          console.log(`     - ${b.name}`)
        })
      }
    }
    console.log()

    // Check appointments table
    const { data: appointments, error: appointmentsError, count: appointmentsCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('barbershop_id', BARBERSHOP_ID)

    console.log('📅 APPOINTMENTS TABLE:')
    if (appointmentsError) {
      console.log('   ❌ Error:', appointmentsError.message)
    } else {
      console.log('   Count:', appointmentsCount || 0)
      if (appointments && appointments.length > 0) {
        console.log('   Sample appointments:')
        appointments.slice(0, 3).forEach(a => {
          console.log(`     - ${a.client_name} on ${a.scheduled_at || a.date}`)
        })
      }
    }
    console.log()

    // Summary
    console.log('📊 SUMMARY:')
    console.log('   Barbershop:', shopError ? '❌' : '✅')
    console.log('   Services:', (servicesCount || 0) > 0 ? `✅ (${servicesCount})` : '❌ None')
    console.log('   Customers:', (customersCount || 0) > 0 ? `✅ (${customersCount})` : '❌ None')
    console.log('   Barbers:', (barbersCount || 0) > 0 ? `✅ (${barbersCount})` : '❌ None')
    console.log('   Appointments:', (appointmentsCount || 0) > 0 ? `✅ (${appointmentsCount})` : '❌ None')
    console.log()

    const needsSeeding = !servicesCount && !customersCount && !appointmentsCount
    if (needsSeeding) {
      console.log('⚠️  NO DATA FOUND - You need to run the seed script!')
      console.log()
      console.log('Run one of these commands:')
      console.log('  node database/seed-demo-account.js')
      console.log('  OR')
      console.log('  psql $DATABASE_URL -f database/seed-demo-account-complete.sql')
    } else {
      console.log('✅ Data exists! Dashboard should load properly.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

verifyData()
