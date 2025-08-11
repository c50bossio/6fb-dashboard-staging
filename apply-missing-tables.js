#!/usr/bin/env node

/**
 * Apply missing tables migration (appointments and transactions)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function applyMigration() {
  console.log('📊 Applying missing tables migration...\n')
  
  try {
    // Read the migration SQL file
    const migrationSQL = readFileSync('./database/migrations/003_missing_tables.sql', 'utf8')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    })
    
    if (error) {
      console.error('❌ Error applying migration:', error.message)
      
      // Try alternative approach - split and execute individual statements
      console.log('🔄 Trying alternative approach...')
      
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      for (const statement of statements) {
        if (statement.length > 0) {
          console.log(`Executing: ${statement.substring(0, 50)}...`)
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql_query: statement + ';'
          })
          
          if (stmtError) {
            console.log(`⚠️ Statement error: ${stmtError.message}`)
          } else {
            console.log('✅ Statement executed successfully')
          }
        }
      }
    } else {
      console.log('✅ Migration applied successfully!')
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...')
    
    const { data: appointmentsCheck } = await supabase
      .from('appointments')
      .select('id')
      .limit(1)
    
    const { data: transactionsCheck } = await supabase
      .from('transactions')
      .select('id')
      .limit(1)
    
    console.log(appointmentsCheck !== null ? '✅ appointments table exists' : '❌ appointments table missing')
    console.log(transactionsCheck !== null ? '✅ transactions table exists' : '❌ transactions table missing')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  }
}

applyMigration().catch(console.error)