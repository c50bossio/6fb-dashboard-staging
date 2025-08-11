#!/usr/bin/env node

/**
 * Check which tables exist in Supabase
 */

import 'dotenv/config'
import supabaseQuery from '../lib/supabase-query.js'

async function checkTables() {
  console.log('🔍 Checking for required tables in Supabase...\n')
  
  const requiredTables = [
    'barbershops',
    'services', 
    'customers',
    'appointments',
    'transactions',
    'barbershop_staff',
    'barber_customizations',
    'barber_services',
    'financial_arrangements',
    'products'
  ]
  
  const existingTables = []
  const missingTables = []
  
  for (const table of requiredTables) {
    const result = await supabaseQuery.queryTable(table, { limit: 1 })
    if (result.error) {
      console.log(`❌ ${table} - NOT FOUND`)
      missingTables.push(table)
    } else {
      console.log(`✅ ${table} - EXISTS`)
      existingTables.push(table)
    }
  }
  
  console.log('\n📊 Summary:')
  console.log(`   Existing tables: ${existingTables.length}`)
  console.log(`   Missing tables: ${missingTables.length}`)
  
  if (missingTables.length > 0) {
    console.log('\n⚠️  Missing tables:', missingTables.join(', '))
    console.log('\n📝 To fix this:')
    console.log('1. Go to Supabase SQL Editor')
    console.log('2. Run the migration from: database/migrations/002_core_tables.sql')
    console.log('3. Then run: node scripts/seed-test-data.js')
  } else {
    console.log('\n✅ All required tables exist! You can run the seed script.')
  }
}

checkTables().catch(console.error)