#!/usr/bin/env node

/**
 * Simple verification script to check if no-show tables exist
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTables() {
  console.log('🔍 Checking no-show management tables...')
  
  const tables = [
    'no_shows',
    'no_show_policies', 
    'no_show_enforcements',
    'customer_no_show_stats',
    'no_show_trends'
  ]
  
  for (const table of tables) {
    try {
      // Try to count records (will fail if table doesn't exist)
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ Table '${table}' does not exist`)
        } else {
          console.log(`⚠️  Table '${table}': ${error.message}`)
        }
      } else {
        console.log(`✅ Table '${table}' exists (${count || 0} records)`)
      }
    } catch (error) {
      console.log(`❌ Table '${table}': ${error.message}`)
    }
  }
  
  // Test a simple insert to verify table structure
  console.log('\n🧪 Testing table structure...')
  try {
    const { error } = await supabase
      .from('no_show_policies')
      .insert([{
        barbershop_id: '00000000-0000-0000-0000-000000000000',
        name: 'Test Policy',
        description: 'Test policy for verification',
        is_active: false
      }])
    
    if (error) {
      console.log(`⚠️  Insert test failed: ${error.message}`)
    } else {
      console.log('✅ Table structure test passed')
      
      // Clean up test record
      await supabase
        .from('no_show_policies')
        .delete()
        .eq('name', 'Test Policy')
    }
  } catch (error) {
    console.log(`❌ Structure test failed: ${error.message}`)
  }
}

checkTables().then(() => {
  console.log('\n🎯 Verification complete!')
}).catch(error => {
  console.error('\n❌ Verification failed:', error.message)
})