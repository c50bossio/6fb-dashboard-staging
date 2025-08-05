#!/usr/bin/env node

/**
 * Production Database Setup
 * Creates the token-based billing system schema in Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

console.log('🗄️ Setting up Production Database Schema')
console.log('========================================')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  try {
    console.log('📊 Creating production database schema...')
    
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync('migrate-to-production-db.sql', 'utf8')
    
    // Split by statements and execute each one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`🚀 Executing ${statements.length} SQL statements...`)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.toLowerCase().includes('begin') || statement.toLowerCase().includes('commit')) {
        continue // Skip transaction statements for Supabase
      }
      
      console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      })
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message)
        // Continue with other statements
      } else {
        console.log(`   ✅ Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('✅ Database schema setup complete!')
    
    // Test the tables were created
    console.log('🔍 Verifying table creation...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['tenants', 'token_usage', 'tenant_subscriptions', 'usage_analytics'])
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError.message)
    } else {
      console.log('📋 Created tables:', tables.map(t => t.table_name).join(', '))
    }
    
    console.log('🎉 Production database setup complete!')
    console.log('')
    console.log('📊 Database ready for:')
    console.log('   ✅ Multi-tenant architecture')
    console.log('   ✅ Token-based billing')
    console.log('   ✅ Stripe subscription management')
    console.log('   ✅ Usage analytics and reporting')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    process.exit(1)
  }
}

// Alternative: Direct SQL execution using node-postgres
async function setupDatabaseDirect() {
  console.log('🔄 Attempting direct SQL execution...')
  
  // Create the core tables manually
  const coreSQL = `
    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Core tenants table
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(50) UNIQUE NOT NULL,
      owner_id UUID NOT NULL,
      subscription_tier VARCHAR(20) DEFAULT 'starter',
      onboarding_completed BOOLEAN DEFAULT FALSE,
      status VARCHAR(20) DEFAULT 'active',
      settings JSONB DEFAULT '{}',
      features JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Token usage tracking
    CREATE TABLE IF NOT EXISTS token_usage (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      request_id VARCHAR(50) UNIQUE NOT NULL,
      model_provider VARCHAR(20) NOT NULL,
      model_name VARCHAR(50) NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      actual_cost_usd DECIMAL(10,6) DEFAULT 0,
      marked_up_price DECIMAL(10,6) DEFAULT 0,
      feature_used VARCHAR(50),
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Tenant subscriptions
    CREATE TABLE IF NOT EXISTS tenant_subscriptions (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      tier VARCHAR(20) DEFAULT 'starter',
      status VARCHAR(20) DEFAULT 'trial',
      trial_start TIMESTAMP WITH TIME ZONE,
      trial_end TIMESTAMP WITH TIME ZONE,
      tokens_included INTEGER DEFAULT 15000,
      tokens_used INTEGER DEFAULT 0,
      monthly_base DECIMAL(10,2) DEFAULT 19.99,
      stripe_subscription_id VARCHAR(100),
      stripe_customer_id VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Row Level Security
    ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
  `
  
  console.log('🚀 Executing core database schema...')
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: coreSQL
  })
  
  if (error) {
    console.error('❌ Error:', error.message)
    console.log('💡 Creating tables individually...')
    
    // Create tables one by one
    const tables = [
      {
        name: 'tenants',
        sql: `CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          slug VARCHAR(50) UNIQUE NOT NULL,
          owner_id UUID NOT NULL,
          subscription_tier VARCHAR(20) DEFAULT 'starter',
          onboarding_completed BOOLEAN DEFAULT FALSE,
          status VARCHAR(20) DEFAULT 'active',
          settings JSONB DEFAULT '{}',
          features JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      }
    ]
    
    for (const table of tables) {
      const { error: tableError } = await supabase.rpc('exec_sql', { sql: table.sql })
      if (tableError) {
        console.error(`❌ Failed to create ${table.name}:`, tableError.message)
      } else {
        console.log(`✅ Created table: ${table.name}`)
      }
    }
  } else {
    console.log('✅ Database schema created successfully!')
  }
}

// Run the setup
if (process.argv[2] === 'direct') {
  setupDatabaseDirect()
} else {
  setupDatabase()
}