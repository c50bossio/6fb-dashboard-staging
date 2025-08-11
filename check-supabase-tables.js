#!/usr/bin/env node

/**
 * Check what tables already exist in Supabase to avoid duplicates
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkExistingTables() {
  console.log('🔍 Checking existing tables in Supabase...\n')
  
  const coreTables = [
    'appointments',
    'customers', 
    'payments',
    'services',
    'barbers',
    'barbershops',
    'business_metrics',
    'ai_insights',
    'ai_agents',
    'chat_history'
  ]
  
  const results = {
    existing: [],
    missing: [],
    errors: []
  }
  
  for (const tableName of coreTables) {
    try {
      // Try to query the table to see if it exists
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        if (error.message.includes('does not exist') || error.code === 'PGRST116') {
          console.log(`❌ Table missing: ${tableName}`)
          results.missing.push(tableName)
        } else {
          console.log(`⚠️  Table "${tableName}" error:`, error.message)
          results.errors.push({ table: tableName, error: error.message })
        }
      } else {
        console.log(`✅ Table exists: ${tableName} (${count || 0} rows)`)
        results.existing.push({ table: tableName, count })
      }
    } catch (err) {
      console.log(`❌ Failed to check ${tableName}:`, err.message)
      results.errors.push({ table: tableName, error: err.message })
    }
  }
  
  console.log('\n📊 Summary:')
  console.log('='.repeat(50))
  console.log(`✅ Existing tables: ${results.existing.length}`)
  console.log(`❌ Missing tables: ${results.missing.length}`) 
  console.log(`⚠️  Errors: ${results.errors.length}`)
  
  if (results.existing.length > 0) {
    console.log('\n📋 Tables that already exist:')
    results.existing.forEach(({ table, count }) => {
      console.log(`   - ${table} (${count || 0} rows)`)
    })
  }
  
  if (results.missing.length > 0) {
    console.log('\n🔧 Tables we need to create:')
    results.missing.forEach(table => {
      console.log(`   - ${table}`)
    })
  }
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Tables with errors:')
    results.errors.forEach(({ table, error }) => {
      console.log(`   - ${table}: ${error}`)
    })
  }
  
  // Check if we have data to migrate
  if (results.existing.length > 0) {
    console.log('\n⚠️  WARNING: Some tables already exist!')
    console.log('   Before running migration scripts:')
    console.log('   1. Check if existing data should be preserved')
    console.log('   2. Consider backup before any changes')
    console.log('   3. Use INSERT ... ON CONFLICT to avoid duplicates')
  }
  
  return results
}

// Additional check for auth.users table
async function checkAuthUsers() {
  try {
    const { count, error } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
    
    if (!error) {
      console.log(`\n👥 Users in auth.users: ${count || 0}`)
    }
  } catch (err) {
    // auth.users might not be accessible via API
    console.log('\n👥 Users table: Not accessible via API (normal)')
  }
}

async function main() {
  try {
    await checkExistingTables()
    await checkAuthUsers()
  } catch (error) {
    console.error('Failed to check Supabase tables:', error.message)
  }
}

main()