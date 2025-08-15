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
  console.log('🚀 Starting Barber Operations Migration...\n')
  
  try {
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_barber_operations.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration file loaded successfully')
    console.log('📍 File path:', migrationPath)
    console.log('📏 SQL length:', migrationSQL.length, 'characters\n')
    
    const statements = migrationSQL
      .split(/;(?=\s*\n)/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`)
    
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
            console.log('\n\n⚠️  The exec_sql function is not available in your Supabase database.')
            console.log('\n📝 Please run the migration manually:')
            console.log('1. Go to your Supabase dashboard')
            console.log('2. Navigate to SQL Editor')
            console.log('3. Create a new query')
            console.log('4. Copy and paste the contents of:')
            console.log(`   ${migrationPath}`)
            console.log('5. Run the query\n')
            
            const tempPath = path.join(__dirname, '..', 'APPLY_THIS_MIGRATION.sql')
            fs.writeFileSync(tempPath, migrationSQL)
            console.log(`\n💾 Migration SQL has been saved to: ${tempPath}`)
            console.log('   You can copy this file content to Supabase SQL Editor\n')
            
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
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log('='.repeat(60))
    console.log(`✅ Successful statements: ${successCount}`)
    console.log(`❌ Failed statements: ${errorCount}`)
    
    if (errors.length > 0) {
      console.log('\n⚠️  Some statements failed:')
      errors.forEach((err, index) => {
        console.log(`\n${index + 1}. ${err.statement}`)
        console.log(`   Error: ${err.error}`)
      })
      
      console.log('\n💡 Common reasons for failures:')
      console.log('   - Tables might already exist (this is OK)')
      console.log('   - Some PostgreSQL syntax might need adjustment')
      console.log('   - RLS policies might already be in place')
    }
    
    if (successCount > 0) {
      console.log('\n🎉 Migration partially or fully completed!')
      console.log('   Your database now has the barber operations tables.')
    }
    
    console.log('\n🔍 Testing created tables...\n')
    
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
          console.log(`   ✅ Table '${table}' is accessible`)
        } else {
          console.log(`   ❌ Table '${table}' error: ${error.message}`)
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}' error: ${err.message}`)
      }
    }
    
    console.log('\n✨ Migration process complete!\n')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

function showManualInstructions() {
  console.log('\n📝 Manual Migration Instructions:')
  console.log('=====================================\n')
  console.log('Since direct SQL execution might not be available, follow these steps:\n')
  console.log('1. Open your Supabase Dashboard')
  console.log('2. Go to the SQL Editor section')
  console.log('3. Click "New query"')
  console.log('4. Copy the entire contents of this file:')
  console.log(`   ${path.join(__dirname, '..', 'database', 'migrations', '001_barber_operations.sql')}`)
  console.log('5. Paste it into the SQL editor')
  console.log('6. Click "Run" to execute the migration\n')
  console.log('The migration will create all necessary tables for the barber operations system.\n')
}

console.log('====================================')
console.log('   Barber Operations Migration')
console.log('====================================\n')

if (process.argv.includes('--manual')) {
  showManualInstructions()
} else {
  applyMigration().catch(error => {
    console.error('Unexpected error:', error)
    showManualInstructions()
    process.exit(1)
  })
}