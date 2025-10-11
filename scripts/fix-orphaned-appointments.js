#!/usr/bin/env node
/**
 * Fix Orphaned Appointments - Assign Missing barbershop_id
 *
 * Purpose: Fix 28 appointments that have NULL barbershop_id
 * Strategy: Determine barbershop_id from barber_id relationship
 *
 * Run: node scripts/fix-orphaned-appointments.js [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const isDryRun = process.argv.includes('--dry-run')

console.log('\n' + '='.repeat(70))
console.log('🔧 ORPHANED APPOINTMENTS FIX')
console.log(isDryRun ? '⚠️  DRY RUN MODE - No changes will be made' : '✅ LIVE MODE - Changes will be applied')
console.log('='.repeat(70) + '\n')

async function analyzeOrphanedAppointments() {
  console.log('Step 1: Analyzing orphaned appointments...\n')

  // Get appointments with NULL barbershop_id
  const { data: orphaned, error } = await supabase
    .from('appointments')
    .select(`
      id,
      barbershop_id,
      barber_id,
      client_name,
      scheduled_at,
      status,
      barber:profiles!barber_id (
        id,
        full_name,
        barbershop_id
      )
    `)
    .is('barbershop_id', null)

  if (error) {
    console.error('❌ Error querying appointments:', error.message)
    throw error
  }

  console.log(`Found ${orphaned.length} orphaned appointments\n`)

  // Categorize orphaned appointments
  const categories = {
    canFixViaBarber: [],
    hasBarberButNoBarbershop: [],
    noBarberAssigned: []
  }

  orphaned.forEach(appt => {
    if (!appt.barber_id) {
      categories.noBarberAssigned.push(appt)
    } else if (appt.barber && appt.barber.barbershop_id) {
      categories.canFixViaBarber.push(appt)
    } else {
      categories.hasBarberButNoBarbershop.push(appt)
    }
  })

  console.log('📊 Categorization:')
  console.log(`  ✅ Can fix via barber relationship: ${categories.canFixViaBarber.length}`)
  console.log(`  ⚠️  Has barber but barber has no barbershop: ${categories.hasBarberButNoBarbershop.length}`)
  console.log(`  ❌ No barber assigned: ${categories.noBarberAssigned.length}`)
  console.log()

  return categories
}

async function fixAppointmentsViaBarber(appointments) {
  if (appointments.length === 0) {
    console.log('No appointments to fix via barber relationship\n')
    return { success: 0, failed: 0 }
  }

  console.log(`\nStep 2: Fixing ${appointments.length} appointments via barber relationship...\n`)

  let success = 0
  let failed = 0

  for (const appt of appointments) {
    const barbershopId = appt.barber.barbershop_id

    console.log(`Appointment ${appt.id.substring(0, 8)}:`)
    console.log(`  - Barber: ${appt.barber.full_name}`)
    console.log(`  - Barber's barbershop_id: ${barbershopId.substring(0, 12)}...`)
    console.log(`  - Scheduled: ${appt.scheduled_at}`)
    console.log(`  - Client: ${appt.client_name}`)

    if (!isDryRun) {
      const { error } = await supabase
        .from('appointments')
        .update({ barbershop_id: barbershopId })
        .eq('id', appt.id)

      if (error) {
        console.log(`  ❌ Failed to update: ${error.message}`)
        failed++
      } else {
        console.log(`  ✅ Updated successfully`)
        success++
      }
    } else {
      console.log(`  🔄 Would update barbershop_id to: ${barbershopId.substring(0, 12)}...`)
      success++
    }
    console.log()
  }

  return { success, failed }
}

async function reportUnfixableAppointments(categories) {
  console.log('\nStep 3: Reporting unfixable appointments...\n')

  if (categories.hasBarberButNoBarbershop.length > 0) {
    console.log('⚠️  Appointments with barbers who have no barbershop:')
    categories.hasBarberButNoBarbershop.forEach(appt => {
      console.log(`  - Appointment ${appt.id.substring(0, 8)}: Barber ${appt.barber_id.substring(0, 8)} has no barbershop_id`)
      console.log(`    Client: ${appt.client_name}, Scheduled: ${appt.scheduled_at}`)
    })
    console.log()
    console.log('   → These barbers need their barbershop_id set first')
    console.log()
  }

  if (categories.noBarberAssigned.length > 0) {
    console.log('❌ Appointments with no barber assigned:')
    categories.noBarberAssigned.forEach(appt => {
      console.log(`  - Appointment ${appt.id.substring(0, 8)}: Client ${appt.client_name}`)
      console.log(`    Scheduled: ${appt.scheduled_at}, Status: ${appt.status}`)
    })
    console.log()
    console.log('   → These need manual review - cannot determine barbershop')
    console.log()
  }
}

async function validateFix() {
  console.log('\nStep 4: Validating fix...\n')

  const { count: beforeCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .is('barbershop_id', null)

  console.log(`Remaining orphaned appointments: ${beforeCount}`)

  if (beforeCount === 0) {
    console.log('✅ All appointments now have barbershop_id!\n')
  } else {
    console.log(`⚠️  ${beforeCount} appointments still need attention\n`)
  }

  return beforeCount
}

async function generateSummary(results, remainingOrphans) {
  console.log('=' + '='.repeat(69))
  console.log('📋 FIX SUMMARY')
  console.log('=' + '='.repeat(69))

  console.log(`\n✅ Successfully fixed: ${results.success}`)
  console.log(`❌ Failed to fix: ${results.failed}`)
  console.log(`⚠️  Remaining orphans: ${remainingOrphans}`)

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN - No actual changes were made')
    console.log('   Run without --dry-run flag to apply fixes')
  } else if (results.success > 0) {
    console.log('\n✅ Changes applied successfully')
  }

  console.log('\n' + '='.repeat(70))

  if (remainingOrphans > 0) {
    console.log('\n📋 Next Steps for Remaining Orphans:')
    console.log('1. Review barber profiles without barbershop_id')
    console.log('2. Assign barbershop_id to those barbers')
    console.log('3. Re-run this script to fix remaining appointments')
    console.log('4. Manually review appointments with no barber assigned')
  }

  console.log()
}

// Main execution
(async () => {
  try {
    const categories = await analyzeOrphanedAppointments()

    const results = await fixAppointmentsViaBarber(categories.canFixViaBarber)

    await reportUnfixableAppointments(categories)

    const remainingOrphans = isDryRun ?
      (categories.hasBarberButNoBarbershop.length + categories.noBarberAssigned.length) :
      await validateFix()

    await generateSummary(results, remainingOrphans)

    if (results.failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Fix failed:', error)
    process.exit(1)
  }
})()
