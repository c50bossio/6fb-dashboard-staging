#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Debug - Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
console.log('Debug - Service Key:', supabaseServiceKey ? 'SET' : 'MISSING')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Tables that should exist based on complete-schema.sql
const REQUIRED_TABLES = [
  'users',
  'organizations', 
  'barbershops',
  'barbershop_staff',
  'services',
  'appointments',
  'payments', 
  'ai_chat_sessions',
  'ai_chat_messages',
  'ai_knowledge_base',
  'business_analytics',
  'ai_usage_analytics'
]

// Tables that currently exist (based on test output)
const EXISTING_TABLES = [
  'profiles', // Supabase auth table
  'agents',
  'notifications',
  'tenants',
  'chat_history',
  'analytics_events',
  'business_settings',
  'feature_flags',
  'token_usage',
  'tenant_subscriptions',
  'usage_analytics',
  'trial_tracking',
  'usage_alerts',
  'alert_preferences',
  'payment_records',
  'failed_payments'
]

async function analyzeDatabase() {
  console.log('🔍 Analyzing database state...\n')
  
  // Get all tables from information_schema
  console.log('📋 Checking existing tables...')
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')
      
    if (error) {
      // Fallback - check known tables by querying them
      console.log('⚠️ Could not query information_schema, checking known tables...')
      
      const existingTables = []
      for (const table of [...REQUIRED_TABLES, ...EXISTING_TABLES]) {
        try {
          const { error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1)
            
          if (!tableError) {
            existingTables.push(table)
          }
        } catch (e) {
          // Table doesn't exist
        }
      }
      
      console.log(`✅ Found ${existingTables.length} existing tables:`)
      existingTables.forEach(table => console.log(`  - ${table}`))
      
      // Check what's missing
      const missingTables = REQUIRED_TABLES.filter(table => !existingTables.includes(table))
      console.log(`\n❌ Missing ${missingTables.length} required tables:`)
      missingTables.forEach(table => console.log(`  - ${table}`))
      
      return { existing: existingTables, missing: missingTables }
      
    } else {
      const existingTables = data.map(row => row.table_name)
      console.log(`✅ Found ${existingTables.length} existing tables:`)
      existingTables.forEach(table => console.log(`  - ${table}`))
      
      const missingTables = REQUIRED_TABLES.filter(table => !existingTables.includes(table))
      console.log(`\n❌ Missing ${missingTables.length} required tables:`)
      missingTables.forEach(table => console.log(`  - ${table}`))
      
      return { existing: existingTables, missing: missingTables }
    }
  } catch (error) {
    console.error('❌ Error analyzing database:', error)
    return { existing: [], missing: REQUIRED_TABLES }
  }
}

async function checkDataConsistency() {
  console.log('\n📊 Checking data consistency...')
  
  // Check profiles vs users mapping
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(5)
      
    if (!profilesError && profiles) {
      console.log(`✅ Profiles table has ${profiles.length} records (checking sample):`)
      profiles.forEach(profile => {
        console.log(`  - ${profile.email} (${profile.role})`)
      })
    }
  } catch (e) {
    console.log('❌ Could not check profiles table')
  }
  
  // Check for appointment/booking data
  try {
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .limit(1)
      
    if (!appointmentsError && appointments) {
      console.log(`✅ Appointments table exists with ${appointments.length} sample records`)
    } else {
      console.log('❌ No appointments table or data found')
    }
  } catch (e) {
    console.log('❌ Appointments table does not exist')
  }
}

async function generateMigrationPlan() {
  const { existing, missing } = await analyzeDatabase()
  await checkDataConsistency()
  
  console.log('\n📋 MIGRATION PLAN:')
  console.log('==================')
  
  if (missing.length > 0) {
    console.log('\n1. CREATE MISSING TABLES:')
    missing.forEach(table => {
      console.log(`   - Create ${table} table with proper schema`)
    })
  }
  
  console.log('\n2. DATA MIGRATION:')
  console.log('   - Map profiles → users table')
  console.log('   - Create sample barbershop data')
  console.log('   - Create sample services and appointments') 
  console.log('   - Seed AI knowledge base')
  
  console.log('\n3. SETUP ROW LEVEL SECURITY:')
  console.log('   - Enable RLS on all tables')
  console.log('   - Create policies for multi-tenant access')
  
  console.log('\n4. VERIFICATION:')
  console.log('   - Test API endpoints with real data')
  console.log('   - Verify analytics calculations')
  console.log('   - Check AI agent functionality')
  
  return { existing, missing }
}

// Run analysis
generateMigrationPlan().then(({ existing, missing }) => {
  console.log(`\n🎯 SUMMARY: ${existing.length} existing, ${missing.length} missing tables`)
  
  if (missing.length === 0) {
    console.log('✅ Database schema is complete!')
  } else {
    console.log('⚠️ Database migration required')
  }
}).catch(console.error)