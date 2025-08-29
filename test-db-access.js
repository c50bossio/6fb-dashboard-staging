#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

console.log('🔍 Testing Database Table Access...\n')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testTableAccess() {
  const tables = ['calendar_integrations', 'calendar_sync_history', 'calendar_conflicts']
  
  for (const tableName of tables) {
    try {
      console.log(`Testing ${tableName}...`)
      
      // Test table structure
      const { data, error } = await supabase.from(tableName).select('*').limit(1)
      
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`)
        
        // If table doesn't exist, try to check what tables do exist
        if (error.message.includes('does not exist')) {
          console.log('   Checking if table exists in schema...')
          
          const { data: tableInfo, error: infoError } = await supabase.rpc('get_table_info', { 
            table_name: tableName 
          })
          
          if (infoError) {
            console.log('   Schema check failed:', infoError.message)
          } else {
            console.log('   Table info:', tableInfo)
          }
        }
      } else {
        console.log(`✅ ${tableName}: Table accessible (${data ? data.length : 0} records)`)
      }
    } catch (e) {
      console.log(`❌ ${tableName}: Exception - ${e.message}`)
    }
    
    console.log() // Empty line for readability
  }
  
  // Test basic table creation manually if needed
  console.log('🔧 Attempting to create table manually if needed...')
  
  try {
    // Try to create calendar_integrations table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS calendar_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        barbershop_id UUID,
        provider VARCHAR(50) NOT NULL DEFAULT 'google',
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT TRUE,
        display_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    
    // Use the SQL query
    const { data, error } = await supabase.rpc('exec', { sql: createTableSQL })
    
    if (error) {
      console.log('Manual table creation failed:', error.message)
    } else {
      console.log('✅ Manual table creation succeeded')
      
      // Test again
      const { data: testData, error: testError } = await supabase
        .from('calendar_integrations')
        .select('*')
        .limit(1)
        
      if (testError) {
        console.log('Post-creation test failed:', testError.message)
      } else {
        console.log('✅ Table now accessible after manual creation')
      }
    }
    
  } catch (error) {
    console.log('Manual creation exception:', error.message)
  }
}

testTableAccess()