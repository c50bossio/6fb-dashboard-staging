#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables manually
const envPath = join(__dirname, '../.env.local')
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🚀 Setting up calendar database schema...')

async function setupDatabase() {
  try {
    // Read the SQL schema file
    const schemaPath = join(__dirname, '../database/setup-calendar-tables.sql')
    const schema = readFileSync(schemaPath, 'utf8')
    
    console.log('📄 Loaded schema file')
    console.log('🗄️ Executing SQL schema...')
    
    // Execute the schema SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: schema })
    
    if (error) {
      console.error('❌ Error executing schema:', error)
      // Try alternative approach - execute in smaller chunks
      console.log('🔄 Trying alternative approach - executing statements individually...')
      
      // Split SQL into individual statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      console.log(`📝 Found ${statements.length} SQL statements to execute`)
      
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';'
        
        if (statement.trim().length < 5) continue
        
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement })
          
          if (stmtError && stmtError.code !== '42P07' && stmtError.code !== '42710') {
            // Ignore "already exists" errors
            console.error(`❌ Error in statement ${i + 1}: ${stmtError.message}`)
            errorCount++
          } else {
            successCount++
            if (i % 5 === 0) console.log(`✅ Executed ${i + 1}/${statements.length} statements`)
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message)
          errorCount++
        }
      }
      
      console.log(`\n📊 Results: ${successCount} successful, ${errorCount} errors`)
      
    } else {
      console.log('✅ Schema executed successfully!')
    }
    
    // Test the tables
    console.log('\n🧪 Testing table creation...')
    
    const tables = ['barbershops', 'barbers', 'services', 'clients', 'appointments']
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: Ready (${data?.length || 0} records)`)
      }
    }
    
    console.log('\n🎉 Database setup completed!')
    console.log('📈 Ready to generate test data with: node scripts/generate-comprehensive-data.js')
    
  } catch (error) {
    console.error('❌ Fatal error setting up database:', error)
    process.exit(1)
  }
}

setupDatabase()