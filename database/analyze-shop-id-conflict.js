#!/usr/bin/env node

/**
 * Live Database Analysis Script: shop_id vs barbershop_id Conflict
 *
 * This script queries the live Supabase database to analyze actual data
 * population in shop_id vs barbershop_id columns across all affected tables.
 *
 * Purpose: Verify which columns have data before migrating/dropping shop_id
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables to analyze (documented as having shop_id conflicts)
const TABLES_TO_ANALYZE = [
  'profiles',
  'customers',
  'services',
  'appointment_records',
  'customers_backup',
  'barbers',
  'inventory',
  'invoice_history',
  'payout_history',
  'production_barbers',
  'user_shop_access_history'
];

const results = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTablesAnalyzed: 0,
    tablesWithBothColumns: 0,
    tablesWithShopIdOnly: 0,
    tablesWithBarbershopIdOnly: 0,
    totalShopIdRecords: 0,
    totalBarbershopIdRecords: 0,
    criticalIssues: []
  },
  tableDetails: []
};

/**
 * Check if a table exists in the database
 */
async function tableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    return !error || !error.message.includes('does not exist');
  } catch (err) {
    return false;
  }
}

/**
 * Get column names for a table
 */
async function getTableColumns(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) return [];
    if (!data || data.length === 0) return [];

    return Object.keys(data[0]);
  } catch (err) {
    return [];
  }
}

/**
 * Analyze a single table for shop_id vs barbershop_id usage
 */
