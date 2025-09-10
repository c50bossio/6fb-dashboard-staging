#!/usr/bin/env node

/**
 * Run Phase 1 ID Standardization Migration
 * This script applies the phase1_id_standardization.sql migration to the database
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting Phase 1 ID Standardization Migration...\n')
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'phase1_id_standardization.sql')
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8')
    
    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📏 Migration size:', migrationSQL.length, 'characters\n')
    
    // Split the migration into individual statements
    // Remove comments and split by semicolons
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--')) // Remove SQL comments
      .join('\n')
      .split(/;\s*$/gm) // Split by semicolons at end of line
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';')
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)
    
    // Execute each statement
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip DO blocks and other complex statements that Supabase might not handle well
      if (statement.startsWith('DO $$')) {
        console.log(`⏭️  Skipping DO block (statement ${i + 1}/${statements.length})`)
        continue
      }
      
      // Show progress
      const preview = statement.substring(0, 60).replace(/\n/g, ' ')
      console.log(`Executing (${i + 1}/${statements.length}): ${preview}...`)
      
      try {
        // Use the SQL function to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement
        }).single()
        
        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase.from('_sql').select(statement)
          
          if (directError) {
            console.error(`❌ Error in statement ${i + 1}:`, directError.message)
            errorCount++
            
            // Continue with other statements even if one fails
            continue
          }
        }
        
        console.log(`✅ Success`)
        successCount++
      } catch (err) {
        console.error(`❌ Error in statement ${i + 1}:`, err.message)
        errorCount++
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary:')
    console.log(`✅ Successful statements: ${successCount}`)
    console.log(`❌ Failed statements: ${errorCount}`)
    console.log('='.repeat(60) + '\n')
    
    // Verify the migration worked by checking if barbershop_id was added
    console.log('🔍 Verifying migration results...\n')
    
    // Check services table
    const { data: servicesCheck, error: servicesError } = await supabase
      .from('services')
      .select('id, barbershop_id, barbershop_id')
      .limit(1)
    
    if (!servicesError) {
      console.log('✅ Services table check:')
      if (servicesCheck && servicesCheck.length > 0) {
        const sample = servicesCheck[0]
        console.log('  - Has barbershop_id:', 'barbershop_id' in sample)
        console.log('  - Has barbershop_id:', 'barbershop_id' in sample)
      } else {
        console.log('  - No services found to check')
      }
    } else {
      console.log('⚠️  Could not check services table:', servicesError.message)
    }
    
    // Check profiles table
    const { data: profilesCheck, error: profilesError } = await supabase
      .from('profiles')
      .select('id, barbershop_id, barbershop_id')
      .limit(1)
    
    if (!profilesError) {
      console.log('\n✅ Profiles table check:')
      if (profilesCheck && profilesCheck.length > 0) {
        const sample = profilesCheck[0]
        console.log('  - Has barbershop_id:', 'barbershop_id' in sample)
        console.log('  - Has barbershop_id:', 'barbershop_id' in sample)
      } else {
        console.log('  - No profiles found to check')
      }
    } else {
      console.log('⚠️  Could not check profiles table:', profilesError.message)
    }
    
    console.log('\n' + '='.repeat(60))
    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!')
    } else {
      console.log('⚠️  Migration completed with some errors. Please review the output above.')
    }
    console.log('='.repeat(60) + '\n')
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration().catch(console.error)