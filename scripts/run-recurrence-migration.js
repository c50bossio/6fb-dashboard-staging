#!/usr/bin/env node
/**
 * Recurrence Rule Format Migration Runner
 *
 * Migrates all recurring appointments from legacy format to standardized JSON format.
 * Uses Supabase client for database access.
 */

const { createClient } = require('@supabase/supabase-js');
const { parseRecurrenceRule, migrateToJsonFormat } = require('../lib/recurring-format-parser');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Analyze current format distribution
 */
async function analyzeFormats() {
  console.log('📊 Analyzing recurrence rule formats...\n');

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, recurrence_rule, client_name, scheduled_at')
    .eq('is_recurring', true);

  if (error) {
    console.error('❌ Error fetching appointments:', error);
    return null;
  }

  const stats = {
    total: appointments.length,
    json: 0,
    legacy: 0,
    invalid: 0,
    migrationNeeded: []
  };

  for (const apt of appointments) {
    const parseResult = parseRecurrenceRule(apt.recurrence_rule);

    if (!parseResult.success) {
      stats.invalid++;
      console.warn(`  ⚠️ Invalid: ${apt.client_name || apt.id} - ${parseResult.error}`);
    } else {
      if (parseResult.format === 'json') {
        stats.json++;
      } else if (parseResult.format === 'legacy') {
        stats.legacy++;
        stats.migrationNeeded.push(apt);
      }
    }
  }

  console.log('═══════════════════════════════════════');
  console.log('Format Distribution:');
  console.log('═══════════════════════════════════════');
  console.log(`Total recurring appointments: ${stats.total}`);
  console.log(`  ✅ JSON format (ready): ${stats.json}`);
  console.log(`  🔄 Legacy format (needs migration): ${stats.legacy}`);
  console.log(`  ❌ Invalid format: ${stats.invalid}`);
  console.log('═══════════════════════════════════════\n');

  return stats;
}

/**
 * Migrate a single appointment
 */
async function migrateAppointment(appointment, dryRun = false) {
  const migrationResult = migrateToJsonFormat(appointment.recurrence_rule, {
    defaultTimezone: 'America/Los_Angeles',
    defaultDuration: appointment.duration_minutes || 60
  });

  if (!migrationResult.success) {
    return {
      success: false,
      appointmentId: appointment.id,
      error: migrationResult.error
    };
  }

  if (dryRun) {
    return {
      success: true,
      appointmentId: appointment.id,
      clientName: appointment.client_name,
      dryRun: true,
      before: appointment.recurrence_rule,
      after: migrationResult.result
    };
  }

  // Perform actual database update
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ recurrence_rule: migrationResult.result })
    .eq('id', appointment.id);

  if (updateError) {
    return {
      success: false,
      appointmentId: appointment.id,
      error: updateError.message
    };
  }

  return {
    success: true,
    appointmentId: appointment.id,
    clientName: appointment.client_name
  };
}

/**
 * Run migration on all legacy appointments
 */
async function runMigration(dryRun = false) {
  console.log(`🚀 Starting migration (${dryRun ? 'DRY RUN' : 'LIVE'})...\n`);

  // Step 1: Analyze current state
  const stats = await analyzeFormats();
  if (!stats) {
    console.error('❌ Failed to analyze formats');
    process.exit(1);
  }

  if (stats.legacy === 0) {
    console.log('✅ All appointments already in JSON format - no migration needed!');
    return;
  }

  // Step 2: Get appointments that need migration
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, recurrence_rule, client_name, duration_minutes')
    .eq('is_recurring', true);

  if (error) {
    console.error('❌ Error fetching appointments:', error);
    process.exit(1);
  }

  // Filter to only legacy format
  const legacyAppointments = appointments.filter(apt => {
    const result = parseRecurrenceRule(apt.recurrence_rule);
    return result.success && result.format === 'legacy';
  });

  console.log(`📝 Found ${legacyAppointments.length} appointments to migrate\n`);

  if (dryRun) {
    console.log('═════════════ DRY RUN MODE ════════════');
    console.log('Changes will be displayed but NOT saved\n');
  }

  // Step 3: Migrate each appointment
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const apt of legacyAppointments) {
    const result = await migrateAppointment(apt, dryRun);

    if (result.success) {
      results.success++;
      if (dryRun) {
        console.log(`✓ ${result.clientName || result.appointmentId}`);
        console.log(`  Before: ${result.before.substring(0, 60)}...`);
        console.log(`  After:  ${result.after.substring(0, 60)}...\n`);
      } else {
        console.log(`✅ Migrated: ${result.clientName || result.appointmentId}`);
      }
    } else {
      results.failed++;
      results.errors.push(result);
      console.error(`❌ Failed: ${result.appointmentId} - ${result.error}`);
    }
  }

  // Step 4: Summary
  console.log('\n═══════════════════════════════════════');
  console.log('Migration Summary:');
  console.log('═══════════════════════════════════════');
  console.log(`Total processed: ${legacyAppointments.length}`);
  console.log(`  ✅ Successful: ${results.success}`);
  console.log(`  ❌ Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\n⚠️ Errors:');
    results.errors.forEach(err => {
      console.log(`  - ${err.appointmentId}: ${err.error}`);
    });
  }
  console.log('═══════════════════════════════════════\n');

  if (!dryRun && results.success > 0) {
    console.log('🎉 Migration complete! Verifying results...\n');
    await analyzeFormats();
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'analyze':
      await analyzeFormats();
      break;

    case 'dry-run':
      await runMigration(true);
      break;

    case 'migrate':
      console.log('⚠️  WARNING: This will modify the database!');
      console.log('Press Ctrl+C within 5 seconds to cancel...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await runMigration(false);
      break;

    default:
      console.log('Usage:');
      console.log('  node scripts/run-recurrence-migration.js analyze   # Analyze formats');
      console.log('  node scripts/run-recurrence-migration.js dry-run   # Test migration');
      console.log('  node scripts/run-recurrence-migration.js migrate   # Run migration');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