async function analyzeTable(tableName) {
  console.log(`\n📊 Analyzing: ${tableName}`);

  const tableResult = {
    tableName,
    exists: false,
    hasShopId: false,
    hasBarbershopId: false,
    totalRows: 0,
    shopIdCount: 0,
    barbershopIdCount: 0,
    bothColumnsCount: 0,
    sampleRecords: [],
    issues: []
  };

  // Check if table exists
  const exists = await tableExists(tableName);
  if (!exists) {
    console.log(`   ⚠️  Table does not exist or is not accessible`);
    tableResult.issues.push('Table does not exist or is not accessible');
    return tableResult;
  }

  tableResult.exists = true;

  // Get columns
  const columns = await getTableColumns(tableName);
  tableResult.hasShopId = columns.includes('shop_id');
  tableResult.hasBarbershopId = columns.includes('barbershop_id');

  console.log(`   Columns: shop_id=${tableResult.hasShopId}, barbershop_id=${tableResult.hasBarbershopId}`);

  if (!tableResult.hasShopId && !tableResult.hasBarbershopId) {
    console.log(`   ✅ No shop identifier columns (not affected)`);
    return tableResult;
  }

  // Get total row count
  const { count: totalCount, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log(`   ❌ Error counting rows: ${countError.message}`);
    tableResult.issues.push(`Count error: ${countError.message}`);
    return tableResult;
  }

  tableResult.totalRows = totalCount || 0;
  console.log(`   Total rows: ${tableResult.totalRows}`);

  // Count non-NULL shop_id values
  if (tableResult.hasShopId) {
    const { count: shopIdCount, error: shopIdError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .not('shop_id', 'is', null);

    if (!shopIdError) {
      tableResult.shopIdCount = shopIdCount || 0;
      console.log(`   shop_id (non-NULL): ${tableResult.shopIdCount}`);

      if (tableResult.shopIdCount > 0) {
        results.summary.totalShopIdRecords += tableResult.shopIdCount;
      }
    }
  }

  // Count non-NULL barbershop_id values
  if (tableResult.hasBarbershopId) {
    const { count: barbershopIdCount, error: barbershopIdError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .not('barbershop_id', 'is', null);

    if (!barbershopIdError) {
      tableResult.barbershopIdCount = barbershopIdCount || 0;
      console.log(`   barbershop_id (non-NULL): ${tableResult.barbershopIdCount}`);

      if (tableResult.barbershopIdCount > 0) {
        results.summary.totalBarbershopIdRecords += tableResult.barbershopIdCount;
      }
    }
  }

  // Count records with BOTH columns populated
  if (tableResult.hasShopId && tableResult.hasBarbershopId) {
    const { count: bothCount, error: bothError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .not('shop_id', 'is', null)
      .not('barbershop_id', 'is', null);

    if (!bothError) {
      tableResult.bothColumnsCount = bothCount || 0;
      console.log(`   Both columns (non-NULL): ${tableResult.bothColumnsCount}`);

      if (tableResult.bothColumnsCount > 0) {
        tableResult.issues.push(`${tableResult.bothColumnsCount} records have BOTH shop_id and barbershop_id populated`);
        results.summary.criticalIssues.push({
          table: tableName,
          issue: 'Duplicate identifiers',
          count: tableResult.bothColumnsCount
        });
      }
    }
  }

  // Get sample records for detailed analysis
  if (tableResult.hasShopId || tableResult.hasBarbershopId) {
    const selectColumns = ['id'];
    if (tableResult.hasShopId) selectColumns.push('shop_id');
    if (tableResult.hasBarbershopId) selectColumns.push('barbershop_id');

    const { data: samples, error: sampleError } = await supabase
      .from(tableName)
      .select(selectColumns.join(', '))
      .limit(5);

    if (!sampleError && samples) {
      tableResult.sampleRecords = samples;
    }
  }

  // Flag critical issues
  if (tableResult.hasShopId && tableResult.hasBarbershopId) {
    if (tableResult.shopIdCount > 0 && tableResult.barbershopIdCount > 0) {
      const issue = `CONFLICT: Both shop_id (${tableResult.shopIdCount}) and barbershop_id (${tableResult.barbershopIdCount}) have data`;
      console.log(`   🚨 ${issue}`);
      tableResult.issues.push(issue);
      results.summary.criticalIssues.push({
        table: tableName,
        issue: 'Dual column conflict',
        shopIdCount: tableResult.shopIdCount,
        barbershopIdCount: tableResult.barbershopIdCount
      });
    } else if (tableResult.shopIdCount > 0 && tableResult.barbershopIdCount === 0) {
      const issue = `MIGRATION NEEDED: shop_id has ${tableResult.shopIdCount} records, barbershop_id is empty`;
      console.log(`   ⚠️  ${issue}`);
      tableResult.issues.push(issue);
    }
  }

  return tableResult;
}

/**
 * Generate summary statistics
 */
function updateSummary() {
  results.summary.totalTablesAnalyzed = results.tableDetails.filter(t => t.exists).length;
  results.summary.tablesWithBothColumns = results.tableDetails.filter(t => t.hasShopId && t.hasBarbershopId).length;
  results.summary.tablesWithShopIdOnly = results.tableDetails.filter(t => t.hasShopId && !t.hasBarbershopId).length;
  results.summary.tablesWithBarbershopIdOnly = results.tableDetails.filter(t => !t.hasShopId && t.hasBarbershopId).length;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport() {
  let markdown = `# Database Analysis Report: shop_id vs barbershop_id Conflict\n\n`;
  markdown += `**Generated**: ${results.timestamp}\n\n`;
  markdown += `---\n\n`;

  // Executive Summary
  markdown += `## Executive Summary\n\n`;
  markdown += `- **Total Tables Analyzed**: ${results.summary.totalTablesAnalyzed}\n`;
  markdown += `- **Tables with BOTH Columns**: ${results.summary.tablesWithBothColumns} 🚨\n`;
  markdown += `- **Tables with shop_id Only**: ${results.summary.tablesWithShopIdOnly}\n`;
  markdown += `- **Tables with barbershop_id Only**: ${results.summary.tablesWithBarbershopIdOnly}\n\n`;
  markdown += `- **Total shop_id Records**: ${results.summary.totalShopIdRecords}\n`;
  markdown += `- **Total barbershop_id Records**: ${results.summary.totalBarbershopIdRecords}\n\n`;

  // Critical Issues
  if (results.summary.criticalIssues.length > 0) {
    markdown += `### 🚨 Critical Issues Found\n\n`;
    results.summary.criticalIssues.forEach(issue => {
      markdown += `- **${issue.table}**: ${issue.issue}`;
      if (issue.count) markdown += ` (${issue.count} records)`;
      if (issue.shopIdCount !== undefined) {
        markdown += ` - shop_id: ${issue.shopIdCount}, barbershop_id: ${issue.barbershopIdCount}`;
      }
      markdown += `\n`;
    });
    markdown += `\n`;
  } else {
    markdown += `### ✅ No Critical Issues\n\nAll tables are using identifiers consistently.\n\n`;
  }

  markdown += `---\n\n`;

  // Table Details
  markdown += `## Detailed Table Analysis\n\n`;

  results.tableDetails.forEach(table => {
    markdown += `### ${table.tableName}\n\n`;

    if (!table.exists) {
      markdown += `⚠️ **Status**: Table does not exist or is not accessible\n\n`;
      return;
    }

    markdown += `- **Total Rows**: ${table.totalRows}\n`;
    markdown += `- **Has shop_id Column**: ${table.hasShopId ? '✓' : '✗'}\n`;
    markdown += `- **Has barbershop_id Column**: ${table.hasBarbershopId ? '✓' : '✗'}\n`;

    if (table.hasShopId) {
      markdown += `- **shop_id Records (non-NULL)**: ${table.shopIdCount}\n`;
    }

    if (table.hasBarbershopId) {
      markdown += `- **barbershop_id Records (non-NULL)**: ${table.barbershopIdCount}\n`;
    }

    if (table.hasShopId && table.hasBarbershopId) {
      markdown += `- **Both Columns Populated**: ${table.bothColumnsCount}\n`;
    }

    // Issues
    if (table.issues.length > 0) {
      markdown += `\n**Issues**:\n`;
      table.issues.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
    }

    // Sample Records
    if (table.sampleRecords.length > 0) {
      markdown += `\n**Sample Records** (first 5):\n\n`;
      markdown += `\`\`\`json\n${JSON.stringify(table.sampleRecords, null, 2)}\n\`\`\`\n`;
    }

    markdown += `\n`;
  });

  markdown += `---\n\n`;

  // Recommendations
  markdown += `## Recommendations\n\n`;

  const tablesNeedingMigration = results.tableDetails.filter(t =>
    t.hasShopId && t.shopIdCount > 0 && t.hasBarbershopId && t.barbershopIdCount === 0
  );

  const tablesWithConflicts = results.tableDetails.filter(t =>
    t.hasShopId && t.shopIdCount > 0 && t.hasBarbershopId && t.barbershopIdCount > 0
  );

  const tablesReadyForCleanup = results.tableDetails.filter(t =>
    t.hasShopId && t.shopIdCount === 0 && t.hasBarbershopId
  );

  if (tablesNeedingMigration.length > 0) {
    markdown += `### 1. Data Migration Required (${tablesNeedingMigration.length} tables)\n\n`;
    markdown += `These tables have data in shop_id but not in barbershop_id. Migrate data before dropping:\n\n`;
    tablesNeedingMigration.forEach(t => {
      markdown += `- **${t.tableName}**: ${t.shopIdCount} records need migration\n`;
    });
    markdown += `\n`;
  }

  if (tablesWithConflicts.length > 0) {
    markdown += `### 2. Conflict Resolution Required (${tablesWithConflicts.length} tables)\n\n`;
    markdown += `These tables have data in BOTH columns. Review and reconcile before cleanup:\n\n`;
    tablesWithConflicts.forEach(t => {
      markdown += `- **${t.tableName}**: shop_id=${t.shopIdCount} records, barbershop_id=${t.barbershopIdCount} records\n`;
    });
    markdown += `\n`;
  }

  if (tablesReadyForCleanup.length > 0) {
    markdown += `### 3. Ready for Cleanup (${tablesReadyForCleanup.length} tables)\n\n`;
    markdown += `These tables have no data in shop_id. Safe to drop the column:\n\n`;
    tablesReadyForCleanup.forEach(t => {
      markdown += `- **${t.tableName}**: shop_id is empty, barbershop_id has ${t.barbershopIdCount} records\n`;
    });
    markdown += `\n`;
  }

  markdown += `### Next Steps\n\n`;
  markdown += `1. **Review this report** to understand current data distribution\n`;
  markdown += `2. **Backup database** before any migration\n`;
  markdown += `3. **Execute migration scripts** for tables needing data migration\n`;
  markdown += `4. **Drop shop_id columns** from tables ready for cleanup\n`;
  markdown += `5. **Update code** to remove all shop_id references\n`;
  markdown += `6. **Run tests** to verify no data loss\n\n`;

  markdown += `---\n\n`;
  markdown += `*Report generated by analyze-shop-id-conflict.js*\n`;

  return markdown;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 6FB AI Agent System - Database Conflict Analysis');
  console.log('=' .repeat(60));
  console.log('\nAnalyzing shop_id vs barbershop_id usage across all tables...\n');

  // Analyze each table
  for (const tableName of TABLES_TO_ANALYZE) {
    const tableResult = await analyzeTable(tableName);
    results.tableDetails.push(tableResult);
  }

  // Update summary
  updateSummary();

  // Generate reports
  console.log('\n' + '='.repeat(60));
  console.log('📊 ANALYSIS COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nTables Analyzed: ${results.summary.totalTablesAnalyzed}`);
  console.log(`Critical Issues: ${results.summary.criticalIssues.length}`);
  console.log(`Total shop_id Records: ${results.summary.totalShopIdRecords}`);
  console.log(`Total barbershop_id Records: ${results.summary.totalBarbershopIdRecords}`);

  // Save JSON results
  const jsonPath = path.join(__dirname, 'shop-id-conflict-analysis.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ JSON report saved: ${jsonPath}`);

  // Save markdown report
  const markdown = generateMarkdownReport();
  const mdPath = path.join(__dirname, 'SHOP_ID_CONFLICT_ANALYSIS.md');
  fs.writeFileSync(mdPath, markdown);
  console.log(`✅ Markdown report saved: ${mdPath}`);

  console.log('\n📖 Review the markdown report for detailed findings and recommendations.\n');
}

// Run the analysis
main().catch(err => {
  console.error('\n❌ Analysis failed:', err);
  process.exit(1);
});
