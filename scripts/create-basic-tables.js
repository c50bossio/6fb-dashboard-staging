#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

console.log('🚀 Creating basic calendar tables...')

async function createBasicTables() {
  try {
    
    console.log('📋 Creating basic barbershop data structure...')
    
    console.log('1. Testing simple insert to see what tables exist...')
    
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .insert([{
          name: 'Test Barbershop',
          slug: 'test-barbershop-' + Date.now()
        }])
        .select()
        
      if (error) {
        console.log('❌ barbershops table:', error.message)
      } else {
        console.log('✅ barbershops table exists and working!')
      }
    } catch (err) {
      console.log('❌ barbershops error:', err.message)
    }
    
    
    console.log('\n🔧 Alternative: Create tables manually')
    console.log('📖 To create the calendar tables, please:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Paste the content from database/setup-calendar-tables.sql')
    console.log('3. Execute the SQL to create the tables')
    console.log('4. Then run: node scripts/generate-comprehensive-data.js')
    console.log('\n🔗 Supabase Dashboard: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee')
    
    console.log('\n🔄 Creating mock data with current available tables...')
    
    const { data: profiles } = await supabase.from('profiles').select('*').limit(3)
    console.log(`✅ Found ${profiles?.length || 0} profiles in database`)
    
    return true
    
  } catch (error) {
    console.error('❌ Error:', error)
    return false
  }
}

createBasicTables()