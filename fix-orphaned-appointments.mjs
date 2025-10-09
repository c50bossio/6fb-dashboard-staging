#!/usr/bin/env node

/**
 * Fix appointments with NULL service_id by assigning a default service
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

async function fixOrphanedAppointments() {
  console.log('🔧 Finding appointments with NULL service_id...\n')

  // Find appointments with NULL service_id
  const { data: orphanedAppointments, error: findError } = await supabase
    .from('appointments')
    .select('id, scheduled_at, service_id, service_price, total_amount, status, client_name')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .is('service_id', null)

  if (findError) {
    console.error('❌ Error finding appointments:', findError.message)
    return
  }

  if (!orphanedAppointments || orphanedAppointments.length === 0) {
    console.log('✅ No orphaned appointments found!')
    return
  }

  console.log(`Found ${orphanedAppointments.length} appointment(s) without service_id:\n`)
  orphanedAppointments.forEach(a => {
    console.log(`   - ID: ${a.id}`)
    console.log(`     Client: ${a.client_name || 'Unknown'}`)
    console.log(`     Scheduled: ${a.scheduled_at}`)
    console.log(`     Status: ${a.status}`)
    console.log()
  })

  // Get services to find default (Haircut)
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, price')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)

  if (servicesError) {
    console.error('❌ Error fetching services:', servicesError.message)
    return
  }

  // Find "Haircut" service (most common)
  const haircutService = services.find(s => s.name === 'Haircut')

  if (!haircutService) {
    console.error('❌ No "Haircut" service found to use as default')
    return
  }

  console.log(`Using default service: ${haircutService.name} ($${haircutService.price})`)
  console.log()

  // Fix each appointment
  console.log('🔧 Fixing appointments...\n')

  for (const appointment of orphanedAppointments) {
    const servicePrice = parseFloat(haircutService.price)
    const tipAmount = 0
    const totalAmount = servicePrice + tipAmount

    console.log(`Updating appointment ${appointment.id}:`)
    console.log(`   Client: ${appointment.client_name || 'Unknown'}`)
    console.log(`   Assigning service: ${haircutService.name}`)
    console.log(`   service_id: null → ${haircutService.id}`)
    console.log(`   service_price: null → $${servicePrice}`)
    console.log(`   total_amount: null → $${totalAmount}`)

    // Update the appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        service_id: haircutService.id,
        service_price: servicePrice,
        tip_amount: tipAmount,
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
  console.log('✅ Verification: Checking for remaining issues...\n')

  const { data: remainingOrphaned, error: verifyError1 } = await supabase
    .from('appointments')
    .select('id')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .is('service_id', null)

  const { data: remainingNull, error: verifyError2 } = await supabase
    .from('appointments')
    .select('id')
    .eq('barbershop_id', DEMO_BARBERSHOP_ID)
    .is('service_price', null)

  if (verifyError1 || verifyError2) {
    console.error('❌ Error verifying')
    return
  }

  if ((remainingOrphaned && remainingOrphaned.length > 0) || (remainingNull && remainingNull.length > 0)) {
    console.log(`⚠️  Still ${remainingOrphaned?.length || 0} orphaned, ${remainingNull?.length || 0} NULL prices`)
  } else {
    console.log('✅ All appointments now have valid service_id and service_price!')
  }

  // Show updated revenue summary
  console.log('\n💰 Updated Revenue Summary (October 2025)...')

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

  console.log('\n✅ Fix complete! AgentKit should now work without errors.\n')
}

fixOrphanedAppointments().catch(console.error)
