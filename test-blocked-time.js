// Test script to verify blocked time persistence
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBlockedTime() {
  console.log('Testing blocked time persistence...\n')
  
  // 1. Query existing blocked times
  console.log('1. Checking existing blocked times in bookings table...')
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'blocked')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (bookingsError) {
    console.error('Error querying bookings:', bookingsError)
  } else {
    console.log(`Found ${bookings?.length || 0} blocked time slots:`)
    bookings?.forEach(booking => {
      console.log(`  - ID: ${booking.id}`)
      console.log(`    Shop: ${booking.shop_id}`)
      console.log(`    Start: ${booking.start_time}`)
      console.log(`    End: ${booking.end_time}`)
      console.log(`    Notes: ${booking.notes}`)
      console.log(`    Created: ${booking.created_at}`)
      console.log('')
    })
  }
  
  // 2. Check the most recent booking of any type
  console.log('2. Checking most recent booking (any status)...')
  const { data: recentBooking, error: recentError } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (recentError) {
    console.error('Error getting recent booking:', recentError)
  } else if (recentBooking) {
    console.log('Most recent booking:')
    console.log(JSON.stringify(recentBooking, null, 2))
  }
  
  // 3. Test the shop ID that's being used
  const testShopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b'
  console.log(`\n3. Checking bookings for shop ID: ${testShopId}`)
  
  const { data: shopBookings, error: shopError } = await supabase
    .from('bookings')
    .select('id, status, start_time, notes')
    .eq('shop_id', testShopId)
    .order('start_time', { ascending: false })
    .limit(10)
  
  if (shopError) {
    console.error('Error querying shop bookings:', shopError)
  } else {
    console.log(`Found ${shopBookings?.length || 0} bookings for this shop`)
    shopBookings?.forEach(b => {
      console.log(`  ${b.status}: ${b.start_time} - ${b.notes?.substring(0, 50)}`)
    })
  }
  
  process.exit(0)
}

testBlockedTime().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})