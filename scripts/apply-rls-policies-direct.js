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
  envContent.split('\n').forEach(line => {
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyRLSPolicies() {

  const sqlPath = join(__dirname, '../database/setup-rls-policies.sql')
  const sql = readFileSync(sqlPath, 'utf8')
  
  const statements = sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

  const results = {
    success: 0,
    failed: 0,
    errors: []
  }

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
      continue
    }

    try {

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ query: statement + ';' })
      })

      if (response.ok) {
        
        results.success++
      } else {
        const errorText = await response.text()

        if (errorText.includes('already exists') || errorText.includes('does not exist')) {
          
          results.success++
        } else {
          results.failed++
          results.errors.push({ statement: statement.substring(0, 50) + '...', error: errorText })
        }
      }

    } catch (error) {
      
      results.failed++
      results.errors.push({ statement: statement.substring(0, 50) + '...', error: error.message })
    }
  }

  return results
}

async function testRLSPolicies() {

  const tests = [
    {
      name: 'Public access to active barbershops',
      query: () => supabase.from('barbershops').select('id, name, is_active').eq('is_active', true).limit(3)
    },
    {
      name: 'Public access to available barbers',
      query: () => supabase.from('barbers').select('id, name, is_available').eq('is_available', true).limit(3)
    },
    {
      name: 'Public access to active services',
      query: () => supabase.from('services').select('id, name, price').eq('is_active', true).limit(3)
    }
  ]

  for (const test of tests) {
    try {
      
      const { data, error } = await test.query()
      
      if (error) {
        if (error.message.includes('RLS') || error.code === 'PGRST301') {
          `)
        } else {
          
        }
      } else {
        
      }
    } catch (err) {
      
    }
  }
}

async function main() {
  try {

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials')
      process.exit(1)
    }

    const results = await applyRLSPolicies()

    if (results.errors.length > 0 && results.failed > results.errors.length / 2) {
      
      results.errors.slice(0, 3).forEach(err => {
        
      })
    }

    await testRLSPolicies()

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default applyRLSPolicies