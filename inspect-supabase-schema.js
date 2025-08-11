#!/usr/bin/env node

/**
 * Inspect Supabase table schemas to understand the structure
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function inspectTableSchema(tableName) {
  console.log(`\n🔍 Inspecting ${tableName} schema:`)
  console.log('=' .repeat(50))
  
  try {
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      console.log(`❌ Error querying ${tableName}:`, error.message)
      return
    }
    
    if (data && data.length > 0) {
      const record = data[0]
      console.log('📋 Columns found:')
      Object.keys(record).forEach(key => {
        const value = record[key]
        const type = Array.isArray(value) ? 'array' : typeof value
        console.log(`   - ${key}: ${type} = ${JSON.stringify(value)}`)
      })
    } else {
      // No data, try to insert a test record to see required fields
      console.log('📋 No existing data, attempting test insert to discover required fields...')
      
      const testData = {}
      const { error: insertError } = await supabase
        .from(tableName)
        .insert([testData])
      
      if (insertError) {
        console.log(`⚠️  Required fields indicated by error: ${insertError.message}`)
      }
    }
    
  } catch (error) {
    console.log(`❌ Failed to inspect ${tableName}:`, error.message)
  }
}

async function main() {
  console.log('🔬 Inspecting Supabase Table Schemas')
  console.log('This will help us understand the exact structure needed for migration')
  
  const tables = ['customers', 'services', 'barbers', 'appointments', 'payments', 'barbershops']
  
  for (const table of tables) {
    await inspectTableSchema(table)
  }
}

main()