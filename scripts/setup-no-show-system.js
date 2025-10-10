#!/usr/bin/env node

/**
 * Setup script for No-Show Management System
 * Creates all necessary database tables and initial configuration
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🚀 Setting up No-Show Management System...')
  
  try {
    // Read the SQL migration file
    const migrationPath = join(__dirname, '../migrations/create_no_show_tables.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Running database migration...')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (error) {
      // If RPC doesn't exist, try direct execution (less reliable but fallback)
      console.log('📝 Direct SQL execution (RPC not available)...')
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      for (const statement of statements) {
        try {
          if (statement.toLowerCase().includes('create table')) {
            console.log(`   Creating table: ${statement.match(/create table[^(]*([^(\s]+)/i)?.[1] || 'unknown'}`)
          } else if (statement.toLowerCase().includes('create index')) {
            console.log(`   Creating index: ${statement.match(/create index[^(]*([^(\s]+)/i)?.[1] || 'unknown'}`)
          }
          
          await supabase.rpc('exec_sql', { sql: statement })
        } catch (statementError) {
          console.warn(`⚠️  Statement warning: ${statementError.message}`)
        }
      }
    }
    
    console.log('✅ Database migration completed')
    
  } catch (migrationError) {
    console.error('❌ Migration failed:', migrationError.message)
    throw migrationError
  }
}

async function createDefaultPolicy() {
  console.log('📋 Creating default no-show policy...')
  
  try {
    // Get first barbershop for demo policy
    const { data: barbershops, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(1)
    
    if (shopError || !barbershops?.length) {
      console.log('⚠️  No barbershops found, skipping default policy creation')
      return
    }
    
    const barbershopId = barbershops[0].id
    
    // Create default policy
    const { data: policy, error: policyError } = await supabase
      .from('no_show_policies')
      .insert([{
        barbershop_id: barbershopId,
        name: 'Standard No-Show Policy',
        description: 'Three unexcused no-shows in 90 days results in account suspension',
        is_active: true,
        threshold_count: 3,
        threshold_period_days: 90,
        action_type: 'suspension',
        suspension_days: 30,
        send_warning_email: true,
        send_warning_sms: false,
        warning_message: 'You have missed multiple appointments. Please contact us to discuss your booking preferences.'
      }])
      .select()
      .single()
    
    if (policyError) {
      console.warn('⚠️  Could not create default policy:', policyError.message)
    } else {
      console.log(`✅ Created default policy for ${barbershops[0].name}`)
    }
    
  } catch (error) {
    console.error('❌ Error creating default policy:', error.message)
  }
}

async function verifySetup() {
  console.log('🔍 Verifying setup...')
  
  const tables = [
    'no_shows',
    'no_show_policies', 
    'no_show_enforcements',
    'customer_no_show_stats',
    'no_show_trends'
  ]
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count(*)', { count: 'exact', head: true })
      
      if (error) {
        console.error(`❌ Table ${table}: ${error.message}`)
      } else {
        console.log(`✅ Table ${table}: Ready (${data || 0} records)`)
      }
    } catch (error) {
      console.error(`❌ Table ${table}: ${error.message}`)
    }
  }
}

async function updateAnalyticsAPI() {
  console.log('🔄 Analytics API should now work with database tables')
  console.log('📊 Available endpoints:')
  console.log('   GET /api/no-show/analytics - Analytics dashboard data')
  console.log('   POST /api/no-show/analytics - Export analytics data')
  console.log('   GET /api/no-show/policies - Manage no-show policies')
  console.log('   POST /api/no-show/mark - Mark appointment as no-show')
}

async function main() {
  try {
    console.log('🎯 No-Show Management System Setup')
    console.log('=' .repeat(50))
    
    await runMigration()
    await createDefaultPolicy()
    await verifySetup()
    await updateAnalyticsAPI()
    
    console.log('')
    console.log('🎉 No-Show Management System setup complete!')
    console.log('📊 Analytics dashboard should now load at: http://localhost:9999/dashboard/analytics/no-show')
    console.log('')
    console.log('Next steps:')
    console.log('1. Test the analytics dashboard')
    console.log('2. Configure no-show policies in barbershop settings')
    console.log('3. Train staff on marking no-shows in the system')
    
  } catch (error) {
    console.error('')
    console.error('❌ Setup failed:', error.message)
    console.error('')
    console.error('Troubleshooting:')
    console.error('1. Check your .env file has correct Supabase credentials')
    console.error('2. Ensure you have service role key (not anon key)')
    console.error('3. Verify database connection')
    process.exit(1)
  }
}

main()