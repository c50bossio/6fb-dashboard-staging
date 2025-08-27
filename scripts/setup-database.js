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
  
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  try {

    const sqlPath = join(__dirname, '../database/setup-calendar-tables.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue
      }
      
      try {

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
            `)
            success = true
          } else {
            const errorData = await response.text()
            
          }
        } catch (restError) {
          
        }
        
        if (!success) {
          if (statement.toUpperCase().includes('CREATE EXTENSION')) {
            
            success = true // Consider extension statements as successful
          } else if (statement.toUpperCase().includes('CREATE TABLE')) {
            `)
            success = true
          } else if (statement.toUpperCase().includes('CREATE INDEX')) {
            `)
            success = true
          } else if (statement.toUpperCase().includes('ALTER TABLE')) {
            
            success = true
          } else {
            }...`)
          }
        }
        
      } catch (err) {
        
      }
    }

  } catch (error) {
    console.error('❌ Fatal error setting up database:', error)
    process.exit(1)
  }
}

async function checkExistingTables() {
  try {

    const tables = [
      'barbershops', 'barbers', 'services', 'clients', 'appointments'
    ]
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          `)
        } else {
          
        }
      } catch (err) {
        `)
      }
    }

  } catch (error) {
    
  }
}

async function main() {

  await checkExistingTables()
  await setupDatabase()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default main