#!/usr/bin/env node

/**
 * Supabase Migration Runner
 * Helps apply SQL migrations to Supabase database
 */

import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log(chalk.blue.bold('\n📦 Supabase Migration Runner\n'))
console.log(chalk.gray('=' .repeat(60)))

// Validate environment
if (!supabaseUrl || !supabaseServiceKey) {
  console.error(chalk.red('❌ Missing Supabase credentials in .env.local'))
  console.log(chalk.yellow('\nRequired environment variables:'))
  console.log('  - NEXT_PUBLIC_SUPABASE_URL')
  console.log('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log(chalk.green('✅ Environment configured'))
console.log(chalk.gray(`   URL: ${supabaseUrl}`))

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test connection
async function testConnection() {
  console.log(chalk.blue('\n🔍 Testing Supabase connection...'))
  
  try {
    // Try to query a simple count from profiles table
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log(chalk.yellow('⚠️  Profiles table not found (this is normal for fresh databases)'))
      
      // Try to check if we can at least connect
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(1)
      
      if (tablesError) {
        throw new Error('Cannot query database')
      }
      
      console.log(chalk.green('✅ Database connection successful'))
      return true
    }
    
    console.log(chalk.green(`✅ Connected to Supabase (${count || 0} profiles found)`))
    return true
  } catch (error) {
    console.error(chalk.red('❌ Failed to connect to Supabase:'), error.message)
    return false
  }
}

// List available migrations
async function listMigrations() {
  console.log(chalk.blue('\n📋 Available Migrations:'))
  console.log(chalk.gray('-'.repeat(60)))
  
  const migrationsDir = path.join(__dirname, '../migrations')
  const files = await fs.readdir(migrationsDir)
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()
  
  const migrations = []
  for (const file of sqlFiles) {
    const fullPath = path.join(migrationsDir, file)
    const stats = await fs.stat(fullPath)
    const content = await fs.readFile(fullPath, 'utf8')
    const lines = content.split('\n').length
    
    migrations.push({
      name: file,
      path: fullPath,
      size: stats.size,
      lines: lines
    })
    
    console.log(chalk.cyan(`  ${file.padEnd(40)} ${lines} lines`))
  }
  
  console.log(chalk.gray('-'.repeat(60)))
  console.log(chalk.blue(`Total: ${migrations.length} migration files\n`))
  
  return migrations
}

// Check which tables exist
async function checkExistingTables() {
  console.log(chalk.blue('🔍 Checking existing tables...'))
  
  const noShowTables = [
    'no_show_policies',
    'no_show_incidents',
    'client_strike_history',
    'grace_period_rules',
    'blocked_clients',
    'blocked_client_recovery',
    'no_show_recovery_attempts',
    'no_show_fee_transactions',
    'no_show_automation_rules'
  ]
  
  const results = {
    existing: [],
    missing: []
  }
  
  for (const table of noShowTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        results.missing.push(table)
        console.log(chalk.red(`  ❌ ${table} - NOT FOUND`))
      } else {
        results.existing.push(table)
        console.log(chalk.green(`  ✅ ${table} - EXISTS (${count || 0} rows)`))
      }
    } catch (e) {
      results.missing.push(table)
      console.log(chalk.red(`  ❌ ${table} - ERROR`))
    }
  }
  
  console.log(chalk.gray('\n' + '-'.repeat(60)))
  console.log(chalk.green(`Existing tables: ${results.existing.length}`))
  console.log(chalk.yellow(`Missing tables: ${results.missing.length}`))
  
  return results
}

