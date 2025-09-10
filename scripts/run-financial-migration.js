#!/usr/bin/env node

/**
 * Database Migration Script for Financial Arrangement Fields
 * Adds standardized financial arrangement fields to barbershop_staff table
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runFinancialMigration() {
  try {

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '009_add_financial_arrangement_fields.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Test current table structure
    const { data: testCurrent, error: testCurrentError } = await supabase
      .from('barbershop_staff')
      .select('id, financial_model, commission_rate')
      .limit(1)
    
    if (testCurrentError) {
      
    } else {
      
    }

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && 
        !stmt.startsWith('--') && 
        !stmt.startsWith('/*') && 
        !stmt.startsWith('SELECT \''))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ')

        try {
          // Try using the exec_sql RPC function first
          const { error } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (error) {
            // If RPC doesn't work, try direct SQL execution through PostgREST

            // For ALTER TABLE statements, we can't execute them directly via PostgREST
            // So we'll indicate they need to be run manually
            if (statement.toUpperCase().includes('ALTER TABLE') || 
                statement.toUpperCase().includes('CREATE INDEX') ||
                statement.toUpperCase().includes('CREATE OR REPLACE FUNCTION')) {
              
            } else {
              ')
            }
          } else {
            
          }
        } catch (stmtError) {
          
        }
      }
    }

    // Test if new fields are accessible
    const { data: testFields, error: testFieldsError } = await supabase
      .from('barbershop_staff')
      .select('id, arrangement_type, rent_frequency, hybrid_base_rent')
      .limit(1)
    
    if (testFieldsError) {

      )
      
      )
    } else {

      ) - standardized field name')
      ) - weekly, bi_weekly, monthly')
      ) - base rent for hybrid model')
      ) - revenue threshold')
      ) - commission rate for hybrid')

       - financial calculations')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)

    process.exit(1)
  }
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
            - commission, booth_rent, hybrid
  - rent_frequency: VARCHAR(20)            - payment frequency for booth rent
  - hybrid_base_rent: DECIMAL(8,2)         - base rent amount for hybrid model  
  - hybrid_revenue_threshold: DECIMAL(10,2) - revenue threshold for hybrid
  - hybrid_commission_rate: DECIMAL(5,4)   - commission rate above threshold

The migration is safe and preserves existing data.
`)
  process.exit(0)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFinancialMigration()
}

export { runFinancialMigration }