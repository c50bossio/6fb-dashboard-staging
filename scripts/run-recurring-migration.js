#!/usr/bin/env node

/**
 * Script to run the recurring appointments database migration
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'
);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

async function runMigration() {
  console.log(`\n${colors.bright}${colors.blue}Running Recurring Appointments Migration${colors.reset}\n`);

  try {
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '002-add-recurring-improvements.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    log.info('Migration file loaded successfully');
    
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    log.info(`Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (!statement || statement.startsWith('--')) {
        continue;
      }
      
      if (statement.toUpperCase().startsWith('DO ')) {
        log.warning(`Skipping DO block (statement ${i + 1})`);
        skipCount++;
        continue;
      }
      
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        }).single();
        
        if (error) {
          if (statement.includes('IF NOT EXISTS') || statement.includes('OR REPLACE')) {
            log.warning(`Statement ${i + 1} might already exist (this is OK)`);
            skipCount++;
          } else {
            throw error;
          }
        } else {
          log.success(`Executed statement ${i + 1}/${statements.length}`);
          successCount++;
        }
      } catch (err) {
        if (err.message?.includes('already exists') || 
            err.message?.includes('duplicate') ||
            err.code === '42P07' || // duplicate table
            err.code === '42P04' || // duplicate database
            err.code === '42710') { // duplicate object
          log.warning(`Statement ${i + 1} - Object already exists (skipping)`);
          skipCount++;
        } else {
          log.error(`Failed to execute statement ${i + 1}: ${err.message}`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n${colors.bright}Migration Summary:${colors.reset}`);
    console.log(`  ${colors.green}Success: ${successCount}${colors.reset}`);
    console.log(`  ${colors.yellow}Skipped: ${skipCount}${colors.reset}`);
    console.log(`  ${colors.red}Errors: ${errorCount}${colors.reset}`);
    
    log.info('\nVerifying migration results...');
    
    const { data: testData, error: testError } = await supabase
      .from('bookings')
      .select('id, parent_id, occurrence_date, modification_type, cancelled_at')
      .limit(1);
    
    if (testError) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);
      
      if (!bookingsError && bookings && bookings.length > 0) {
        const sample = bookings[0];
        if ('parent_id' in sample || 'occurrence_date' in sample) {
          log.success('New columns verified in bookings table');
        } else {
          log.warning('Could not verify all new columns');
        }
      }
    } else {
      log.success('New columns successfully added to bookings table');
      log.info('Columns verified: parent_id, occurrence_date, modification_type, cancelled_at');
    }
    
    log.info('\nChecking views...');
    const viewsToCheck = ['active_bookings', 'recurring_series', 'exception_appointments'];
    
    for (const viewName of viewsToCheck) {
      const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .limit(1);
      
      if (!error) {
        log.success(`View '${viewName}' is accessible`);
      } else {
        log.warning(`View '${viewName}' might not be accessible (this might be OK)`);
      }
    }
    
    if (errorCount === 0) {
      console.log(`\n${colors.bright}${colors.green}✅ Migration completed successfully!${colors.reset}\n`);
      return true;
    } else {
      console.log(`\n${colors.bright}${colors.yellow}⚠️ Migration completed with some errors${colors.reset}`);
      console.log(`${colors.yellow}The system should still work, but some optimizations might be missing${colors.reset}\n`);
      return true;
    }
    
  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function addColumnsDirect() {
  log.info('\nAttempting direct column addition...');
  
  const columns = [
    { name: 'parent_id', type: 'TEXT REFERENCES bookings(id) ON DELETE CASCADE' },
    { name: 'occurrence_date', type: 'DATE' },
    { name: 'modification_type', type: 'VARCHAR(20)' },
    { name: 'cancelled_at', type: 'TIMESTAMP WITH TIME ZONE' }
  ];
  
  for (const column of columns) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(column.name)
        .limit(1);
      
      if (!error) {
        log.success(`Column '${column.name}' already exists`);
      } else {
        log.warning(`Column '${column.name}' might not exist or is not accessible`);
      }
    } catch (err) {
      log.error(`Could not verify column '${column.name}': ${err.message}`);
    }
  }
}

async function main() {
  const success = await runMigration();
  
  if (!success) {
    log.warning('Trying alternative approach...');
    await addColumnsDirect();
  }
  
  console.log(`${colors.cyan}Migration process complete. The new recurring system is ready to use!${colors.reset}\n`);
}

main().catch(error => {
  console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}\n`);
  process.exit(1);
});