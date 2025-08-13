import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupCalendarTables() {
  console.log('🚀 Setting up calendar tables in Supabase...\n')
  
  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, 'database', 'calendar-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('📄 Read calendar schema from:', schemaPath)
    console.log('⚠️  Note: This script shows the SQL that needs to be run.')
    console.log('⚠️  You need to run this SQL in the Supabase SQL Editor:\n')
    console.log('1. Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql')
    console.log('2. Copy and paste the following SQL:')
    console.log('='.repeat(60))
    console.log(schema)
    console.log('='.repeat(60))
    console.log('\n✅ After running the SQL above in Supabase, your calendar tables will be ready!')
    
    // Test if tables exist
    console.log('\n🔍 Checking current table status...')
    
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('count')
      .limit(1)
    
    if (!servicesError) {
      console.log('✅ Services table exists')
    } else {
      console.log('❌ Services table not found')
    }
    
    const { data: barbers, error: barbersError } = await supabase
      .from('barbers')
      .select('count')
      .limit(1)
    
    if (!barbersError) {
      console.log('✅ Barbers table exists')
    } else {
      console.log('❌ Barbers table not found')
    }
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('count')
      .limit(1)
    
    if (!bookingsError) {
      console.log('✅ Bookings table exists')
    } else {
      console.log('❌ Bookings table not found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Run setup
setupCalendarTables().catch(console.error)