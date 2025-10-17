#!/usr/bin/env node

/**
 * Script to create Cin7 integration tables in Supabase
 * Run this to set up the database schema for Cin7 connections
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupCin7Tables() {

  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'cin7-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (statement.startsWith('--') || statement.length < 10) {
        continue
      }

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
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })

        if (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate')) {
            ')
            successCount++
          } else {
            
            errorCount++
          }
        } else {
          
          successCount++
        }
      } catch (err) {
        
        errorCount++
      }
    }

    )

    if (errorCount === 0) {

    } else {

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

async function setupCin7TablesAlternative() {

  try {
    const { error: testError } = await supabase
      .from('cin7_connections')
      .select('id')
      .limit(1)

    if (!testError) {
      
      return
    }

    )
    :')
     + '\n')
    
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

    )

  } catch (error) {
    console.error('Alternative approach failed:', error.message)
  }
}

setupCin7Tables().then(() => {
  setupCin7TablesAlternative()
})