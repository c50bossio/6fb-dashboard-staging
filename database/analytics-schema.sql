-- Analytics and Business Intelligence Schema for 6FB AI Agent System
-- This schema provides real data storage for all dashboard analytics
-- Replaces all mock/hardcoded data in the application

-- ==========================================
-- BUSINESS METRICS (Daily aggregated metrics)
-- ==========================================
CREATE TABLE IF NOT EXISTS business_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  avg_service_duration INTEGER, -- in minutes
  avg_wait_time INTEGER, -- in minutes
  chair_utilization_rate DECIMAL(5, 2), -- percentage
  
  -- Satisfaction metrics
  avg_satisfaction_score DECIMAL(3, 2), -- 1-5 scale
  total_reviews INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per barbershop per day
  UNIQUE(barbershop_id, date)
);

-- ==========================================
-- AI INSIGHTS (AI-generated business insights)
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL,
  
  -- Insight details
  insight_type VARCHAR(50) NOT NULL, -- 'recommendation', 'alert', 'trend', 'opportunity'
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Priority and impact
  priority INTEGER DEFAULT 5, -- 1-10 scale, 10 being highest
  impact_level VARCHAR(20), -- 'high', 'medium', 'low'
  confidence_score DECIMAL(3, 2), -- 0-1 scale
  
  -- Category
  category VARCHAR(50), -- 'revenue', 'customer', 'operations', 'marketing', 'efficiency'
  
  -- Action tracking
  is_active BOOLEAN DEFAULT TRUE,
  is_acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id),
  
  -- Implementation tracking
  is_implemented BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  implementation_notes TEXT,
  
  -- Metadata
  generated_by VARCHAR(50), -- which AI agent generated this
  data_sources JSONB, -- what data was used to generate this insight
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- when this insight becomes stale
  
  INDEX idx_ai_insights_barbershop (barbershop_id),
  INDEX idx_ai_insights_priority (priority DESC),
  INDEX idx_ai_insights_active (is_active, is_acknowledged)
);

-- ==========================================
-- AI AGENTS (AI agent status and performance)
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL,
  
  -- Agent identification
  agent_name VARCHAR(100) NOT NULL,
  agent_type ai_agent_type NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'idle', 'processing', 'error', 'disabled'
  is_enabled BOOLEAN DEFAULT TRUE,
  
  -- Activity tracking
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_insight TEXT,
  last_error TEXT,
  
  -- Performance metrics
  total_insights_generated INTEGER DEFAULT 0,
  avg_confidence_score DECIMAL(3, 2),
  avg_processing_time_ms INTEGER,
  success_rate DECIMAL(5, 2), -- percentage
  
  -- Configuration
  config JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '[]',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, agent_type)
);

-- ==========================================
-- BUSINESS RECOMMENDATIONS (Actionable recommendations)
-- ==========================================
CREATE TABLE IF NOT EXISTS business_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL,
  
  -- Recommendation details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50), -- 'pricing', 'scheduling', 'marketing', 'staffing', 'services'
  
  -- Impact assessment
  impact_level VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  revenue_potential_monthly DECIMAL(10, 2),
  cost_reduction_monthly DECIMAL(10, 2),
  customer_impact_score INTEGER, -- 1-10 scale
  
  -- Implementation details
  implementation_effort VARCHAR(20), -- 'easy', 'moderate', 'complex'
  time_to_implement_days INTEGER,
  required_resources TEXT,
  implementation_steps JSONB,
  
  -- Tracking
  is_implemented BOOLEAN DEFAULT FALSE,
  implemented_at TIMESTAMP WITH TIME ZONE,
  implementation_result TEXT,
  actual_impact_measured DECIMAL(10, 2),
  
  -- AI metadata
  generated_by_agent UUID REFERENCES ai_agents(id),
  confidence_score DECIMAL(3, 2),
  supporting_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  INDEX idx_recommendations_impact (barbershop_id, impact_level, is_implemented)
);

