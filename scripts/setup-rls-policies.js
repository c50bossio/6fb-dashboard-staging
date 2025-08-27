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

async function setupRLS() {

  try {
    const sqlPath = join(__dirname, '../database/setup-rls-policies.sql')
    const sql = readFileSync(sqlPath, 'utf8')

    .toFixed(1)} KB`)

    const tables = ['barbershops', 'barbers', 'services', 'clients', 'appointments']
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          `)
        } else {
          `)
        }
      } catch (err) {
        `)
      }
    }

    ')

    , owner management')
    , self + owner management')
    , owner management')

    return true
    
  } catch (error) {
    console.error('❌ Error setting up RLS policies:', error)
    return false
  }
}

async function testRLSAccess() {

  try {
    const { data: barbershops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name, is_active')
      .limit(3)
    
    if (shopsError) {
      ')
    } else {
      
    }
    
    const { data: barbers, error: barbersError } = await supabase
      .from('barbers')
      .select('id, name, is_available')
      .limit(3)
    
    if (barbersError) {
      ')
    } else {
      
    }
    
  } catch (error) {
    
  }

}

async function main() {
  const success = await setupRLS()
  await testRLSAccess()
  
  if (success) {

  } else {
    
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default setupRLS