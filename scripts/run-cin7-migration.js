#!/usr/bin/env node

/**
 * Cin7 Database Migration Script
 * Executes the migration using Supabase client
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

async function runCin7Migration() {

  // Check environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:')
    console.error('   - NEXT_PUBLIC_SUPABASE_URL')
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    console.error('\nPlease check your .env.local file.')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Read the migration SQL file
    const migrationPath = '/Users/bossio/6FB AI Agent System/database/cin7-credentials-migration.sql'
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 10) {
        continue
      }

      try {
        }...`)
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        })

        if (error) {
          // Try direct execution if RPC fails
          const { error: directError } = await supabase
            .from('_dummy_')
            .select('1')
            .limit(0)
          
          // Execute using raw SQL if possible
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
            },
            body: JSON.stringify({ sql_query: statement + ';' })
          })

          if (!response.ok) {
            :`, error.message)
            errorCount++
          } else {
            
            successCount++
          }
        } else {
          
          successCount++
        }
      } catch (execError) {
        
        errorCount++
      }
    }

    // Verify the table was created

    const { data: tableCheck, error: tableError } = await supabase
      .from('cin7_credentials')
      .select('*')
      .limit(1)

    if (tableError && tableError.code === '42P01') {

    } else {

    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message)

    process.exit(1)
  }
}

// Show manual instructions as backup
function showManualInstructions() {

}

// Run the migration
if (require.main === module) {
  runCin7Migration().catch(error => {
    console.error('Migration script failed:', error.message)
    showManualInstructions()
    process.exit(1)
  })
}

module.exports = { runCin7Migration }