-- ==========================================
-- LOCATION PERFORMANCE (Multi-location analytics)
-- ==========================================
CREATE TABLE IF NOT EXISTS location_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES barbershops(id),
  date DATE NOT NULL,
  
  -- Performance metrics
  revenue DECIMAL(10, 2) DEFAULT 0,
  appointments INTEGER DEFAULT 0,
  customers INTEGER DEFAULT 0,
  
  -- Efficiency metrics
  efficiency_score DECIMAL(5, 2), -- 0-100 scale
  productivity_score DECIMAL(5, 2), -- 0-100 scale
  
  -- Staff metrics
  active_barbers INTEGER DEFAULT 0,
  revenue_per_barber DECIMAL(10, 2),
  appointments_per_barber DECIMAL(5, 2),
  
  -- Customer metrics
  customer_rating DECIMAL(3, 2), -- 1-5 scale
  customer_retention_rate DECIMAL(5, 2), -- percentage
  
  -- Comparative metrics
  rank_in_network INTEGER, -- ranking among all locations
  performance_vs_average DECIMAL(5, 2), -- percentage above/below network average
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(location_id, date)
);

-- ==========================================
-- TRENDING SERVICES (Service popularity tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS trending_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Service identification
  service_id UUID REFERENCES services(id),
  service_name VARCHAR(255) NOT NULL,
  service_category VARCHAR(50),
  
  -- Popularity metrics
  total_bookings INTEGER DEFAULT 0,
  unique_customers INTEGER DEFAULT 0,
  revenue_generated DECIMAL(10, 2) DEFAULT 0,
  
  -- Growth metrics
  growth_rate DECIMAL(5, 2), -- percentage vs previous period
  trend_direction VARCHAR(10), -- 'up', 'down', 'stable'
  momentum_score INTEGER, -- 1-10 scale
  
  -- Customer metrics
  avg_rating DECIMAL(3, 2),
  repeat_booking_rate DECIMAL(5, 2), -- percentage
  
  -- Ranking
  popularity_rank INTEGER, -- rank within barbershop
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id, service_id, date),
  INDEX idx_trending_services_rank (barbershop_id, date, popularity_rank)
);

-- ==========================================
-- REALTIME METRICS (Live dashboard metrics)
-- ==========================================
CREATE TABLE IF NOT EXISTS realtime_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL,
  
  -- Current status
  chairs_occupied INTEGER DEFAULT 0,
  chairs_total INTEGER DEFAULT 0,
  customers_waiting INTEGER DEFAULT 0,
  avg_wait_time_minutes INTEGER DEFAULT 0,
  
  -- Today's metrics (updated in real-time)
  revenue_today DECIMAL(10, 2) DEFAULT 0,
  appointments_today INTEGER DEFAULT 0,
  customers_today INTEGER DEFAULT 0,
  
  -- Active staff
  barbers_working INTEGER DEFAULT 0,
  barbers_on_break INTEGER DEFAULT 0,
  
  -- Next hour forecast
  expected_customers_next_hour INTEGER DEFAULT 0,
  expected_wait_time_next_hour INTEGER DEFAULT 0,
  
  -- Alert flags
  has_urgent_alerts BOOLEAN DEFAULT FALSE,
  alert_count INTEGER DEFAULT 0,
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(barbershop_id)
);

-- ==========================================
-- ANALYTICS AUDIT LOG (Track data changes)
-- ==========================================
CREATE TABLE IF NOT EXISTS analytics_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id VARCHAR(255) NOT NULL,
  
  -- Audit details
  action VARCHAR(50) NOT NULL, -- 'insert', 'update', 'delete', 'aggregate'
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  
  -- Change tracking
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES users(id),
  
  -- Context
  source VARCHAR(50), -- 'manual', 'automated', 'ai_generated', 'api'
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_audit_log_barbershop (barbershop_id, created_at DESC)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Business metrics indexes
CREATE INDEX idx_business_metrics_barbershop_date ON business_metrics(barbershop_id, date DESC);
CREATE INDEX idx_business_metrics_revenue ON business_metrics(barbershop_id, total_revenue DESC);

