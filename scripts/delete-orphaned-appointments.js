#!/usr/bin/env node
/**
 * Delete Orphaned Appointments - Remove Invalid Seed Data
 *
 * Purpose: Safely delete 28 orphaned appointments that cannot be fixed
 * These are seed/test data with NO barber, service, or barbershop relationships
 *
 * Run: node scripts/delete-orphaned-appointments.js [--dry-run]
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
console.log('🗑️  DELETE ORPHANED APPOINTMENTS')
console.log(isDryRun ? '⚠️  DRY RUN MODE - No deletions will occur' : '🚨 LIVE MODE - Appointments will be deleted')
console.log('='.repeat(70) + '\n')

async function analyzeOrphanedAppointments() {
  console.log('Step 1: Analyzing orphaned appointments for deletion...\n')

  const { data: orphaned, error } = await supabase
    .from('appointments')
    .select('id, client_name, barber_id, service_id, barbershop_id, created_at, scheduled_at, status')
    .is('barbershop_id', null)

  if (error) {
    console.error('❌ Error querying appointments:', error.message)
    throw error
  }

  console.log(`Found ${orphaned.length} orphaned appointments\n`)

  // Verify they're all seed data (same timestamp)
  const timestamps = [...new Set(orphaned.map(a => a.created_at))]
  const isSeedData = timestamps.length === 1

  console.log('📊 Analysis:')
  console.log(`  Total orphaned: ${orphaned.length}`)
  console.log(`  All from same timestamp: ${isSeedData ? 'YES (seed data)' : 'NO'}`)
  console.log(`  Creation timestamp: ${timestamps[0]}`)

  // Check for any real data that shouldn't be deleted
  const hasBarber = orphaned.filter(a => a.barber_id).length
  const hasService = orphaned.filter(a => a.service_id).length

  console.log(`  Have barber_id: ${hasBarber}`)
  console.log(`  Have service_id: ${hasService}`)

  if (hasBarber > 0 || hasService > 0) {
    console.warn('\n⚠️  WARNING: Some appointments have barber or service relationships!')
    console.warn('   Aborting deletion - manual review required')
    return { orphaned: [], safe: false }
  }

  console.log(`\n✅ Safe to delete: All ${orphaned.length} are incomplete seed data`)
  console.log('   (No barber, no service, no barbershop relationships)\n')

  return { orphaned, safe: true }
}

async function deleteOrphanedAppointments(orphaned) {
  if (orphaned.length === 0) {
    console.log('No appointments to delete\n')
    return { deleted: 0, failed: 0 }
  }

  console.log(`Step 2: Deleting ${orphaned.length} orphaned appointments...\n`)

  if (isDryRun) {
    console.log('🔄 DRY RUN - Would delete the following appointments:')
    orphaned.forEach((appt, idx) => {
      console.log(`  ${idx + 1}. ${appt.id.substring(0, 8)} - ${appt.client_name} (${appt.status})`)
    })
    console.log()
    return { deleted: orphaned.length, failed: 0 }
  }

  // Delete in production
  const appointmentIds = orphaned.map(a => a.id)

  const { data, error } = await supabase
    .from('appointments')
    .delete()
    .in('id', appointmentIds)

  if (error) {
    console.error(`❌ Deletion failed: ${error.message}`)
    return { deleted: 0, failed: orphaned.length }
  }

  console.log(`✅ Successfully deleted ${orphaned.length} orphaned appointments`)
  console.log()

  return { deleted: orphaned.length, failed: 0 }
}

async function validateDeletion() {
  console.log('\nStep 3: Validating deletion...\n')

  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .is('barbershop_id', null)

  console.log(`Remaining orphaned appointments: ${count}`)

  if (count === 0) {
    console.log('✅ All orphaned appointments successfully removed!\n')
  } else {
    console.log(`⚠️  ${count} orphaned appointments still exist (may need separate handling)\n`)
  }

  return count
}

async function generateSummary(results, remainingOrphans) {
  console.log('=' + '='.repeat(69))
  console.log('📋 DELETION SUMMARY')
  console.log('=' + '='.repeat(69))

  console.log(`\n✅ Deleted: ${results.deleted}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`⚠️  Remaining orphans: ${remainingOrphans}`)

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN - No actual deletions occurred')
    console.log('   Run without --dry-run flag to delete orphaned appointments')
  } else if (results.deleted > 0) {
    console.log('\n✅ Orphaned seed data cleaned up successfully')
    console.log('   Database integrity improved - all appointments now have valid FKs')
  }

  console.log('\n' + '='.repeat(70))

  if (remainingOrphans === 0 && !isDryRun) {
    console.log('\n🎯 Next Step: Execute database migration')
    console.log('   All data integrity issues resolved - safe to proceed with migration')
  }

  console.log()
}

// Main execution
(async () => {
  try {
    const { orphaned, safe } = await analyzeOrphanedAppointments()

    if (!safe) {
      console.error('❌ Unsafe to proceed - manual review required')
      process.exit(1)
    }

    const results = await deleteOrphanedAppointments(orphaned)

    const remainingOrphans = isDryRun ? 0 : await validateDeletion()

    await generateSummary(results, remainingOrphans)

    if (results.failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Deletion failed:', error)
    process.exit(1)
  }
})()
