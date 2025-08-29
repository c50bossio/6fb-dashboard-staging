-- Calendar Integrations Migration
-- Adds production-ready Google Calendar integration tables

-- Calendar integrations table for OAuth tokens and settings
CREATE TABLE calendar_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES barbershops(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'google', -- google, outlook, apple, etc.
  
  -- OAuth tokens (encrypted)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Integration settings
  is_active BOOLEAN DEFAULT TRUE,
  display_name VARCHAR(255), -- User's calendar name (e.g., "john@barbershop.com")
  email VARCHAR(255), -- Associated email for this calendar
  calendar_id VARCHAR(255) DEFAULT 'primary', -- Google Calendar ID
  
  -- Sync settings
  sync_direction VARCHAR(20) DEFAULT 'both', -- both, push_only, pull_only
  auto_create_events BOOLEAN DEFAULT TRUE,
  event_title_template TEXT DEFAULT '{customer_name} - {service_name}',
  event_description_template TEXT DEFAULT 'Service: {service_name}\nCustomer: {customer_name}\nPhone: {customer_phone}\nNotes: {notes}',
  buffer_time_minutes INTEGER DEFAULT 5,
  conflict_resolution VARCHAR(20) DEFAULT 'manual', -- manual, 6fb_wins, calendar_wins, latest_wins
  
  -- Status tracking
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  
  -- Security and audit
  ical_token UUID DEFAULT uuid_generate_v4(), -- For public iCal feeds
  webhook_id VARCHAR(255), -- Google Calendar webhook ID
  webhook_expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, provider), -- One integration per provider per user
  CHECK (sync_direction IN ('both', 'push_only', 'pull_only')),
  CHECK (conflict_resolution IN ('manual', '6fb_wins', 'calendar_wins', 'latest_wins'))
);

-- Sync history table for tracking sync operations
CREATE TABLE calendar_sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  
  -- Sync details
  sync_type VARCHAR(50) NOT NULL, -- full_sync, appointment_create, appointment_update, appointment_delete
  direction VARCHAR(20) NOT NULL, -- push, pull, bidirectional
  
  -- Results
  total_events INTEGER DEFAULT 0,
  successful_events INTEGER DEFAULT 0,
  failed_events INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  
  -- Performance tracking
  duration_ms INTEGER,
  error_message TEXT,
  
  -- Metadata
  triggered_by VARCHAR(50), -- user, webhook, cron, api
  appointment_ids TEXT[], -- Array of appointment IDs involved
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (sync_type IN ('full_sync', 'appointment_create', 'appointment_update', 'appointment_delete', 'manual_sync')),
  CHECK (direction IN ('push', 'pull', 'bidirectional')),
  CHECK (triggered_by IN ('user', 'webhook', 'cron', 'api', 'system'))
);

-- Calendar conflicts table for tracking and resolving scheduling conflicts
CREATE TABLE calendar_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Conflict details
  conflict_type VARCHAR(50) NOT NULL, -- double_booking, time_overlap, external_event
  external_event_id VARCHAR(255), -- Google Calendar event ID causing conflict
  external_event_title TEXT,
  external_event_start TIMESTAMP WITH TIME ZONE,
  external_event_end TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  resolution_status VARCHAR(20) DEFAULT 'pending', -- pending, resolved, ignored
  resolution_action VARCHAR(50), -- reschedule_appointment, cancel_appointment, ignore_conflict, update_external
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (conflict_type IN ('double_booking', 'time_overlap', 'external_event', 'recurring_conflict')),
  CHECK (resolution_status IN ('pending', 'resolved', 'ignored')),
  CHECK (resolution_action IN ('reschedule_appointment', 'cancel_appointment', 'ignore_conflict', 'update_external', 'manual_resolution'))
);

-- Indexes for performance
CREATE INDEX idx_calendar_integrations_user_provider ON calendar_integrations(user_id, provider);
CREATE INDEX idx_calendar_integrations_barbershop ON calendar_integrations(barbershop_id);
CREATE INDEX idx_calendar_integrations_active ON calendar_integrations(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_calendar_integrations_sync_time ON calendar_integrations(last_sync_at);

CREATE INDEX idx_calendar_sync_history_integration ON calendar_sync_history(integration_id);
CREATE INDEX idx_calendar_sync_history_created ON calendar_sync_history(created_at);
CREATE INDEX idx_calendar_sync_history_type ON calendar_sync_history(sync_type);

CREATE INDEX idx_calendar_conflicts_integration ON calendar_conflicts(integration_id);
CREATE INDEX idx_calendar_conflicts_appointment ON calendar_conflicts(appointment_id);
CREATE INDEX idx_calendar_conflicts_status ON calendar_conflicts(resolution_status);
CREATE INDEX idx_calendar_conflicts_created ON calendar_conflicts(created_at);

-- Add trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_calendar_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calendar_integrations_updated_at 
    BEFORE UPDATE ON calendar_integrations 
    FOR EACH ROW EXECUTE PROCEDURE update_calendar_updated_at_column();

CREATE TRIGGER update_calendar_conflicts_updated_at 
    BEFORE UPDATE ON calendar_conflicts 
    FOR EACH ROW EXECUTE PROCEDURE update_calendar_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_conflicts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own calendar integrations
CREATE POLICY calendar_integrations_user_access ON calendar_integrations
    FOR ALL USING (user_id = auth.uid());

-- Barbershop owners can access integrations for their barbershop
CREATE POLICY calendar_integrations_barbershop_access ON calendar_integrations
    FOR ALL USING (
        barbershop_id IN (
            SELECT id FROM barbershops WHERE owner_id = auth.uid()
            UNION
            SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid() AND role IN ('SHOP_OWNER', 'MANAGER')
        )
    );

-- Similar policies for sync history and conflicts
CREATE POLICY calendar_sync_history_access ON calendar_sync_history
    FOR ALL USING (
        integration_id IN (
            SELECT id FROM calendar_integrations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY calendar_conflicts_access ON calendar_conflicts
    FOR ALL USING (
        integration_id IN (
            SELECT id FROM calendar_integrations WHERE user_id = auth.uid()
        )
    );

-- Add google_calendar_event_id column to appointments if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' AND column_name = 'google_calendar_event_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN google_calendar_event_id VARCHAR(255);
        ALTER TABLE appointments ADD COLUMN calendar_synced BOOLEAN DEFAULT FALSE;
        ALTER TABLE appointments ADD COLUMN calendar_synced_at TIMESTAMP WITH TIME ZONE;
        
        CREATE INDEX idx_appointments_google_calendar ON appointments(google_calendar_event_id);
        CREATE INDEX idx_appointments_calendar_synced ON appointments(calendar_synced) WHERE calendar_synced = TRUE;
    END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE calendar_integrations IS 'Stores OAuth tokens and settings for external calendar integrations';
COMMENT ON TABLE calendar_sync_history IS 'Tracks calendar synchronization operations and their results';
COMMENT ON TABLE calendar_conflicts IS 'Manages scheduling conflicts between internal appointments and external calendar events';

COMMENT ON COLUMN calendar_integrations.access_token IS 'Encrypted OAuth access token for calendar API access';
COMMENT ON COLUMN calendar_integrations.refresh_token IS 'Encrypted OAuth refresh token for renewing access';
COMMENT ON COLUMN calendar_integrations.ical_token IS 'UUID token for secure iCal feed access';
COMMENT ON COLUMN calendar_integrations.webhook_id IS 'Google Calendar push notification channel ID';