-- AI insights indexes
CREATE INDEX idx_ai_insights_category ON ai_insights(barbershop_id, category, is_active);
CREATE INDEX idx_ai_insights_created ON ai_insights(created_at DESC);

-- AI agents indexes
CREATE INDEX idx_ai_agents_status ON ai_agents(barbershop_id, status);
CREATE INDEX idx_ai_agents_activity ON ai_agents(last_activity_at DESC);

-- Recommendations indexes
CREATE INDEX idx_recommendations_barbershop ON business_recommendations(barbershop_id, created_at DESC);
CREATE INDEX idx_recommendations_category ON business_recommendations(category, is_implemented);

-- Location performance indexes
CREATE INDEX idx_location_performance_date ON location_performance(date DESC, efficiency_score DESC);

-- Trending services indexes
CREATE INDEX idx_trending_services_date ON trending_services(date DESC, total_bookings DESC);

-- ==========================================
-- FUNCTIONS FOR DATA AGGREGATION
-- ==========================================

-- Function to calculate daily metrics
CREATE OR REPLACE FUNCTION calculate_daily_metrics(p_barbershop_id VARCHAR, p_date DATE)
RETURNS VOID AS $$
BEGIN
  -- This function would aggregate data from appointments, transactions, etc.
  -- and populate the business_metrics table
  -- Implementation depends on your specific business logic
END;
$$ LANGUAGE plpgsql;

-- Function to generate AI insights
CREATE OR REPLACE FUNCTION generate_ai_insights(p_barbershop_id VARCHAR)
RETURNS VOID AS $$
BEGIN
  -- This function would analyze recent data and generate insights
  -- Implementation would call your AI service
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==========================================

-- Trigger to update metrics when appointments change
CREATE OR REPLACE FUNCTION update_metrics_on_appointment_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update realtime_metrics when appointments change
  UPDATE realtime_metrics
  SET 
    appointments_today = appointments_today + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END,
    last_updated = NOW()
  WHERE barbershop_id = NEW.barbershop_id OR barbershop_id = OLD.barbershop_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to appointments table (if it exists)
-- CREATE TRIGGER appointment_metrics_update
-- AFTER INSERT OR UPDATE OR DELETE ON appointments
-- FOR EACH ROW EXECUTE FUNCTION update_metrics_on_appointment_change();

-- ==========================================
-- INITIAL DATA POPULATION
-- ==========================================

-- Insert demo barbershop metrics (can be removed for production)
INSERT INTO business_metrics (barbershop_id, date, total_revenue, total_customers, total_appointments, avg_satisfaction_score)
VALUES 
  ('demo-shop-001', CURRENT_DATE, 0, 0, 0, 0),
  ('demo-shop-001', CURRENT_DATE - INTERVAL '1 day', 0, 0, 0, 0)
ON CONFLICT (barbershop_id, date) DO NOTHING;

-- Insert demo AI agents
INSERT INTO ai_agents (barbershop_id, agent_name, agent_type, status)
VALUES 
  ('demo-shop-001', 'Master Business Coach', 'master_coach', 'active'),
  ('demo-shop-001', 'Financial Advisor', 'financial', 'active'),
  ('demo-shop-001', 'Client Acquisition Specialist', 'client_acquisition', 'active'),
  ('demo-shop-001', 'Operations Manager', 'operations', 'active'),
  ('demo-shop-001', 'Brand Strategist', 'brand', 'active'),
  ('demo-shop-001', 'Growth Optimizer', 'growth', 'active')
ON CONFLICT (barbershop_id, agent_type) DO NOTHING;

-- Insert demo realtime metrics
INSERT INTO realtime_metrics (barbershop_id, chairs_total, barbers_working)
VALUES ('demo-shop-001', 4, 0)
ON CONFLICT (barbershop_id) DO NOTHING;