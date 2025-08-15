#!/usr/bin/env node

/**
 * Direct Analytics Table Creation Script
 * Creates analytics tables using Supabase client directly
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAndCreateTables() {
  console.log('🔍 Checking for existing analytics tables...\n')
  
  const tables = [
    'business_metrics',
    'ai_insights', 
    'ai_agents',
    'business_recommendations',
    'location_performance',
    'trending_services',
    'realtime_metrics'
  ]
  
  const existingTables = []
  const missingTables = []
  
  for (const tableName of tables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0)
      
      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`❌ Table '${tableName}' does not exist`)
          missingTables.push(tableName)
        } else {
          console.log(`⚠️  Table '${tableName}' exists but has issues: ${error.message}`)
          existingTables.push(tableName)
        }
      } else {
        console.log(`✅ Table '${tableName}' exists`)
        existingTables.push(tableName)
      }
    } catch (err) {
      console.log(`❌ Table '${tableName}' does not exist`)
      missingTables.push(tableName)
    }
  }
  
  console.log('\n📊 Summary:')
  console.log(`- Existing tables: ${existingTables.length}`)
  console.log(`- Missing tables: ${missingTables.length}`)
  
  if (missingTables.length > 0) {
    console.log('\n⚠️  Missing tables:', missingTables.join(', '))
    console.log('\n📝 To create missing tables:')
    console.log('1. Go to your Supabase Dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy the SQL from database/analytics-schema.sql')
    console.log('4. Run the SQL to create the missing tables')
    
    generateSQLForMissingTables(missingTables)
  } else {
    console.log('\n✨ All analytics tables exist! You can now run:')
    console.log('   npm run seed:analytics')
  }
  
  return { existingTables, missingTables }
}

function generateSQLForMissingTables(missingTables) {
  console.log('\n📄 SQL for missing tables only:\n')
  console.log('-- Copy and run this SQL in Supabase Dashboard --\n')
  
  const tableDefs = {
    business_metrics: `
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  service_revenue DECIMAL(10, 2) DEFAULT 0,
  product_revenue DECIMAL(10, 2) DEFAULT 0,
  tip_revenue DECIMAL(10, 2) DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  avg_service_duration INTEGER,
  avg_wait_time INTEGER,
  chair_utilization_rate DECIMAL(5, 2),
  avg_satisfaction_score DECIMAL(3, 2),
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbershop_id, date)
);`,
    
    ai_insights: `
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id VARCHAR(255) NOT NULL,
  insight_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  impact_level VARCHAR(20),
  confidence_score DECIMAL(3, 2),
  category VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  is_implemented BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  implementation_notes TEXT,
  generated_by VARCHAR(50),
  data_sources JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);`,
    
    ai_agents: `
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(100) NOT NULL,
  agent_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  is_enabled BOOLEAN DEFAULT TRUE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_insight TEXT,
  last_error TEXT,
  total_insights_generated INTEGER DEFAULT 0,
  avg_confidence_score DECIMAL(3, 2),
  avg_processing_time_ms INTEGER,
  success_rate DECIMAL(5, 2),
  config JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbershop_id, agent_type)
);`,
    
    business_recommendations: `
CREATE TABLE IF NOT EXISTS business_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50),
  impact_level VARCHAR(20) NOT NULL,
  revenue_potential_monthly DECIMAL(10, 2),
  cost_reduction_monthly DECIMAL(10, 2),
  customer_impact_score INTEGER,
  implementation_effort VARCHAR(20),
  time_to_implement_days INTEGER,
  required_resources TEXT,
  implementation_steps JSONB,
  is_implemented BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  implementation_result TEXT,
  actual_impact_measured DECIMAL(10, 2),
  generated_by_agent UUID,
  confidence_score DECIMAL(3, 2),
  supporting_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);`,
    
    location_performance: `
CREATE TABLE IF NOT EXISTS location_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID,
  date DATE NOT NULL,
  revenue DECIMAL(10, 2) DEFAULT 0,
  appointments INTEGER DEFAULT 0,
  customers INTEGER DEFAULT 0,
  efficiency_score DECIMAL(5, 2),
  productivity_score DECIMAL(5, 2),
  active_barbers INTEGER DEFAULT 0,
  revenue_per_barber DECIMAL(10, 2),
  appointments_per_barber DECIMAL(5, 2),
  customer_rating DECIMAL(3, 2),
  customer_retention_rate DECIMAL(5, 2),
  rank_in_network INTEGER,
  performance_vs_average DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_id, date)
);`,
    
    trending_services: `
CREATE TABLE IF NOT EXISTS trending_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  service_id VARCHAR(255),
  service_name VARCHAR(255) NOT NULL,
  service_category VARCHAR(50),
  total_bookings INTEGER DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10, 2) DEFAULT 0,
  growth_rate DECIMAL(5, 2),
  trend_direction VARCHAR(10),
  momentum_score INTEGER,
  avg_rating DECIMAL(3, 2),
  repeat_booking_rate DECIMAL(5, 2),
  popularity_rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbershop_id, service_id, date)
);`,
    
    realtime_metrics: `
CREATE TABLE IF NOT EXISTS realtime_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id VARCHAR(255) NOT NULL,
  chairs_occupied INTEGER DEFAULT 0,
  chairs_total INTEGER DEFAULT 0,
  customers_waiting INTEGER DEFAULT 0,
  avg_wait_time_minutes INTEGER DEFAULT 0,
  revenue_today DECIMAL(10, 2) DEFAULT 0,
  appointments_today INTEGER DEFAULT 0,
  customers_today INTEGER DEFAULT 0,
  barbers_working INTEGER DEFAULT 0,
  barbers_on_break INTEGER DEFAULT 0,
  expected_customers_next_hour INTEGER DEFAULT 0,
  expected_wait_time_next_hour INTEGER DEFAULT 0,
  has_urgent_alerts BOOLEAN DEFAULT FALSE,
  alert_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(barbershop_id)
);`
  }
  
  missingTables.forEach(tableName => {
    if (tableDefs[tableName]) {
      console.log(tableDefs[tableName])
      console.log('')
    }
  })
  
  console.log('-- End of SQL --\n')
}

async function main() {
  console.log('🚀 Analytics Tables Check & Creation Helper')
  console.log('===========================================\n')
  
  const { existingTables, missingTables } = await checkAndCreateTables()
  
  if (missingTables.length === 0) {
    console.log('\n🎉 Success! All tables are ready.')
    console.log('You can now populate them with test data using:')
    console.log('   npm run seed:analytics')
  }
}

main()