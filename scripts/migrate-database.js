#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQLFile(filePath) {
  console.log(`📁 Reading SQL file: ${filePath}`)
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8')
    
    // Split SQL into individual statements (basic splitting)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('\\echo'))
    
    console.log(`🔧 Executing ${statements.length} SQL statements...`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const [index, statement] of statements.entries()) {
      if (statement.trim().length === 0) continue
      
      try {
        console.log(`  ${index + 1}/${statements.length}: Executing...`)
        
        // Use rpc to execute raw SQL if available, otherwise use direct query
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          // Try direct query if RPC fails
          const { data: directData, error: directError } = await supabase
            .from('pg_tables')  // Use a simple query to test connection
            .select('*')
            .limit(1)
            
          if (directError) {
            console.error(`    ❌ Error: ${error.message}`)
            errorCount++
          } else {
            // If we can connect but RPC doesn't work, we might need to execute via different method
            console.log(`    ⚠️ RPC not available, need manual execution`)
          }
        } else {
          console.log(`    ✅ Success`)
          successCount++
        }
      } catch (err) {
        console.error(`    ❌ Error: ${err.message}`)
        errorCount++
      }
    }
    
    console.log(`\n📊 Results: ${successCount} successful, ${errorCount} errors`)
    
    if (errorCount > 0) {
      console.log('\n⚠️ Some statements failed. You may need to run them manually in Supabase dashboard.')
      console.log('📋 Manual execution instructions:')
      console.log('1. Go to https://supabase.com/dashboard/project/[your-project]/sql')
      console.log('2. Copy and paste the contents of scripts/create-missing-tables.sql')
      console.log('3. Click "Run" to execute the statements')
    }
    
  } catch (error) {
    console.error('❌ Error reading or executing SQL file:', error)
    return false
  }
  
  return true
}

async function verifyTables() {
  console.log('\n🔍 Verifying table creation...')
  
  const requiredTables = [
    'ai_chat_sessions',
    'ai_chat_messages', 
    'ai_knowledge_base',
    'business_analytics',
    'ai_usage_analytics'
  ]
  
  let allTablesExist = true
  
  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
        
      if (error) {
        console.log(`  ❌ ${tableName}: Not found`)
        allTablesExist = false
      } else {
        console.log(`  ✅ ${tableName}: Exists`)
      }
    } catch (err) {
      console.log(`  ❌ ${tableName}: Error checking - ${err.message}`)
      allTablesExist = false
    }
  }
  
  return allTablesExist
}

async function main() {
  console.log('🚀 Starting database migration...\n')
  
  // Check initial state
  console.log('📋 Checking current table state...')
  const initialCheck = await verifyTables()
  
  if (initialCheck) {
    console.log('✅ All required tables already exist!')
    return
  }
  
  // Execute migration
  const success = await executeSQLFile('scripts/create-missing-tables.sql')
  
  if (success) {
    // Verify results
    const finalCheck = await verifyTables()
    
    if (finalCheck) {
      console.log('\n🎉 Database migration completed successfully!')
      console.log('✅ All AI-related tables are now available')
    } else {
      console.log('\n⚠️ Migration completed with issues')
      console.log('Some tables may require manual creation')
    }
  }
}

main().catch(console.error)