#!/usr/bin/env node
/**
 * Test Supabase Connection
 * Run with: node scripts/test_supabase_connection.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function testConnection() {

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  }...`)
  if (serviceKey) {
    }...`)
  }

  try {
    ...')
    const supabase = createClient(url, anonKey)
    
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      if (error.message.includes('relation "public.users" does not exist')) {

      } else if (error.message.includes('JWT')) {
        
      } else {
        
      }
    } else {
      
    }

    if (serviceKey) {
      ...')
      const supabaseAdmin = createClient(url, serviceKey)
      
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1)

      if (adminError) {
        
      } else {
        
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    process.exit(1)
  }
}

testConnection()