#!/usr/bin/env node

/**
 * Apply Barber Operations Migration to Supabase
 * 
 * This script applies the barber operations schema to your Supabase database.
 * It creates all necessary tables for the barber hierarchy system.
 * 
 * Usage: node scripts/apply-barber-operations-migration.js
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {

  try {
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_barber_operations.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    const statements = migrationSQL
      .split(/;(?=\s*\n)/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))

    let successCount = 0
    let errorCount = 0
    const errors = []
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (!statement || statement.match(/^(\s*--.*\n?)*$/)) {
        continue
      }
      
      const statementPreview = statement
        .split('\n')
        .find(line => line && !line.startsWith('--'))
        ?.substring(0, 50) || 'Unknown statement'
      
      process.stdout.write(`[${i + 1}/${statements.length}] Executing: ${statementPreview}...`)
      
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        }).single()
        
        if (error) {
          const { error: queryError } = await supabase
            .from('_migrations')
            .select('*')
            .limit(1)
          
          if (queryError && queryError.message.includes('exec_sql')) {

            const tempPath = path.join(__dirname, '..', 'APPLY_THIS_MIGRATION.sql')
            fs.writeFileSync(tempPath, migrationSQL)

            process.exit(1)
          }
          
          throw error || queryError
        }
        
        process.stdout.write(' ✅\n')
        successCount++
      } catch (error) {
        process.stdout.write(' ❌\n')
        errorCount++
        errors.push({
          statement: statementPreview,
          error: error.message || error
        })
        
        console.error(`   Error: ${error.message || error}`)
      }
    }
    
    )
    
    )

    if (errors.length > 0) {
      
      errors.forEach((err, index) => {

      })

      ')

    }
    
    if (successCount > 0) {

    }

    const tablesToTest = [
      'barber_customizations',
      'barber_services',
      'barbershop_staff',
      'financial_arrangements',
      'products',
      'organizations'
    ]
    
    for (const table of tablesToTest) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1)
        
        if (!error) {
          
        } else {
          
        }
      } catch (err) {
        
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

function showManualInstructions() {

  }`)

}

if (process.argv.includes('--manual')) {
  showManualInstructions()
} else {
  applyMigration().catch(error => {
    console.error('Unexpected error:', error)
    showManualInstructions()
    process.exit(1)
  })
}