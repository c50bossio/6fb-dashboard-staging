-- Trafft Integration Schema Extension
-- Add tables for managing Trafft booking system integration

-- Integration providers enum
CREATE TYPE integration_provider AS ENUM (
  'trafft',
  'google_calendar',
  'square',
  'acuity',
  'calendly'
);

-- Integration status enum
CREATE TYPE integration_status AS ENUM (
  'pending',
  'active',
  'error',
  'disconnected'
);

-- Sync status enum
CREATE TYPE sync_status AS ENUM (
  'pending',
  'in_progress',
  'success',
  'failed',
  'partial'
);

-- ==========================================
-- INTEGRATION MANAGEMENT
-- ==========================================

-- Third-party integrations
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  
  -- Integration configuration
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status integration_status DEFAULT 'pending',
  
  -- Authentication data (encrypted in production)
  credentials JSONB NOT NULL, -- Store API keys, tokens, etc.
  webhook_url TEXT,
  webhook_secret VARCHAR(255),
  
  -- Configuration settings
  sync_settings JSONB DEFAULT '{}',
  feature_flags JSONB DEFAULT '{}',
  
  -- Status tracking
  authenticated_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one integration per provider per barbershop
  UNIQUE(barbershop_id, provider)
);

-- ==========================================
-- DATA SYNCHRONIZATION
-- ==========================================

-- Sync operations tracking
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type VARCHAR(50) NOT NULL, -- full, incremental, appointments, customers, etc.
  status sync_status DEFAULT 'pending',
  
  -- Time range for sync
  date_from DATE,
  date_to DATE,
  
  -- Results tracking
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  -- Sync summary data
  summary JSONB DEFAULT '{}',
  errors JSONB DEFAULT '[]',
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- SYNCHRONIZED DATA STORAGE
-- ==========================================

-- External appointments (from Trafft, etc.)
CREATE TABLE external_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- External system data
  external_id VARCHAR(255) NOT NULL, -- ID in external system
  external_data JSONB NOT NULL, -- Raw data from external API
  
  -- Normalized appointment data
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  employee_name VARCHAR(255),
  service_name VARCHAR(255),
  
  -- Appointment details
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  price DECIMAL(8,2),
  status VARCHAR(50),
  
  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_hash VARCHAR(64), -- For detecting changes
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique external appointments per integration
  UNIQUE(integration_id, external_id)
);

-- External customers (from Trafft, etc.)
CREATE TABLE external_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- External system data
  external_id VARCHAR(255) NOT NULL,
  external_data JSONB NOT NULL,
  
  -- Normalized customer data
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Customer metrics
  total_appointments INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  first_appointment_at TIMESTAMP WITH TIME ZONE,
  last_appointment_at TIMESTAMP WITH TIME ZONE,
  
  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_hash VARCHAR(64),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(integration_id, external_id)
);

-- External services (from Trafft, etc.)
CREATE TABLE external_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- External system data
  external_id VARCHAR(255) NOT NULL,
  external_data JSONB NOT NULL,
  
  -- Normalized service data
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  price DECIMAL(8,2),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Performance metrics
  booking_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_rating DECIMAL(3,2),
  
  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_hash VARCHAR(64),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(integration_id, external_id)
);

-- External employees (from Trafft, etc.)
CREATE TABLE external_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- External system data
  external_id VARCHAR(255) NOT NULL,
  external_data JSONB NOT NULL,
  
  -- Normalized employee data
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Work schedule and performance
  schedule JSONB DEFAULT '{}', -- Working hours, availability
  specialties VARCHAR(255)[],
  
  -- Performance metrics
  total_appointments INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  avg_rating DECIMAL(3,2),
  
  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_hash VARCHAR(64),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(integration_id, external_id)
);

-- ==========================================
-- BUSINESS ANALYTICS (Enhanced)
-- ==========================================

