#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

console.log('🛠️ Creating Calendar Tables Directly...\n')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTables() {
  // Create calendar_integrations table
  console.log('Creating calendar_integrations table...')
  
  const calendarIntegrationsSQL = `
    CREATE TABLE calendar_integrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      barbershop_id UUID,
      provider VARCHAR(50) NOT NULL DEFAULT 'google',
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE,
      display_name VARCHAR(255),
      email VARCHAR(255),
      calendar_id VARCHAR(255) DEFAULT 'primary',
      sync_direction VARCHAR(20) DEFAULT 'both',
      auto_create_events BOOLEAN DEFAULT TRUE,
      event_title_template TEXT DEFAULT '{customer_name} - {service_name}',
      buffer_time_minutes INTEGER DEFAULT 5,
      conflict_resolution VARCHAR(20) DEFAULT 'manual',
      connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_sync_at TIMESTAMP WITH TIME ZONE,
      sync_error_count INTEGER DEFAULT 0,
      last_error_message TEXT,
      ical_token UUID DEFAULT gen_random_uuid(),
      webhook_id VARCHAR(255),
      webhook_expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  
  try {
    const { data, error } = await supabase.rpc('sql', { query: calendarIntegrationsSQL })
    if (error) throw error
    console.log('✅ calendar_integrations table created')
  } catch (error) {
    console.log('⚠️ calendar_integrations creation:', error.message)
  }
  
  // Create calendar_sync_history table
  console.log('\nCreating calendar_sync_history table...')
  
  const syncHistorySQL = `
    CREATE TABLE calendar_sync_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      integration_id UUID NOT NULL,
      sync_type VARCHAR(50) NOT NULL,
      direction VARCHAR(20) NOT NULL,
      total_events INTEGER DEFAULT 0,
      successful_events INTEGER DEFAULT 0,
      failed_events INTEGER DEFAULT 0,
      conflicts_detected INTEGER DEFAULT 0,
      conflicts_resolved INTEGER DEFAULT 0,
      duration_ms INTEGER,
      error_message TEXT,
      triggered_by VARCHAR(50),
      appointment_ids TEXT[],
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  
  try {
    const { data, error } = await supabase.rpc('sql', { query: syncHistorySQL })
    if (error) throw error
    console.log('✅ calendar_sync_history table created')
  } catch (error) {
    console.log('⚠️ calendar_sync_history creation:', error.message)
  }
  
  // Create calendar_conflicts table
  console.log('\nCreating calendar_conflicts table...')
  
  const conflictsSQL = `
    CREATE TABLE calendar_conflicts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      integration_id UUID NOT NULL,
      appointment_id UUID,
      conflict_type VARCHAR(50) NOT NULL,
      external_event_id VARCHAR(255),
      external_event_title TEXT,
      external_event_start TIMESTAMP WITH TIME ZONE,
      external_event_end TIMESTAMP WITH TIME ZONE,
      resolution_status VARCHAR(20) DEFAULT 'pending',
      resolution_action VARCHAR(50),
      resolved_by UUID,
      resolved_at TIMESTAMP WITH TIME ZONE,
      resolution_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `
  
  try {
    const { data, error } = await supabase.rpc('sql', { query: conflictsSQL })
    if (error) throw error
    console.log('✅ calendar_conflicts table created')
  } catch (error) {
    console.log('⚠️ calendar_conflicts creation:', error.message)
  }
  
  // Test table access
  console.log('\n🔍 Testing table access...')
  
  const tables = ['calendar_integrations', 'calendar_sync_history', 'calendar_conflicts']
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1)
      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`)
      } else {
        console.log(`✅ ${tableName}: Accessible`)
      }
    } catch (e) {
      console.log(`❌ ${tableName}: Exception - ${e.message}`)
    }
  }
  
  console.log('\n🎯 Calendar tables setup complete!')
}

createTables()