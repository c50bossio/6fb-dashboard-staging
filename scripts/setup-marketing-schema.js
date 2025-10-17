#!/usr/bin/env node

/**
 * Setup Marketing Schema in Supabase Database
 * Applies the complete marketing campaign schema to Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndCreateMarketingTables() {

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

  const { data: existingTables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', marketingTables)

  if (tablesError) {
    
  } else {
    const existingTableNames = existingTables?.map(t => t.table_name) || []
    
  }

  const schemaPath = path.join(__dirname, '../database/marketing-campaigns-schema.sql')
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Marketing schema file not found:', schemaPath)
    process.exit(1)
  }

  const schemaSQL = fs.readFileSync(schemaPath, 'utf8')

  const statements = schemaSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

  let successCount = 0
  let skipCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'
    
    if (statement.trim().length < 10) continue
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate')) {
          }... (already exists)`)
          skipCount++
        } else {
          console.error(`   ❌ Error executing statement ${i + 1}:`, error.message)
          console.error(`      Statement: ${statement.substring(0, 100)}...`)
        }
      } else {
        }...`)
        successCount++
      }
      
    } catch (err) {
      console.error(`   ❌ Exception executing statement ${i + 1}:`, err.message)
    }
  }

  : ${skipCount}`)

  for (const tableName of marketingTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        
      } else {
        
      }
    } catch (err) {
      
    }
  }

  return true
}

async function applySchemaDirectly() {

  const schemaPath = path.join(__dirname, '../database/marketing-campaigns-schema.sql')
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
  
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

      return false
    } else {
      
      return await checkAndCreateMarketingTables()
    }
  } catch (err) {
    
    return false
  }
}

async function main() {
  try {
    const success = await applySchemaDirectly()
    if (success) {

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