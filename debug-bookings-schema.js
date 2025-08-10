import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Connecting to Supabase...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugBookings() {
  console.log('\n📊 Checking bookings table...')
  
  // Get one booking
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .limit(1)
  
  if (bookingsError) {
    console.error('Error fetching bookings:', bookingsError)
    return
  }
  
  if (bookings && bookings.length > 0) {
    console.log('\n✅ Sample booking:')
    console.log(JSON.stringify(bookings[0], null, 2))
    
    // Check what columns we have
    const columns = Object.keys(bookings[0])
    console.log('\n📋 Available columns in bookings table:')
    columns.forEach(col => console.log(`  - ${col}`))
  }
  
  // Check if we have related tables
  console.log('\n📊 Checking services table...')
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('*')
    .limit(3)
  
  if (services) {
    console.log(`✅ Found ${services.length} services`)
    console.log('Sample service:', services[0])
  } else if (servicesError) {
    console.log('❌ Services table error:', servicesError.message)
  }
  
  console.log('\n📊 Checking customers table...')
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('*')
    .limit(3)
  
  if (customers) {
    console.log(`✅ Found ${customers.length} customers`)
    console.log('Sample customer:', customers[0])
  } else if (customersError) {
    console.log('❌ Customers table error:', customersError.message)
  }
  
  console.log('\n📊 Checking barbers table...')
  const { data: barbers, error: barbersError } = await supabase
    .from('barbers')
    .select('*')
    .limit(3)
  
  if (barbers) {
    console.log(`✅ Found ${barbers.length} barbers`)
    console.log('Sample barber:', barbers[0])
  } else if (barbersError) {
    console.log('❌ Barbers table error:', barbersError.message)
  }
}

debugBookings().catch(console.error)