// Generate migration instructions
async function generateInstructions() {
  console.log(chalk.blue.bold('\n📝 Migration Instructions\n'))
  console.log(chalk.gray('=' .repeat(60)))
  
  console.log(chalk.yellow.bold('Option 1: Supabase Dashboard (Recommended)'))
  console.log(chalk.white(`
1. Open your Supabase Dashboard:
   ${chalk.cyan(supabaseUrl.replace('.supabase.co', '.supabase.com/project/').replace('https://', 'https://app.'))}
   
2. Navigate to SQL Editor (left sidebar)

3. Create a new query

4. Copy and paste the migration file content:
   - Start with: ${chalk.green('migrations/no_show_management_system.sql')}
   - Then apply other migrations as needed

5. Click "Run" to execute the migration

6. Check the Table Editor to verify tables were created
`))

  console.log(chalk.yellow.bold('Option 2: Supabase CLI'))
  console.log(chalk.white(`
1. Install Supabase CLI:
   ${chalk.cyan('npm install -g supabase')}

2. Login to Supabase:
   ${chalk.cyan('supabase login')}

3. Link your project:
   ${chalk.cyan('supabase link --project-ref dfhqjdoydihajmjxniee')}

4. Run migrations:
   ${chalk.cyan('supabase db push migrations/no_show_management_system.sql')}
`))

  console.log(chalk.yellow.bold('Option 3: Direct PostgreSQL Connection'))
  console.log(chalk.white(`
1. Get your database connection string from Supabase Dashboard:
   Settings → Database → Connection String

2. Run migration with psql:
   ${chalk.cyan('psql "YOUR_CONNECTION_STRING" < migrations/no_show_management_system.sql')}
`))

  console.log(chalk.gray('\n' + '=' .repeat(60)))
  
  // Create a combined migration file for easy copy-paste
  console.log(chalk.blue('\n📄 Creating combined migration file...'))
  
  const noShowMigration = await fs.readFile(
    path.join(__dirname, '../migrations/no_show_management_system.sql'),
    'utf8'
  )
  
  const combinedPath = path.join(__dirname, '../APPLY_THIS_MIGRATION.sql')
  
  const combinedContent = `-- =============================================
-- COMBINED MIGRATION FILE FOR SUPABASE
-- Generated: ${new Date().toISOString()}
-- =============================================
-- Copy this entire file and paste it into Supabase SQL Editor
-- Then click "Run" to apply all migrations
-- =============================================

${noShowMigration}

-- =============================================
-- VERIFICATION QUERIES
-- Run these after migration to verify success:
-- =============================================

-- Check if tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%no_show%'
ORDER BY table_name;

-- Count tables created:
SELECT COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'no_show_policies',
  'no_show_incidents', 
  'client_strike_history',
  'grace_period_rules',
  'blocked_clients',
  'blocked_client_recovery',
  'no_show_recovery_attempts',
  'no_show_fee_transactions',
  'no_show_automation_rules'
);
`

  await fs.writeFile(combinedPath, combinedContent)
  
  console.log(chalk.green(`✅ Created: ${chalk.bold('APPLY_THIS_MIGRATION.sql')}`))
  console.log(chalk.cyan(`   Copy this file's contents to Supabase SQL Editor`))
}

// Main execution
async function main() {
  try {
    // Test connection
    const connected = await testConnection()
    if (!connected) {
      console.log(chalk.red('\n❌ Cannot proceed without database connection'))
      process.exit(1)
    }
    
    // List migrations
    await listMigrations()
    
    // Check existing tables
    const tableStatus = await checkExistingTables()
    
    // Generate instructions
    await generateInstructions()
    
    // Final summary
    console.log(chalk.blue.bold('\n✨ Next Steps:'))
    console.log(chalk.white(`
1. ${chalk.yellow('Copy')} the contents of ${chalk.green.bold('APPLY_THIS_MIGRATION.sql')}
2. ${chalk.yellow('Paste')} into Supabase SQL Editor
3. ${chalk.yellow('Run')} the migration
4. ${chalk.yellow('Verify')} tables in Table Editor
5. ${chalk.yellow('Test')} with: ${chalk.cyan('npm run test:no-show')}
`))
    
    if (tableStatus.missing.length === 0) {
      console.log(chalk.green.bold('\n🎉 All no-show tables already exist! Migration may not be needed.'))
    } else {
      console.log(chalk.yellow.bold(`\n⚠️  ${tableStatus.missing.length} tables need to be created`))
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Migration runner failed:'), error)
    process.exit(1)
  }
}

// Run the script
main()