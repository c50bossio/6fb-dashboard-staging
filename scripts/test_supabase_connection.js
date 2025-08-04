#!/usr/bin/env node
/**
 * Test Supabase Connection
 * Run with: node scripts/test_supabase_connection.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n')

  // Check environment variables
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey) {
    console.error('❌ Missing Supabase credentials in .env.local')
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  console.log('✅ Environment variables found')
  console.log(`📍 URL: ${url}`)
  console.log(`🔑 Anon Key: ${anonKey.substring(0, 20)}...`)
  if (serviceKey) {
    console.log(`🔐 Service Key: ${serviceKey.substring(0, 20)}...`)
  }

  try {
    // Test with anon key (client-side)
    console.log('\n🧪 Testing client connection (anon key)...')
    const supabase = createClient(url, anonKey)
    
    // Try to fetch from a table (will fail if table doesn't exist yet)
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      if (error.message.includes('relation "public.users" does not exist')) {
        console.log('⚠️  Tables not created yet - please run the migration SQL')
        console.log('   Go to Supabase Dashboard > SQL Editor')
        console.log('   Run the script from: scripts/supabase-migration.sql')
      } else if (error.message.includes('JWT')) {
        console.log('✅ Connection successful but authentication needed')
      } else {
        console.log('❌ Error:', error.message)
      }
    } else {
      console.log('✅ Connection successful! Tables exist.')
    }

    // Test with service key (server-side)
    if (serviceKey) {
      console.log('\n🧪 Testing service connection (service key)...')
      const supabaseAdmin = createClient(url, serviceKey)
      
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1)

      if (adminError) {
        console.log('❌ Service key error:', adminError.message)
      } else {
        console.log('✅ Service key connection successful!')
      }
    }

    console.log('\n📋 Next Steps:')
    console.log('1. If tables don\'t exist, run the migration SQL in Supabase')
    console.log('2. Run the data migration: python scripts/migrate_sqlite_to_supabase.py')
    console.log('3. Start the app: npm run dev')
    console.log('\n🎉 Supabase setup is working!')

  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    process.exit(1)
  }
}

// Run the test
testConnection()