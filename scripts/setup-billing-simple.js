#!/usr/bin/env node

/**
 * Simple Billing Database Setup
 * Creates tables directly using Supabase client
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupTables() {

  // Create usage_events table
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS usage_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          barbershop_id UUID,
          event_type VARCHAR(50) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0,
          service_name VARCHAR(100),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          billing_period DATE NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_usage_events_user_period ON usage_events(user_id, billing_period);
        CREATE INDEX IF NOT EXISTS idx_usage_events_type_period ON usage_events(event_type, billing_period);

        ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own usage events" ON usage_events;
        CREATE POLICY "Users can view own usage events" ON usage_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Service role can manage usage events" ON usage_events;
        CREATE POLICY "Service role can manage usage events" ON usage_events FOR ALL TO service_role USING (true);
      `
    })
    
    if (error) {
      
    } else {
      
    }
  } catch (err) {
    
  }

  // Create billing_cycles table
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS billing_cycles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          barbershop_id UUID,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          ai_tokens_used INTEGER DEFAULT 0,
          ai_cost_usd DECIMAL(10, 4) DEFAULT 0,
          sms_sent INTEGER DEFAULT 0,
          sms_cost_usd DECIMAL(10, 4) DEFAULT 0,
          email_sent INTEGER DEFAULT 0,
          email_cost_usd DECIMAL(10, 4) DEFAULT 0,
          total_cost_usd DECIMAL(10, 4) DEFAULT 0,
          subscription_fee_usd DECIMAL(10, 4) DEFAULT 0,
          grand_total_usd DECIMAL(10, 4) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_cycles_unique ON billing_cycles(user_id, period_start);
        CREATE INDEX IF NOT EXISTS idx_billing_cycles_status ON billing_cycles(status, period_start);

        ALTER TABLE billing_cycles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own billing cycles" ON billing_cycles;
        CREATE POLICY "Users can view own billing cycles" ON billing_cycles FOR SELECT TO authenticated USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Service role can manage billing cycles" ON billing_cycles;
        CREATE POLICY "Service role can manage billing cycles" ON billing_cycles FOR ALL TO service_role USING (true);
      `
    })
    
    if (error) {
      
    } else {
      
    }
  } catch (err) {
    
  }

  // Create usage_limits table  
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS usage_limits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          period_start DATE NOT NULL,
          subscription_tier VARCHAR(20) NOT NULL,
          ai_tokens_limit INTEGER NOT NULL DEFAULT 5000,
          sms_limit INTEGER NOT NULL DEFAULT 500,
          email_limit INTEGER NOT NULL DEFAULT 1000,
          ai_tokens_used INTEGER DEFAULT 0,
          sms_used INTEGER DEFAULT 0,
          email_used INTEGER DEFAULT 0,
          ai_tokens_overage INTEGER DEFAULT 0,
          sms_overage INTEGER DEFAULT 0,
          email_overage INTEGER DEFAULT 0,
          ai_limit_warning_sent BOOLEAN DEFAULT FALSE,
          sms_limit_warning_sent BOOLEAN DEFAULT FALSE,
          email_limit_warning_sent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_limits_unique ON usage_limits(user_id, period_start);

        ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own usage limits" ON usage_limits;
        CREATE POLICY "Users can view own usage limits" ON usage_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Service role can manage usage limits" ON usage_limits;
        CREATE POLICY "Service role can manage usage limits" ON usage_limits FOR ALL TO service_role USING (true);
      `
    })
    
    if (error) {
      
    } else {
      
    }
  } catch (err) {
    
  }

  // Test tables exist and insert sample data

  // Test usage_events
  try {
    const { data, error } = await supabase
      .from('usage_events')
      .select('*')
      .limit(1)
    
    if (error) {
      
    } else {

      // Insert test event
      const testEvent = {
        user_id: null /* hardcoded ID removed for production */,
        event_type: 'ai_tokens',
        quantity: 100,
        cost_usd: 0.004,
        service_name: 'test_setup',
        billing_period: '2024-08-01'
      }
      
      const { error: insertError } = await supabase
        .from('usage_events')
        .insert(testEvent)
      
      if (!insertError) {
        
      }
    }
  } catch (err) {
    
  }

  // Test billing_cycles
  try {
    const { data, error } = await supabase
      .from('billing_cycles')
      .select('*')
      .limit(1)
    
    if (error) {
      
    } else {
      
    }
  } catch (err) {
    
  }

  // Test usage_limits
  try {
    const { data, error } = await supabase
      .from('usage_limits')
      .select('*')
      .limit(1)
    
    if (error) {
      
    } else {

      // Initialize limits for test user
      const testLimits = {
        user_id: null /* hardcoded ID removed for production */,
        period_start: '2024-08-01',
        subscription_tier: 'PROFESSIONAL',
        ai_tokens_limit: 20000,
        sms_limit: 2000,
        email_limit: 5000
      }
      
      const { error: insertError } = await supabase
        .from('usage_limits')
        .upsert(testLimits)
      
      if (!insertError) {
        
      }
    }
  } catch (err) {
    
  }

}

setupTables().then(() => {
  process.exit(0)
}).catch(error => {
  console.error('Setup failed:', error)
  process.exit(1)
})