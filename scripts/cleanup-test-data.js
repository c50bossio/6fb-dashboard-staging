#!/usr/bin/env node

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupTestData() {

  await supabase.from('bookings').delete().eq('is_test', true)
  
  await supabase.from('customers').delete().eq('is_test', true)
  
  await supabase.from('services').delete().eq('is_test', true)
  
  await supabase.from('barbers').delete().eq('is_test', true)

}

cleanupTestData().catch(console.error)
EOF < /dev/null