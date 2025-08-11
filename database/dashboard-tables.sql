-- Dashboard Tables for Real Data Operations
-- Replaces all mock data generators in UnifiedDashboard.js

-- ==========================================
-- BUSINESS METRICS TRACKING
-- ==========================================

-- Daily business metrics aggregated from appointments and payments
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Date and time period
  date DATE NOT NULL,
  period_type VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
  
  -- Core business metrics
  total_revenue DECIMAL(10,2) DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  total_appointments INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_show_appointments INTEGER DEFAULT 0,
  
  -- Satisfaction and quality metrics
  avg_satisfaction_score DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Operational metrics
  chair_utilization_rate DECIMAL(5,4) DEFAULT 0,
  avg_appointment_duration INTEGER DEFAULT 0, -- minutes
  peak_hour_bookings INTEGER DEFAULT 0,
  
  -- Financial breakdowns
  service_revenue DECIMAL(10,2) DEFAULT 0,
  tip_revenue DECIMAL(10,2) DEFAULT 0,
  commission_paid DECIMAL(10,2) DEFAULT 0,
  platform_fees DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, date, period_type)
);

-- Create index for fast dashboard queries
CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(barbershop_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_business_metrics_period ON business_metrics(barbershop_id, period_type, date DESC);

-- ==========================================
-- AI INSIGHTS SYSTEM
-- ==========================================

-- AI-generated business insights and recommendations
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Insight classification
  type VARCHAR(50) NOT NULL, -- opportunity, alert, success, warning
  category VARCHAR(50) NOT NULL, -- revenue, customer_behavior, operations, marketing
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  
  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  recommendation TEXT,
  
  -- AI metadata
  confidence_score DECIMAL(3,2) DEFAULT 0,
  impact_score DECIMAL(3,2) DEFAULT 0,
  ai_agent_type VARCHAR(50), -- which AI agent generated this
  
  -- Data sources used for insight
  data_points JSONB DEFAULT '{}',
  source_metrics JSONB DEFAULT '{}',
  
  -- Lifecycle management
  is_active BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_active ON ai_insights(barbershop_id, is_active, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_insights(barbershop_id, category, created_at DESC);

-- ==========================================
-- AI AGENTS STATUS TRACKING
-- ==========================================

-- Track AI agent activity and status
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Agent identity
  agent_name VARCHAR(100) NOT NULL,
  agent_type VARCHAR(50) NOT NULL, -- master_coach, financial, operations, etc.
  agent_description TEXT,
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'idle', -- active, idle, processing, error
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_insight TEXT,
  last_recommendation TEXT,
  
  -- Performance metrics
  total_insights_generated INTEGER DEFAULT 0,
  total_recommendations_made INTEGER DEFAULT 0,
  avg_confidence_score DECIMAL(3,2) DEFAULT 0,
  
  -- Configuration
  is_enabled BOOLEAN DEFAULT TRUE,
  priority_level INTEGER DEFAULT 5, -- 1-10, higher = more important
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, agent_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(barbershop_id, status, last_activity_at DESC);

-- ==========================================
-- BUSINESS RECOMMENDATIONS
-- ==========================================

-- AI-generated actionable business recommendations
CREATE TABLE IF NOT EXISTS business_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  ai_agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  
  -- Recommendation content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  implementation_steps TEXT,
  
  -- Impact analysis
  impact_level VARCHAR(20) NOT NULL, -- low, medium, high, critical
  revenue_potential_monthly DECIMAL(10,2),
  cost_estimate DECIMAL(10,2),
  implementation_effort VARCHAR(20), -- easy, moderate, complex
  time_to_implement_days INTEGER,
  
  -- Confidence and validation
  confidence_score DECIMAL(3,2) NOT NULL,
  data_quality_score DECIMAL(3,2),
  validation_status VARCHAR(20) DEFAULT 'pending', -- pending, validated, dismissed
  
  -- Tracking
  is_implemented BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  actual_results JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_recommendations_active ON business_recommendations(barbershop_id, is_implemented, impact_level, created_at DESC);

-- ==========================================
-- LOCATION PERFORMANCE DATA
-- ==========================================

-- Performance metrics for multi-location enterprises
CREATE TABLE IF NOT EXISTS location_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Time period
  date DATE NOT NULL,
  period_type VARCHAR(20) DEFAULT 'daily',
  
  -- Performance metrics
  efficiency_score DECIMAL(5,2) DEFAULT 0, -- 0-100
  customer_rating DECIMAL(3,2) DEFAULT 0, -- 0-5.0
  revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Comparative metrics
  rank_in_franchise INTEGER,
  performance_vs_average DECIMAL(5,2), -- percentage above/below average
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, date, period_type)
);

-- ==========================================
-- REALTIME OPERATIONAL METRICS
-- ==========================================

-- Current operational status for realtime dashboard
CREATE TABLE IF NOT EXISTS realtime_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Current operational status
  active_appointments INTEGER DEFAULT 0,
  waiting_customers INTEGER DEFAULT 0,
  available_barbers INTEGER DEFAULT 0,
  next_available_slot TIMESTAMP WITH TIME ZONE,
  
  -- Today's running totals
  today_revenue DECIMAL(8,2) DEFAULT 0,
  today_bookings INTEGER DEFAULT 0,
  today_capacity_percent DECIMAL(5,2) DEFAULT 0,
  
  -- System health
  last_booking_at TIMESTAMP WITH TIME ZONE,
  system_status VARCHAR(20) DEFAULT 'operational', -- operational, busy, closed, maintenance
  
  -- Timestamp
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, timestamp::date)
);

-- Update timestamp trigger for realtime_metrics
CREATE OR REPLACE FUNCTION update_realtime_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.timestamp = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_realtime_metrics_timestamp
  BEFORE UPDATE ON realtime_metrics
  FOR EACH ROW EXECUTE FUNCTION update_realtime_metrics_timestamp();

-- ==========================================
-- TRENDING SERVICES ANALYTICS
-- ==========================================

-- Track service popularity and trends
CREATE TABLE IF NOT EXISTS trending_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Service details
  service_name VARCHAR(255) NOT NULL,
  service_category VARCHAR(100),
  
  -- Period metrics
  date DATE NOT NULL,
  period_type VARCHAR(20) DEFAULT 'daily',
  
  -- Popularity metrics
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_price DECIMAL(8,2) DEFAULT 0,
  
  -- Growth analysis
  growth_rate DECIMAL(5,2) DEFAULT 0, -- percentage growth vs previous period
  trend_direction VARCHAR(20), -- increasing, stable, decreasing
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, service_name, date, period_type)
);

CREATE INDEX IF NOT EXISTS idx_trending_services_date ON trending_services(barbershop_id, date DESC, total_bookings DESC);