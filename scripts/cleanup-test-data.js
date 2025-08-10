#\!/usr/bin/env node

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...')
  
  // Delete test bookings
  await supabase.from('bookings').delete().eq('is_test', true)
  
  // Delete test customers
  await supabase.from('customers').delete().eq('is_test', true)
  
  // Delete test services  
  await supabase.from('services').delete().eq('is_test', true)
  
  // Delete test barbers
  await supabase.from('barbers').delete().eq('is_test', true)
  
  console.log('✅ Test data cleaned up')
}

cleanupTestData().catch(console.error)
EOF < /dev/null