-- Enhanced business analytics with integration data
CREATE TABLE integration_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Time period
  date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  
  -- Appointment metrics from external system
  external_appointments INTEGER DEFAULT 0,
  external_completed INTEGER DEFAULT 0,
  external_cancelled INTEGER DEFAULT 0,
  external_no_shows INTEGER DEFAULT 0,
  
  -- Revenue metrics from external system
  external_revenue DECIMAL(10,2) DEFAULT 0,
  external_avg_ticket DECIMAL(8,2) DEFAULT 0,
  
  -- Client metrics from external system
  external_new_clients INTEGER DEFAULT 0,
  external_returning_clients INTEGER DEFAULT 0,
  
  -- Capacity and efficiency metrics
  capacity_utilization DECIMAL(5,2) DEFAULT 0, -- Percentage
  peak_hours JSONB DEFAULT '[]', -- Array of {hour, bookings}
  popular_services JSONB DEFAULT '[]', -- Array of {service, bookings, revenue}
  
  -- AI context data
  ai_insights JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  alerts JSONB DEFAULT '[]',
  
  -- Growth potential analysis
  growth_metrics JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(integration_id, date, period_type)
);

-- ==========================================
-- WEBHOOK EVENT TRACKING
-- ==========================================

-- Webhook events from external systems
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  event_id VARCHAR(255), -- External event ID if available
  
  -- Payload
  payload JSONB NOT NULL,
  headers JSONB DEFAULT '{}',
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_error TEXT,
  
  -- Response
  response_status INTEGER, -- HTTP status returned
  response_data JSONB,
  
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for efficient querying
  INDEX idx_webhook_events_integration_type ON webhook_events(integration_id, event_type),
  INDEX idx_webhook_events_processed ON webhook_events(processed, received_at)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Integration indexes
CREATE INDEX idx_integrations_barbershop ON integrations(barbershop_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_last_sync ON integrations(last_sync_at);

-- Sync operation indexes
CREATE INDEX idx_sync_operations_integration ON sync_operations(integration_id);
CREATE INDEX idx_sync_operations_barbershop ON sync_operations(barbershop_id);
CREATE INDEX idx_sync_operations_status ON sync_operations(status);
CREATE INDEX idx_sync_operations_started ON sync_operations(started_at);

-- External data indexes
CREATE INDEX idx_external_appointments_barbershop ON external_appointments(barbershop_id);
CREATE INDEX idx_external_appointments_scheduled ON external_appointments(scheduled_at);
CREATE INDEX idx_external_appointments_sync ON external_appointments(last_synced_at);

CREATE INDEX idx_external_customers_barbershop ON external_customers(barbershop_id);
CREATE INDEX idx_external_customers_email ON external_customers(email);
CREATE INDEX idx_external_customers_sync ON external_customers(last_synced_at);

CREATE INDEX idx_external_services_barbershop ON external_services(barbershop_id);
CREATE INDEX idx_external_services_active ON external_services(is_active);

CREATE INDEX idx_external_employees_barbershop ON external_employees(barbershop_id);

-- Analytics indexes
CREATE INDEX idx_integration_analytics_barbershop_date ON integration_analytics(barbershop_id, date);
CREATE INDEX idx_integration_analytics_integration_date ON integration_analytics(integration_id, date);

-- ==========================================
-- TRIGGERS FOR REAL-TIME UPDATES
-- ==========================================

-- Function to update integration analytics when appointments change
CREATE OR REPLACE FUNCTION update_integration_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily analytics when appointments are added/modified
  INSERT INTO integration_analytics (
    integration_id,
    barbershop_id,
    date,
    period_type,
    external_appointments,
    external_revenue
  )
  VALUES (
    NEW.integration_id,
    NEW.barbershop_id,
    DATE(NEW.scheduled_at),
    'daily',
    1,
    COALESCE(NEW.price, 0)
  )
  ON CONFLICT (integration_id, date, period_type)
  DO UPDATE SET
    external_appointments = integration_analytics.external_appointments + 1,
    external_revenue = integration_analytics.external_revenue + COALESCE(NEW.price, 0);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to external appointments
CREATE TRIGGER update_analytics_on_appointment_insert
  AFTER INSERT ON external_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_analytics();

-- Function to update sync operation duration
CREATE OR REPLACE FUNCTION calculate_sync_duration()
RETURNS TRIGGER AS $$
BEGIN
  NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at));
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to sync operations
CREATE TRIGGER calculate_sync_duration_trigger
  BEFORE UPDATE ON sync_operations
  FOR EACH ROW
  WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
  EXECUTE FUNCTION calculate_sync_duration();

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_external_appointments_updated_at BEFORE UPDATE ON external_appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_external_customers_updated_at BEFORE UPDATE ON external_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_external_services_updated_at BEFORE UPDATE ON external_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_external_employees_updated_at BEFORE UPDATE ON external_employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();