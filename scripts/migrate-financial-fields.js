#!/usr/bin/env node

/**
 * Simple script to add financial arrangement fields to the database
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔄 Running financial arrangement fields migration...')
console.log('📊 Supabase URL:', supabaseUrl ? '✅ Found' : '❌ Missing')
console.log('🔑 Service Key:', supabaseServiceKey ? '✅ Found' : '❌ Missing')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('\n🔍 Testing database connection...')

try {
  // Test basic connection
  const { data: testConnection, error: connectionError } = await supabase
    .from('barbershop_staff')
    .select('id')
    .limit(1)
  
  if (connectionError) {
    console.error('❌ Connection failed:', connectionError.message)
    process.exit(1)
  }
  
  console.log('✅ Database connection successful')
  
  // Check if fields already exist
  const { data: currentRecord, error: currentError } = await supabase
    .from('barbershop_staff') 
    .select('id, arrangement_type, rent_frequency')
    .limit(1)
  
  if (!currentError && currentRecord) {
    console.log('✅ Financial fields already exist - migration may have been run previously')
    console.log('📋 Current fields detected:', Object.keys(currentRecord))
    process.exit(0)
  }
  
  console.log('\n🚀 Adding financial arrangement fields...')
  console.log('⚠️  Note: This requires manual execution in Supabase SQL Editor')
  
  // Read the migration file and display it
  const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '009_add_financial_arrangement_fields.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
  
  console.log('\n📋 MANUAL MIGRATION REQUIRED:')
  console.log('1. Go to your Supabase Dashboard → SQL Editor')
  console.log('2. Copy and paste the following SQL:')
  console.log('\n' + '='.repeat(80))
  console.log(migrationSQL)
  console.log('='.repeat(80))
  console.log('\n3. Click "Run" to execute the migration')
  console.log('\n✅ After running the SQL, the CRUD functionality will work!')
  
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}