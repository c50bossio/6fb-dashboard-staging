#!/usr/bin/env node

/**
 * Fix appointments with NULL service_price values
 * Updates prices based on linked service_id
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const DEMO_BARBERSHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function fixNullPrices() {
  console.log('🔧 Finding appointments with NULL service_price...\n')

  // Find appointments with NULL service_price
  const { data: nullAppointments, error: findError } = await supabase
    .from('appointments')
    .select('id, scheduled_at, service_id, service_price, total_amount, status')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .is('service_price', null)

  if (findError) {
    console.error('❌ Error finding appointments:', findError.message)
    return
  }

  if (!nullAppointments || nullAppointments.length === 0) {
    console.log('✅ No appointments with NULL service_price found!')
    return
  }

  console.log(`Found ${nullAppointments.length} appointment(s) with NULL prices:\n`)
  nullAppointments.forEach(a => {
    console.log(`   - ID: ${a.id}`)
    console.log(`     Scheduled: ${a.scheduled_at}`)
    console.log(`     Service ID: ${a.service_id}`)
    console.log(`     Current: service_price=${a.service_price}, total_amount=${a.total_amount}`)
    console.log()
  })

  // Get all services to determine correct prices
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, price')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)

  if (servicesError) {
    console.error('❌ Error fetching services:', servicesError.message)
    return
  }

  console.log(`Available services:`)
  services.forEach(s => console.log(`   - ${s.name}: $${s.price} (${s.id})`))
  console.log()

  // Fix each appointment
  console.log('🔧 Fixing appointments...\n')

  for (const appointment of nullAppointments) {
    // Find the service for this appointment
    const service = services.find(s => s.id === appointment.service_id)

    if (!service) {
      console.log(`⚠️  No service found for appointment ${appointment.id}`)
      console.log(`   Service ID: ${appointment.service_id}`)
      console.log(`   Skipping...`)
      continue
    }

    // Calculate correct total (service_price + tip_amount, default tip to 0)
    const servicePrice = parseFloat(service.price)
    const tipAmount = 0 // Default to 0 since original had 0
    const totalAmount = servicePrice + tipAmount

    console.log(`Updating appointment ${appointment.id}:`)
    console.log(`   Service: ${service.name}`)
    console.log(`   service_price: NULL → $${servicePrice}`)
    console.log(`   total_amount: ${appointment.total_amount} → $${totalAmount}`)

    // Update the appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        service_price: servicePrice,
        total_amount: totalAmount
      })
      .eq('id', appointment.id)

    if (updateError) {
      console.log(`   ❌ Error updating: ${updateError.message}`)
    } else {
      console.log(`   ✅ Updated successfully`)
    }
    console.log()
  }

  // Verify the fix
  console.log('✅ Verification: Checking for remaining NULL values...\n')

  const { data: remainingNull, error: verifyError } = await supabase
    .from('appointments')
    .select('id')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .is('service_price', null)

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError.message)
    return
  }

  if (remainingNull && remainingNull.length > 0) {
    console.log(`⚠️  Still ${remainingNull.length} appointment(s) with NULL prices`)
  } else {
    console.log('✅ All appointments now have valid service_price values!')
  }

  // Show updated revenue summary
  console.log('\n💰 Updated Revenue Summary...')

  const { data: allAppointments, error: summaryError } = await supabase
    .from('appointments')
    .select('service_price, tip_amount, total_amount, status')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .gte('scheduled_at', '2025-10-01T00:00:00')
    .lte('scheduled_at', '2025-10-31T23:59:59')
    .in('status', ['CONFIRMED', 'COMPLETED'])

  if (!summaryError && allAppointments) {
    const totalRevenue = allAppointments.reduce((sum, a) => sum + parseFloat(a.total_amount || 0), 0)
    const totalTips = allAppointments.reduce((sum, a) => sum + parseFloat(a.tip_amount || 0), 0)
    const totalService = allAppointments.reduce((sum, a) => sum + parseFloat(a.service_price || 0), 0)

    console.log(`   - Confirmed/Completed appointments: ${allAppointments.length}`)
    console.log(`   - Service revenue: $${totalService.toFixed(2)}`)
    console.log(`   - Tips: $${totalTips.toFixed(2)}`)
    console.log(`   - Total revenue: $${totalRevenue.toFixed(2)}`)
  }

  console.log('\n✅ Fix complete!\n')
}

fixNullPrices().catch(console.error)
