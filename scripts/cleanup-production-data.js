#!/usr/bin/env node

/**
 * Production Database Cleanup Script
 * Removes all test/demo/mock data from Supabase database
 * CAUTION: This script permanently deletes data - use with care
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test data patterns to identify and remove
const TEST_PATTERNS = {
  emails: [
    '%test%',
    '%demo%',
    '%example.com%',
    '%mock%',
    '%fake%',
    '%dummy%'
  ],
  ids: [
    'demo-%',
    'test-%',
    'mock-%',
    'fake-%',
    'dummy-%',
    'sample-%'
  ],
  names: [
    'Test %',
    'Demo %',
    'Mock %',
    'Fake %',
    'Sample %',
    'John Doe%',
    'Jane Doe%'
  ]
};

// Tables to clean with their test data identification columns
const CLEANUP_CONFIG = {
  users: {
    emailColumn: 'email',
    nameColumn: 'name',
    idColumn: 'id'
  },
  profiles: {
    emailColumn: 'email',
    nameColumn: 'full_name',
    idColumn: 'id'
  },
  barbershops: {
    nameColumn: 'name',
    idColumn: 'id',
    additionalCheck: "name ILIKE '%demo%' OR name ILIKE '%test%'"
  },
  barbers: {
    nameColumn: 'name',
    emailColumn: 'email',
    idColumn: 'id'
  },
  customers: {
    nameColumn: 'name',
    emailColumn: 'email',
    idColumn: 'id'
  },
  bookings: {
    idColumn: 'id',
    relatedColumn: 'customer_id',
    additionalCheck: "notes ILIKE '%test%' OR notes ILIKE '%demo%'"
  },
  appointments: {
    idColumn: 'id',
    relatedColumn: 'customer_id'
  },
  services: {
    nameColumn: 'name',
    idColumn: 'id',
    additionalCheck: "name ILIKE '%test%' OR name ILIKE '%demo%'"
  },
  transactions: {
    idColumn: 'id',
    additionalCheck: "description ILIKE '%test%' OR description ILIKE '%mock%'"
  },
  marketing_campaigns: {
    nameColumn: 'name',
    idColumn: 'id',
    additionalCheck: "name ILIKE '%test%' OR status = 'test'"
  }
};

// Safety check function
async function confirmCleanup() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {

    rl.question('Type "CONFIRM DELETE TEST DATA" to proceed: ', (answer) => {
      rl.close();
      resolve(answer === 'CONFIRM DELETE TEST DATA');
    });
  });
}

// Function to build WHERE clause for test data
function buildTestDataQuery(config) {
  const conditions = [];
  
  if (config.emailColumn) {
    TEST_PATTERNS.emails.forEach(pattern => {
      conditions.push(`${config.emailColumn} ILIKE '${pattern}'`);
    });
  }
  
  if (config.nameColumn) {
    TEST_PATTERNS.names.forEach(pattern => {
      conditions.push(`${config.nameColumn} ILIKE '${pattern}'`);
    });
  }
  
  if (config.idColumn) {
    TEST_PATTERNS.ids.forEach(pattern => {
      conditions.push(`${config.idColumn}::text ILIKE '${pattern}'`);
    });
  }
  
  if (config.additionalCheck) {
    conditions.push(`(${config.additionalCheck})`);
  }
  
  return conditions.length > 0 ? conditions.join(' OR ') : null;
}

// Function to count test records
async function countTestRecords(table, config) {
  try {
    const whereClause = buildTestDataQuery(config);
    if (!whereClause) return 0;
    
    // Build a raw SQL query for counting
    const { data, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .or(whereClause);
    
    if (error) {
      console.error(`Error counting ${table}:`, error.message);
      return 0;
    }
    
    return data?.length || 0;
  } catch (error) {
    console.error(`Failed to count test records in ${table}:`, error);
    return 0;
  }
}

// Function to delete test records
async function deleteTestRecords(table, config) {
  try {
    const whereClause = buildTestDataQuery(config);
    if (!whereClause) {
      
      return 0;
    }
    
    // First, count records to be deleted
    const count = await countTestRecords(table, config);
    
    if (count === 0) {
      
      return 0;
    }

    // Delete using Supabase client with OR conditions
    const { error } = await supabase
      .from(table)
      .delete()
      .or(whereClause);
    
    if (error) {
      console.error(`  ❌ Error deleting from ${table}:`, error.message);
      return 0;
    }

    return count;
  } catch (error) {
    console.error(`  ❌ Failed to clean ${table}:`, error);
    return 0;
  }
}

// Main cleanup function
async function cleanupDatabase() {

  let totalDeleted = 0;
  const results = {};
  
  // Process each table
  for (const [table, config] of Object.entries(CLEANUP_CONFIG)) {
    
    const deleted = await deleteTestRecords(table, config);
    totalDeleted += deleted;
    results[table] = deleted;
  }
  
  // Clean up orphaned records

  // Clean orphaned bookings (where customer doesn't exist)
  try {
    const { data: orphanedBookings, error } = await supabase
      .from('bookings')
      .delete()
      .is('customer_id', null)
      .select();
    
    if (!error && orphanedBookings) {
      
      totalDeleted += orphanedBookings.length;
    }
  } catch (error) {
    console.error('  ❌ Failed to clean orphaned bookings:', error);
  }
  
  // Summary
  );
  
  );
  
  Object.entries(results).forEach(([table, count]) => {
    if (count > 0) {
      
    }
  });
  
  );
  
  );
  
  return totalDeleted;
}

// Reset demo sequences if needed
async function resetSequences() {

  try {
    // This would reset auto-increment sequences
    // Note: Be very careful with this in production
    const tables = ['bookings', 'appointments', 'transactions'];
    
    for (const table of tables) {
      // Check if table is now empty
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (count === 0) {
        
      }
    }
  } catch (error) {
    console.error('Failed to check sequences:', error);
  }
}

// Main execution
async function main() {
  try {
    // Check environment
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_PRODUCTION_CLEANUP) {
      console.error('❌ Cannot run cleanup in production without FORCE_PRODUCTION_CLEANUP=true');
      process.exit(1);
    }
    
    // Validate Supabase connection
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables:');
      console.error('  - NEXT_PUBLIC_SUPABASE_URL');
      console.error('  - SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    
    // Get user confirmation
    const confirmed = await confirmCleanup();
    
    if (!confirmed) {
      
      process.exit(0);
    }

    // Run cleanup
    const deletedCount = await cleanupDatabase();
    
    if (deletedCount > 0) {
      await resetSequences();
    }

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  cleanupDatabase,
  TEST_PATTERNS,
  CLEANUP_CONFIG
};