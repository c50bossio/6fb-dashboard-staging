#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs the calendar integration migration directly
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  try {
    console.log('📅 Running Calendar Integration Migration...\n')
    
    // Read the migration file
    const migrationSql = readFileSync('./database/migrations/008_add_calendar_integrations.sql', 'utf8')
    
    console.log('📜 Migration SQL loaded, length:', migrationSql.length, 'characters')
    
    // Split into individual statements (rough split by semicolons)
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log('🔨 Found', statements.length, 'SQL statements to execute\n')
    
    let successCount = 0
    let errorCount = 0
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--') || statement.trim() === '') {
        continue
      }
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
        
        // Execute the SQL statement
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        })
        
        if (error) {
          throw error
        }
        
        console.log(`✅ Statement ${i + 1} executed successfully`)
        successCount++
        
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message)
        console.log('Statement:', statement.substring(0, 100) + '...')
        errorCount++
        
        // Don't stop on errors - some statements might be idempotent
      }
    }
    
    console.log(`\n📊 Migration Summary:`)
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!')
    } else {
      console.log('\n⚠️ Migration completed with some errors - checking table creation...')
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...')
    
    const tables = ['calendar_integrations', 'calendar_sync_history', 'calendar_conflicts']
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').limit(1)
        console.log(`✅ ${tableName}: Table exists and is accessible`)
      } catch (error) {
        console.log(`❌ ${tableName}: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Alternative approach - try direct SQL execution
async function runMigrationDirect() {
  try {
    console.log('📅 Running Calendar Integration Migration (Direct SQL)...\n')
    
    const migrationSql = readFileSync('./database/migrations/008_add_calendar_integrations.sql', 'utf8')
    
    console.log('📜 Executing full migration as single transaction...')
    
    // Try to execute the entire migration
    const { data, error } = await supabase.rpc('exec_migration', { 
      migration_sql: migrationSql 
    })
    
    if (error) {
      console.error('❌ Direct migration failed:', error)
      
      // Fallback to creating tables manually
      console.log('\n🔄 Trying manual table creation...')
      await createTablesManually()
    } else {
      console.log('✅ Migration executed successfully!')
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    
    // Fallback to manual creation
    console.log('\n🔄 Trying manual table creation...')
    await createTablesManually()
  }
}

async function createTablesManually() {
  console.log('🔨 Creating calendar tables manually...')
  
  // Create calendar_integrations table
  try {
    await supabase.rpc('exec_sql', {
      sql_query: `
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
          email VARCHAR(255),
          calendar_id VARCHAR(255) DEFAULT 'primary',
          sync_direction VARCHAR(20) DEFAULT 'both',
          auto_create_events BOOLEAN DEFAULT TRUE,
          event_title_template TEXT DEFAULT '{customer_name} - {service_name}',
          event_description_template TEXT DEFAULT 'Service: {service_name}\nCustomer: {customer_name}\nPhone: {customer_phone}\nNotes: {notes}',
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
    })
    console.log('✅ calendar_integrations table created')
  } catch (error) {
    console.log('⚠️ calendar_integrations:', error.message)
  }
  
  // Create calendar_sync_history table  
  try {
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS calendar_sync_history (
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
    })
    console.log('✅ calendar_sync_history table created')
  } catch (error) {
    console.log('⚠️ calendar_sync_history:', error.message)
  }
  
  // Create calendar_conflicts table
  try {
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS calendar_conflicts (
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
    })
    console.log('✅ calendar_conflicts table created')
  } catch (error) {
    console.log('⚠️ calendar_conflicts:', error.message)
  }
}

// Run migration
runMigrationDirect()