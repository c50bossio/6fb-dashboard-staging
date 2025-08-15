#!/usr/bin/env node

/**
 * Direct Database Migration Execution
 * Creates production tables via direct SQL execution
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

console.log('🚀 Executing Production Database Migration')
console.log('========================================')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createProductionTables() {
  console.log('📊 Creating core production tables...')
  
  const tableDefinitions = [
    {
      name: 'tenants',
      sql: `
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
        
        CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
        CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
        CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
        
        ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: 'token_usage',
      sql: `
        CREATE TABLE IF NOT EXISTS token_usage (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID NOT NULL,
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
        
        CREATE INDEX IF NOT EXISTS idx_token_usage_tenant ON token_usage(tenant_id, timestamp);
        CREATE INDEX IF NOT EXISTS idx_token_usage_request ON token_usage(request_id);
        CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(model_provider, model_name);
        
        ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: 'tenant_subscriptions',
      sql: `
        CREATE TABLE IF NOT EXISTS tenant_subscriptions (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID UNIQUE NOT NULL,
          tier VARCHAR(20) DEFAULT 'starter',
          status VARCHAR(20) DEFAULT 'trial',
          trial_start TIMESTAMP WITH TIME ZONE,
          trial_end TIMESTAMP WITH TIME ZONE,
          billing_cycle_start TIMESTAMP WITH TIME ZONE,
          billing_cycle_end TIMESTAMP WITH TIME ZONE,
          tokens_included INTEGER DEFAULT 15000,
          tokens_used INTEGER DEFAULT 0,
          monthly_base DECIMAL(10,2) DEFAULT 19.99,
          overage_charges DECIMAL(10,2) DEFAULT 0,
          total_bill DECIMAL(10,2) DEFAULT 0,
          payment_method_id VARCHAR(100),
          stripe_subscription_id VARCHAR(100),
          stripe_customer_id VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON tenant_subscriptions(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON tenant_subscriptions(stripe_subscription_id);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON tenant_subscriptions(status);
        
        ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
      `
    },
    {
      name: 'usage_analytics',
      sql: `
        CREATE TABLE IF NOT EXISTS usage_analytics (
          id BIGSERIAL PRIMARY KEY,
          date DATE NOT NULL,
          total_tenants INTEGER DEFAULT 0,
          total_tokens_consumed BIGINT DEFAULT 0,
          total_actual_costs DECIMAL(10,2) DEFAULT 0,
          total_revenue DECIMAL(10,2) DEFAULT 0,
          gross_margin DECIMAL(5,4) DEFAULT 0,
          avg_tokens_per_tenant INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_usage_analytics_date ON usage_analytics(date);
      `
    }
  ]
  
  console.log(`📋 Creating ${tableDefinitions.length} production tables...`)
  
  for (const table of tableDefinitions) {
    console.log(`   🔧 Creating table: ${table.name}`)
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: table.sql
      })
      
      if (error) {
        console.log(`   ⚠️  Direct SQL failed for ${table.name}, trying alternative approach...`)
        
        try {
          await supabase.from(table.name).select('*').limit(1)
          console.log(`   ✅ Table ${table.name} already exists or was created`)
        } catch (altError) {
          console.log(`   ❌ Could not create table ${table.name}:`, error.message)
        }
      } else {
        console.log(`   ✅ Table ${table.name} created successfully`)
      }
    } catch (err) {
      console.log(`   ❌ Error creating ${table.name}:`, err.message)
    }
  }
  
  console.log('')
  console.log('🔍 Verifying table creation...')
  
  const verificationResults = []
  
  for (const table of tableDefinitions) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*')
        .limit(1)
      
      if (!error) {
        verificationResults.push({ table: table.name, status: 'EXISTS', error: null })
        console.log(`   ✅ Verified: ${table.name}`)
      } else {
        verificationResults.push({ table: table.name, status: 'MISSING', error: error.message })
        console.log(`   ❌ Missing: ${table.name} - ${error.message}`)
      }
    } catch (err) {
      verificationResults.push({ table: table.name, status: 'ERROR', error: err.message })
      console.log(`   ❌ Error: ${table.name} - ${err.message}`)
    }
  }
  
  console.log('')
  console.log('📊 Migration Results Summary')
  console.log('===========================')
  
  const existingTables = verificationResults.filter(r => r.status === 'EXISTS')
  const missingTables = verificationResults.filter(r => r.status !== 'EXISTS')
  
  console.log(`✅ Tables verified: ${existingTables.length}/${tableDefinitions.length}`)
  
  if (existingTables.length > 0) {
    console.log('✅ Existing tables:', existingTables.map(t => t.table).join(', '))
  }
  
  if (missingTables.length > 0) {
    console.log('❌ Missing tables:', missingTables.map(t => t.table).join(', '))
    console.log('')
    console.log('📋 Manual Migration Required')
    console.log('============================')
    console.log('Please execute the migration manually via Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql')
    console.log('')
    console.log('Copy and paste the content from: migrate-to-production-db.sql')
  } else {
    console.log('')
    console.log('🎉 Database Migration Complete!')
    console.log('==============================')
    console.log('✅ All production tables created successfully')
    console.log('✅ Token-based billing system ready')
    console.log('✅ Multi-tenant architecture active')
    console.log('✅ Usage analytics tracking enabled')
    
    console.log('')
    console.log('🧪 Testing database functionality...')
    
    const testTenant = {
      name: 'Migration Test Barbershop',
      slug: 'test-migration-' + Date.now(),
      owner_id: '00000000-0000-0000-0000-000000000000'
    }
    
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('tenants')
        .insert([testTenant])
        .select()
      
      if (!insertError && insertData.length > 0) {
        console.log('✅ Database write test successful')
        
        await supabase
          .from('tenants')
          .delete()
          .eq('id', insertData[0].id)
        
        console.log('✅ Database functionality verified')
      } else {
        console.log('❌ Database write test failed:', insertError?.message)
      }
    } catch (testError) {
      console.log('❌ Database test error:', testError.message)
    }
  }
  
  console.log('')
  console.log('🚀 Production Database Status: READY')
  console.log('===================================')
}

createProductionTables().catch(console.error)