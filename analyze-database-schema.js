#!/usr/bin/env node

/**
 * Comprehensive Database Schema Analysis Script
 * Analyzes the 6FB AI Agent System database for structural conflicts
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Analysis results
const analysis = {
  shopIdTables: [],
  barbershopIdTables: [],
  bothIdTables: [],
  foreignKeys: [],
  dataPopulation: {},
  duplicateStaff: [],
  orphanedRecords: [],
  schemaConflicts: []
}

async function getAllTables() {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE')

  if (error) {
    console.error('Error fetching tables:', error)
    return []
  }

  return data.map(t => t.table_name)
}

async function getTableColumns(tableName) {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `
  })

  if (error) {
    // Fallback: Try to query the table directly to infer columns
    const { data: sample, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (!sampleError && sample && sample.length > 0) {
      return Object.keys(sample[0]).map(col => ({ column_name: col }))
    }

    return []
  }

  return data || []
}

async function getForeignKeys() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `
  })

  if (error) {
    console.warn('Could not fetch foreign keys (might need RPC function):', error.message)
    return []
  }

  return data || []
}

async function checkDataPopulation(tableName, column) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .not(column, 'is', null)

  if (error) {
    return { error: error.message }
  }

  return { count: count || 0 }
}

async function analyzeShopIdConflict() {
  console.log('\n========================================')
  console.log('1. ANALYZING SHOP_ID vs BARBERSHOP_ID CONFLICT')
  console.log('========================================\n')

  const tables = await getAllTables()

  for (const table of tables) {
    const columns = await getTableColumns(table)
    const columnNames = columns.map(c => c.column_name)

    const hasShopId = columnNames.includes('shop_id')
    const hasBarbershopId = columnNames.includes('barbershop_id')

    if (hasShopId && hasBarbershopId) {
      analysis.bothIdTables.push(table)

      // Check data population
      const shopIdPop = await checkDataPopulation(table, 'shop_id')
      const barbershopIdPop = await checkDataPopulation(table, 'barbershop_id')

      analysis.dataPopulation[table] = {
        shop_id: shopIdPop,
        barbershop_id: barbershopIdPop
      }

      console.log(`⚠️  CRITICAL: ${table} has BOTH shop_id AND barbershop_id`)
      console.log(`    - shop_id rows: ${shopIdPop.count ?? 'ERROR: ' + shopIdPop.error}`)
      console.log(`    - barbershop_id rows: ${barbershopIdPop.count ?? 'ERROR: ' + barbershopIdPop.error}`)
    } else if (hasShopId) {
      analysis.shopIdTables.push(table)
      const shopIdPop = await checkDataPopulation(table, 'shop_id')
      analysis.dataPopulation[table] = { shop_id: shopIdPop }
      console.log(`📋 ${table} uses shop_id only (${shopIdPop.count ?? 'ERROR'} rows)`)
    } else if (hasBarbershopId) {
      analysis.barbershopIdTables.push(table)
      const barbershopIdPop = await checkDataPopulation(table, 'barbershop_id')
      analysis.dataPopulation[table] = { barbershop_id: barbershopIdPop }
      console.log(`✅ ${table} uses barbershop_id only (${barbershopIdPop.count ?? 'ERROR'} rows)`)
    }
  }

  console.log('\n--- SUMMARY ---')
  console.log(`Tables with BOTH identifiers (DANGER): ${analysis.bothIdTables.length}`)
  console.log(`Tables with shop_id only (DEPRECATED): ${analysis.shopIdTables.length}`)
  console.log(`Tables with barbershop_id only (CORRECT): ${analysis.barbershopIdTables.length}`)
}

async function analyzeStaffDualTable() {
  console.log('\n========================================')
  console.log('2. ANALYZING STAFF/BARBER DUAL-TABLE PATTERN')
  console.log('========================================\n')

  // Check if tables exist
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, barbershop_id')
    .in('role', ['BARBER', 'SHOP_OWNER'])

  const { data: barbers, error: barbersError } = await supabase
    .from('barbers')
    .select('id, name, email, barbershop_id, shop_id')

  if (profilesError) {
    console.error('❌ Error querying profiles:', profilesError.message)
  } else {
    console.log(`✅ Profiles table: ${profiles?.length || 0} barber/owner records`)
  }

  if (barbersError) {
    console.error('❌ Error querying barbers:', barbersError.message)
  } else {
    console.log(`✅ Barbers table: ${barbers?.length || 0} barber records`)
  }

  // Check for duplicates
  if (profiles && barbers) {
    const profileIds = new Set(profiles.map(p => p.id))
    const duplicates = barbers.filter(b => profileIds.has(b.id))

    analysis.duplicateStaff = duplicates
    console.log(`\n${duplicates.length > 0 ? '⚠️' : '✅'} Duplicate staff records: ${duplicates.length}`)

    if (duplicates.length > 0) {
      console.log('Duplicates:')
      duplicates.forEach(d => console.log(`  - ID: ${d.id}, Name: ${d.name}`))
    }
  }
}

async function analyzeForeignKeys() {
  console.log('\n========================================')
  console.log('3. ANALYZING FOREIGN KEY INTEGRITY')
  console.log('========================================\n')

  const fks = await getForeignKeys()
  analysis.foreignKeys = fks

  // Group by table
  const fksByTable = {}
  fks.forEach(fk => {
    if (!fksByTable[fk.table_name]) {
      fksByTable[fk.table_name] = []
    }
    fksByTable[fk.table_name].push(fk)
  })

  console.log(`Total foreign key constraints: ${fks.length}\n`)

  // Check for shop_id foreign keys
  const shopIdFKs = fks.filter(fk => fk.column_name === 'shop_id')
  const barbershopIdFKs = fks.filter(fk => fk.column_name === 'barbershop_id')

  console.log(`Foreign keys using shop_id: ${shopIdFKs.length}`)
  shopIdFKs.forEach(fk => {
    console.log(`  - ${fk.table_name}.shop_id → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
  })

  console.log(`\nForeign keys using barbershop_id: ${barbershopIdFKs.length}`)
  barbershopIdFKs.forEach(fk => {
    console.log(`  - ${fk.table_name}.barbershop_id → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
  })

  // Check for orphaned records (example with appointments)
  await checkOrphanedRecords()
}

async function checkOrphanedRecords() {
  console.log('\n--- CHECKING FOR ORPHANED RECORDS ---')

  // Check appointments with null barbershop_id
  const { count: orphanedAppointments } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .is('barbershop_id', null)
    .not('id', 'is', null)

  if (orphanedAppointments && orphanedAppointments > 0) {
    console.log(`⚠️  Appointments with null barbershop_id: ${orphanedAppointments}`)
    analysis.orphanedRecords.push({ table: 'appointments', field: 'barbershop_id', count: orphanedAppointments })
  } else {
    console.log(`✅ No orphaned appointments (barbershop_id)`)
  }

  // Check customers with null barbershop_id
  const { count: orphanedCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .is('barbershop_id', null)

  if (orphanedCustomers && orphanedCustomers > 0) {
    console.log(`⚠️  Customers with null barbershop_id: ${orphanedCustomers}`)
    analysis.orphanedRecords.push({ table: 'customers', field: 'barbershop_id', count: orphanedCustomers })
  } else {
    console.log(`✅ No orphaned customers (barbershop_id)`)
  }
}

async function analyzeTableRelationships() {
  console.log('\n========================================')
  console.log('4. ANALYZING TABLE RELATIONSHIPS')
  console.log('========================================\n')

  // Check barbershop_staff table relationship
  const { data: staffRelations, error } = await supabase
    .from('barbershop_staff')
    .select('barbershop_id, user_id, role')
    .limit(5)

  if (error) {
    console.error('❌ Error querying barbershop_staff:', error.message)
  } else {
    console.log(`✅ barbershop_staff table exists with ${staffRelations?.length || 0} sample records`)
    console.log('   Links: barbershops ↔ profiles (many-to-many)')
  }

  // Check for missing indexes on foreign keys
  console.log('\n--- CHECKING INDEXES ON FOREIGN KEYS ---')
  const { data: indexes } = await supabase.rpc('exec_sql', {
    query: `
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (indexdef LIKE '%shop_id%' OR indexdef LIKE '%barbershop_id%')
      ORDER BY tablename
    `
  }).catch(() => ({ data: null }))

  if (indexes) {
    console.log(`Found ${indexes.length} indexes on shop identifiers:`)
    indexes.forEach(idx => {
      console.log(`  - ${idx.tablename}: ${idx.indexname}`)
    })
  }
}

async function generateReport() {
  console.log('\n========================================')
  console.log('📊 COMPREHENSIVE SCHEMA ANALYSIS REPORT')
  console.log('========================================\n')

  console.log('## CRITICAL FINDINGS:\n')

  if (analysis.bothIdTables.length > 0) {
    console.log('⚠️  DANGER: Tables with BOTH shop_id AND barbershop_id:')
    analysis.bothIdTables.forEach(table => {
      const data = analysis.dataPopulation[table]
      console.log(`   - ${table}`)
      console.log(`     shop_id: ${data.shop_id.count ?? 'ERROR'} rows populated`)
      console.log(`     barbershop_id: ${data.barbershop_id.count ?? 'ERROR'} rows populated`)
    })
    console.log('\n   RECOMMENDATION: Migrate all shop_id references to barbershop_id and drop shop_id columns\n')
  }

  if (analysis.shopIdTables.length > 0) {
    console.log('📋 Tables using DEPRECATED shop_id (should migrate to barbershop_id):')
    analysis.shopIdTables.forEach(table => {
      const count = analysis.dataPopulation[table]?.shop_id?.count
      console.log(`   - ${table} (${count ?? 'unknown'} rows)`)
    })
    console.log('\n   RECOMMENDATION: Add barbershop_id column, migrate data, update queries\n')
  }

  if (analysis.duplicateStaff.length > 0) {
    console.log('⚠️  Duplicate staff records between profiles and barbers:')
    console.log(`   Count: ${analysis.duplicateStaff.length}`)
    console.log('   RECOMMENDATION: Verify UNION pattern implementation in /app/api/staff/route.js\n')
  }

  if (analysis.orphanedRecords.length > 0) {
    console.log('⚠️  Orphaned records found:')
    analysis.orphanedRecords.forEach(orphan => {
      console.log(`   - ${orphan.table}.${orphan.field}: ${orphan.count} orphaned records`)
    })
    console.log('   RECOMMENDATION: Clean up orphaned records or add missing foreign keys\n')
  }

  console.log('\n## SUMMARY STATISTICS:\n')
  console.log(`✅ Tables with barbershop_id only: ${analysis.barbershopIdTables.length}`)
  console.log(`⚠️  Tables with shop_id only: ${analysis.shopIdTables.length}`)
  console.log(`🚨 Tables with BOTH identifiers: ${analysis.bothIdTables.length}`)
  console.log(`📎 Total foreign keys: ${analysis.foreignKeys.length}`)
  console.log(`👥 Duplicate staff records: ${analysis.duplicateStaff.length}`)
  console.log(`🔗 Orphaned record types: ${analysis.orphanedRecords.length}`)

  // Save report to file
  const fs = await import('fs/promises')
  const reportPath = '/Users/bossio/6FB AI Agent System/DATABASE_SCHEMA_ANALYSIS_REPORT.md'

  const markdown = `# 6FB AI Agent System - Database Schema Analysis Report

**Generated:** ${new Date().toISOString()}

## Executive Summary

This report analyzes the structural conflicts, naming inconsistencies, and schema problems in the 6FB AI Agent System Supabase database.

### Critical Findings

${analysis.bothIdTables.length > 0 ? `
#### ⚠️ Tables with BOTH shop_id AND barbershop_id (CRITICAL)

These tables have duplicate shop identifier columns, causing data fragmentation:

${analysis.bothIdTables.map(table => {
  const data = analysis.dataPopulation[table]
  return `- **${table}**
  - shop_id: ${data.shop_id.count ?? 'ERROR'} rows populated
  - barbershop_id: ${data.barbershop_id.count ?? 'ERROR'} rows populated
  - **Risk:** Queries using wrong column return empty results`
}).join('\n\n')}

**Recommendation:** Consolidate to barbershop_id exclusively, migrate data, drop shop_id columns.
` : '✅ No tables found with both identifiers'}

${analysis.shopIdTables.length > 0 ? `
#### 📋 Tables Using DEPRECATED shop_id Only

${analysis.shopIdTables.map(table => {
  const count = analysis.dataPopulation[table]?.shop_id?.count
  return `- ${table} (${count ?? 'unknown'} rows)`
}).join('\n')}

**Recommendation:** Add barbershop_id, migrate data, update all queries.
` : '✅ All tables use barbershop_id'}

### Data Population Analysis

${Object.entries(analysis.dataPopulation).map(([table, data]) => {
  return `**${table}:**
${data.shop_id ? `- shop_id: ${data.shop_id.count ?? 'ERROR'} rows` : ''}
${data.barbershop_id ? `- barbershop_id: ${data.barbershop_id.count ?? 'ERROR'} rows` : ''}`
}).join('\n\n')}

### Foreign Key Analysis

**Total Foreign Keys:** ${analysis.foreignKeys.length}

**shop_id Foreign Keys:**
${analysis.foreignKeys.filter(fk => fk.column_name === 'shop_id').map(fk =>
  `- ${fk.table_name}.shop_id → ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.delete_rule})`
).join('\n') || 'None'}

**barbershop_id Foreign Keys:**
${analysis.foreignKeys.filter(fk => fk.column_name === 'barbershop_id').map(fk =>
  `- ${fk.table_name}.barbershop_id → ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.delete_rule})`
).join('\n') || 'None'}

### Staff Data Architecture

${analysis.duplicateStaff.length > 0 ? `
⚠️ **Duplicate Staff Records:** ${analysis.duplicateStaff.length}

These IDs exist in both profiles and barbers tables:
${analysis.duplicateStaff.map(d => `- ${d.id}: ${d.name}`).join('\n')}

**Recommendation:** Verify UNION deduplication in /app/api/staff/route.js
` : '✅ No duplicate staff records detected'}

### Orphaned Records

${analysis.orphanedRecords.length > 0 ?
  analysis.orphanedRecords.map(o => `- **${o.table}.${o.field}:** ${o.count} orphaned records`).join('\n')
  : '✅ No orphaned records found'}

## Detailed Breakdown

### Tables by Identifier Type

**barbershop_id only (${analysis.barbershopIdTables.length}):**
${analysis.barbershopIdTables.map(t => `- ${t}`).join('\n')}

**shop_id only (${analysis.shopIdTables.length}):**
${analysis.shopIdTables.map(t => `- ${t}`).join('\n')}

**BOTH identifiers (${analysis.bothIdTables.length}):**
${analysis.bothIdTables.map(t => `- ${t}`).join('\n')}

## Recommended Actions

### High Priority (Critical Issues)

1. **Consolidate shop identifiers in tables with both columns**
   - Migrate all data from shop_id to barbershop_id
   - Update all queries to use barbershop_id
   - Drop shop_id columns after migration

2. **Fix orphaned records**
   ${analysis.orphanedRecords.map(o => `- Clean up ${o.table}.${o.field} (${o.count} records)`).join('\n   ')}

### Medium Priority (Technical Debt)

1. **Migrate shop_id-only tables to barbershop_id**
   - Add barbershop_id column to legacy tables
   - Backfill data from shop_id
   - Update foreign key constraints
   - Update application queries

2. **Verify staff UNION pattern**
   - Test deduplication logic in /app/api/staff/route.js
   - Ensure profiles table takes precedence
   - Add integration tests for dual-table query

### Low Priority (Optimization)

1. **Add missing indexes on foreign keys**
2. **Standardize foreign key cascade rules**
3. **Add database constraints to prevent future shop_id usage**

## Conclusion

The primary schema conflict is the **shop_id vs barbershop_id duplication** which causes:
- Data fragmentation across columns
- Empty query results when using wrong identifier
- Maintenance complexity with dual naming

**Impact:** Production bug where calendar showed no appointments because profile query used empty shop_id instead of populated barbershop_id.

**Solution:** Standardize on barbershop_id exclusively across all tables and remove shop_id columns.
`

  await fs.writeFile(reportPath, markdown)
  console.log(`\n✅ Full report saved to: ${reportPath}`)
}

// Run analysis
async function main() {
  console.log('🔍 Starting comprehensive database schema analysis...\n')

  try {
    await analyzeShopIdConflict()
    await analyzeStaffDualTable()
    await analyzeForeignKeys()
    await analyzeTableRelationships()
    await generateReport()

    console.log('\n✅ Analysis complete!\n')
  } catch (error) {
    console.error('\n❌ Analysis failed:', error)
    process.exit(1)
  }
}

main()
