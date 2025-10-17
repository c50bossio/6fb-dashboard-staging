/**
 * Comprehensive Analysis of shop_id Columns
 *
 * This script analyzes all tables with shop_id columns to determine:
 * 1. Which tables have shop_id vs barbershop_id
 * 2. Data population in each column
 * 3. Foreign key relationships
 * 4. Migration recommendations
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeShopIdTables() {
  console.log('\n🔍 Comprehensive shop_id Analysis\n');
  console.log('='.repeat(80));

  // Known tables with shop_id column (from previous database analysis)
  const knownTables = [
    'appointment_records',
    'barbers',
    'customers',
    'customers_backup',
    'inventory',
    'invoice_history',
    'payout_history',
    'production_barbers',
    'profiles',
    'services',
    'user_shop_access_history'
  ];

  console.log('\n📋 Analyzing tables with shop_id column:');
  console.log(knownTables.join(', '));
  console.log('');

  return await analyzeKnownTables(knownTables);
}

async function analyzeKnownTables(tables) {
  console.log('\n📊 Analyzing known tables with shop_id...\n');

  for (const tableName of tables) {
    await analyzeTable(tableName);
  }
}

async function analyzeTable(tableName) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📦 Table: ${tableName}`);
  console.log('─'.repeat(80));

  try {
    // Determine table status based on known schema
    const tablesWithBoth = ['appointment_records', 'customers', 'customers_backup', 'profiles', 'services'];
    const legacyTables = ['barbers', 'production_barbers', 'inventory', 'invoice_history', 'payout_history', 'user_shop_access_history'];

    if (tablesWithBoth.includes(tableName)) {
      console.log('  🔄 Status: HAS BOTH shop_id AND barbershop_id (DUPLICATE COLUMNS)');
    } else if (legacyTables.includes(tableName)) {
      console.log('  📜 Status: Legacy table with ONLY shop_id');
    }

    // Count data in both columns
    const countQuery = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const totalRows = countQuery.count || 0;
    console.log(`  📊 Total rows: ${totalRows}`);

    if (totalRows > 0) {
      // Try to count shop_id population
      try {
        const { count: shopIdCount } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .not('shop_id', 'is', null);

        console.log(`  📌 Rows with shop_id: ${shopIdCount || 0}`);
      } catch (e) {
        console.log('  ⚠️ Could not count shop_id rows');
      }

      // Try to count barbershop_id population
      try {
        const { count: barbershopIdCount } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
          .not('barbershop_id', 'is', null);

        console.log(`  ✅ Rows with barbershop_id: ${barbershopIdCount || 0}`);
      } catch (e) {
        console.log('  ⚠️ Table does not have barbershop_id column');
      }
    }

    // Provide recommendation
    console.log('\n  💡 Recommendation:');
    if (tableName.includes('backup') || tableName.includes('history')) {
      console.log('     → Archive table - low priority for migration');
    } else if (tableName === 'profiles' || tableName === 'services' || tableName === 'customers') {
      console.log('     → CRITICAL - Migrate shop_id data to barbershop_id immediately');
      console.log('     → High impact on calendar, booking, and services');
    } else if (tableName === 'barbers' || tableName === 'production_barbers') {
      console.log('     → Legacy table - use profiles + barbershop_staff instead');
    } else {
      console.log('     → Review table usage and migrate if actively used');
    }

  } catch (error) {
    console.log(`  ❌ Error analyzing table: ${error.message}`);
  }
}

async function generateReport() {
  console.log('\n\n📝 MIGRATION ANALYSIS REPORT');
  console.log('='.repeat(80));

  console.log('\n🎯 CRITICAL TABLES REQUIRING IMMEDIATE MIGRATION:');
  console.log('   1. profiles - User shop assignments (affects all queries)');
  console.log('   2. services - Service catalog (affects booking)');
  console.log('   3. customers - Customer data (affects appointments)');

  console.log('\n📦 LEGACY TABLES TO DEPRECATE:');
  console.log('   1. barbers - Use profiles + barbershop_staff');
  console.log('   2. production_barbers - Use profiles + barbershop_staff');
  console.log('   3. inventory - Use barbershop_inventory');

  console.log('\n📚 ARCHIVE TABLES (Low Priority):');
  console.log('   1. customers_backup - Backup table');
  console.log('   2. invoice_history - Historical data');
  console.log('   3. payout_history - Historical data');
  console.log('   4. user_shop_access_history - Audit trail (shop_id OK here)');

  console.log('\n✅ MIGRATION RECOMMENDATION:');
  console.log('   Phase 1: Migrate profiles.shop_id → profiles.barbershop_id');
  console.log('   Phase 2: Migrate services.shop_id → services.barbershop_id');
  console.log('   Phase 3: Migrate customers.shop_id → customers.barbershop_id');
  console.log('   Phase 4: Update all code references');
  console.log('   Phase 5: Drop shop_id columns after verification');

  console.log('\n' + '='.repeat(80));
}

// Run analysis
analyzeShopIdTables()
  .then(() => generateReport())
  .then(() => {
    console.log('\n✅ Analysis complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  });
