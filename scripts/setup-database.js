#!/usr/bin/env node

/**
 * Database Setup Script
 * Initializes Supabase database with all required schemas
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQLFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8')
    
    // Split by semicolons but ignore those in strings
    const statements = sql
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      console.log(`   Executing: ${statement.substring(0, 50)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        console.error(`   ❌ Error: ${error.message}`)
        throw error
      }
    }
    
    console.log(`   ✅ Successfully executed ${statements.length} statements`)
  } catch (error) {
    console.error(`❌ Failed to run ${filePath}:`, error.message)
    throw error
  }
}

async function setupDatabase() {
  console.log('🗄️  Setting up Supabase database...\n')
  
  const schemaFiles = [
    'database/supabase-schema.sql',
    'database/payment-schema.sql',
    'database/notification-schema.sql',
  ]
  
  for (const file of schemaFiles) {
    const filePath = path.join(__dirname, '..', file)
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (not found)`)
      continue
    }
    
    console.log(`📄 Running ${file}...`)
    try {
      await runSQLFile(filePath)
    } catch (error) {
      console.error(`Failed to setup database. Please check your Supabase configuration.`)
      process.exit(1)
    }
  }
  
  console.log('\n✅ Database setup completed successfully!')
  console.log('\n📝 Next steps:')
  console.log('   1. Enable Row Level Security (RLS) in Supabase dashboard')
  console.log('   2. Configure authentication providers')
  console.log('   3. Set up storage buckets if needed')
}

// Note: Supabase doesn't support direct SQL execution via client library
// This is a placeholder - you'll need to run SQL via Supabase dashboard
console.log('⚠️  Note: This script is a guide. Please run the SQL files manually in Supabase SQL editor.')
console.log('\n📂 SQL files to run:')
console.log('   1. database/supabase-schema.sql')
console.log('   2. database/payment-schema.sql')
console.log('   3. database/notification-schema.sql')
console.log('\nOpen your Supabase dashboard → SQL Editor → New Query → Paste and run each file.')

// Alternatively, provide direct links
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (projectRef) {
  console.log(`\n🔗 Direct link to SQL editor:`)
  console.log(`   https://app.supabase.com/project/${projectRef}/sql`)
}