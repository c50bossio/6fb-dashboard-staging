#!/usr/bin/env node

/**
 * Create Production Database Tables via Supabase
 * Simple table creation for token-based billing system
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

console.log('🗄️ Creating Production Database Tables')
console.log('====================================')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTables() {
  console.log('🚀 Setting up token-based billing system...')
  
  try {
    // Test the connection first
    console.log('🔍 Testing Supabase connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('tenants')
      .select('count')
      .limit(1)
    
    if (connectionError && !connectionError.message.includes('relation "tenants" does not exist')) {
      console.error('❌ Connection failed:', connectionError.message)
      return
    }
    
    console.log('✅ Supabase connection successful')
    
    // Since we can't execute DDL through the client, let's verify if tables exist
    console.log('🔍 Checking existing tables...')
    
    // Try to query each table to see if it exists
    const tables = ['tenants', 'token_usage', 'tenant_subscriptions', 'usage_analytics']
    const existingTables = []
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (!error) {
          existingTables.push(table)
          console.log(`   ✅ Table exists: ${table}`)
        }
      } catch (err) {
        console.log(`   ❌ Table missing: ${table}`)
      }
    }
    
    if (existingTables.length === 0) {
      console.log('')
      console.log('📋 Database Migration Required')
      console.log('=============================')
      console.log('The production database tables need to be created.')
      console.log('Please run the SQL migration manually via Supabase Dashboard:')
      console.log('')
      console.log('1. Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql')
      console.log('2. Copy and paste the content from: migrate-to-production-db.sql')
      console.log('3. Click "Run" to execute the migration')
      console.log('')
      console.log('Or use the PostgreSQL client:')
      console.log('psql -h dfhqjdoydihajmjxniee.supabase.co -p 5432 -d postgres -U postgres -f migrate-to-production-db.sql')
      console.log('')
    } else {
      console.log('')
      console.log('🎉 Database Tables Status')
      console.log('========================')
      console.log(`✅ Found ${existingTables.length}/${tables.length} tables`)
      
      if (existingTables.length === tables.length) {
        console.log('✅ All tables exist - database migration complete!')
        
        // Test basic functionality
        console.log('')
        console.log('🧪 Testing basic functionality...')
        
        // Test tenant creation
        const testTenant = {
          name: 'Test Barbershop',
          slug: 'test-barbershop-' + Date.now(),
          owner_id: '00000000-0000-0000-0000-000000000000',
          subscription_tier: 'starter'
        }
        
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .insert([testTenant])
          .select()
        
        if (!tenantError && tenantData.length > 0) {
          console.log('✅ Tenant creation successful')
          
          // Clean up test data
          await supabase
            .from('tenants')
            .delete()
            .eq('id', tenantData[0].id)
          
          console.log('✅ Database functionality validated')
        } else {
          console.log('❌ Tenant creation failed:', tenantError?.message)
        }
      } else {
        console.log('⚠️ Partial migration - some tables missing')
        console.log('Missing tables:', tables.filter(t => !existingTables.includes(t)))
      }
    }
    
    console.log('')
    console.log('📊 Database Schema Summary')
    console.log('========================')
    console.log('Required for token-based billing:')
    console.log('  📋 tenants - Multi-tenant architecture')
    console.log('  🎯 token_usage - AI token consumption tracking')
    console.log('  💳 tenant_subscriptions - Stripe billing integration')
    console.log('  📈 usage_analytics - Business intelligence')
    console.log('')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
  }
}

// Run the setup
createTables()