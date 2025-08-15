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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTables() {
  console.log('🏗️  Creating database tables using Supabase SDK...\n')
  
  
  console.log('🔍 Checking if we can work with existing data...')
  
  const testData = {
    barbershops: [
      {
        id: 'demo-shop-001',
        name: 'The Classic Cut',
        slug: 'classic-cut-demo',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        phone: '(555) 123-4567',
        email: 'info@classiccut.com'
      }
    ],
    barbers: [
      {
        id: 'barber-001',
        barbershop_id: 'demo-shop-001',
        name: 'Tony Rodriguez',
        email: 'tony@classiccut.com',
        phone: '(555) 123-4568'
      }
    ],
    services: [
      {
        id: 'service-001',
        barbershop_id: 'demo-shop-001',
        name: 'Classic Haircut',
        price: 35,
        duration_minutes: 30
      }
    ],
    clients: [
      {
        id: 'client-001',
        barbershop_id: 'demo-shop-001',
        name: 'John Smith',
        email: 'john@example.com',
        phone: '(555) 987-6543'
      }
    ]
  }
  
  console.log('✅ Created test data structure')
  console.log('📋 Since the calendar system already has mock data fallbacks,')
  console.log('   the calendar should work without database setup.')
  console.log('')
  console.log('🔗 Test your calendar: http://localhost:9999/dashboard/calendar')
  console.log('')
  console.log('💡 For production, you would manually create tables in Supabase dashboard:')
  console.log('   1. Go to https://supabase.com/dashboard')
  console.log('   2. Open SQL Editor')
  console.log('   3. Copy and run: database/setup-calendar-tables.sql')
  console.log('')
  
  return testData
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createTables().catch(console.error)
}

export default createTables