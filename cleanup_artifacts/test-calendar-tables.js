import 'dotenv/config'
import supabaseQuery from './lib/supabase-query.js'

async function testCalendarTables() {
  console.log('Checking for calendar-related tables in Supabase...\n')
  
  // List all available tables
  const tables = await supabaseQuery.listTables()
  console.log('Available tables:')
  tables.forEach(table => {
    console.log(`  - ${table.table_name}`)
  })
  
  // Check for appointments/bookings table
  console.log('\n1. Checking for appointments/bookings:')
  const appointments = await supabaseQuery.queryTable('appointments', { limit: 5 })
  if (appointments.error) {
    console.log('  ❌ No appointments table found')
    
    // Try bookings table
    const bookings = await supabaseQuery.queryTable('bookings', { limit: 5 })
    if (bookings.error) {
      console.log('  ❌ No bookings table found')
    } else {
      console.log(`  ✅ Found bookings table with ${bookings.data.length} records`)
    }
  } else {
    console.log(`  ✅ Found appointments table with ${appointments.data.length} records`)
  }
  
  // Check for services table
  console.log('\n2. Checking for services:')
  const services = await supabaseQuery.queryTable('services', { limit: 5 })
  if (services.error) {
    console.log('  ❌ No services table found')
  } else {
    console.log(`  ✅ Found services table with ${services.data.length} records`)
    services.data.forEach(service => {
      console.log(`    - ${service.name || service.title}: $${service.price}`)
    })
  }
  
  // Check for barbers/staff in profiles
  console.log('\n3. Checking for barbers/staff:')
  const barbers = await supabaseQuery.queryTable('profiles', { 
    filter: { role: 'barber' },
    limit: 10
  })
  
  if (barbers.data && barbers.data.length > 0) {
    console.log(`  ✅ Found ${barbers.data.length} barbers in profiles`)
    barbers.data.forEach(barber => {
      console.log(`    - ${barber.full_name || barber.email}`)
    })
  } else {
    // Try to get all profiles and see what roles exist
    const allProfiles = await supabaseQuery.queryTable('profiles', { 
      select: 'role',
      limit: 20
    })
    const roles = [...new Set(allProfiles.data?.map(p => p.role) || [])]
    console.log(`  ℹ️ Available roles in profiles: ${roles.join(', ')}`)
  }
  
  // Check for barbershops/locations
  console.log('\n4. Checking for barbershops/locations:')
  const barbershops = await supabaseQuery.queryTable('barbershops', { limit: 5 })
  if (barbershops.error) {
    const locations = await supabaseQuery.queryTable('locations', { limit: 5 })
    if (locations.error) {
      console.log('  ❌ No barbershops or locations table found')
    } else {
      console.log(`  ✅ Found locations table with ${locations.data.length} records`)
    }
  } else {
    console.log(`  ✅ Found barbershops table with ${barbershops.data.length} records`)
  }
}

// Run the test
testCalendarTables().catch(console.error)