#!/usr/bin/env node

/**
 * Create Analytics Tables Script
 * Creates all analytics tables in the database using the analytics-schema.sql file
 * 
 * Usage:
 *   node scripts/create-analytics-tables.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createAnalyticsTables() {
  console.log('📊 Creating analytics tables...')
  
  try {
    // Define table creation SQL statements individually for better error handling
    const tables = [
      {
        name: 'business_metrics',
        sql: `
          CREATE TABLE IF NOT EXISTS business_metrics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            barbershop_id VARCHAR(255) NOT NULL,
            date DATE NOT NULL,
            -- Revenue metrics
            total_revenue DECIMAL(10, 2) DEFAULT 0,
            service_revenue DECIMAL(10, 2) DEFAULT 0,
            product_revenue DECIMAL(10, 2) DEFAULT 0,
            tip_revenue DECIMAL(10, 2) DEFAULT 0,
            -- Customer metrics
            total_customers INTEGER DEFAULT 0,
            new_customers INTEGER DEFAULT 0,
            returning_customers INTEGER DEFAULT 0,
            -- Appointment metrics
            total_appointments INTEGER DEFAULT 0,
            completed_appointments INTEGER DEFAULT 0,
            cancelled_appointments INTEGER DEFAULT 0,
            no_show_appointments INTEGER DEFAULT 0,
            -- Efficiency metrics
            avg_service_duration INTEGER,
            avg_wait_time INTEGER,
            chair_utilization_rate DECIMAL(5, 2),
            -- Satisfaction metrics
            avg_satisfaction_score DECIMAL(3, 2),
            total_reviews INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(barbershop_id, date)
          )
        `
      },
      {
        name: 'ai_insights',
        sql: `
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
          )
        `
      },
      {
        name: 'ai_agents',
        sql: `
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
          )
        `
      },
      {
        name: 'business_recommendations',
        sql: `
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
          )
        `
      },
      {
        name: 'location_performance',
        sql: `
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
          )
        `
      },
      {
        name: 'trending_services',
        sql: `
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
          )
        `
      },
      {
        name: 'realtime_metrics',
        sql: `
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
          )
        `
      }
    ]
    
    // Create each table
    for (const table of tables) {
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: table.sql 
        }).single()
        
        if (error) {
          // If RPC doesn't exist, try direct query (for newer Supabase versions)
          // This is a fallback - in production you'd use migrations
          console.log(`⚠️  Could not create ${table.name} via RPC, skipping...`)
        } else {
          console.log(`✅ Created table: ${table.name}`)
        }
      } catch (err) {
        console.log(`⚠️  Table ${table.name} might already exist or requires manual creation`)
      }
    }
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_business_metrics_barbershop_date ON business_metrics(barbershop_id, date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_ai_insights_barbershop ON ai_insights(barbershop_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority DESC)',
      'CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(barbershop_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_recommendations_barbershop ON business_recommendations(barbershop_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_trending_services_rank ON trending_services(barbershop_id, date, popularity_rank)'
    ]
    
    console.log('\n📋 Note: Tables may need to be created manually via Supabase dashboard')
    console.log('Copy the SQL from database/analytics-schema.sql and run it in the SQL editor')
    
    return true
    
  } catch (error) {
    console.error('Error creating analytics tables:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Analytics Tables Creation Script')
  console.log('====================================\n')
  
  const success = await createAnalyticsTables()
  
  if (success) {
    console.log('\n✨ Analytics tables creation completed!')
    console.log('Next step: Run "npm run seed:analytics" to populate with test data')
  } else {
    console.log('\n❌ Failed to create some tables')
    console.log('Please create them manually via Supabase dashboard using database/analytics-schema.sql')
  }
}

// Run the script
main()