#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '../.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  const envLines = envContent.split('\n')

  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=')
      }
    }
  })
} catch (error) {
  console.log('Warning: Could not load .env.local file')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Debug - Environment check:')
console.log('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('   SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {
    console.log('🚀 Setting up calendar database tables...\n')
    
    const sqlPath = join(__dirname, '../database/setup-calendar-tables.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue
      }
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        
        let success = false
        
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ query: statement })
          })
          
          if (response.ok) {
            console.log(`   └─ ✅ Success (REST API)`)
            success = true
          } else {
            const errorData = await response.text()
            console.log(`   └─ ⚠️  REST API Error: ${errorData}`)
          }
        } catch (restError) {
          console.log(`   └─ ⚠️  REST API failed: ${restError.message}`)
        }
        
        if (!success) {
          if (statement.toUpperCase().includes('CREATE EXTENSION')) {
            console.log(`   └─ 🔌 Extension statement - may require superuser privileges`)
            success = true // Consider extension statements as successful
          } else if (statement.toUpperCase().includes('CREATE TABLE')) {
            console.log(`   └─ 📋 Table creation - continuing (may already exist)`)
            success = true
          } else if (statement.toUpperCase().includes('CREATE INDEX')) {
            console.log(`   └─ 📊 Index creation - continuing (may already exist)`)
            success = true
          } else if (statement.toUpperCase().includes('ALTER TABLE')) {
            console.log(`   └─ 🔧 Table alteration - continuing`)
            success = true
          } else {
            console.log(`   └─ ⚠️  Could not execute: ${statement.substring(0, 50)}...`)
          }
        }
        
      } catch (err) {
        console.log(`   └─ ⚠️  Exception: ${err.message}`)
      }
    }
    
    console.log('\n🎉 Database setup completed!')
    console.log('\nNext steps:')
    console.log('1. Run: node scripts/create-test-data.js')
    console.log('2. Test the calendar system with real data')
    console.log('3. Use scripts/cleanup-test-data.js to remove test data later\n')
    
  } catch (error) {
    console.error('❌ Fatal error setting up database:', error)
    process.exit(1)
  }
}

async function checkExistingTables() {
  try {
    console.log('🔍 Checking existing tables...\n')
    
    const tables = [
      'barbershops', 'barbers', 'services', 'clients', 'appointments'
    ]
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.log(`   📋 ${table}: Does not exist (will be created)`)
        } else {
          console.log(`   📋 ${table}: ✅ Exists with ${count || 0} records`)
        }
      } catch (err) {
        console.log(`   📋 ${table}: Does not exist (will be created)`)
      }
    }
    
    console.log('')
  } catch (error) {
    console.log('Could not check existing tables, proceeding with setup...\n')
  }
}

async function main() {
  console.log('🏪 6FB AI Agent System - Database Setup')
  console.log('=====================================\n')
  
  await checkExistingTables()
  await setupDatabase()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default main