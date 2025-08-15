#!/usr/bin/env node

/**
 * Script to create Cin7 integration tables in Supabase
 * Run this to set up the database schema for Cin7 connections
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupCin7Tables() {
  console.log('🔧 Setting up Cin7 integration tables in Supabase...\n')

  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'cin7-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`)

    let successCount = 0
    let errorCount = 0

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip if it's just a comment
      if (statement.startsWith('--') || statement.length < 10) {
        continue
      }

      // Get a description of what we're doing
      let description = 'Executing statement'
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)
        if (match) description = `Creating table: ${match[1]}`
      } else if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE (\w+)/)
        if (match) description = `Altering table: ${match[1]}`
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/)
        if (match) description = `Creating index: ${match[1]}`
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY "([^"]+)"/)
        if (match) description = `Creating policy: ${match[1]}`
      } else if (statement.includes('CREATE FUNCTION')) {
        const match = statement.match(/CREATE (?:OR REPLACE )?FUNCTION (\w+)/)
        if (match) description = `Creating function: ${match[1]}`
      } else if (statement.includes('CREATE TRIGGER')) {
        const match = statement.match(/CREATE TRIGGER (\w+)/)
        if (match) description = `Creating trigger: ${match[1]}`
      }

      process.stdout.write(`${i + 1}/${statements.length} - ${description}... `)

      try {
        // Execute the statement using Supabase's SQL execution
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })

        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate')) {
            console.log('✓ (already exists)')
            successCount++
          } else {
            console.log(`✗ ${error.message}`)
            errorCount++
          }
        } else {
          console.log('✓')
          successCount++
        }
      } catch (err) {
        console.log(`✗ ${err.message}`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`\n📊 Results:`)
    console.log(`   ✅ Success: ${successCount} statements`)
    console.log(`   ❌ Errors: ${errorCount} statements`)

    if (errorCount === 0) {
      console.log('\n🎉 Cin7 integration tables created successfully!')
      console.log('\n📝 Next steps:')
      console.log('   1. Start the application: npm run dev')
      console.log('   2. Navigate to the Inventory page')
      console.log('   3. Click "Advanced: Connect warehouse system" at the bottom')
      console.log('   4. Enter your Cin7 credentials to connect')
    } else {
      console.log('\n⚠️  Some statements failed. This might be okay if tables already exist.')
      console.log('    You can still try to use the integration.')
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    console.error('\n📝 Manual setup required:')
    console.error('   1. Copy the contents of database/cin7-schema.sql')
    console.error('   2. Go to your Supabase dashboard')
    console.error('   3. Navigate to the SQL editor')
    console.error('   4. Paste and execute the SQL')
  }
}

// Alternative approach if exec_sql doesn't work
async function setupCin7TablesAlternative() {
  console.log('\n🔄 Trying alternative approach...\n')

  try {
    // Test if cin7_connections table exists
    const { error: testError } = await supabase
      .from('cin7_connections')
      .select('id')
      .limit(1)

    if (!testError) {
      console.log('✅ Cin7 tables already exist!')
      return
    }

    console.log('❌ Tables do not exist yet.')
    console.log('\n📝 Please manually create the tables:')
    console.log('   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql')
    console.log('   2. Copy the contents of database/cin7-schema.sql')
    console.log('   3. Paste and run in the SQL editor')
    console.log('\n   Or run this simplified version:')
    
    // Print a simplified version for manual execution
    console.log('\n' + '='.repeat(60))
    console.log('-- Simplified Cin7 Tables (copy and run in Supabase):')
    console.log('='.repeat(60) + '\n')
    
    const simplifiedSQL = `
-- Create cin7_connections table
CREATE TABLE IF NOT EXISTS cin7_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  account_id TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  account_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  last_sync_status TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cin7_sync_logs table  
CREATE TABLE IF NOT EXISTS cin7_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES cin7_connections(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  items_synced INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add Cin7 columns to inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_product_id TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_sku TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cin7_last_sync TIMESTAMPTZ;
`

    console.log(simplifiedSQL)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Alternative approach failed:', error.message)
  }
}

// Run the setup
setupCin7Tables().then(() => {
  // If main approach fails, try alternative
  setupCin7TablesAlternative()
})