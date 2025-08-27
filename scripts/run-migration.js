#!/usr/bin/env node

/**
 * Database Migration Script for Recurring Appointments
 * Safely migrates the bookings table to support recurring appointments
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001-add-recurring-fields.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    const { data: beforeColumns, error: beforeError } = await supabase.rpc('get_table_columns', {
      table_name: 'bookings'
    })
    
    if (beforeError && beforeError.code !== 'PGRST202') {
      
    }

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'))
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          const { error: directError } = await supabase.from('_').select().limit(0) // This will fail, but let's try the migration differently
          
          `)
        } else {
          
        }
      }
    }

    ')
    ')
    ')
    ')
    
    const { data: testQuery, error: testError } = await supabase
      .from('bookings')
      .select('id, is_recurring, recurring_pattern')
      .limit(1)
    
    if (testError) {

    } else {
      
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  
  process.exit(0)
}

if (require.main === module) {
  runMigration()
}

module.exports = { runMigration }