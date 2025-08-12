#!/usr/bin/env node

/**
 * Setup Marketing Schema in Supabase Database
 * Applies the complete marketing campaign schema to Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Use environment variables or MCP server credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndCreateMarketingTables() {
  console.log('🚀 Setting up Marketing Schema in Supabase...\n')

  // List of marketing tables to check/create
  const marketingTables = [
    'marketing_accounts',
    'marketing_payment_methods', 
    'marketing_campaigns',
    'campaign_recipients',
    'campaign_analytics',
    'marketing_billing_records',
    'customer_segments',
    'customer_segment_members',
    'email_unsubscribes'
  ]

  // Check existing tables
  console.log('📋 Checking existing tables...')
  const { data: existingTables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', marketingTables)

  if (tablesError) {
    console.log('⚠️  Could not check existing tables via API, will proceed with schema application')
  } else {
    const existingTableNames = existingTables?.map(t => t.table_name) || []
    console.log(`   Found ${existingTableNames.length} existing marketing tables:`, existingTableNames)
  }

  // Read the marketing schema file
  const schemaPath = path.join(__dirname, '../database/marketing-campaigns-schema.sql')
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Marketing schema file not found:', schemaPath)
    process.exit(1)
  }

  const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
  console.log('📄 Read marketing schema file:', schemaPath)

  // Split the schema into individual statements for better error handling
  const statements = schemaSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

  console.log(`🔧 Applying ${statements.length} schema statements...\n`)

  let successCount = 0
  let skipCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    
    // Skip comments and empty statements
    if (statement.trim().length < 10) continue
    
    try {
      // Execute each statement
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        // Check if it's just a "already exists" error, which is okay
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate')) {
          console.log(`   ⏭️  Skipped: ${statement.substring(0, 50)}... (already exists)`)
          skipCount++
        } else {
          console.error(`   ❌ Error executing statement ${i + 1}:`, error.message)
          console.error(`      Statement: ${statement.substring(0, 100)}...`)
        }
      } else {
        console.log(`   ✅ Applied: ${statement.substring(0, 50)}...`)
        successCount++
      }
      
    } catch (err) {
      console.error(`   ❌ Exception executing statement ${i + 1}:`, err.message)
    }
  }

  console.log(`\n📊 Schema Application Summary:`)
  console.log(`   ✅ Successfully applied: ${successCount}`)
  console.log(`   ⏭️  Skipped (already exists): ${skipCount}`)
  console.log(`   📋 Total statements: ${statements.length}`)

  // Verify tables were created
  console.log('\n🔍 Verifying marketing tables...')
  
  for (const tableName of marketingTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`)
      } else {
        console.log(`   ✅ ${tableName}: Table accessible`)
      }
    } catch (err) {
      console.log(`   ❌ ${tableName}: ${err.message}`)
    }
  }

  console.log('\n🎉 Marketing schema setup complete!')
  return true
}

// Alternative method using direct SQL execution
async function applySchemaDirectly() {
  console.log('\n🔄 Attempting alternative schema application method...')
  
  // Read schema file
  const schemaPath = path.join(__dirname, '../database/marketing-campaigns-schema.sql')
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
  
  // Try to create a simple test table first
  const testTableSQL = `
    CREATE TABLE IF NOT EXISTS marketing_test (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      test_field TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: testTableSQL })
    if (error) {
      console.log('❌ Cannot execute SQL via RPC:', error.message)
      console.log('💡 Please apply the schema manually in Supabase SQL Editor')
      console.log('📄 Schema file location:', schemaPath)
      return false
    } else {
      console.log('✅ SQL execution working, proceeding with full schema...')
      return await checkAndCreateMarketingTables()
    }
  } catch (err) {
    console.log('❌ Exception during SQL execution:', err.message)
    return false
  }
}

// Run the setup
async function main() {
  try {
    const success = await applySchemaDirectly()
    if (success) {
      console.log('\n🎯 Next steps:')
      console.log('   1. Seed test data: node scripts/seed-marketing-data.js')
      console.log('   2. Test APIs: curl http://localhost:9999/api/marketing/campaigns')
      console.log('   3. Configure SendGrid/Twilio services')
    }
  } catch (error) {
    console.error('💥 Fatal error during schema setup:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { checkAndCreateMarketingTables }